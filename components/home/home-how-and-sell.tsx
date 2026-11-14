import Link from 'next/link';
import { BookOpen, Scissors, ShoppingBag, Sparkles } from 'lucide-react';
import { COMPANY_INFO } from '@/lib/company-info';
import { TiltCard } from '@/components/motion/tilt-card';
import { Reveal } from '@/components/motion/reveal';

const STEPS = [
  {
    icon: BookOpen,
    title: 'Find a pattern',
    body: 'Browse PDF patterns from independent designers. Your purchase goes straight to the person who made it.',
  },
  {
    icon: ShoppingBag,
    title: 'Download instantly',
    body: 'Your pattern arrives by email right away. Print at home or send it to a copy shop.',
  },
  {
    icon: Scissors,
    title: 'Choose your fabric',
    body: 'Many patterns list the yardage they need, so you can add the right amount of curated deadstock fabric to the same order.',
  },
];

export function HomeHowItWorks() {
  return (
    <section aria-labelledby="home-how" className="border-b bg-muted/30 overflow-hidden">
      <div className="container mx-auto max-w-7xl px-4 py-14">
        <h2 id="home-how" className="text-2xl sm:text-3xl font-bold mb-10">
          How it works
        </h2>
        <div className="relative">
          {/* Running stitch joining the steps (shows in the gaps between cards) */}
          <div
            aria-hidden
            className="stitch-line absolute left-0 right-0 top-[52px] hidden h-[2px] sm:block"
          />
          <ol className="relative grid gap-6 sm:grid-cols-3 sm:gap-10">
            {STEPS.map((step, i) => (
              <li key={step.title} className="relative z-10">
                <Reveal delay={i * 140} className="h-full [transform-style:preserve-3d]">
                  <TiltCard maxTilt={9} className="h-full rounded-2xl">
                    <div className="absolute inset-0 rounded-2xl border bg-background shadow-sm transition-shadow duration-300 group-hover/tilt:shadow-xl" />
                    <div className="relative h-full p-6 [transform-style:preserve-3d]">
                      <span
                        aria-hidden
                        className="absolute right-5 top-3 select-none text-6xl font-bold leading-none text-rose-100 [transform:translateZ(10px)] dark:text-rose-950"
                      >
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-500 shadow-sm [transform:translateZ(45px)] dark:bg-rose-950 dark:text-rose-300">
                        <step.icon className="h-6 w-6" />
                      </div>
                      <div className="space-y-2 [transform:translateZ(25px)]">
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Step {i + 1}
                        </p>
                        <h3 className="text-lg font-semibold">{step.title}</h3>
                        <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                      </div>
                    </div>
                  </TiltCard>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

export function HomeSellCta() {
  const { fees } = COMPANY_INFO;
  return (
    <section aria-labelledby="home-sell">
      <div className="container mx-auto max-w-7xl px-4 py-12">
        <div className="rounded-3xl border bg-gradient-to-br from-rose-50 via-background to-background p-8 sm:p-10 dark:from-rose-950/30">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-center">
            <div className="space-y-4">
              <p className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1 text-xs font-medium">
                <Sparkles className="h-3.5 w-3.5 text-rose-400" /> For pattern designers
              </p>
              <h2 id="home-sell" className="text-2xl sm:text-3xl font-bold">
                Sell your patterns here, and keep what you earn
              </h2>
              <p className="text-muted-foreground">
                Put your patterns in front of sewists who are ready to make them. List PDFs in
                minutes, keep selling everywhere else, and keep full ownership of your work.
              </p>
              <Link
                href="/marketplace/sell"
                className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
              >
                Start selling
              </Link>
            </div>
            <ul className="space-y-3 text-sm">
              <li className="rounded-xl border bg-background p-4">
                <strong>No listing fees, no ad fees.</strong> List as many patterns as you like.
              </li>
              <li className="rounded-xl border bg-background p-4">
                <strong>Your first {fees.freeSalesCount} sales are platform-fee free.</strong>
              </li>
              <li className="rounded-xl border bg-background p-4">
                <strong>Human-made only.</strong> AI-generated patterns aren&apos;t allowed, and we
                review listings, so your work isn&apos;t buried under them.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
