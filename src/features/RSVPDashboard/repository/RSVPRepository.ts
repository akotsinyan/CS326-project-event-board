import { Ok, Err, type Result } from "../../../lib/result";
import type { IRSVP } from "../model/rsvp";

// ── Error types ───────────────────────────────────────────────────────────────

export type RSVPRepoError = { type: "UnexpectedError"; message: string };

// ── Repository interface ──────────────────────────────────────────────────────

export interface IRSVPRepository {
  findByUserId(userId: string): Promise<Result<IRSVP[], RSVPRepoError>>;
}

// ── Seed data ─────────────────────────────────────────────────────────────────

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

const SEED_RSVPS: IRSVP[] = [
  { id: "rsvp-1", userId: "user-demo", eventId: "evt-list-1", status: "attending",  createdAt: daysAgo(5) },
  { id: "rsvp-2", userId: "user-demo", eventId: "evt-list-2", status: "waitlisted", createdAt: daysAgo(4) },
  { id: "rsvp-3", userId: "user-demo", eventId: "evt-list-5", status: "attending",  createdAt: daysAgo(3) },
  { id: "rsvp-4", userId: "user-demo", eventId: "evt-past-1", status: "attending",  createdAt: daysAgo(20) },
  { id: "rsvp-5", userId: "user-demo", eventId: "evt-past-2", status: "cancelled",  createdAt: daysAgo(10) },
];

// ── In-memory implementation ──────────────────────────────────────────────────

class InMemoryRSVPRepository implements IRSVPRepository {
  constructor(private readonly rsvps: IRSVP[]) {}

  async findByUserId(userId: string): Promise<Result<IRSVP[], RSVPRepoError>> {
    try {
      return Ok(this.rsvps.filter((r) => r.userId === userId));
    } catch {
      return Err({ type: "UnexpectedError" as const, message: "Failed to fetch RSVPs." });
    }
  }
}

// ── Factory function ──────────────────────────────────────────────────────────

export function CreateInMemoryRSVPRepository(): IRSVPRepository {
  return new InMemoryRSVPRepository([...SEED_RSVPS]);
}
