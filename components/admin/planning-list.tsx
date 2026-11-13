'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Copy, ExternalLink, Star } from 'lucide-react';
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
  draft_message?: string | null;
};

export type StatusOption = { value: string; label: string; className: string };

/** Editable outreach draft with a copy button. Edits save when you click away. */
function DraftMessage({ initial, onSave }: { initial: string; onSave: (value: string) => void }) {
  const [value, setValue] = useState(initial);
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <details className="mt-2 rounded-md border bg-muted/30">
      <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium">
        Draft message
      </summary>
      <div className="space-y-2 px-3 pb-3">
        <Textarea
          value={value}
          onChange={e => setValue(e.target.value)}
          onBlur={() => value !== initial && onSave(value)}
          rows={14}
          className="text-sm leading-relaxed"
        />
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted"
        >
          {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Copied' : 'Copy message'}
        </button>
      </div>
    </details>
  );
}

/** Where a designer sells, judged from their main link. */
function sellChannel(url: string | null): string {
  if (!url) return 'No link';
  let host: string;
  try {
    host = new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'Other';
  }
  if (host.endsWith('etsy.com')) return 'Etsy';
  if (host.endsWith('ravelry.com')) return 'Ravelry';
  if (host.endsWith('payhip.com')) return 'Payhip';
  if (/(^|\.)(sewmodernbags|modernquiltco|threadloop)\./.test(host)) return 'Via a retailer';
  return 'Own site';
}

type Filters = {
  query: string;
  statuses: string[];
  section: string;
  channel: string;
  priorityOnly: boolean;
};

const DEFAULT_FILTERS: Filters = {
  query: '',
  statuses: [],
  section: 'all',
  channel: 'all',
  priorityOnly: false,
};

const selectClass = 'rounded-md border bg-background px-2 py-1.5 text-sm';

function handleUrl(handle: string): string | null {
  const h = handle.trim();
  if (/^https?:\/\//.test(h)) return h;
  if (h.startsWith('@')) return `https://instagram.com/${h.slice(1)}`;
  return null;
}

export function PlanningList({
  initialItems,
  statuses,
  storageKey,
  showChannelFilter = false,
}: {
  initialItems: PlanningItem[];
  statuses: StatusOption[];
  /** Filters are remembered in this browser under this key. */
  storageKey: string;
  /** Show the "where they sell" filter (designer list). */
  showChannelFilter?: boolean;
}) {
  const { showToast } = useToast();
  const [items, setItems] = useState(initialItems);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [restored, setRestored] = useState(false);
  const { query, statuses: statusFilter, section: sectionFilter, channel, priorityOnly } = filters;
  const update = (patch: Partial<Filters>) => setFilters(current => ({ ...current, ...patch }));

  const statusByValue = useMemo(
    () => Object.fromEntries(statuses.map(s => [s.value, s])),
    [statuses]
  );
  const allSections = useMemo(() => [...new Set(items.map(item => item.section))], [items]);
  const allChannels = useMemo(
    () => [...new Set(items.map(item => sellChannel(item.url)))].sort(),
    [items]
  );

  // Restore saved filters after mount (localStorage isn't available during server render).
  const filtersKey = `admin-planning-filters:${storageKey}`;
  useEffect(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem(filtersKey) ?? 'null'
      ) as Partial<Filters> | null;
      if (saved) {
        setFilters({
          ...DEFAULT_FILTERS,
          ...saved,
          statuses: (saved.statuses ?? []).filter(v => statuses.some(s => s.value === v)),
        });
      }
    } catch {
      // Ignore unreadable saved filters
    }
    setRestored(true);
  }, [filtersKey, statuses]);

  useEffect(() => {
    if (restored) localStorage.setItem(filtersKey, JSON.stringify(filters));
  }, [restored, filtersKey, filters]);

  const save = async (id: string, patch: Partial<PlanningItem>) => {
    const previous = items;
    setItems(current => current.map(item => (item.id === id ? { ...item, ...patch } : item)));
    const { error } = await createClient().from('admin_planning_items').update(patch).eq('id', id);
    if (error) {
      setItems(previous);
      showToast(`Couldn't save: ${error.message}`, 'error');
    }
  };

  const toggleStatus = (value: string) =>
    update({
      statuses: statusFilter.includes(value)
        ? statusFilter.filter(v => v !== value)
        : [...statusFilter, value],
    });

  const filtersActive =
    query !== '' ||
    statusFilter.length > 0 ||
    sectionFilter !== 'all' ||
    channel !== 'all' ||
    priorityOnly;

  const visible = items.filter(item => {
    if (priorityOnly && !item.is_priority) return false;
    if (statusFilter.length > 0 && !statusFilter.includes(item.status)) return false;
    if (sectionFilter !== 'all' && item.section !== sectionFilter) return false;
    if (showChannelFilter && channel !== 'all' && sellChannel(item.url) !== channel) return false;
    if (!query) return true;
    const haystack = [
      item.title,
      item.subtitle,
      item.handle,
      item.detail,
      item.notes,
      item.admin_notes,
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(query.toLowerCase());
  });

  // Avoid flashing the unfiltered list before saved filters are restored
  if (!restored) return null;

  const sections = [...new Set(visible.map(item => item.section))];
  const counts = statuses.map(s => ({
    ...s,
    count: items.filter(i => i.status === s.value).length,
  }));

  return (
    <div className="space-y-6">
      {/* Progress summary; click to filter (pick several) */}
      <div className="flex flex-wrap gap-2">
        {counts.map(s => (
          <button
            key={s.value}
            type="button"
            onClick={() => toggleStatus(s.value)}
            aria-pressed={statusFilter.includes(s.value)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium border',
              s.className,
              statusFilter.includes(s.value) && 'ring-2 ring-primary ring-offset-1'
            )}
          >
            {s.label}: {s.count}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Input
          placeholder="Search names, notes, handles…"
          value={query}
          onChange={e => update({ query: e.target.value })}
          className="sm:max-w-xs"
        />
        <select
          value={sectionFilter}
          onChange={e => update({ section: e.target.value })}
          className={selectClass}
          aria-label="Section"
        >
          <option value="all">All sections</option>
          {allSections.map(section => (
            <option key={section} value={section}>
              {section}
            </option>
          ))}
        </select>
        {showChannelFilter && (
          <select
            value={channel}
            onChange={e => update({ channel: e.target.value })}
            className={selectClass}
            aria-label="Where they sell"
          >
            <option value="all">Sells anywhere</option>
            {allChannels.map(c => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={priorityOnly}
            onChange={e => update({ priorityOnly: e.target.checked })}
          />
          Priority only
        </label>
        {filtersActive && (
          <button
            type="button"
            onClick={() => setFilters(DEFAULT_FILTERS)}
            className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            Clear filters
          </button>
        )}
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
                          <Star
                            className="h-4 w-4 fill-amber-400 text-amber-500"
                            aria-label="Priority"
                          />
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
                      {item.detail && (
                        <p className="text-xs text-muted-foreground">{item.detail}</p>
                      )}
                      {item.notes && <p className="text-sm text-muted-foreground">{item.notes}</p>}
                      {item.draft_message && (
                        <DraftMessage
                          initial={item.draft_message}
                          onSave={value => save(item.id, { draft_message: value })}
                        />
                      )}
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
                          if (value !== (item.admin_notes ?? null))
                            save(item.id, { admin_notes: value });
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
