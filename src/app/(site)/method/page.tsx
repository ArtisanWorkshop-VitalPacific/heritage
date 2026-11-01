import type { Metadata } from "next";
import Link from "next/link";
import { IconArrowRight } from "@/components/icons";
import { ClosingCTA, MoreLink, PageHeader, SectionHead } from "@/components/site/blocks";
import { CourseMap } from "@/components/site/CourseMap";
import { LadderFeature } from "@/components/site/LadderFeature";
import { MasteryTimeline, ValidatorCard } from "@/components/site/depictions/MethodUI";
import { ReadingCheck } from "@/components/site/depictions/ReadingCheck";

export const metadata: Metadata = {
  title: "Method",
  description:
    "Phonics first on the Hay & Wingo vowel ladder, 40 rungs in order. Mastery before moving on. A deterministic engine decides what your child reads; the language model never does.",
};

const OUTCOMES = [
  { name: "Correct", text: "Read as printed." },
  { name: "Substitution", text: "Another word in its place, such as had for hid." },
  { name: "Omission", text: "Skipped." },
  { name: "Insertion", text: "A word added that is not on the page." },
  { name: "Hesitation", text: "A long pause before the word." },
];

const STAGES = [
  {
    numeral: "I",
    name: "Grammar",
    ages: "Ages 4 to 10",
    text: "The code of written English, rung by rung. Copywork, dictation and narration. Fables, tales and graded readers.",
  },
  {
    numeral: "II",
    name: "Logic",
    ages: "Ages 11 to 13",
    text: "Reading to reason. Summary, outline and the order of an argument, drawn from longer books.",
  },
  {
    numeral: "III",
    name: "Rhetoric",
    ages: "Ages 14 and up",
    text: "Composition with the Progymnasmata, from fable to argument, and speech: reading aloud, recitation and debate.",
  },
];

const SOURCES = [
  { who: "Julie Hay and Charles E. Wingo", work: "Reading with Phonics", year: "1946", use: "The vowel ladder and the order of the sounds." },
  { who: "William Holmes McGuffey", work: "McGuffey’s Eclectic Readers", year: "1879 edition", use: "Graded readers and the engraved page." },
  { who: "Romalda Spalding", work: "The Writing Road to Reading", year: "1957", use: "Phonograms, dictation and handwriting." },
  { who: "Samuel Orton and Anna Gillingham", work: "Syllable types", year: "", use: "How two-syllable words are divided and read." },
  { who: "Siegfried Engelmann", work: "Direct Instruction", year: "", use: "Scripted lessons and the correction: model, lead, test." },
  { who: "Charlotte Mason", work: "Narration", year: "", use: "The child tells the story back in their own words." },
  { who: "Aphthonius of Antioch", work: "Progymnasmata", year: "", use: "The composition exercises, from fable to argument." },
  { who: "Dorothy L. Sayers", work: "The Lost Tools of Learning", year: "1947", use: "The three stages: grammar, logic, rhetoric." },
];

export default function MethodPage() {
  return (
    <>
      <PageHeader
        eyebrow="The method"
        title="Phonics first. Mastery, not minutes."
        lede="Heritage Readers teaches the sounds of written English in a fixed order, checks each step before the next, and never shows a child a word they have not been taught to decode."
        art="slate-copywork"
        actions={
          <>
            <Link href="/app/onboarding" className="btn btn-primary btn-lg">
              Begin placement
            </Link>
            <MoreLink href="#engine">What the AI decides</MoreLink>
          </>
        }
      />

      <section id="ladder" className="s-section s-band" aria-labelledby="m-ladder">
        <div className="s-wrap s-split">
          <div className="s-split-copy">
            <SectionHead eyebrow="Phonics first" title="Forty rungs, in order." id="m-ladder">
              <p className="s-body-lg">
                The sequence follows Hay &amp; Wingo’s <cite>Reading with Phonics</cite> (1946): the five short vowels, then each consonant on the vowel ladder, then blends, digraphs, silent e, vowel teams, r-controlled vowels, endings and two-syllable words.
              </p>
              <p className="s-body-lg">Each rung adds one piece of the code. Each passage uses only the pieces taught so far.</p>
            </SectionHead>
          </div>
          <div className="s-split-art" data-reveal="">
            <LadderFeature />
          </div>
        </div>
        <div className="s-wrap">
          <div className="s-course-wrap" data-reveal="">
            <CourseMap />
          </div>
        </div>
      </section>

      <section id="mastery" className="s-section" aria-labelledby="m-mastery">
        <div className="s-wrap s-split">
          <div className="s-split-copy">
            <SectionHead eyebrow="Mastery, not minutes" title="A rung is done when it is learned." id="m-mastery">
              <p className="s-body-lg">A clean read is 95% accuracy or better. Two clean reads, then one more seven days later, and the rung is mastered. The next rung opens.</p>
              <p className="s-body-lg">Below 90%, the rung stays. The next passage uses only what your child has already mastered.</p>
            </SectionHead>
            <p className="s-footnote">In this demo, a rung is sealed after the two clean reads so you can see the whole cycle in one sitting. The seven-day read is then scheduled as a review.</p>
          </div>
          <div className="s-split-art" data-reveal="">
            <MasteryTimeline />
          </div>
        </div>
      </section>

      <section id="engine" className="s-section s-band" aria-labelledby="m-engine">
        <div className="s-wrap">
          <SectionHead eyebrow="What the AI decides" title="The engine decides what your child reads." id="m-engine" center>
            <p className="s-lede">A deterministic engine holds your child’s place on the ladder. The language model talks, and it writes only with the words the engine allows.</p>
          </SectionHead>
          <div className="s-decide" data-reveal="">
            <div className="s-decide-col">
              <p className="s-decide-title">The engine decides</p>
              <ul>
                <li>Which rung your child is on.</li>
                <li>Which words are allowed at that rung.</li>
                <li>Which passage comes next.</li>
                <li>When a rung is mastered, and when a review is due.</li>
                <li>The order of each lesson: warm-up, teach, words, passage, check, close.</li>
              </ul>
            </div>
            <div className="s-decide-col">
              <p className="s-decide-title">The language model may</p>
              <ul>
                <li>Speak as Mrs. Wren, gently and a little slowly.</li>
                <li>Answer your child’s questions.</li>
                <li>Draft a new passage from the allowed words.</li>
                <li>Teach one classical word per lesson, with a plain meaning.</li>
              </ul>
            </div>
            <div className="s-decide-col" data-never="">
              <p className="s-decide-title">It never</p>
              <ul>
                <li>Shows a word your child cannot decode.</li>
                <li>Decides that a rung is mastered.</li>
                <li>Skips a step.</li>
                <li>Says “wrong.”</li>
              </ul>
            </div>
          </div>
          <div className="s-split s-validator-split">
            <div className="s-split-copy">
              <SectionHead title="Every word is checked against your child’s rung.">
                <p className="s-body-lg">
                  Before a passage reaches the screen or the printer, every word must be decodable with the sounds taught so far, a sight word already taught, or a name in the story. One word outside the list and the passage is rejected.
                </p>
                <p className="s-body-lg">After three rejections, a passage from the library is used instead. Nothing unchecked is shown.</p>
              </SectionHead>
            </div>
            <div className="s-split-art" data-reveal="">
              <ValidatorCard />
            </div>
          </div>
        </div>
      </section>

      <section id="check" className="s-section" aria-labelledby="m-check">
        <div className="s-wrap">
          <SectionHead eyebrow="The reading check" title="Three minutes, read aloud." id="m-check" center>
            <p className="s-lede">Your child reads one passage. Each spoken word is matched to the printed word, in order, and given one of five outcomes.</p>
          </SectionHead>
          <div className="s-listens-stage s-listens-stage-plain" data-reveal="">
            <ReadingCheck />
          </div>
          <dl className="s-outcomes" data-reveal="">
            {OUTCOMES.map((o) => (
              <div key={o.name}>
                <dt>{o.name}</dt>
                <dd>{o.text}</dd>
              </div>
            ))}
          </dl>
          <p className="s-center-note">Accuracy and words correct per minute go to the grown-up. Your child sees the underline and the review mark, and hears Mrs. Wren. Never the word “wrong.”</p>
        </div>
      </section>

      <section id="arc" className="s-section s-band" aria-labelledby="m-arc">
        <div className="s-wrap">
          <SectionHead eyebrow="The arc by age" title="Grammar, logic, rhetoric." id="m-arc" center>
            <p className="s-lede">The classical stages, as Dorothy Sayers described them in 1947. Reading comes first. Composition and speech follow.</p>
          </SectionHead>
          <ol className="s-stages" data-reveal="">
            {STAGES.map((s) => (
              <li key={s.name} className="s-stage">
                <span className="s-stage-numeral" aria-hidden="true">
                  {s.numeral}
                </span>
                <p className="s-stage-name">{s.name}</p>
                <p className="s-stage-ages">{s.ages}</p>
                <p className="s-body">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="sources" className="s-section" aria-labelledby="m-sources">
        <div className="s-wrap s-sources-wrap">
          <SectionHead eyebrow="Sources" title="What the method draws on." id="m-sources" />
          <ol className="s-sources" data-reveal="">
            {SOURCES.map((s) => (
              <li key={s.work}>
                <p className="s-source-cite">
                  {s.who}. <cite>{s.work}</cite>
                  {s.year ? `, ${s.year}` : ""}.
                </p>
                <p className="s-source-use">{s.use}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <ClosingCTA band title="See where your child starts." body="Placement takes about ten minutes. Letters, sounds, words, and one short passage, read aloud.">
        <Link href="/app/onboarding" className="btn btn-primary btn-lg">
          Begin placement
        </Link>
        <Link href="/app" className="btn btn-secondary btn-lg">
          Open the app <IconArrowRight size={18} />
        </Link>
      </ClosingCTA>
    </>
  );
}
