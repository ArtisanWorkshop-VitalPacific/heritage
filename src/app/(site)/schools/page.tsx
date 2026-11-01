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
    "Heritage Readers for classical schools, co-ops and microschools. Teachers get a mastery board for each class, lessons printed by rung and paper score entry, with roles, rostering and single sign-on.",
};

const SURFACE: Record<string, string> = { family: "Family", school: "School", student: "Student" };

const PRIVACY = [
  { icon: IconLock, title: "A parent consents for each child.", text: "No child starts a lesson until a parent has given consent." },
  { icon: IconMic, title: "Raw audio isn’t kept by default.", text: "Speech is turned into text to score the reading. Parents decide whether to keep the week 1 and week 8 recordings." },
  { icon: IconPaper, title: "A standard data privacy agreement.", text: "Your school can sign it before any roster is shared, so the terms are settled first." },
  { icon: IconShield, title: "Student Privacy Pledge commitments.", text: "We don’t sell student data or advertise to students, and we use the data only for teaching." },
];

const FUNDING = [
  { title: "529 plans", text: "Since a federal change in July 2025, 529 plans can pay for K-12 curriculum and tutoring." },
  { title: "Tax credit scholarships", text: "Federal tax credit scholarships start on January 1, 2027, in states that opt in." },
  { title: "Education savings accounts", text: "Families can pay from an education savings account in states where Heritage Readers is an approved vendor." },
];

export default function SchoolsPage() {
  return (
    <>
      <PageHeader
        eyebrow="For schools"
        title={<>For classical schools, <span className="s-nowrap">co-ops</span> and microschools.</>}
        lede="Each child in a class works on their own rung. Teachers print lessons for each group and keep every child’s scores in one place."
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
          <SectionHead eyebrow="Roles" title="Seven roles with different access" id="sc-roles" center>
            <p className="s-lede">Permissions are enforced in the app and in the data itself. A teacher can’t change anyone’s role, and a student sees only the lesson.</p>
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
          <SectionHead eyebrow="Mastery board" title="The whole class on one screen" id="sc-board" center>
            <p className="s-lede">Each row is a child and each column is a group of rungs. Green means mastered, navy marks the rung a child is on now, and ochre shows a review that is due.</p>
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
              <SectionHead eyebrow="Class packets" title="Lessons printed by rung" id="sc-packets">
                <p className="s-body-lg">You print once for each group. Each child gets the student page for their own rung, and you get one teacher script for the group.</p>
              </SectionHead>
              <PacketList />
            </div>
            <div className="s-two-col" data-reveal="">
              <SectionHead eyebrow="Paper scores" title="Scores from the paper sheet">
                <p className="s-body-lg">Tap the words a child missed. The app works out the accuracy, counts the reading toward mastery, and shows the parent the same result.</p>
              </SectionHead>
              <ScoreEntry />
            </div>
          </div>
        </div>
      </section>

      <section id="rostering" className="s-section" aria-labelledby="sc-roster">
        <div className="s-wrap">
          <SectionHead eyebrow="Rostering and sign-in" title="Classes come from your roster" id="sc-roster" center>
            <p className="s-lede">Classes and students sync from Clever or ClassLink, and teachers and staff sign in with their Google or Microsoft accounts.</p>
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
          <SectionHead eyebrow="Privacy" title="How we handle children’s data" id="sc-privacy" center />
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
          <SectionHead eyebrow="Funding" title="Paying with education funds" id="sc-funding" center />
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

      <ClosingCTA band title="Open the teacher view." body="The demo opens the Primer Class as its teacher, with the mastery board, the class packets and score entry.">
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
