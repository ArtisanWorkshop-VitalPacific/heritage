import type { Metadata } from "next";
import Link from "next/link";
import { IconArrowRight, IconLock, IconMic, IconPaper, IconShield } from "@/components/icons";
import { ROLES } from "@/lib/roles";
import { ClosingCTA, MoreLink, PageHeader, SectionHead } from "@/components/site/blocks";
import { MasteryBoard } from "@/components/site/depictions/MasteryBoard";
import { PacketList, ScoreEntry } from "@/components/site/depictions/SchoolUI";
import { contactHref } from "@/components/site/site-config";

export const metadata: Metadata = {
  title: "For schools",
  description:
    "Heritage Readers for classical schools, co-ops and microschools: seven roles, a mastery board for each class, class packets by rung, paper scores entered in seconds, rostering and single sign-on.",
};

const SURFACE: Record<string, string> = { family: "Family", school: "School", student: "Student" };

const PRIVACY = [
  { icon: IconLock, title: "Parent consent for every child.", text: "A parent gives consent before a child’s first lesson." },
  { icon: IconMic, title: "Raw audio is not kept by default.", text: "Speech is turned into text to score the read. Parents choose whether to keep the week 1 and week 8 recordings." },
  { icon: IconPaper, title: "A standard data privacy agreement.", text: "Ready for your school to sign, so the terms are clear before any roster is shared." },
  { icon: IconShield, title: "Student Privacy Pledge commitments.", text: "No selling student data. No advertising to students. Data used only to teach." },
];

const FUNDING = [
  { title: "529 plans", text: "529 plans can pay for K-12 curriculum and tutoring (federal change effective July 2025)." },
  { title: "Tax credit scholarships", text: "Federal tax credit scholarships begin January 1, 2027, in states that opt in." },
  { title: "Education savings accounts", text: "Education savings accounts in states where Heritage Readers is an approved vendor." },
];

export default function SchoolsPage() {
  return (
    <>
      <PageHeader
        eyebrow="For schools"
        title={<>For classical schools, <span className="s-nowrap">co-ops</span> and microschools.</>}
        lede="Every child on the right rung. Every lesson on paper. Every score in one place."
        art="schoolroom"
        actions={
          <>
            <Link href="/app/teacher?as=teacher" className="btn btn-primary btn-lg">
              See the teacher view
            </Link>
            <a href={contactHref("Heritage Readers for our school")} className="btn btn-secondary btn-lg">
              Talk to us
            </a>
          </>
        }
      />

      <section id="roles" className="s-section s-band" aria-labelledby="sc-roles">
        <div className="s-wrap">
          <SectionHead eyebrow="Roles" title="Seven roles. Each sees what it needs." id="sc-roles" center>
            <p className="s-lede">Permissions are enforced in the interface and in the data layer. A teacher cannot change roles. A student sees the lesson and nothing else.</p>
          </SectionHead>
          <ul className="s-rolegrid" data-reveal="">
            {ROLES.map((r) => (
              <li key={r.id} className="s-rolecard">
                <span className="s-tag">{SURFACE[r.surface]}</span>
                <p className="s-rolecard-name">{r.label}</p>
                <p className="s-body">{r.summary}</p>
              </li>
            ))}
          </ul>
          <div className="s-center-link">
            <MoreLink href="/app/admin?as=admin">See roles and permissions in the app</MoreLink>
          </div>
        </div>
      </section>

      <section id="board" className="s-section" aria-labelledby="sc-board">
        <div className="s-wrap">
          <SectionHead eyebrow="Mastery board" title="One row per child. One glance per class." id="sc-board" center>
            <p className="s-lede">Green for mastered. Navy for the rung each child is on. Ochre for a review that is due.</p>
          </SectionHead>
          <div className="s-board-stage" data-reveal="">
            <MasteryBoard />
          </div>
        </div>
      </section>

      <section id="packets" className="s-section s-band" aria-labelledby="sc-packets">
        <div className="s-wrap">
          <div className="s-two">
            <div className="s-two-col" data-reveal="">
              <SectionHead eyebrow="Class packets" title="Printed by rung." id="sc-packets">
                <p className="s-body-lg">One print per group. Each child gets the student page for their own rung, and you get one teacher script per group.</p>
              </SectionHead>
              <PacketList />
            </div>
            <div className="s-two-col" data-reveal="">
              <SectionHead eyebrow="Paper scores" title="Entered in seconds.">
                <p className="s-body-lg">Tap the words that were missed. Accuracy is worked out, the ladder updates, and the parent sees the same result.</p>
              </SectionHead>
              <ScoreEntry />
            </div>
          </div>
        </div>
      </section>

      <section id="rostering" className="s-section" aria-labelledby="sc-roster">
        <div className="s-wrap">
          <SectionHead eyebrow="Rostering and sign-in" title="Your classes, already there." id="sc-roster" center>
            <p className="s-lede">Classes and students sync from Clever or ClassLink. Teachers and staff sign in with Google or Microsoft.</p>
          </SectionHead>
          <ul className="s-integrations" data-reveal="">
            <li>
              <b>Clever</b>
              <span>Rostering</span>
            </li>
            <li>
              <b>ClassLink</b>
              <span>Rostering</span>
            </li>
            <li>
              <b>Google</b>
              <span>Sign-in</span>
            </li>
            <li>
              <b>Microsoft</b>
              <span>Sign-in</span>
            </li>
          </ul>
        </div>
      </section>

      <section id="privacy" className="s-section s-band" aria-labelledby="sc-privacy">
        <div className="s-wrap">
          <SectionHead eyebrow="Privacy" title="Children’s data, handled with care." id="sc-privacy" center />
          <ul className="s-privacy" data-reveal="">
            {PRIVACY.map(({ icon: Icon, title, text }) => (
              <li key={title}>
                <span className="s-privacy-icon" aria-hidden="true">
                  <Icon size={22} />
                </span>
                <p className="s-privacy-title">{title}</p>
                <p className="s-body">{text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="funding" className="s-section" aria-labelledby="sc-funding">
        <div className="s-wrap">
          <SectionHead eyebrow="Funding" title="Ways families and schools can pay." id="sc-funding" center />
          <ul className="s-funding" data-reveal="">
            {FUNDING.map((f) => (
              <li key={f.title}>
                <p className="s-funding-title">{f.title}</p>
                <p className="s-body-lg">{f.text}</p>
              </li>
            ))}
          </ul>
          <p className="s-center-note">Rules differ by state and by plan. Check with your plan administrator or a tax advisor before paying with these funds.</p>
        </div>
      </section>

      <ClosingCTA band title="See the teacher view." body="Open the Primer Class as its teacher: the mastery board, the packets and the scores.">
        <Link href="/app/teacher?as=teacher" className="btn btn-primary btn-lg">
          See the teacher view
        </Link>
        <a href={contactHref("Heritage Readers for our school")} className="btn btn-secondary btn-lg">
          Talk to us <IconArrowRight size={18} />
        </a>
      </ClosingCTA>
    </>
  );
}
