// src/features/RsvpToggle/RsvpToggleRepository.ts

import { Ok, Err, type Result } from "../../lib/result";

export type RsvpStatus = "going" | "waitlisted" | "cancelled";

export interface IRsvp {
  id: string;
  eventId: string;
  userId: string;
  status: RsvpStatus;
  createdAt: Date;
}

export type RsvpRepoError =
  | { type: "NotFound" }
  | { type: "UnexpectedError"; message: string };

export interface IRsvpToggleRepository {
  findByUserId(userId: string): Promise<Result<IRsvp[], RsvpRepoError>>;

  findByEventAndUser(
    eventId: string,
    userId: string,
  ): Promise<Result<IRsvp | null, RsvpRepoError>>;

  findActiveByEvent(eventId: string): Promise<Result<IRsvp[], RsvpRepoError>>;

  findWaitlistedByEvent(
    eventId: string,
  ): Promise<Result<IRsvp[], RsvpRepoError>>;

  countWaitlistedAhead(
    eventId: string,
    userId: string,
  ): Promise<Result<number, RsvpRepoError>>;

  create(
    eventId: string,
    userId: string,
    status: RsvpStatus,
  ): Promise<Result<IRsvp, RsvpRepoError>>;

  updateStatus(
    rsvpId: string,
    status: RsvpStatus,
  ): Promise<Result<IRsvp, RsvpRepoError>>;
}

let nextId = 1;

// ── Seed data ─────────────────────────────────────────────────────────────────

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

const SEED_RSVPS: IRsvp[] = [
  { id: "rsvp-seed-1", userId: "user-reader", eventId: "evt-list-1", status: "going",      createdAt: daysAgo(5) },
  { id: "rsvp-seed-2", userId: "user-reader", eventId: "evt-list-2", status: "waitlisted", createdAt: daysAgo(4) },
  { id: "rsvp-seed-3", userId: "user-reader", eventId: "evt-list-5", status: "going",      createdAt: daysAgo(3) },
  { id: "rsvp-seed-4", userId: "user-reader", eventId: "evt-past-1", status: "going",      createdAt: daysAgo(20) },
  { id: "rsvp-seed-5", userId: "user-reader", eventId: "evt-past-2", status: "cancelled",  createdAt: daysAgo(10) },
];

// ── Implementation ────────────────────────────────────────────────────────────

class InMemoryRsvpToggleRepository implements IRsvpToggleRepository {
  constructor(private readonly rsvps: IRsvp[]) {}

  async findByUserId(userId: string): Promise<Result<IRsvp[], RsvpRepoError>> {
    try {
      return Ok(this.rsvps.filter((r) => r.userId === userId));
    } catch {
      return Err({ type: "UnexpectedError" as const, message: "Failed to fetch RSVPs." });
    }
  }

  async findByEventAndUser(
    eventId: string,
    userId: string,
  ): Promise<Result<IRsvp | null, RsvpRepoError>> {
    try {
      const match =
        this.rsvps.find((r) => r.eventId === eventId && r.userId === userId) ?? null;
      return Ok(match);
    } catch {
      return Err({
        type: "UnexpectedError" as const,
        message: "Failed to find RSVP.",
      });
    }
  }

  async findActiveByEvent(
    eventId: string,
  ): Promise<Result<IRsvp[], RsvpRepoError>> {
    try {
      const active = this.rsvps.filter(
        (r) => r.eventId === eventId && r.status === "going",
      );
      return Ok(active);
    } catch {
      return Err({
        type: "UnexpectedError" as const,
        message: "Failed to find RSVPs.",
      });
    }
  }

  async findWaitlistedByEvent(
    eventId: string,
  ): Promise<Result<IRsvp[], RsvpRepoError>> {
    try {
      const waitlisted = this.rsvps
        .filter((r) => r.eventId === eventId && r.status === "waitlisted")
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

      return Ok(waitlisted);
    } catch {
      return Err({
        type: "UnexpectedError" as const,
        message: "Failed to find waitlisted RSVPs.",
      });
    }
  }

  async countWaitlistedAhead(
    eventId: string,
    userId: string,
  ): Promise<Result<number, RsvpRepoError>> {
    try {
      const current =
        this.rsvps.find((r) => r.eventId === eventId && r.userId === userId) ?? null;

      if (!current || current.status !== "waitlisted") {
        return Ok(0);
      }

      const count = this.rsvps.filter(
        (r) =>
          r.eventId === eventId &&
          r.status === "waitlisted" &&
          r.createdAt.getTime() < current.createdAt.getTime(),
      ).length;

      return Ok(count);
    } catch {
      return Err({
        type: "UnexpectedError" as const,
        message: "Failed to calculate waitlist position.",
      });
    }
  }

  async create(
    eventId: string,
    userId: string,
    status: RsvpStatus,
  ): Promise<Result<IRsvp, RsvpRepoError>> {
    try {
      const rsvp: IRsvp = {
        id: `rsvp-${nextId++}`,
        eventId,
        userId,
        status,
        createdAt: new Date(),
      };
      this.rsvps.push(rsvp);
      return Ok(rsvp);
    } catch {
      return Err({
        type: "UnexpectedError" as const,
        message: "Failed to create RSVP.",
      });
    }
  }

  async updateStatus(
    rsvpId: string,
    status: RsvpStatus,
  ): Promise<Result<IRsvp, RsvpRepoError>> {
    try {
      const index = this.rsvps.findIndex((r) => r.id === rsvpId);
      if (index === -1) {
        return Err({ type: "NotFound" as const });
      }

      const updated: IRsvp = { ...this.rsvps[index], status };
      this.rsvps[index] = updated;
      return Ok(updated);
    } catch {
      return Err({
        type: "UnexpectedError" as const,
        message: "Failed to update RSVP.",
      });
    }
  }
}

export function CreateInMemoryRsvpToggleRepository(): IRsvpToggleRepository {
  return new InMemoryRsvpToggleRepository([...SEED_RSVPS]);
}