import {
  Check,
  ClipboardList,
  FileText,
  MessageCircle,
} from 'lucide-react'
import Link from 'next/link'
import { FaqAccordion } from '@/components/marketing/faq-accordion'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const STEPS = [
  {
    number: '01',
    title: 'Message arrives',
    description:
      'A patient writes to the clinic on WhatsApp. The message is received and stored for review.',
  },
  {
    number: '02',
    title: 'AI drafts a reply',
    description:
      'The assistant proposes an answer grounded in the clinic FAQ, never inventing prices or medical advice.',
  },
  {
    number: '03',
    title: 'Admin reviews',
    description:
      'A staff member approves, edits, or rejects every draft. Nothing is sent without an explicit decision.',
  },
  {
    number: '04',
    title: 'Patient receives the reply',
    description:
      'Only the approved response reaches WhatsApp. Human judgment stays in the loop, every time.',
  },
] as const

const WHY_POINTS = [
  {
    title: 'Human review, every time',
    description:
      'No AI reply reaches a patient without an explicit approve, edit, or reject decision.',
    icon: Check,
  },
  {
    title: 'Grounded in real content',
    description:
      'Answers come from the clinic’s actual FAQ, not general AI knowledge, and the assistant says “I don’t know” rather than guessing.',
    icon: FileText,
  },
  {
    title: 'Real WhatsApp, not a mock chat',
    description:
      'Messages flow through an actual WhatsApp number via Twilio.',
    icon: MessageCircle,
  },
  {
    title: 'Full audit trail',
    description:
      'Every approved, edited, or rejected message is logged.',
    icon: ClipboardList,
  },
] as const

export default function HomePage() {
  return (
    <div className="min-h-full flex-1 bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-6 px-6 py-6">
          <span className="font-display text-xl font-medium italic">
            Respondly
          </span>
          <nav
            aria-label="Landing page navigation"
            className="hidden items-center gap-9 md:flex"
          >
            <a
              href="#how-it-works"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              How it works
            </a>
            <a
              href="#why"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Why Respondly
            </a>
            <a
              href="#faq"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              FAQ
            </a>
          </nav>
          <Link
            href="/login"
            className="text-sm font-medium transition-colors hover:text-primary"
          >
            Admin login
          </Link>
        </div>
      </header>

      <main>
        <section
          id="how-it-works"
          className="relative isolate flex min-h-[calc(100svh-73px)] scroll-mt-6 items-center overflow-hidden py-24 lg:py-32"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 mx-auto hidden w-full max-w-[1180px] grid-cols-[0.85fr_1.15fr] gap-16 px-6 md:grid"
          >
            <div className="relative">
              <img
                src="/images/hero-planner.jpg"
                alt=""
                width={1440}
                height={900}
                loading="lazy"
                decoding="async"
                className="absolute right-0 top-1/2 h-[85%] w-[85vw] max-w-none -translate-y-1/2 object-cover object-center opacity-20 [-webkit-mask-image:radial-gradient(ellipse_33%_75%_at_67%_center,black_40%,transparent_100%)] [mask-image:radial-gradient(ellipse_33%_75%_at_67%_center,black_40%,transparent_100%)]"
              />
            </div>
          </div>

          <div className="relative z-10 mx-auto grid w-full max-w-[1180px] gap-16 px-6 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="flex flex-col items-start gap-[22px] pt-2">
              <h1 className="font-display text-5xl font-medium italic leading-[1.05] text-primary sm:text-[56px]">
                Lumin Aesthetic Clinic
              </h1>
              <p className="max-w-[34ch] text-[17px] leading-relaxed text-muted-foreground">
                WhatsApp patient messages, answered with AI-drafted replies
                your team reviews before anything goes out. Human-in-the-loop,
                every time.
              </p>
              <Link
                href="/login"
                className={cn(
                  buttonVariants({ size: 'lg' }),
                  'mt-1.5 h-auto rounded-[10px] px-[26px] py-3 text-[15px] font-semibold'
                )}
              >
                Admin login
              </Link>
            </div>

            <ol className="grid gap-5 sm:grid-cols-2">
              {STEPS.map((step) => (
                <li
                  key={step.title}
                  className="flex flex-col gap-2.5 rounded-2xl border border-border bg-card px-6 py-7"
                >
                  <span className="text-[13px] font-semibold tracking-[0.04em] text-primary">
                    {step.number}
                  </span>
                  <h2 className="text-[17px] font-semibold">{step.title}</h2>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section
          id="why"
          className="scroll-mt-6 bg-[oklch(0.24_0.035_25)] px-6 py-[100px]"
        >
          <div className="mx-auto max-w-[1180px]">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[oklch(0.78_0.03_30)]">
              Why Respondly
            </span>
            <h2 className="mt-5 max-w-[18ch] font-display text-4xl font-medium leading-[1.15] text-primary-foreground sm:text-[42px]">
              Automated where it helps.{' '}
              <em className="font-medium">Human where it matters.</em>
            </h2>
            <div className="mt-14 grid gap-9 sm:grid-cols-2 lg:grid-cols-4">
              {WHY_POINTS.map((point) => {
                const Icon = point.icon

                return (
                  <article key={point.title} className="flex flex-col gap-4">
                    <div className="flex size-11 items-center justify-center rounded-full bg-primary/15">
                      <Icon
                        aria-hidden
                        className="size-5 text-primary"
                        strokeWidth={1.8}
                      />
                    </div>
                    <h3 className="text-base font-semibold text-primary-foreground">
                      {point.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-[oklch(0.78_0.025_30)]">
                      {point.description}
                    </p>
                    <span aria-hidden className="h-0.5 w-7 bg-primary/50" />
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        <section
          id="faq"
          className="mx-auto max-w-[860px] scroll-mt-6 px-6 py-[100px]"
        >
          <span className="text-xs font-semibold uppercase tracking-[0.08em] text-primary">
            Frequently asked
          </span>
          <h2 className="mb-10 mt-[18px] font-display text-4xl font-semibold">
            Common questions.
          </h2>
          <FaqAccordion />
        </section>

        <section className="bg-[linear-gradient(135deg,var(--primary)_0%,oklch(0.86_0.03_60)_55%,var(--background)_100%)] px-6 py-[120px] text-center">
          <div className="mx-auto flex max-w-[640px] flex-col items-center gap-[22px]">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-primary-foreground/85">
              Your next reply
            </span>
            <h2 className="font-display text-4xl font-medium italic leading-tight text-primary-foreground sm:text-[42px]">
              AI that drafts.
              <br />
              Humans who decide.
            </h2>
            <p className="max-w-[40ch] text-base leading-relaxed text-primary-foreground/90">
              See the full patient-message workflow, from WhatsApp to admin
              review, built for Lumin Aesthetic Clinic.
            </p>
            <div className="mt-2.5 flex flex-wrap justify-center gap-3.5">
              <Link
                href="/login"
                className="rounded-[10px] bg-foreground px-[26px] py-3 text-[15px] font-semibold text-background transition-colors hover:bg-foreground/80"
              >
                Admin login
              </Link>
              <a
                href="#how-it-works"
                className="rounded-[10px] border border-primary-foreground/70 px-[26px] py-3 text-[15px] font-semibold text-primary-foreground transition-colors hover:bg-primary-foreground/10"
              >
                See how it works
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-6 py-7">
        <p className="mx-auto max-w-[1180px] text-[13px] text-muted-foreground">
          Respondly for Lumin Aesthetic Clinic
        </p>
      </footer>
    </div>
  )
}
