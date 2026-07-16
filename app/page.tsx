import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const STEPS = [
  {
    title: 'Message arrives',
    description:
      'A patient writes to the clinic on WhatsApp. The message is received and stored for review.',
  },
  {
    title: 'AI drafts a reply',
    description:
      'The assistant proposes an answer grounded in the clinic FAQ, never inventing prices or medical advice.',
  },
  {
    title: 'Admin reviews',
    description:
      'A staff member approves, edits, or rejects every draft. Nothing is sent without an explicit decision.',
  },
  {
    title: 'Patient receives the reply',
    description:
      'Only the approved response reaches WhatsApp. Human judgment stays in the loop, every time.',
  },
] as const

export default function HomePage() {
  return (
    <div className="relative flex min-h-full flex-1 flex-col overflow-hidden bg-background">
      <img
        src="/images/hero-planner.jpg"
        alt=""
        aria-hidden
        width={672}
        height={840}
        loading="lazy"
        decoding="async"
        className="pointer-events-none absolute left-0 top-28 z-0 hidden h-auto w-[36rem] object-cover opacity-20 [-webkit-mask-image:radial-gradient(ellipse_70%_70%_at_center,black_40%,transparent_100%)] [mask-image:radial-gradient(ellipse_70%_70%_at_center,black_40%,transparent_100%)] md:block lg:w-[42rem]"
      />
      <main className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-16 sm:py-24">
        <section className="ml-[100px] flex flex-col items-start gap-6">
          <h1 className="font-display text-4xl italic leading-tight text-foreground sm:text-5xl">
            Lumin Aesthetic Clinic
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            WhatsApp patient messages, answered with AI drafts your team
            reviews before anything goes out. Human-in-the-loop, every time.
          </p>
          <Link
            href="/login"
            className={cn(buttonVariants({ size: 'lg' }), 'mt-2')}
          >
            Admin login
          </Link>
        </section>

        <section className="ml-[100px] mt-20 flex flex-col gap-8 sm:mt-28">
          <h2 className="font-display text-2xl italic">How it works</h2>
          <ol className="flex flex-col gap-6">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-4">
                <span
                  aria-hidden
                  className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-medium text-primary"
                >
                  {index + 1}
                </span>
                <div className="flex flex-col gap-1">
                  <p className="font-medium text-foreground">{step.title}</p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <footer className="border-t border-border px-6 py-6">
        <p className="mx-auto max-w-3xl text-sm text-muted-foreground">
          Lumin Aesthetic Clinic
        </p>
      </footer>
    </div>
  )
}
