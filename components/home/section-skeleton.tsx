/** Placeholder while a homepage section's data loads (keeps the hero from waiting on the database). */
export function SectionSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <section aria-hidden className="border-b">
      <div className="container mx-auto max-w-7xl px-4 py-12">
        <div className="mb-6 space-y-2">
          <div className="h-8 w-56 animate-pulse rounded-md bg-muted" />
          <div className="h-4 w-80 max-w-full animate-pulse rounded-md bg-muted" />
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: cards }, (_, i) => (
            <div key={i} className="aspect-[3/4] animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    </section>
  );
}
