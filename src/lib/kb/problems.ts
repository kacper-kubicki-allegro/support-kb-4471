// What one big ticket really holds, problem by problem. Pages explain it; this file is what runs.
//
// Counted the way the desk counts (CauseTable): every report once, where its tenant files it
// (`parser` or `hint`, causes.ts). The desk reads some reports as a one-day move (desk-notes.json).
// A day/month flip never moves a date by exactly one day, so that is a problem of its own with its
// own ticket; its reports stay counted where their tenant files them, as the desk counts them.
import { causeOf, uniqueById, type Cause, type Report, type Tenant } from '#lib/kb/causes';

export type Problem = Cause | 'one-day' | 'unplaced';

export type ProblemGroup = {
  problem: Problem;
  reports: Report[];
  tenants: string[];
  // How the reports came in: channel → count.
  channels: Record<string, number>;
  firstSeen: string;
  lastSeen: string;
  // For a problem read on top of the tenant's cause: where those reports are filed, cause → count.
  filedUnder: Partial<Record<Cause | 'unplaced', number>>;
};

export type TicketSplit = {
  // Rows in the export, before one id = one report.
  rows: number;
  // Unique reports merged into the ticket.
  merged: Report[];
  // One group per cause by tenant: every merged report in exactly one of them.
  filed: ProblemGroup[];
  // Problems the desk read on top of the cause, counted again here.
  read: ProblemGroup[];
};

const count = (rs: Report[], key: (r: Report) => string) =>
  rs.reduce<Record<string, number>>((n, r) => ({ ...n, [key(r)]: (n[key(r)] ?? 0) + 1 }), {});

function group(problem: Problem, rs: Report[], filedUnder: ProblemGroup['filedUnder'] = {}): ProblemGroup {
  const days = rs.map((r) => r.receivedAt.slice(0, 10)).sort();
  return {
    problem,
    reports: rs,
    tenants: [...new Set(rs.map((r) => r.tenant))].sort(),
    channels: count(rs, (r) => r.channel),
    firstSeen: days[0],
    lastSeen: days[days.length - 1],
    filedUnder,
  };
}

export function splitTicket(
  exported: Report[],
  ticket: number,
  tenantOf: (r: Report) => Tenant | undefined,
  oneDayMove: readonly string[],
): TicketSplit {
  const merged = uniqueById(exported).filter((r) => r.mergedInto === ticket);
  const filedAs = (r: Report) => causeOf(r, tenantOf(r)) ?? 'unplaced';
  const byCause = new Map<Cause | 'unplaced', Report[]>();
  for (const r of merged) byCause.set(filedAs(r), [...(byCause.get(filedAs(r)) ?? []), r]);
  const filed = [...byCause.entries()].map(([c, rs]) => group(c, rs)).sort((a, b) => b.reports.length - a.reports.length);
  const moved = merged.filter((r) => oneDayMove.includes(r.id));
  const read = moved.length ? [group('one-day', moved, count(moved, filedAs))] : [];
  return { rows: exported.filter((r) => r.mergedInto === ticket).length, merged, filed, read };
}
