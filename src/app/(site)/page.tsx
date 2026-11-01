import Link from "next/link";
import { Illustration } from "@/components/Illustration";
import { IconArrowRight } from "@/components/icons";
import { heroFrames, illustration } from "@/lib/illustrations";
import { ClosingCTA, FableGallery, MoreLink, SectionHead } from "@/components/site/blocks";
import { HeroScrub } from "@/components/site/HeroScrub";
import { LadderFeature } from "@/components/site/LadderFeature";
import { RolesExplorer } from "@/components/site/RolesExplorer";
import { MiniLine, MiniPaper, MiniScreen } from "@/components/site/depictions/LessonFlow";
import { ParentReport } from "@/components/site/depictions/ParentReport";
import { PrintPacket } from "@/components/site/depictions/PrintPacket";
import { MicPill, ReadingCheck } from "@/components/site/depictions/ReadingCheck";
import { SAMPLE } from "@/components/site/depictions/sample";

export default function Home() {
  const still = illustration("hero")!;
  const motion = illustration("hero-motion");

  return (
    <>
      <HeroScrub
        frames={heroFrames()}
        still={{ src: still.src, alt: still.alt, width: still.width, height: still.height }}
        videoSrc={motion?.src ?? null}
        // The camera pushes in until the mother's head sits near the top of the frame.
        // Crop from the bottom (grass and bench legs) so her head is never under the nav.
        focusY={0.18}
        intro={
          <div className="s-hero-intro-inner">
            <h1 id="s-hero-title" className="s-hero-title">
              Reading, taught the way it always worked.
            </h1>
            <p className="s-hero-sub">Phonics first. One child at a time. On paper.</p>
            <div className="s-hero-cta glass glass-lg">
              <Link href="/app/onboarding" className="btn btn-primary btn-lg">
                Begin placement
              </Link>
              <a href="#lesson" className="btn btn-ghost btn-lg s-hero-cta-2">
                See a lesson
              </a>
            </div>
          </div>
        }
        outro={
          <div className="s-hero-outro-inner">
            <p className="s-hero-payoff">Now the page listens.</p>
            <p className="s-hero-sub">Your child reads aloud. Mrs. Wren hears every word.</p>
            <MicPill label="Listening" />
          </div>
        }
      />

      {/* (a) Thesis */}
      <section className="s-section s-thesis" aria-label="What Heritage Readers is">
        <div className="s-wrap">
          <p className="s-statement" data-reveal="">
            <span>Heritage Readers teaches children to read the classical way.</span>{" "}
            <span className="s-statement-quiet">
              Sounds before words. Words before stories. Each step mastered before the next, and a tutor who listens while your child reads aloud.
            </span>
          </p>
          <dl className="s-specs" data-reveal="">
            <div>
              <dt>Rungs, from short a to <span className="s-nowrap">two-syllable</span> words</dt>
              <dd className="num">40</dd>
            </div>
            <div>
              <dt>Minutes on paper, with a grown-up</dt>
              <dd className="num">12</dd>
            </div>
            <div>
              <dt>Minutes on screen, reading aloud</dt>
              <dd className="num">3</dd>
            </div>
            <div>
              <dt>Words on screen beyond your child’s rung</dt>
              <dd className="num">0</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* (b) How a lesson works */}
      <section id="lesson" className="s-section s-band" aria-labelledby="s-lesson-title">
        <div className="s-wrap">
          <SectionHead eyebrow="How a lesson works" title="Fifteen minutes. Mostly on paper." id="s-lesson-title" center>
            <p className="s-lede">Every lesson has three parts, in the same order, every day.</p>
          </SectionHead>
          <ol className="s-steps">
            <li className="s-step" data-reveal="">
              <MiniPaper />
              <p className="s-step-num">
                <span className="num">12</span> min · On paper
              </p>
              <h3 className="s-h3">With you, at the table.</h3>
              <p className="s-body">Print the lesson. A script tells you what to say, what your child reads, and what to do after a missed word.</p>
            </li>
            <li className="s-step" data-reveal="">
              <MiniScreen />
              <p className="s-step-num">
                <span className="num">3</span> min · On screen
              </p>
              <h3 className="s-h3">Reading aloud to Mrs. Wren.</h3>
              <p className="s-body">Your child reads one short passage. Mrs. Wren listens word by word and marks any word to review.</p>
            </li>
            <li className="s-step" data-reveal="">
              <MiniLine />
              <p className="s-step-num">
                <span className="num">1</span> line · To you
              </p>
              <h3 className="s-h3">What happened, in one sentence.</h3>
              <p className="s-body">After every lesson: what was read, how it went, and what comes next.</p>
            </li>
          </ol>
        </div>
      </section>

      {/* (c) The ladder */}
      <section className="s-section" aria-labelledby="s-ladder-title">
        <div className="s-wrap s-split">
          <div className="s-split-copy">
            <SectionHead eyebrow="The ladder" title={<>From short a to <span className="s-nowrap">two-syllable</span> words.</>} id="s-ladder-title">
              <p className="s-body-lg">
                This is the vowel ladder from Hay &amp; Wingo’s <cite>Reading with Phonics</cite> (1946). Your child starts at the blue dot and reads up: ha, he, hi, ho, hu. Then the whole words: hat, hen, him, hot, hum.
              </p>
              <p className="s-body-lg">Heritage Readers follows the ladder across 40 rungs: short vowels, consonants, blends, digraphs, silent e, vowel teams, r-controlled vowels, endings, and two-syllable words.</p>
              <MoreLink href="/method#ladder">See all 40 rungs</MoreLink>
            </SectionHead>
          </div>
          <div className="s-split-art" data-reveal="">
            <LadderFeature />
          </div>
        </div>
      </section>

      {/* (d) It listens */}
      <section className="s-section s-band s-listens" aria-labelledby="s-listen-title">
        <div className="s-wrap">
          <SectionHead eyebrow="The reading check" title="It listens to every word." id="s-listen-title" center>
            <p className="s-lede">
              Your child reads the passage aloud. The underline follows along, word by word. A word that needs practice is marked in ochre for review.
            </p>
          </SectionHead>
          <div className="s-listens-stage" data-reveal="">
            <div className="s-listens-art" aria-hidden="true">
              <Illustration id="hearth-reading" alt="" sizes="(min-width: 1080px) 1100px, 100vw" />
            </div>
            <ReadingCheck />
          </div>
          <div className="s-never" data-reveal="">
            <p className="s-never-title">
              Mrs. Wren never says “wrong.”
            </p>
            <p className="s-body-lg">She says the word, reads it with your child, and asks for it once more. Then the lesson goes on.</p>
            <p className="s-wren-quote">
              <span className="s-wren-name">Mrs. Wren</span> That word is hid. Read it with me: hid.
            </p>
          </div>
        </div>
      </section>

      {/* (e) The stories */}
      <section className="s-section" aria-labelledby="s-stories-title">
        <div className="s-wrap">
          <SectionHead eyebrow="The stories" title="Old stories, in words your child can read." id="s-stories-title">
            <p className="s-body-lg">Aesop’s fables and the old tales, retold for each rung and drawn in the manner of the 1879 McGuffey Readers. Each story ends with its moral.</p>
          </SectionHead>
        </div>
        <div className="s-wrap s-fables-wrap" data-reveal="">
          <FableGallery />
        </div>
      </section>

      {/* (f) Paper first */}
      <section className="s-section s-band" aria-labelledby="s-paper-title">
        <div className="s-wrap">
          <SectionHead eyebrow="Paper first" title="Every lesson prints." id="s-paper-title" center>
            <p className="s-lede">The teacher page, the student page and the score sheet come from the same lesson. Twelve minutes at the table, then three on screen.</p>
          </SectionHead>
          <div data-reveal="">
            <PrintPacket />
          </div>
          <div className="s-minutes" data-reveal="">
            <p className="s-minutes-title">This week</p>
            <div className="s-minutes-row">
              <span className="s-minutes-label">On paper</span>
              <span className="s-minutes-bar" style={{ ["--v" as string]: SAMPLE.paperMinutes / 40 }}>
                <i data-kind="paper" />
              </span>
              <span className="s-minutes-val num">{SAMPLE.paperMinutes} min</span>
            </div>
            <div className="s-minutes-row">
              <span className="s-minutes-label">On screen</span>
              <span className="s-minutes-bar" style={{ ["--v" as string]: SAMPLE.screenMinutes / 40 }}>
                <i data-kind="screen" />
              </span>
              <span className="s-minutes-val num">{SAMPLE.screenMinutes} min</span>
            </div>
            <p className="s-minutes-note">Screen minutes next to paper minutes, in every weekly report. You set the daily screen limit for each child.</p>
          </div>
        </div>
      </section>

      {/* (g) Proof for parents */}
      <section className="s-section" aria-labelledby="s-proof-title">
        <div className="s-wrap s-split s-split-flip">
          <div className="s-split-copy">
            <SectionHead eyebrow="For parents" title="Progress you can measure, and hear." id="s-proof-title">
              <p className="s-body-lg">Three numbers every week: rungs mastered, the rung your child reads at, and words correct per minute.</p>
              <p className="s-body-lg">And the same passage, recorded in week 1 and week 8, so you can hear the difference.</p>
              <MoreLink href="/app/report?as=parent">See the parent report</MoreLink>
            </SectionHead>
          </div>
          <div className="s-split-art s-proof-art" data-reveal="">
            <div className="s-proof-engraving" aria-hidden="true">
              <Illustration id="family-table" alt="" sizes="(min-width: 1080px) 640px, 100vw" />
            </div>
            <ParentReport />
            <p className="s-sample-note">Sample report</p>
          </div>
        </div>
      </section>

      {/* (h) Schools and co-ops */}
      <section className="s-section s-band" aria-labelledby="s-schools-title">
        <div className="s-wrap">
          <SectionHead eyebrow="For schools and co-ops" title="Every child on the right rung." id="s-schools-title" center>
            <p className="s-lede">Seven roles, from owner to observer. A mastery board for every class. Packets printed by rung. Paper scores entered in seconds.</p>
          </SectionHead>
          <div data-reveal="">
            <RolesExplorer />
          </div>
          <div className="s-center-link">
            <MoreLink href="/schools">Heritage Readers for schools</MoreLink>
          </div>
        </div>
      </section>

      {/* (i) Susan */}
      <section className="s-section" aria-labelledby="s-susan-title">
        <div className="s-wrap s-split">
          <div className="s-split-art s-susan-art" data-reveal="">
            <Illustration id="schoolroom" sizes="(min-width: 1080px) 600px, 100vw" />
          </div>
          <div className="s-split-copy">
            <SectionHead eyebrow="The educator" title="Built on the methods of Susan Weaver, M.A." id="s-susan-title">
              <p className="s-body-lg">
                Susan Weaver has taught for 42 years, including as a Master Teacher at Biola University. She holds a Master of Arts in Early Reading and educated all six of her children from early childhood through high school.
              </p>
              <p className="s-body-lg">
                Her methods build on Hay &amp; Wingo’s <cite>Reading with Phonics</cite> and the McGuffey Readers. Heritage Readers is built on her methods.
              </p>
            </SectionHead>
            <dl className="s-facts">
              <div>
                <dd className="num">42</dd>
                <dt>Years of teaching</dt>
              </div>
              <div>
                <dd className="num">6</dd>
                <dt>Children taught, early childhood through high school</dt>
              </div>
              <div>
                <dd>M.A.</dd>
                <dt>Early Reading</dt>
              </div>
            </dl>
            <MoreLink href="/susan">About Susan</MoreLink>
          </div>
        </div>
      </section>

      {/* (j) Pricing */}
      <section className="s-section s-band" aria-labelledby="s-price-title">
        <div className="s-wrap">
          <div className="s-pricing-teaser">
            <div className="s-pricing-main" data-reveal="">
              <p className="s-eyebrow">Pricing</p>
              <h2 className="s-h2" id="s-price-title">
                One price for the whole family.
              </h2>
              <p className="s-price-line">
                <span className="s-price-big num">$39</span>
                <span className="s-price-unit">a month</span>
              </p>
              <p className="s-body-lg">Or $399 a year. Every child in the household. Printable lessons, the reading check, the parent report and Mrs. Wren.</p>
              <div className="s-actions">
                <Link href="/app/onboarding" className="btn btn-primary btn-lg">
                  Begin placement
                </Link>
                <MoreLink href="/pricing">See all plans</MoreLink>
              </div>
            </div>
            <aside className="s-referral glass glass-lg" data-reveal="" aria-labelledby="s-ref-title">
              <p className="s-card-kicker">Referral</p>
              <p className="s-referral-title" id="s-ref-title">
                Give a month, get a month.
              </p>
              <p className="s-body">Share your link. When a family you invite starts a paid plan, you each get a month free. Up to 12 months a year.</p>
              <div className="s-referral-code">
                <span className="num">HARPER-8K2F</span>
                <span>Copy link</span>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* (k) Close */}
      <ClosingCTA title="Begin with placement." body="About ten minutes. Your child reads letters, sounds and words aloud, and Heritage Readers finds the right rung to start on.">
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

