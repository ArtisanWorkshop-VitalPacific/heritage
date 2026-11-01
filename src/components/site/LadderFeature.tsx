import { VowelLadder } from "@/components/VowelLadder";
import { getRung } from "@/lib/ladder";
import { SAMPLE } from "./depictions/sample";

/** Splits a word into its vowel and the consonants around it, so only the vowel is pink. */
function pinkVowel(word: string) {
  const m = word.match(/^([^aeiou]*)([aeiou]+)(.*)$/i);
  if (!m) return <>{word}</>;
  return (
    <>
      {m[1]}
      <span className="s-pink">{m[2]}</span>
      {m[3]}
    </>
  );
}

/**
 * The Hay & Wingo page for rung 10, as a card: the interactive vowel ladder,
 * the minimal pairs beneath it, and where the sample child is on the 40 rungs.
 */
export function LadderFeature() {
  const rung = getRung(10);
  const pairs = rung.pairs.slice(0, 5);
  return (
    <div className="s-ladder-card surface-drill">
      <div className="s-ladder-card-head">
        <span className="s-chip">Rung 10 · {rung.title}</span>
        <span className="s-ladder-hint">Tap a word to hear it</span>
      </div>
      <VowelLadder data={rung.ladder!} label="Vowel ladder for the letter h. Tap a word to hear it." />
      <div className="s-pairs" aria-label="Words that change only the vowel">
        {pairs.map(([a, b]) => (
          <span key={a + b} className="s-pair">
            <span>{pinkVowel(a)}</span>
            <span>{pinkVowel(b)}</span>
          </span>
        ))}
      </div>
      <div className="s-rungstrip" aria-label={`${SAMPLE.child} has mastered ${SAMPLE.mastered} of 40 rungs and is on rung ${SAMPLE.rung}`}>
        <div className="s-rungstrip-label">
          <span>
            {SAMPLE.child} · Rung {SAMPLE.rung} of 40
          </span>
          <span className="s-rungstrip-key">
            <i data-state="mastered" /> Mastered <i data-state="current" /> Current
          </span>
        </div>
        <div className="s-rungstrip-cells" aria-hidden="true">
          {Array.from({ length: 40 }, (_, i) => (
            <i key={i} data-state={i + 1 < SAMPLE.rung ? "mastered" : i + 1 === SAMPLE.rung ? "current" : undefined} />
          ))}
        </div>
      </div>
    </div>
  );
}
