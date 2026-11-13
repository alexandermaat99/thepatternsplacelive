import { PlanningList } from '@/components/admin/planning-list';
import { adminPageMetadata, DESIGNER_STATUSES, getPlanningItems } from '@/lib/admin-planning';

export const metadata = { ...adminPageMetadata, title: 'Designer outreach' };

export default async function AdminOutreachPage() {
  const { items, error } = await getPlanningItems('designers');

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Designer outreach</h1>
        <p className="text-muted-foreground mt-1">
          Founding Designer candidates. Starred designers are smaller, active creators: the best
          first contacts. Open &quot;Draft message&quot; on a row to edit and copy a personalized
          message, then set the status as you go. Only admins can see this page.
        </p>
      </div>
      {error ? (
        <p className="text-sm text-destructive">
          Couldn&apos;t load the list ({error.message}). If the table doesn&apos;t exist yet, run{' '}
          <code>sql/add-admin-planning-items.sql</code> in Supabase.
        </p>
      ) : (
        <PlanningList initialItems={items} statuses={DESIGNER_STATUSES} />
      )}
    </div>
  );
}
