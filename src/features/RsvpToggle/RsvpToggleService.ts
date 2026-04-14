import { Ok, Err, type Result } from "../../lib/result";
import type {
  IRsvpToggleRepository,
  IRsvp,
} from "./RsvpToggleRepository";
import type { IEventEditingRepository, IEvent } from "../EventEditing/EventEditingRepository";


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


export interface IRsvpToggleService {
  toggleRsvp(
    eventId: string,
    userId: string,
    userRole: string
  ): Promise<Result<RsvpToggleResult, RsvpToggleError>>;

  getRsvpStatus(
    eventId: string,
    userId: string
  ): Promise<Result<IRsvp | null, RsvpToggleError>>;
}

class RsvpToggleService implements IRsvpToggleService {
  constructor(
    private readonly rsvpRepo: IRsvpToggleRepository,
    private readonly eventRepo: IEventEditingRepository
  ) {}

  async toggleRsvp(
    eventId: string,
    userId: string,
    userRole: string
  ): Promise<Result<RsvpToggleResult, RsvpToggleError>> {
    // 1. Only members can RSVP
    if (userRole !== "user") {
      return Err({
        type: "Unauthorized" as const,
        message: "Only members can RSVP to events.",
      });
    }

    // 2. Event must exist
    const eventResult = await this.eventRepo.findById(eventId);
    if (!eventResult.ok) {
      return Err({ type: "EventNotFound" as const });
    }
    const event: IEvent = eventResult.value;

    // 3. Event must be published
    if (event.status !== "published") {
      return Err({
        type: "InvalidState" as const,
        message: `Cannot RSVP to an event with status "${event.status}".`,
      });
    }

    // 4. Get current attendee count
    const activeResult = await this.rsvpRepo.findActiveByEvent(eventId);
    if (!activeResult.ok) {
      return Err({ type: "UnexpectedError" as const, message: activeResult.value.message });
    }
    const activeCount = activeResult.value.length;

    // 5. Check for existing RSVP
    const existingResult = await this.rsvpRepo.findByEventAndUser(eventId, userId);
    if (!existingResult.ok) {
      return Err({ type: "UnexpectedError" as const, message: existingResult.value.message });
    }
    const existing = existingResult.value;

    // Case A: No existing RSVP — create one
    if (existing === null) {
      const isFull = event.capacity !== null && activeCount >= event.capacity;
      const status = isFull ? "waitlisted" : "going";
      const createResult = await this.rsvpRepo.create(eventId, userId, status);
      if (!createResult.ok) {
        return Err({ type: "UnexpectedError" as const, message: createResult.value.message });
      }
      return Ok({
        rsvp: createResult.value,
        action: isFull ? "waitlisted" : "created",
        attendeeCount: isFull ? activeCount : activeCount + 1,
      });
    }

    // Case B: Existing active RSVP (going or waitlisted) — cancel it
    if (existing.status === "going" || existing.status === "waitlisted") {
      const updateResult = await this.rsvpRepo.updateStatus(existing.id, "cancelled");
      if (!updateResult.ok) {
        return Err({ type: "UnexpectedError" as const, message: "Failed to cancel RSVP." });
      }
      const newCount = existing.status === "going" ? activeCount - 1 : activeCount;
      return Ok({
        rsvp: updateResult.value,
        action: "cancelled",
        attendeeCount: newCount,
      });
    }

    // Case C: Existing cancelled RSVP — reactivate it
    const isFull = event.capacity !== null && activeCount >= event.capacity;
    const newStatus = isFull ? "waitlisted" : "going";
    const reactivateResult = await this.rsvpRepo.updateStatus(existing.id, newStatus);
    if (!reactivateResult.ok) {
      return Err({ type: "UnexpectedError" as const, message: "Failed to reactivate RSVP." });
    }
    return Ok({
      rsvp: reactivateResult.value,
      action: "reactivated",
      attendeeCount: isFull ? activeCount : activeCount + 1,
    });
  }

  async getRsvpStatus(
    eventId: string,
    userId: string
  ): Promise<Result<IRsvp | null, RsvpToggleError>> {
    const result = await this.rsvpRepo.findByEventAndUser(eventId, userId);
    if (!result.ok) {
      return Err({ type: "UnexpectedError" as const, message: result.value.message });
    }
    return Ok(result.value);
  }
}


export function CreateRsvpToggleService(
  rsvpRepo: IRsvpToggleRepository,
  eventRepo: IEventEditingRepository
): IRsvpToggleService {
  return new RsvpToggleService(rsvpRepo, eventRepo);
}