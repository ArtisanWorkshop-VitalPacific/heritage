// Build-time asset pipeline for the generated illustrations.
// 1. Download each original from the Higgsfield CDN into .cache/illustrations.
// 2. Convert to WebP with sharp (engravings 1800w, spots 768w) into public/illustrations.
// 3. Cut the hero clip into two JPEG image sequences with ffmpeg (sm 720w, lg 1440w)
//    for the scroll-scrubbed hero, and copy the MP4 as a fallback.
// 4. Write src/lib/illustrations.local.json so the app serves local files.
// Any failure falls back to the remote URL for that asset. The build never fails here.
import { mkdir, readFile, writeFile, stat, readdir, copyFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";

const run = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataFile = path.join(root, "src/lib/illustrations.data.ts");
const cacheDir = path.join(root, ".cache/illustrations");
const outDir = path.join(root, "public/illustrations");
const localMap = path.join(root, "src/lib/illustrations.local.json");

const source = await readFile(dataFile, "utf8");
const base = source.match(/const B = "([^"]+)"/)?.[1];
const entries = [];
for (const m of source.matchAll(/\b([es])\("([a-z0-9-]+)",\s*"([^"]+)"/g)) {
  entries.push({ id: m[2], kind: m[1] === "e" ? "engraving" : "spot", url: `${base}${m[3]}.png`, ext: "png" });
}
const video = source.match(/id: "hero-motion"[\s\S]*?remote: `\$\{B\}([^`]+)`/);
if (video) entries.push({ id: "hero-motion", kind: "video", url: `${base}${video[1]}`, ext: "mp4" });

await mkdir(cacheDir, { recursive: true });
await mkdir(outDir, { recursive: true });

async function exists(p, min = 1000) {
  try {
    return (await stat(p)).size > min;
  } catch {
    return false;
  }
}

async function download(e) {
  const dest = path.join(cacheDir, `${e.id}.${e.ext}`);
  if (await exists(dest)) return dest;
  const res = await fetch(e.url, { signal: AbortSignal.timeout(45_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  await writeFile(dest, Buffer.from(await res.arrayBuffer()));
  return dest;
}

let sharp = null;
try {
  sharp = (await import("sharp")).default;
} catch {
  console.warn("[illustrations] sharp unavailable; serving PNG originals");
}

let ffmpeg = null;
try {
  ffmpeg = (await import("ffmpeg-static")).default;
  if (!ffmpeg || !(await exists(ffmpeg, 10))) ffmpeg = null;
} catch {
  ffmpeg = null;
}

const map = {};
let local = 0;
let remote = 0;

// Download with limited concurrency.
const queue = [...entries];
async function worker() {
  while (queue.length) {
    const e = queue.shift();
    try {
      const src = await download(e);
      if (e.kind === "video") {
        await copyFile(src, path.join(outDir, "hero-motion.mp4"));
        map[e.id] = "/illustrations/hero-motion.mp4";
        if (ffmpeg) {
          const sets = { sm: 720, lg: 1440 };
          const frames = {};
          for (const [key, width] of Object.entries(sets)) {
            const dir = path.join(outDir, `hero-frames-${key}`);
            await mkdir(dir, { recursive: true });
            await run(ffmpeg, ["-y", "-hide_banner", "-loglevel", "error", "-i", src, "-vf", `fps=18,scale=${width}:-2`, "-q:v", key === "sm" ? "5" : "4", path.join(dir, "f%03d.jpg")]);
            const count = (await readdir(dir)).filter((f) => f.endsWith(".jpg")).length;
            frames[key] = { count, width, height: Math.round((width * 9) / 16), pattern: `/illustrations/hero-frames-${key}/f{n}.jpg` };
          }
          map._heroFrames = frames;
        }
      } else if (sharp) {
        const width = e.kind === "spot" ? 768 : e.id === "hero" || e.id === "village-lane" ? 2400 : 1800;
        const file = `${e.id}.webp`;
        await sharp(src).resize({ width, withoutEnlargement: true }).webp({ quality: e.kind === "spot" ? 84 : 80, alphaQuality: 90 }).toFile(path.join(outDir, file));
        map[e.id] = `/illustrations/${file}`;
      } else {
        await copyFile(src, path.join(outDir, `${e.id}.png`));
        map[e.id] = `/illustrations/${e.id}.png`;
      }
      local++;
    } catch (err) {
      remote++;
      console.warn(`[illustrations] ${e.id}: ${err?.message ?? err} (using remote URL)`);
    }
  }
}
await Promise.all(Array.from({ length: 6 }, worker));

await writeFile(localMap, JSON.stringify(map, null, 2) + "\n");
console.log(`[illustrations] ${local} local, ${remote} remote fallback, of ${entries.length}${map._heroFrames ? `; hero frames ${map._heroFrames.lg.count}` : "; no hero frames"}`);
