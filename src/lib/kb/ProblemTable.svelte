<script lang="ts">
  import reports from '#lib/data/reports-4471.json';
  import notes from '#lib/data/desk-notes.json';
  import type { Report } from '#lib/kb/causes';
  import { splitTicket, type Problem, type ProblemGroup } from '#lib/kb/problems';
  import { tenantOf } from '#lib/kb/locales';

  // `tickets`: problem → link to the ticket that now owns it.
  let { ticket, tickets = {} }: { ticket: number; tickets?: Partial<Record<Problem, string>> } = $props();

  const split = $derived(splitTicket(reports as Report[], ticket, tenantOf, notes.oneDayMove));
  const groups = $derived([...split.filed, ...split.read]);
  const placed = $derived(split.filed.reduce((n, g) => n + g.reports.length, 0));
  const channels = (c: Record<string, number>) =>
    Object.entries(c)
      .sort((a, b) => b[1] - a[1])
      .map(([ch, n]) => `${ch} ×${n}`)
      .join(' · ');
  const filedUnder = (g: ProblemGroup) =>
    Object.entries(g.filedUnder)
      .map(([c, n]) => `${n} filed under ${c}`)
      .join(', ');
  const issue = (href: string) => `GitHub #${href.split('/').pop()}`;
</script>

<p class="sum">
  <strong>{split.merged.length}</strong> reports merged into #{ticket} ·
  <strong>{groups.length}</strong>
  {groups.length === 1 ? 'problem' : 'problems'}
</p>

<table>
  <thead>
    <tr><th>problem</th><th>reports</th><th>came in by</th><th>tenants</th><th>seen</th><th>ticket</th></tr>
  </thead>
  <tbody>
    {#each groups as g (g.problem)}
      <tr class:orphan={!tickets[g.problem]} class:read={split.read.includes(g)}>
        <td><code>{g.problem}</code></td>
        <td>
          <strong>{g.reports.length}</strong>
          {#if split.read.includes(g)}<span class="small">({filedUnder(g)})</span>{/if}
        </td>
        <td class="small">{channels(g.channels)}</td>
        <td title={g.tenants.join(', ')}>{g.tenants.length}</td>
        <td class="small">{g.firstSeen} → {g.lastSeen}</td>
        <td>
          {#if tickets[g.problem]}<a href={tickets[g.problem]}>{issue(tickets[g.problem]!)}</a>{:else}no ticket yet{/if}
        </td>
      </tr>
    {/each}
  </tbody>
</table>

<p class="check" class:off={placed !== split.merged.length}>
  {split.filed.map((g) => `${g.problem} ${g.reports.length}`).join(' + ')} = {placed} of {split.merged.length} reports,
  each counted once where its tenant files it, as the desk counts.
  {#each split.read as g (g.problem)}
    The {g.reports.length} <code>{g.problem}</code> reports stay counted there too ({filedUnder(g)}).
  {/each}
  {split.rows} rows in the export, {split.rows - split.merged.length} of them repeats of a report already counted.
</p>

<style>
  .sum { font-size: 1.1rem; }
  .small { color: var(--muted); font-size: 0.85em; }
  .check { color: var(--muted); font-size: 0.85em; }
  .check.off { color: var(--warn); font-weight: 600; }
  .orphan td { background: var(--warn-bg); }
  .read td:first-child { padding-left: 1.25rem; }
</style>
