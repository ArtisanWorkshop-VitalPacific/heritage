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
              A phonics tutor for children ages 4 to 8.
            </h1>
            <p className="s-hero-sub">
              Fifteen-minute lessons based on <cite>Reading with Phonics</cite> (1946), taught from a printed page at your table.
            </p>
            <div className="s-hero-cta glass glass-lg">
              <Link href="/app/onboarding" className="btn btn-primary btn-lg">
                Start placement
              </Link>
              <a href="#lesson" className="btn btn-ghost btn-lg s-hero-cta-2">
                How a lesson works
              </a>
            </div>
          </div>
        }
        outro={
          <div className="s-hero-outro-inner">
            <p className="s-hero-payoff">Then your child reads the story to Mrs. Wren.</p>
            <p className="s-hero-sub">She follows each word on screen and notes the ones that need another try.</p>
            <MicPill label="Listening" />
          </div>
        }
      />

      {/* (a) Thesis */}
      <section className="s-section s-thesis" aria-label="What Heritage Readers is">
        <div className="s-wrap">
          <p className="s-statement" data-reveal="">
            <span>Heritage Readers teaches reading the way Susan Weaver has taught it for 42 years.</span>{" "}
            <span className="s-statement-quiet">
              Children learn the letter sounds first, then words made from those sounds, then short stories that use only what they have learned. A child moves up after reading a step correctly twice.
            </span>
          </p>
          <dl className="s-specs" data-reveal="">
            <div>
              <dt>Rungs, from short a to <span className="s-nowrap">two-syllable</span> words</dt>
              <dd className="num">40</dd>
            </div>
            <div>
              <dt>Minutes at the table with a parent</dt>
              <dd className="num">12</dd>
            </div>
            <div>
              <dt>Minutes on screen, reading aloud</dt>
              <dd className="num">3</dd>
            </div>
            <div>
              <dt>Words shown that your child hasn’t been taught</dt>
              <dd className="num">0</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* (b) How a lesson works */}
      <section id="lesson" className="s-section s-band" aria-labelledby="s-lesson-title">
        <div className="s-wrap">
          <SectionHead eyebrow="How a lesson works" title="Most of the lesson happens at the table." id="s-lesson-title" center>
            <p className="s-lede">A lesson takes about fifteen minutes, and it runs in the same order each day so your child knows what comes next.</p>
          </SectionHead>
          <ol className="s-steps">
            <li className="s-step" data-reveal="">
              <MiniPaper />
              <p className="s-step-num">
                <span className="num">12</span> min · On paper
              </p>
              <h3 className="s-h3">You teach from a printed page.</h3>
              <p className="s-body">The script tells you what to say and which words your child reads. If a word is missed, it shows you how to correct it.</p>
            </li>
            <li className="s-step" data-reveal="">
              <MiniScreen />
              <p className="s-step-num">
                <span className="num">3</span> min · On screen
              </p>
              <h3 className="s-h3">Mrs. Wren listens to the story.</h3>
              <p className="s-body">Your child reads one short story out loud. She follows each word and keeps a list of the ones to practice again.</p>
            </li>
            <li className="s-step" data-reveal="">
              <MiniLine />
              <p className="s-step-num">
                <span className="num">1</span> line · To you
              </p>
              <h3 className="s-h3">You get a short note.</h3>
              <p className="s-body">After each lesson you get one line telling you how the reading went and which lesson is next.</p>
            </li>
          </ol>
        </div>
      </section>

      {/* (c) The ladder */}
      <section className="s-section" aria-labelledby="s-ladder-title">
        <div className="s-wrap s-split">
          <div className="s-split-copy">
            <SectionHead eyebrow="The ladder" title="The vowel ladder from Reading with Phonics" id="s-ladder-title">
              <p className="s-body-lg">
                Julie Hay and Charles Wingo published <cite>Reading with Phonics</cite> in 1946. On their vowel ladder, a child starts at the blue dot, reads the sounds up the left side, and then reads the whole words on the right. Tap a word to hear it.
              </p>
              <p className="s-body-lg">Heritage Readers follows the book’s order over 40 rungs, starting with the short vowels and ending with two-syllable words.</p>
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
          <SectionHead eyebrow="The reading check" title="A line follows each word as your child reads." id="s-listen-title" center>
            <p className="s-lede">
              Mrs. Wren listens through the microphone. When a word needs more practice, it is underlined in ochre and comes back in the next review.
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
              Mrs. Wren doesn’t say “wrong.”
            </p>
            <p className="s-body-lg">When your child misses a word, she says it, reads it with your child, and asks for it again before going on.</p>
            <p className="s-wren-quote">
              <span className="s-wren-name">Mrs. Wren</span> That word is hid. Read it with me: hid.
            </p>
          </div>
        </div>
      </section>

      {/* (e) The stories */}
      <section className="s-section" aria-labelledby="s-stories-title">
        <div className="s-wrap">
          <SectionHead eyebrow="The stories" title="Aesop’s fables, retold for new readers" id="s-stories-title">
            <p className="s-body-lg">We retell Aesop’s fables and other old stories using only the sounds a child has learned. The pictures are drawn in the style of the 1879 McGuffey Readers, and each story ends with its moral.</p>
          </SectionHead>
        </div>
        <div className="s-wrap s-fables-wrap" data-reveal="">
          <FableGallery />
        </div>
      </section>

      {/* (f) Paper first */}
      <section className="s-section s-band" aria-labelledby="s-paper-title">
        <div className="s-wrap">
          <SectionHead eyebrow="Paper first" title="Each lesson prints on three pages." id="s-paper-title" center>
            <p className="s-lede">You get a teacher page with the script, a student page for your child, and a score sheet for marking each word. The code on the score sheet opens the reading check on screen.</p>
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
            <p className="s-minutes-note">Each weekly report shows minutes on paper next to minutes on screen. You set a daily screen limit for each child.</p>
          </div>
        </div>
      </section>

      {/* (g) Proof for parents */}
      <section className="s-section" aria-labelledby="s-proof-title">
        <div className="s-wrap s-split s-split-flip">
          <div className="s-split-copy">
            <SectionHead eyebrow="For parents" title="What the weekly report shows" id="s-proof-title">
              <p className="s-body-lg">The report shows how many rungs your child has mastered, the rung they are reading at now, and how many words they read correctly per minute, compared with published norms for their grade.</p>
              <p className="s-body-lg">It also keeps a recording of the same story from the first week and the eighth, so you can hear how the reading has changed.</p>
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
          <SectionHead eyebrow="For schools and co-ops" title="Teachers see the whole class at once." id="s-schools-title" center>
            <p className="s-lede">The mastery board shows where each child is on the ladder. Teachers print lessons for each group and enter scores from the paper sheets. A school account has seven roles, from owner to observer.</p>
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
            <SectionHead eyebrow="The educator" title="Based on the teaching of Susan Weaver, M.A." id="s-susan-title">
              <p className="s-body-lg">
                Susan Weaver has taught for 42 years, including as a Master Teacher at Biola University. She holds a Master of Arts in Early Reading and educated all six of her children from early childhood through high school.
              </p>
              <p className="s-body-lg">
                Her teaching draws on Hay and Wingo’s <cite>Reading with Phonics</cite> and the McGuffey Readers, and Heritage Readers follows the way she structures a lesson.
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
                One plan covers your whole family.
              </h2>
              <p className="s-price-line">
                <span className="s-price-big num">$39</span>
                <span className="s-price-unit">a month</span>
              </p>
              <p className="s-body-lg">Or $399 a year, for every child in your household. The plan includes the printable lessons, the reading check, the weekly report and Mrs. Wren.</p>
              <div className="s-actions">
                <Link href="/app/onboarding" className="btn btn-primary btn-lg">
                  Start placement
                </Link>
                <MoreLink href="/pricing">See all plans</MoreLink>
              </div>
            </div>
            <aside className="s-referral glass glass-lg" data-reveal="" aria-labelledby="s-ref-title">
              <p className="s-card-kicker">Referral</p>
              <p className="s-referral-title" id="s-ref-title">
                Give a month, get a month.
              </p>
              <p className="s-body">Share your link with another family. When they start a paid plan, you each get a free month, up to 12 months a year.</p>
              <div className="s-referral-code">
                <span className="num">HARPER-8K2F</span>
                <span>Copy link</span>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* (k) Close */}
      <ClosingCTA title="Start with a ten-minute placement." body="Your child reads some letter sounds, a few words and a short story aloud, and Heritage Readers picks the rung to start on.">
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

