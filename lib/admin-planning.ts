import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import type { PlanningItem, StatusOption } from '@/components/admin/planning-list';

export const adminPageMetadata: Metadata = { robots: { index: false, follow: false } };

const GREY = 'bg-muted text-foreground border-border';
const BLUE = 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-800';
const AMBER = 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800';
const GREEN = 'bg-green-50 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-200 dark:border-green-800';
const RED = 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-200 dark:border-red-800';

export const DESIGNER_STATUSES: StatusOption[] = [
  { value: 'todo', label: 'Not contacted', className: GREY },
  { value: 'contacted', label: 'Contacted', className: BLUE },
  { value: 'replied', label: 'Replied', className: AMBER },
  { value: 'joined', label: 'Joined ✓', className: GREEN },
  { value: 'declined', label: 'Declined', className: RED },
  { value: 'skip', label: 'Skip', className: GREY },
];

export const OPEN_PATTERN_STATUSES: StatusOption[] = [
  { value: 'todo', label: 'To do', className: GREY },
  { value: 'in_progress', label: 'In progress', className: AMBER },
  { value: 'listed', label: 'Listed ✓', className: GREEN },
  { value: 'skip', label: 'Skip', className: GREY },
  { value: 'do_not_list', label: "Don't list", className: RED },
];

/** Load one planning list. RLS restricts the table to admins. */
export async function getPlanningItems(list: 'designers' | 'open_patterns') {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('admin_planning_items')
    // '*' so newer optional columns (e.g. draft_message) never break the page
    .select('*')
    .eq('list', list)
    .order('sort_order', { ascending: true });
  return { items: (data ?? []) as PlanningItem[], error };
}
