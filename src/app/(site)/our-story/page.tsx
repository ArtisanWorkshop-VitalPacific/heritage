import type { Metadata } from "next";
import Link from "next/link";
import { IconArrowRight } from "@/components/icons";
import { ClosingCTA, MoreLink, PageHeader, SectionHead } from "@/components/site/blocks";

export const metadata: Metadata = {
  title: "Our Story",
  description:
    "Susan Weaver, M.A., has taught for 42 years, including as a Master Teacher at Biola University, and educated her six children from early childhood through high school. Heritage Readers follows her approach to teaching reading.",
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
      "Taught in public colleges, private secondary schools and classical Christian academies.",
      "42 years of teaching.",
    ],
  },
  {
    area: "Home",
    items: ["Educated all six of her children, from early childhood through high school."],
  },
  {
    area: "Tutoring",
    items: ["Has tutored hundreds of students.", "Prepares students for the SAT Critical Reading and Writing sections."],
  },
  {
    area: "Speech",
    items: ["Has coached competitive speech and debate.", "Has led Toastmasters chapters."],
  },
];

export default function OurStoryPage() {
  return (
    <>
      <PageHeader
        eyebrow="Our story"
        title="Susan Weaver, M.A."
        lede="Susan has taught for 42 years, from children learning their first letter sounds to students in competitive debate. Heritage Readers follows her approach to teaching reading."
        art="hearth-reading"
        actions={
          <>
            <Link href="/method" className="btn btn-primary btn-lg">
              See the method
            </Link>
            <MoreLink href="/app/onboarding">Start placement</MoreLink>
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
          <SectionHead eyebrow="Her record" title="Teaching reading, writing and speech" id="su-record" />
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
          <SectionHead eyebrow="The foundation" title="What Heritage Readers takes from her teaching" id="su-foundation" center>
            <p className="s-lede">
              Her approach draws on Hay and Wingo’s <cite>Reading with Phonics</cite> and the McGuffey Readers. Three parts of it shape the app.
            </p>
          </SectionHead>
          <ol className="s-stages s-foundation" data-reveal="">
            <li className="s-stage">
              <p className="s-stage-name">The order of the sounds</p>
              <p className="s-body">Children work up the Hay and Wingo vowel ladder one rung at a time, from short a to two-syllable words.</p>
            </li>
            <li className="s-stage">
              <p className="s-stage-name">The graded reader</p>
              <p className="s-body">The stories and pictures follow the McGuffey Readers, and each word can be sounded out at the child’s rung.</p>
            </li>
            <li className="s-stage">
              <p className="s-stage-name">The later years</p>
              <p className="s-body">Composition and speech come after reading, following the range of her own teaching.</p>
            </li>
          </ol>
        </div>
      </section>

      <ClosingCTA band title="See her method in a lesson." body="Start a placement, or open the app to look at the ladder, the reading check and a printed lesson.">
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
