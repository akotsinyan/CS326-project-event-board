import { Ok, Err, type Result } from "../../lib/result";
import type { IRsvpToggleRepository, IRsvp } from "./RsvpToggleRepository";
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
    if (userRole !== "user") {
      return Err({ type: "Unauthorized" as const, message: "Only members can RSVP to events." });
    }

    const eventResult = await this.eventRepo.findById(eventId);
    if (!eventResult.ok) {
      return Err({ type: "EventNotFound" as const });
    }
    const event: IEvent = eventResult.value;

    if (event.status !== "published") {
      return Err({
        type: "InvalidState" as const,
        message: `Cannot RSVP to an event with status "${event.status}".`,
      });
    }

    const activeResult = await this.rsvpRepo.findActiveByEvent(eventId);
    if (!activeResult.ok) {
      const err = activeResult.value as { message?: string };
      return Err({
        type: "UnexpectedError" as const,
        message: err.message ?? "Unexpected error.",
      });
    }
    const activeCount = activeResult.value.length;

    const existingResult = await this.rsvpRepo.findByEventAndUser(eventId, userId);
    if (!existingResult.ok) {
      const err = existingResult.value as { message?: string };
      return Err({
        type: "UnexpectedError" as const,
        message: err.message ?? "Unexpected error.",
      });
    }
    const existing = existingResult.value;

    if (existing === null) {
      const isFull = event.capacity !== null && activeCount >= event.capacity;
      const status = isFull ? "waitlisted" : "going";
      const createResult = await this.rsvpRepo.create(eventId, userId, status);

      if (!createResult.ok) {
        const err = createResult.value as { message?: string };
        return Err({
          type: "UnexpectedError" as const,
          message: err.message ?? "Unexpected error.",
        });
      }

      return Ok({
        rsvp: createResult.value,
        action: isFull ? "waitlisted" : "created",
        attendeeCount: isFull ? activeCount : activeCount + 1,
      });
    }

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
      const err = result.value as { message?: string };
      return Err({
        type: "UnexpectedError" as const,
        message: err.message ?? "Unexpected error.",
      });
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