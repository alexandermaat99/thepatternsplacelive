'use client';

import { useMemo, useState } from 'react';
import { ExternalLink, Star } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/toast-context';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export type PlanningItem = {
  id: string;
  section: string;
  sort_order: number;
  title: string;
  subtitle: string | null;
  url: string | null;
  handle: string | null;
  detail: string | null;
  notes: string | null;
  is_priority: boolean;
  status: string;
  admin_notes: string | null;
};

export type StatusOption = { value: string; label: string; className: string };

function handleUrl(handle: string): string | null {
  const h = handle.trim();
  if (/^https?:\/\//.test(h)) return h;
  if (h.startsWith('@')) return `https://instagram.com/${h.slice(1)}`;
  return null;
}

export function PlanningList({
  initialItems,
  statuses,
}: {
  initialItems: PlanningItem[];
  statuses: StatusOption[];
}) {
  const { showToast } = useToast();
  const [items, setItems] = useState(initialItems);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityOnly, setPriorityOnly] = useState(false);

  const statusByValue = useMemo(
    () => Object.fromEntries(statuses.map(s => [s.value, s])),
    [statuses]
  );

  const save = async (id: string, patch: Partial<PlanningItem>) => {
    const previous = items;
    setItems(current => current.map(item => (item.id === id ? { ...item, ...patch } : item)));
    const { error } = await createClient().from('admin_planning_items').update(patch).eq('id', id);
    if (error) {
      setItems(previous);
      showToast(`Couldn't save: ${error.message}`, 'error');
    }
  };

  const visible = items.filter(item => {
    if (priorityOnly && !item.is_priority) return false;
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    if (!query) return true;
    const haystack = [item.title, item.subtitle, item.handle, item.detail, item.notes, item.admin_notes]
      .join(' ')
      .toLowerCase();
    return haystack.includes(query.toLowerCase());
  });

  const sections = [...new Set(visible.map(item => item.section))];
  const counts = statuses.map(s => ({ ...s, count: items.filter(i => i.status === s.value).length }));

  return (
    <div className="space-y-6">
      {/* Progress summary */}
      <div className="flex flex-wrap gap-2">
        {counts.map(s => (
          <button
            key={s.value}
            type="button"
            onClick={() => setStatusFilter(statusFilter === s.value ? 'all' : s.value)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium border',
              s.className,
              statusFilter === s.value && 'ring-2 ring-primary ring-offset-1'
            )}
          >
            {s.label}: {s.count}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <Input
          placeholder="Search names, notes, handles…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="sm:max-w-sm"
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={priorityOnly}
            onChange={e => setPriorityOnly(e.target.checked)}
          />
          Priority only
        </label>
        <span className="text-sm text-muted-foreground sm:ml-auto">
          Showing {visible.length} of {items.length}
        </span>
      </div>

      {sections.length === 0 && (
        <p className="text-sm text-muted-foreground">Nothing matches these filters.</p>
      )}

      {sections.map(section => (
        <section key={section} className="space-y-3">
          <h2 className="text-lg font-semibold">{section}</h2>
          <div className="divide-y rounded-lg border">
            {visible
              .filter(item => item.section === section)
              .map(item => {
                const status = statusByValue[item.status];
                const social = item.handle ? handleUrl(item.handle) : null;
                return (
                  <div key={item.id} className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_220px]">
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {item.is_priority && (
                          <Star className="h-4 w-4 fill-amber-400 text-amber-500" aria-label="Priority" />
                        )}
                        <span className="font-semibold">{item.title}</span>
                        {item.url && (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary underline underline-offset-2"
                          >
                            Open <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                        {item.handle &&
                          (social ? (
                            <a
                              href={social}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary underline underline-offset-2"
                            >
                              {item.handle}
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">{item.handle}</span>
                          ))}
                      </div>
                      {item.subtitle && <p className="text-sm">{item.subtitle}</p>}
                      {item.detail && <p className="text-xs text-muted-foreground">{item.detail}</p>}
                      {item.notes && <p className="text-sm text-muted-foreground">{item.notes}</p>}
                    </div>
                    <div className="space-y-2">
                      <select
                        value={item.status}
                        onChange={e => save(item.id, { status: e.target.value })}
                        className={cn(
                          'w-full rounded-md border px-2 py-1.5 text-sm font-medium',
                          status?.className
                        )}
                        aria-label={`Status for ${item.title}`}
                      >
                        {statuses.map(s => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                      <Textarea
                        defaultValue={item.admin_notes ?? ''}
                        placeholder="Your notes…"
                        rows={2}
                        className="text-sm"
                        onBlur={e => {
                          const value = e.target.value.trim() || null;
                          if (value !== (item.admin_notes ?? null)) save(item.id, { admin_notes: value });
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => save(item.id, { is_priority: !item.is_priority })}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        {item.is_priority ? 'Remove priority' : 'Mark priority'}
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </section>
      ))}
    </div>
  );
}
