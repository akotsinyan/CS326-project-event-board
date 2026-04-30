import { PrismaClient } from "@prisma/client";
import { Ok, Err, type Result } from "../../lib/result";
import type { IRsvpToggleRepository, IRsvp, RsvpRepoError, RsvpStatus } from "./RsvpToggleRepository";

function toIRsvp(row: {
  id: string;
  eventId: string;
  userId: string;
  status: string;
  createdAt: Date;
}): IRsvp {
  return {
    id: row.id,
    eventId: row.eventId,
    userId: row.userId,
    status: row.status as RsvpStatus,
    createdAt: row.createdAt,
  };
}

class PrismaRsvpToggleRepository implements IRsvpToggleRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByUserId(userId: string): Promise<Result<IRsvp[], RsvpRepoError>> {
    try {
      const rows = await this.prisma.rsvp.findMany({
        where: { userId },
        include: { event: true },
        orderBy: { createdAt: "asc" },
      });
      return Ok(rows.map(toIRsvp));
    } catch {
      return Err({ type: "UnexpectedError" as const, message: "Failed to fetch RSVPs." });
    }
  }

  async findByEventAndUser(eventId: string, userId: string): Promise<Result<IRsvp | null, RsvpRepoError>> {
    try {
      const row = await this.prisma.rsvp.findUnique({
        where: { eventId_userId: { eventId, userId } },
      });
      return Ok(row ? toIRsvp(row) : null);
    } catch {
      return Err({ type: "UnexpectedError" as const, message: "Failed to find RSVP." });
    }
  }

  async findActiveByEvent(eventId: string): Promise<Result<IRsvp[], RsvpRepoError>> {
    try {
      const rows = await this.prisma.rsvp.findMany({
        where: { eventId, status: "going" },
      });
      return Ok(rows.map(toIRsvp));
    } catch {
      return Err({ type: "UnexpectedError" as const, message: "Failed to find RSVPs." });
    }
  }

  async findWaitlistedByEvent(eventId: string): Promise<Result<IRsvp[], RsvpRepoError>> {
    try {
      const rows = await this.prisma.rsvp.findMany({
        where: { eventId, status: "waitlisted" },
        orderBy: { createdAt: "asc" },
      });
      return Ok(rows.map(toIRsvp));
    } catch {
      return Err({ type: "UnexpectedError" as const, message: "Failed to find waitlisted RSVPs." });
    }
  }

  async countWaitlistedAhead(eventId: string, userId: string): Promise<Result<number, RsvpRepoError>> {
    try {
      const current = await this.prisma.rsvp.findUnique({
        where: { eventId_userId: { eventId, userId } },
      });
      if (!current || current.status !== "waitlisted") return Ok(0);
      const count = await this.prisma.rsvp.count({
        where: {
          eventId,
          status: "waitlisted",
          createdAt: { lt: current.createdAt },
        },
      });
      return Ok(count);
    } catch {
      return Err({ type: "UnexpectedError" as const, message: "Failed to calculate waitlist position." });
    }
  }

  async create(eventId: string, userId: string, status: RsvpStatus): Promise<Result<IRsvp, RsvpRepoError>> {
    try {
      const row = await this.prisma.rsvp.create({
        data: { eventId, userId, status },
      });
      return Ok(toIRsvp(row));
    } catch {
      return Err({ type: "UnexpectedError" as const, message: "Failed to create RSVP." });
    }
  }

  async updateStatus(rsvpId: string, status: RsvpStatus): Promise<Result<IRsvp, RsvpRepoError>> {
    try {
      const row = await this.prisma.rsvp.update({
        where: { id: rsvpId },
        data: { status },
      });
      return Ok(toIRsvp(row));
    } catch (err: unknown) {
      if (isPrismaNotFound(err)) return Err({ type: "NotFound" as const });
      return Err({ type: "UnexpectedError" as const, message: "Failed to update RSVP." });
    }
  }
}

function isPrismaNotFound(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "P2025"
  );
}

export function CreatePrismaRsvpToggleRepository(prisma: PrismaClient): IRsvpToggleRepository {
  return new PrismaRsvpToggleRepository(prisma);
}
