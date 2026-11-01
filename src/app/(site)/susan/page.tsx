import type { Metadata } from "next";
import Link from "next/link";
import { IconArrowRight } from "@/components/icons";
import { ClosingCTA, MoreLink, PageHeader, SectionHead } from "@/components/site/blocks";

export const metadata: Metadata = {
  title: "Susan Weaver, M.A.",
  description:
    "Susan Weaver, M.A.: 42 years of teaching, six children educated from early childhood through high school, Master Teacher at Biola University. Heritage Readers is built on her methods.",
};

const RECORD = [
  {
    area: "Education",
    items: ["Master of Arts in Early Reading, specializing in orthographic mapping and phonemic awareness."],
  },
  {
    area: "Teaching",
    items: [
      "Master Teacher at Biola University.",
      "Classroom tenure across public colleges, private secondary schools and classical Christian academies.",
      "42 years of teaching.",
    ],
  },
  {
    area: "Home",
    items: ["Educated all six of her children, from early childhood through high school."],
  },
  {
    area: "Tutoring",
    items: ["Hundreds of tutored students.", "SAT Critical Reading and Writing preparation."],
  },
  {
    area: "Speech",
    items: ["Coached competitive speech and debate.", "Led Toastmasters chapters."],
  },
];

export default function SusanPage() {
  return (
    <>
      <PageHeader
        eyebrow="The educator"
        title="Susan Weaver, M.A."
        lede="Forty-two years of teaching, from a child’s first sounds to competitive debate. Heritage Readers is built on her methods."
        art="hearth-reading"
        actions={
          <>
            <Link href="/method" className="btn btn-primary btn-lg">
              See the method
            </Link>
            <MoreLink href="/app/onboarding">Begin placement</MoreLink>
          </>
        }
      />

      <section className="s-section s-section-flush" aria-label="Susan Weaver in numbers">
        <div className="s-wrap">
          <dl className="s-specs s-specs-3" data-reveal="">
            <div>
              <dt>Years of teaching</dt>
              <dd className="num">42</dd>
            </div>
            <div>
              <dt>Children educated, early childhood through high school</dt>
              <dd className="num">6</dd>
            </div>
            <div>
              <dt>Students tutored</dt>
              <dd>Hundreds</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="s-section s-band" aria-labelledby="su-record">
        <div className="s-wrap s-record-wrap">
          <SectionHead eyebrow="The record" title="A teacher of reading, writing and speech." id="su-record" />
          <dl className="s-record" data-reveal="">
            {RECORD.map((r) => (
              <div key={r.area} className="s-record-row">
                <dt>{r.area}</dt>
                <dd>
                  <ul>
                    {r.items.map((i) => (
                      <li key={i}>{i}</li>
                    ))}
                  </ul>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="s-section" aria-labelledby="su-foundation">
        <div className="s-wrap">
          <SectionHead eyebrow="The foundation" title="Her methods, carried into a tutor that listens." id="su-foundation" center>
            <p className="s-lede">
              Her methods build on Hay &amp; Wingo’s <cite>Reading with Phonics</cite> and the McGuffey Readers. Heritage Readers is built on her methods.
            </p>
          </SectionHead>
          <ol className="s-stages s-foundation" data-reveal="">
            <li className="s-stage">
              <p className="s-stage-name">The order of the sounds</p>
              <p className="s-body">The Hay &amp; Wingo vowel ladder, rung by rung, from short a to two-syllable words.</p>
            </li>
            <li className="s-stage">
              <p className="s-stage-name">The graded reader</p>
              <p className="s-body">McGuffey-style stories and engravings, with every word decodable at the child’s rung.</p>
            </li>
            <li className="s-stage">
              <p className="s-stage-name">The whole arc</p>
              <p className="s-body">From first sounds to composition and speech, the range of her own teaching.</p>
            </li>
          </ol>
        </div>
      </section>

      <ClosingCTA band title="See the method in a lesson." body="Begin placement, or open the app and look at the ladder, the reading check and the printed lesson.">
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
