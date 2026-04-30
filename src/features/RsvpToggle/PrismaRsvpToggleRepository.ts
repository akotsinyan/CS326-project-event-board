// src/features/RsvpToggle/PrismaRsvpToggleRepository.ts

import { PrismaClient } from "@prisma/client";
import { Ok, Err, type Result } from "../../lib/result";
import type { IRsvpToggleRepository, IRsvp, RsvpStatus, RsvpRepoError } from "./RsvpToggleRepository";

class PrismaRsvpToggleRepository implements IRsvpToggleRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByUserId(userId: string): Promise<Result<IRsvp[], RsvpRepoError>> {
    try {
      const rsvps = await this.prisma.rsvp.findMany({
        where: { userId },
        orderBy: { createdAt: "asc" },
      });
      return Ok(rsvps as IRsvp[]);
    } catch {
      return Err({ type: "UnexpectedError" as const, message: "Failed to fetch RSVPs." });
    }
  }

  async findByEventAndUser(eventId: string, userId: string): Promise<Result<IRsvp | null, RsvpRepoError>> {
    try {
      const rsvp = await this.prisma.rsvp.findFirst({
        where: { eventId, userId },
      });
      return Ok(rsvp as IRsvp | null);
    } catch {
      return Err({ type: "UnexpectedError" as const, message: "Failed to find RSVP." });
    }
  }

  async findActiveByEvent(eventId: string): Promise<Result<IRsvp[], RsvpRepoError>> {
    try {
      const rsvps = await this.prisma.rsvp.findMany({
        where: { eventId, status: "going" },
      });
      return Ok(rsvps as IRsvp[]);
    } catch {
      return Err({ type: "UnexpectedError" as const, message: "Failed to find active RSVPs." });
    }
  }

  async findWaitlistedByEvent(eventId: string): Promise<Result<IRsvp[], RsvpRepoError>> {
    try {
      const rsvps = await this.prisma.rsvp.findMany({
        where: { eventId, status: "waitlisted" },
        orderBy: { createdAt: "asc" },
      });
      return Ok(rsvps as IRsvp[]);
    } catch {
      return Err({ type: "UnexpectedError" as const, message: "Failed to find waitlisted RSVPs." });
    }
  }

  async countWaitlistedAhead(eventId: string, userId: string): Promise<Result<number, RsvpRepoError>> {
    try {
      const current = await this.prisma.rsvp.findFirst({
        where: { eventId, userId },
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
      return Err({ type: "UnexpectedError" as const, message: "Failed to count waitlist position." });
    }
  }

  async create(eventId: string, userId: string, status: RsvpStatus): Promise<Result<IRsvp, RsvpRepoError>> {
    try {
      const rsvp = await this.prisma.rsvp.create({
        data: { id: crypto.randomUUID(), eventId, userId, status },
      });
      return Ok(rsvp as IRsvp);
    } catch {
      return Err({ type: "UnexpectedError" as const, message: "Failed to create RSVP." });
    }
  }

  async updateStatus(rsvpId: string, status: RsvpStatus): Promise<Result<IRsvp, RsvpRepoError>> {
    try {
      const rsvp = await this.prisma.rsvp.update({
        where: { id: rsvpId },
        data: { status },
      });
      return Ok(rsvp as IRsvp);
    } catch {
      return Err({ type: "NotFound" as const });
    }
  }
}

export function CreatePrismaRsvpToggleRepository(prisma: PrismaClient): IRsvpToggleRepository {
  return new PrismaRsvpToggleRepository(prisma);
}