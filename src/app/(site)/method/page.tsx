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
    "How Heritage Readers teaches reading: the order of Reading with Phonics over 40 rungs, two clean reads before a child moves up, and a rules engine that decides what your child reads.",
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
    text: "Children learn the sounds and spellings of written English one rung at a time, along with copywork, dictation and narration. They read fables, folk tales and graded readers.",
  },
  {
    numeral: "II",
    name: "Logic",
    ages: "Ages 11 to 13",
    text: "Children read longer books and learn to summarize them, outline them and follow the steps of an argument.",
  },
  {
    numeral: "III",
    name: "Rhetoric",
    ages: "Ages 14 and up",
    text: "Students write through the Progymnasmata exercises, which run from retelling a fable to building an argument, and they practice speaking through recitation and debate.",
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
        title="How Heritage Readers teaches reading"
        lede="Children learn the sounds of written English in a fixed order and move up only after they can read each step accurately. They never see a word they haven’t been taught to sound out."
        art="slate-copywork"
        actions={
          <>
            <Link href="/app/onboarding" className="btn btn-primary btn-lg">
              Start placement
            </Link>
            <MoreLink href="#engine">What the AI does and doesn’t do</MoreLink>
          </>
        }
      />

      <section id="ladder" className="s-section s-band" aria-labelledby="m-ladder">
        <div className="s-wrap s-split">
          <div className="s-split-copy">
            <SectionHead eyebrow="The order" title="Forty rungs in the order of the book" id="m-ladder">
              <p className="s-body-lg">
                The order comes from Hay and Wingo’s <cite>Reading with Phonics</cite> (1946). Children learn the five short vowels first and then each consonant on the vowel ladder. Blends, digraphs, silent e, vowel teams, r-controlled vowels and word endings follow, and the last rung is two-syllable words.
              </p>
              <p className="s-body-lg">Each rung adds one new sound or spelling, and each story uses only what has been taught up to that rung.</p>
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
            <SectionHead eyebrow="Mastery" title="When a rung counts as learned" id="m-mastery">
              <p className="s-body-lg">A clean read means at least 95 percent of the words were read correctly. After two clean reads, and a third a week later, the rung is mastered and the next one opens.</p>
              <p className="s-body-lg">If a reading falls below 90 percent, your child stays on that rung, and the next story uses only sounds your child already knows.</p>
            </SectionHead>
            <p className="s-footnote">In this demo, a rung is mastered after two clean reads so you can see it happen in one sitting. The third read is scheduled as a review a week later.</p>
          </div>
          <div className="s-split-art" data-reveal="">
            <MasteryTimeline />
          </div>
        </div>
      </section>

      <section id="engine" className="s-section s-band" aria-labelledby="m-engine">
        <div className="s-wrap">
          <SectionHead eyebrow="What the AI does" title="A rules engine decides what your child reads." id="m-engine" center>
            <p className="s-lede">The engine keeps track of your child’s rung and the words allowed there. The language model talks with your child, and any story it writes can use only the words the engine allows.</p>
          </SectionHead>
          <div className="s-decide" data-reveal="">
            <div className="s-decide-col">
              <p className="s-decide-title">The engine decides</p>
              <ul>
                <li>Which rung your child is on</li>
                <li>Which words are allowed at that rung</li>
                <li>Which story comes next</li>
                <li>When a rung is mastered and when a review is due</li>
                <li>The order of the lesson, from the warm-up to the closing word</li>
              </ul>
            </div>
            <div className="s-decide-col">
              <p className="s-decide-title">The language model may</p>
              <ul>
                <li>Speak as Mrs. Wren, slowly and kindly</li>
                <li>Answer your child’s questions</li>
                <li>Draft a new story from the allowed words</li>
                <li>Teach one classical word in each lesson, such as diligent, with a plain meaning</li>
              </ul>
            </div>
            <div className="s-decide-col" data-never="">
              <p className="s-decide-title">The language model can’t</p>
              <ul>
                <li>Show a word your child can’t sound out</li>
                <li>Decide that a rung is mastered</li>
                <li>Skip a step in the lesson</li>
                <li>Tell your child “wrong”</li>
              </ul>
            </div>
          </div>
          <div className="s-split s-validator-split">
            <div className="s-split-copy">
              <SectionHead title="Each word is checked before your child sees it.">
                <p className="s-body-lg">
                  Before a story goes to the screen or the printer, the program checks each word. It has to be one your child can sound out with the sounds taught so far, a sight word already taught, or a name in the story. If a single word fails, the story is rejected.
                </p>
                <p className="s-body-lg">If three drafts in a row are rejected, the program uses a story from its own library, which has already passed the same check.</p>
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
          <SectionHead eyebrow="The reading check" title="The three-minute reading check" id="m-check" center>
            <p className="s-lede">Your child reads one story out loud. The program matches each spoken word to the printed word, in order, and records one of five results for it.</p>
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
          <p className="s-center-note">The accuracy and the words read correctly per minute go to you. Your child sees the underline and the review marks and hears Mrs. Wren, who doesn’t use the word “wrong.”</p>
        </div>
      </section>

      <section id="arc" className="s-section s-band" aria-labelledby="m-arc">
        <div className="s-wrap">
          <SectionHead eyebrow="By age" title="The three stages of a classical education" id="m-arc" center>
            <p className="s-lede">Dorothy Sayers described these stages in a 1947 lecture. Heritage Readers starts with reading in the first stage, and composition and speech come later.</p>
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
          <SectionHead eyebrow="Sources" title="The books and teachers behind the method" id="m-sources" />
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

      <ClosingCTA band title="Find out where your child starts." body="Placement takes about ten minutes. Your child reads letter sounds, a few words and one short story out loud.">
        <Link href="/app/onboarding" className="btn btn-primary btn-lg">
          Start placement
        </Link>
        <Link href="/app" className="btn btn-secondary btn-lg">
          Open the app <IconArrowRight size={18} />
        </Link>
      </ClosingCTA>
    </>
  );
}
