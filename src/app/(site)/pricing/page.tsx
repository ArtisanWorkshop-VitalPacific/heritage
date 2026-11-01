import type { Metadata } from "next";
import Link from "next/link";
import { IconArrowRight, IconCheck } from "@/components/icons";
import { ClosingCTA, Faq, MoreLink, SectionHead } from "@/components/site/blocks";
import { contactHref } from "@/components/site/site-config";

export const metadata: Metadata = {
  title: "Pricing",
  description: "The family plan is $39 a month or $399 a year and covers every child in the household. ESA-funded students are $600 a year, and schools and co-ops pay $180 per student per year.",
};

const INCLUDED = ["Printable lessons", "The reading check", "The weekly report", "Mrs. Wren"];

const FAQ = [
  {
    q: "How much screen time is there?",
    a: "About three minutes a lesson, for the reading check. The other twelve minutes or so happen on paper with you. You can set a daily screen limit for each child.",
  },
  {
    q: "What happens to my child’s voice?",
    a: "Your child’s speech is turned into text to check the reading, and the raw audio isn’t kept unless you choose to keep the week 1 and week 8 recordings. A parent gives consent for each child before the first lesson.",
  },
  {
    q: "Is the faith track required?",
    a: "No. You can turn the faith track on or off for each child in settings.",
  },
  {
    q: "Can I cancel?",
    a: "Yes. You can cancel at any time from settings.",
  },
  {
    q: "How does the voice work?",
    a: "Mrs. Wren speaks slowly and kindly, with an American or British accent. When your child reads, the app matches each spoken word to the printed word. In this demo, the listening uses your browser’s own speech recognition.",
  },
  {
    q: "Which ages is it for?",
    a: "It is written for children from 4 to 8. Placement finds the right rung for each child, so a four-year-old and an eight-year-old start in different places.",
  },
];

export default function PricingPage() {
  return (
    <>
      <header className="s-pagehead s-pagehead-plain">
        <div className="s-wrap">
          <div className="s-pagehead-copy">
            <p className="s-eyebrow">Pricing</p>
            <h1 className="s-h1">Pricing for families, schools and co-ops</h1>
            <p className="s-lede">The family plan covers every child in your household. All plans include the printable lessons, the reading check, the weekly report and Mrs. Wren.</p>
          </div>
        </div>
      </header>

      <section className="s-section s-section-flush" aria-label="Plans">
        <div className="s-wrap">
          <ul className="s-plans">
            <li className="s-plan" data-featured="">
              <p className="s-plan-name">Family</p>
              <p className="s-plan-price">
                <span className="num">$39</span>
                <span className="s-plan-unit">a month</span>
              </p>
              <p className="s-plan-alt">
                or <b className="num">$399</b> a year. Save $69.
              </p>
              <p className="s-plan-desc">Covers every child in your household.</p>
              <ul className="s-plan-list">
                {INCLUDED.map((i) => (
                  <li key={i}>
                    <IconCheck size={16} /> {i}
                  </li>
                ))}
              </ul>
              <Link href="/app/onboarding" className="btn btn-primary btn-lg s-plan-cta">
                Start placement
              </Link>
            </li>
            <li className="s-plan">
              <p className="s-plan-name">ESA-funded</p>
              <p className="s-plan-price">
                <span className="num">$600</span>
                <span className="s-plan-unit">per student, per year</span>
              </p>
              <p className="s-plan-alt">Paid from the state account where approved.</p>
              <p className="s-plan-desc">For families paying with an education savings account.</p>
              <ul className="s-plan-list">
                {INCLUDED.map((i) => (
                  <li key={i}>
                    <IconCheck size={16} /> {i}
                  </li>
                ))}
              </ul>
              <Link href="/app/onboarding" className="btn btn-secondary btn-lg s-plan-cta">
                Start placement
              </Link>
            </li>
            <li className="s-plan">
              <p className="s-plan-name">Schools and co-ops</p>
              <p className="s-plan-price">
                <span className="num">$180</span>
                <span className="s-plan-unit">per student, per year</span>
              </p>
              <p className="s-plan-alt">Volume pricing from 50 seats.</p>
              <p className="s-plan-desc">Adds roles, mastery boards, class packets, rostering and sign-in.</p>
              <ul className="s-plan-list">
                {INCLUDED.map((i) => (
                  <li key={i}>
                    <IconCheck size={16} /> {i}
                  </li>
                ))}
              </ul>
              <a href={contactHref("Heritage Readers pricing for our school")} className="btn btn-secondary btn-lg s-plan-cta">
                Talk to us
              </a>
            </li>
          </ul>
          <p className="s-demo-note">Demo pricing for the walkthrough.</p>
        </div>
      </section>

      <section id="referral" className="s-section s-band" aria-labelledby="p-ref">
        <div className="s-wrap s-split">
          <div className="s-split-copy">
            <SectionHead eyebrow="Referral" title="Give a month, get a month." id="p-ref">
              <p className="s-body-lg">Share your link with another family. When they start a paid plan, you each get a free month, up to 12 months a year.</p>
              <p className="s-body">Three paid referrals also earn the printed reader set. Families who pay with ESA funds earn the reader set instead of month credit.</p>
              <MoreLink href="/app/referrals?as=parent">See your referral link</MoreLink>
            </SectionHead>
          </div>
          <div className="s-split-art" data-reveal="">
            <figure className="s-refcard glass glass-strong glass-lg" aria-label="A referral link with three invites, one paid">
              <p className="s-card-kicker">Your link</p>
              <div className="s-referral-code">
                <span className="num">HARPER-8K2F</span>
                <span>Copy link</span>
              </div>
              <ul className="s-ref-list">
                <li>
                  <span>The Mitchells</span>
                  <span className="pill pill-mastered">Paid · +1 month</span>
                </li>
                <li>
                  <span>Sarah Okafor</span>
                  <span className="pill">Joined</span>
                </li>
                <li>
                  <span>Ben and Ann</span>
                  <span className="pill pill-outline">Invited</span>
                </li>
              </ul>
              <div className="s-ref-meter">
                <span>
                  <b className="num">1</b> of 12 months earned this year
                </span>
                <span className="s-ref-bar" aria-hidden="true">
                  <i style={{ width: `${(1 / 12) * 100}%` }} />
                </span>
              </div>
            </figure>
          </div>
        </div>
      </section>

      <section id="faq" className="s-section" aria-labelledby="p-faq">
        <div className="s-wrap s-faq-wrap">
          <SectionHead eyebrow="Questions" title="Questions parents ask" id="p-faq" />
          <Faq items={FAQ} />
        </div>
      </section>

      <ClosingCTA band title="Start with placement." body="Placement takes about ten minutes. When it’s done, the first lesson is ready to print.">
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
