import { Ok, Err, type Result } from "../../lib/result";
import type { IRsvpToggleRepository, IRsvp, RsvpRepoError } from "./RsvpToggleRepository";
import type { IEventEditingRepository, IEvent } from "../EventEditing/EventEditingRepository";
import type { IWaitlistPromotionService } from "../WaitlistPromotion/WaitlistPromotionService";

// ── Error types ───────────────────────────────────────────────────────────────

export type RsvpToggleError =
  | { type: "EventNotFound" }
  | { type: "Unauthorized"; message: string }
  | { type: "InvalidState"; message: string }
  | { type: "UnexpectedError"; message: string };

export interface RsvpToggleResult {
  rsvp: IRsvp;
  action: "created" | "waitlisted" | "cancelled" | "reactivated";
  attendeeCount: number;
}

// ── Service interface ─────────────────────────────────────────────────────────

export interface IRsvpToggleService {
  toggleRsvp(eventId: string, userId: string, userRole: string): Promise<Result<RsvpToggleResult, RsvpToggleError>>;
  getRsvpStatus(eventId: string, userId: string): Promise<Result<IRsvp | null, RsvpToggleError>>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function rsvpErrMsg(err: RsvpRepoError): string {
  return err.type === "UnexpectedError" ? err.message : "Repository error.";
}

// ── Implementation ────────────────────────────────────────────────────────────

class RsvpToggleService implements IRsvpToggleService {
  constructor(
    private readonly rsvpRepo: IRsvpToggleRepository,
    private readonly eventRepo: IEventEditingRepository,
    private readonly waitlistService: IWaitlistPromotionService | null = null,
  ) {}

  async toggleRsvp(eventId: string, userId: string, userRole: string): Promise<Result<RsvpToggleResult, RsvpToggleError>> {
    if (userRole !== "user") {
      return Err({ type: "Unauthorized" as const, message: "Only members can RSVP to events." });
    }

    const eventResult = await this.eventRepo.findById(eventId);
    if (!eventResult.ok) {
      return Err({ type: "EventNotFound" as const });
    }
    const event = eventResult.value as IEvent;

    if (event.status !== "published") {
      return Err({ type: "InvalidState" as const, message: `Cannot RSVP to an event with status "${event.status}".` });
    }

    const activeResult = await this.rsvpRepo.findActiveByEvent(eventId);
    if (!activeResult.ok) {
      return Err({ type: "UnexpectedError" as const, message: rsvpErrMsg(activeResult.value as RsvpRepoError) });
    }
    const activeCount = (activeResult.value as IRsvp[]).length;

    const existingResult = await this.rsvpRepo.findByEventAndUser(eventId, userId);
    if (!existingResult.ok) {
      return Err({ type: "UnexpectedError" as const, message: rsvpErrMsg(existingResult.value as RsvpRepoError) });
    }
    const existing = existingResult.value as IRsvp | null;

    if (existing === null) {
      const isFull = event.capacity !== null && activeCount >= event.capacity;
      const status = isFull ? "waitlisted" : "going";
      const createResult = await this.rsvpRepo.create(eventId, userId, status);
      if (!createResult.ok) {
        return Err({ type: "UnexpectedError" as const, message: rsvpErrMsg(createResult.value as RsvpRepoError) });
      }
      return Ok({ rsvp: createResult.value as IRsvp, action: isFull ? "waitlisted" : "created", attendeeCount: isFull ? activeCount : activeCount + 1 });
    }

    if (existing.status === "going" || existing.status === "waitlisted") {
      const wasGoing = existing.status === "going";
      const updateResult = await this.rsvpRepo.updateStatus(existing.id, "cancelled");
      if (!updateResult.ok) {
        return Err({ type: "UnexpectedError" as const, message: "Failed to cancel RSVP." });
      }
      const newCount = wasGoing ? activeCount - 1 : activeCount;

      if (wasGoing && this.waitlistService) {
        await this.waitlistService.promoteFromWaitlist(eventId);
      }

      return Ok({ rsvp: updateResult.value as IRsvp, action: "cancelled", attendeeCount: newCount });
    }

    // Cancelled RSVP → reactivate
    const isFull = event.capacity !== null && activeCount >= event.capacity;
    const newStatus = isFull ? "waitlisted" : "going";
    const reactivateResult = await this.rsvpRepo.updateStatus(existing.id, newStatus);
    if (!reactivateResult.ok) {
      return Err({ type: "UnexpectedError" as const, message: "Failed to reactivate RSVP." });
    }
    return Ok({ rsvp: reactivateResult.value as IRsvp, action: "reactivated", attendeeCount: isFull ? activeCount : activeCount + 1 });
  }

  async getRsvpStatus(eventId: string, userId: string): Promise<Result<IRsvp | null, RsvpToggleError>> {
    const result = await this.rsvpRepo.findByEventAndUser(eventId, userId);
    if (!result.ok) {
      return Err({ type: "UnexpectedError" as const, message: rsvpErrMsg(result.value as RsvpRepoError) });
    }
    return Ok(result.value as IRsvp | null);
  }
}

// ── Factory function ──────────────────────────────────────────────────────────

export function CreateRsvpToggleService(
  rsvpRepo: IRsvpToggleRepository,
  eventRepo: IEventEditingRepository,
  waitlistService: IWaitlistPromotionService | null = null,
): IRsvpToggleService {
  return new RsvpToggleService(rsvpRepo, eventRepo, waitlistService);
}
