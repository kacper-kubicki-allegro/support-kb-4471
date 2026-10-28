// What one big ticket really holds, problem by problem. Pages explain it; this file is what runs.
//
// causes.ts tells `parser` from `hint` by the tenant: where they are and which booking form they run.
// It cannot tell a flip from a one-day move: both come from day-first tenants. The desk reads those
// apart (desk-notes.json). A day/month flip never moves a date by exactly one day, so a one-day move
// is a problem of its own, whatever the tenant.
import { causeOf, uniqueById, type Report, type Tenant } from '#lib/kb/causes';

export type Problem = 'parser' | 'hint' | 'one-day' | 'unplaced';

export function problemOf(r: Report, t: Tenant | undefined, oneDayMove: readonly string[]): Problem {
  if (oneDayMove.includes(r.id)) return 'one-day';
  return causeOf(r, t) ?? 'unplaced';
}

export type ProblemGroup = {
  problem: Problem;
  reports: Report[];
  tenants: string[];
  // How the reports came in: channel → count.
  channels: Record<string, number>;
  firstSeen: string;
  lastSeen: string;
};

export type TicketSplit = {
  // Rows in the export, before one id = one report.
  rows: number;
  // Unique reports merged into the ticket.
  merged: Report[];
  groups: ProblemGroup[];
};

const count = (rs: Report[], key: (r: Report) => string) =>
  rs.reduce<Record<string, number>>((n, r) => ({ ...n, [key(r)]: (n[key(r)] ?? 0) + 1 }), {});

export function splitTicket(
  exported: Report[],
  ticket: number,
  tenantOf: (r: Report) => Tenant | undefined,
  oneDayMove: readonly string[],
): TicketSplit {
  const merged = uniqueById(exported).filter((r) => r.mergedInto === ticket);
  const byProblem = new Map<Problem, Report[]>();
  for (const r of merged) {
    const p = problemOf(r, tenantOf(r), oneDayMove);
    byProblem.set(p, [...(byProblem.get(p) ?? []), r]);
  }
  const groups = [...byProblem.entries()]
    .map(([problem, rs]) => {
      const days = rs.map((r) => r.receivedAt.slice(0, 10)).sort();
      return {
        problem,
        reports: rs,
        tenants: [...new Set(rs.map((r) => r.tenant))].sort(),
        channels: count(rs, (r) => r.channel),
        firstSeen: days[0],
        lastSeen: days[days.length - 1],
      };
    })
    .sort((a, b) => b.reports.length - a.reports.length);
  return { rows: exported.filter((r) => r.mergedInto === ticket).length, merged, groups };
}
