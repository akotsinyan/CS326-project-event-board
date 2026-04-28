import { Ok, Err, type Result } from "../../lib/result";
import { getPrismaClient } from "../../lib/prisma";
import type {
  IRsvpToggleRepository,
  IRsvp,
  RsvpStatus,
  RsvpRepoError,
} from "./RsvpToggleRepository";

function toRsvp(r: {
  id: string;
  eventId: string;
  userId: string;
  status: string;
  createdAt: Date;
}): IRsvp {
  return {
    id: r.id,
    eventId: r.eventId,
    userId: r.userId,
    status: r.status as RsvpStatus,
    createdAt: r.createdAt,
  };
}

class PrismaRsvpToggleRepository implements IRsvpToggleRepository {
  private get prisma() {
    return getPrismaClient();
  }

  async findByUserId(userId: string): Promise<Result<IRsvp[], RsvpRepoError>> {
    try {
      const rsvps = await this.prisma.rsvp.findMany({ where: { userId } });
      return Ok(rsvps.map(toRsvp));
    } catch {
      return Err({ type: "UnexpectedError" as const, message: "Failed to fetch RSVPs." });
    }
  }

  async findByEventAndUser(
    eventId: string,
    userId: string,
  ): Promise<Result<IRsvp | null, RsvpRepoError>> {
    try {
      const rsvp = await this.prisma.rsvp.findFirst({ where: { eventId, userId } });
      return Ok(rsvp ? toRsvp(rsvp) : null);
    } catch {
      return Err({ type: "UnexpectedError" as const, message: "Failed to find RSVP." });
    }
  }

  async findActiveByEvent(eventId: string): Promise<Result<IRsvp[], RsvpRepoError>> {
    try {
      const rsvps = await this.prisma.rsvp.findMany({
        where: { eventId, status: "going" },
      });
      return Ok(rsvps.map(toRsvp));
    } catch {
      return Err({ type: "UnexpectedError" as const, message: "Failed to find RSVPs." });
    }
  }

  async findWaitlistedByEvent(eventId: string): Promise<Result<IRsvp[], RsvpRepoError>> {
    try {
      const rsvps = await this.prisma.rsvp.findMany({
        where: { eventId, status: "waitlisted" },
        orderBy: { createdAt: "asc" },
      });
      return Ok(rsvps.map(toRsvp));
    } catch {
      return Err({ type: "UnexpectedError" as const, message: "Failed to find waitlisted RSVPs." });
    }
  }

  async countWaitlistedAhead(
    eventId: string,
    userId: string,
  ): Promise<Result<number, RsvpRepoError>> {
    try {
      const current = await this.prisma.rsvp.findFirst({ where: { eventId, userId } });
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
      const id = `rsvp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const rsvp = await this.prisma.rsvp.create({
        data: { id, eventId, userId, status },
      });
      return Ok(toRsvp(rsvp));
    } catch {
      return Err({ type: "UnexpectedError" as const, message: "Failed to create RSVP." });
    }
  }

  async updateStatus(
    rsvpId: string,
    status: RsvpStatus,
  ): Promise<Result<IRsvp, RsvpRepoError>> {
    try {
      const rsvp = await this.prisma.rsvp.update({
        where: { id: rsvpId },
        data: { status },
      });
      return Ok(toRsvp(rsvp));
    } catch {
      return Err({ type: "NotFound" as const });
    }
  }
}

export function CreatePrismaRsvpToggleRepository(): IRsvpToggleRepository {
  return new PrismaRsvpToggleRepository();
}
