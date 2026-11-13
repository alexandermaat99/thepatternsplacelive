import { PlanningList } from '@/components/admin/planning-list';
import { adminPageMetadata, getPlanningItems, OPEN_PATTERN_STATUSES } from '@/lib/admin-planning';

export const metadata = { ...adminPageMetadata, title: 'Open patterns' };

export default async function AdminOpenPatternsPage() {
  const { items, error } = await getPlanningItems('open_patterns');

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Open patterns to list</h1>
        <p className="text-muted-foreground mt-1">
          Public-domain and openly licensed patterns you can list (Terms of Service, Section 4).
          List them for free, credit the designer, source and license with a link, and use your own
          photos. Starred items are the suggested launch batch.
        </p>
      </div>
      {error ? (
        <p className="text-sm text-destructive">
          Couldn&apos;t load the list ({error.message}). If the table doesn&apos;t exist yet, run{' '}
          <code>sql/add-admin-planning-items.sql</code> in Supabase.
        </p>
      ) : (
        <PlanningList initialItems={items} statuses={OPEN_PATTERN_STATUSES} />
      )}
    </div>
  );
}
