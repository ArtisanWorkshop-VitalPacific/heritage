// Build-time asset pipeline for the generated illustrations.
// 1. Download each original from the Higgsfield CDN into .cache/illustrations.
// 2. Convert to WebP with sharp (engravings 1800w, spots 768w) into public/illustrations.
// 3. Cut the hero clip into two WebP image sequences (ffmpeg, then sharp; sm 720w, lg 1280w,
//    15 fps) for the scroll-scrubbed hero, and re-encode a light MP4 as a fallback.
// 4. Write src/lib/illustrations.local.json so the app serves local files.
// Any failure falls back to the remote URL for that asset. The build never fails here.
import { mkdir, readFile, writeFile, stat, readdir, copyFile, rm } from "node:fs/promises";
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
        const mp4 = path.join(outDir, "hero-motion.mp4");
        map[e.id] = "/illustrations/hero-motion.mp4";
        if (!ffmpeg) {
          await copyFile(src, mp4);
        } else {
          // Fallback clip: 1280w, short GOP so seeking stays quick, no audio, fast start.
          try {
            await run(ffmpeg, ["-y", "-hide_banner", "-loglevel", "error", "-i", src, "-vf", "scale=1280:-2:flags=lanczos", "-c:v", "libx264", "-preset", "veryfast", "-crf", "26", "-g", "6", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", mp4]);
          } catch {
            await copyFile(src, mp4);
          }
          // Scroll-scrub sequences. A light temporal denoise steadies the engraving lines between
          // frames and keeps the files small. Frames are WebP when sharp is present, else JPEG.
          const sets = { sm: 720, lg: 1280 };
          const frames = {};
          for (const [key, width] of Object.entries(sets)) {
            const dir = path.join(outDir, `hero-frames-${key}`);
            const tmp = path.join(cacheDir, `hero-frames-${key}`);
            await rm(dir, { recursive: true, force: true });
            await rm(tmp, { recursive: true, force: true });
            await mkdir(dir, { recursive: true });
            await mkdir(tmp, { recursive: true });
            await run(ffmpeg, ["-y", "-hide_banner", "-loglevel", "error", "-i", src, "-vf", `fps=15,scale=${width}:-2:flags=lanczos,hqdn3d=1.5:1.5:3:3`, "-q:v", "2", path.join(tmp, "f%03d.jpg")]);
            const names = (await readdir(tmp)).filter((f) => f.endsWith(".jpg")).sort();
            let ext = "jpg";
            if (sharp) {
              ext = "webp";
              for (const name of names) {
                await sharp(path.join(tmp, name))
                  .webp({ quality: key === "sm" ? 62 : 60, effort: 4 })
                  .toFile(path.join(dir, name.replace(/\.jpg$/, ".webp")));
              }
            } else {
              for (const name of names) await copyFile(path.join(tmp, name), path.join(dir, name));
            }
            let height = Math.round((width * 9) / 16);
            if (sharp && names[0]) height = (await sharp(path.join(tmp, names[0])).metadata()).height ?? height;
            frames[key] = { count: names.length, width, height, pattern: `/illustrations/hero-frames-${key}/f{n}.${ext}` };
          }
          map._heroFrames = frames;
        }
      } else if (sharp && e.kind === "engraving") {
        // Engravings become transparent ink: paper -> alpha 0, ink -> alpha 255, in lamp black.
        // They then print onto any ground (parchment, page cream, a dark plate) with no blend modes.
        // Paper grain is removed by gating on the local tone (a light blur): where the neighborhood
        // reads as paper, alpha is 0, so no faint grey rectangle shows. The outer edge is feathered.
        const width = e.id === "hero" || e.id === "village-lane" ? 2400 : 1800;
        const grey = () => sharp(src).resize({ width, withoutEnlargement: true }).greyscale();
        const { data, info } = await grey().raw().toBuffer({ resolveWithObject: true });
        const { data: soft, info: softInfo } = await grey().blur(1.4).raw().toBuffer({ resolveWithObject: true });
        const W = info.width;
        const H = info.height;
        const ch = info.channels;
        const sch = softInfo.channels;
        const feather = Math.max(8, Math.round(Math.min(W, H) * 0.035));
        const rgba = Buffer.alloc(W * H * 4);
        for (let y = 0; y < H; y++) {
          const ey = Math.min(y, H - 1 - y);
          for (let x = 0; x < W; x++) {
            const i = y * W + x;
            const g = data[i * ch];
            const s = soft[i * sch];
            let a = Math.max(0, Math.min(1, (230 - g) / 190));
            const gate = s >= 227 ? 0 : s <= 219 ? 1 : (227 - s) / 8;
            a *= gate;
            const edge = Math.min(ey, Math.min(x, W - 1 - x));
            if (edge < feather) {
              const t = edge / feather;
              a *= t * t * (3 - 2 * t);
            }
            rgba[i * 4] = 0x1a;
            rgba[i * 4 + 1] = 0x17;
            rgba[i * 4 + 2] = 0x14;
            rgba[i * 4 + 3] = Math.round(a * 255);
          }
        }
        const file = `${e.id}.webp`;
        await sharp(rgba, { raw: { width: W, height: H, channels: 4 } }).webp({ quality: 82, alphaQuality: 92 }).toFile(path.join(outDir, file));
        map[e.id] = `/illustrations/${file}`;
        map._engravingInk = true;
      } else if (sharp) {
        const file = `${e.id}.webp`;
        await sharp(src).resize({ width: 768, withoutEnlargement: true }).webp({ quality: 84, alphaQuality: 90 }).toFile(path.join(outDir, file));
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
