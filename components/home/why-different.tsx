import { Award, HandHeart, PenTool, Scissors } from 'lucide-react';
import { TiltCard } from '@/components/motion/tilt-card';
import { Reveal } from '@/components/motion/reveal';

const POINTS = [
  {
    icon: HandHeart,
    title: 'Designers come first',
    body: 'No listing fees. Designers keep the rights to their work and sell anywhere else too.',
    chip: 'bg-rose-100 text-rose-500 dark:bg-rose-950 dark:text-rose-300',
  },
  {
    icon: PenTool,
    title: 'Human-made only',
    body: 'AI-generated patterns aren’t allowed. We review listings and act on reports.',
    chip: 'bg-violet-100 text-violet-500 dark:bg-violet-950 dark:text-violet-300',
  },
  {
    icon: Award,
    title: 'Points for fabric',
    body: 'Every pattern you buy earns points toward fabric.',
    chip: 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-300',
  },
  {
    icon: Scissors,
    title: 'Curated deadstock',
    body: 'Hand-picked fabric in limited yardage, in the same checkout.',
    chip: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300',
  },
];

/** Hero panel: tilts toward the mouse; tiles float above it at different depths. */
export function WhyDifferent() {
  return (
    <div className="relative">
      <div className="absolute inset-0 -translate-x-6 rounded-3xl bg-gradient-to-br from-rose-500/20 via-rose-400/15 to-amber-300/20 blur-3xl" />
      <TiltCard maxTilt={7} idle className="rounded-3xl">
        {/* Flat background layer (blur/overflow would flatten the 3D children) */}
        <div className="pattern-paper absolute inset-0 rounded-3xl border bg-background/85 shadow-xl backdrop-blur" />
        <div className="relative p-6 [transform-style:preserve-3d]">
          <p className="mb-5 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground [transform:translateZ(20px)]">
            Why it&apos;s different
          </p>
          <div className="grid grid-cols-2 gap-3 [transform-style:preserve-3d]">
            {POINTS.map((p, i) => (
              <Reveal key={p.title} delay={150 + i * 90} className="[transform-style:preserve-3d]">
                <div className="h-full [transform:translateZ(30px)]">
                  <div className="group/tile relative h-full rounded-2xl bg-background/95 p-4 shadow-sm ring-1 ring-border/60 transition duration-300 hover:-translate-y-1 hover:shadow-md dark:bg-muted">
                    {/* stitching that appears on hover */}
                    <div className="pointer-events-none absolute inset-1.5 rounded-xl border border-dashed border-transparent transition-colors duration-300 group-hover/tile:border-rose-300" />
                    <div
                      className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl ${p.chip}`}
                    >
                      <p.icon className="h-[18px] w-[18px]" />
                    </div>
                    <p className="text-sm font-semibold">{p.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{p.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
        {/* Woven-label tag floating above the corner (strongest parallax) */}
        <div className="pointer-events-none absolute -right-3 -top-4 [transform:translateZ(70px)_rotate(6deg)]">
          <div className="rounded-md bg-rose-400 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-white shadow-lg">
            <span className="block rounded-sm border border-dashed border-white/70 px-2 py-0.5">
              Indie &amp; human-made
            </span>
          </div>
        </div>
      </TiltCard>
    </div>
  );
}
