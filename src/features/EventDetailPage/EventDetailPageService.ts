import { Ok, Err, type Result } from "../../lib/result";
import type { UserRole } from "../../auth/User";
import type { IEvent } from "../CreateEvent/model/event";
import type { IEventEditingRepository } from "../EventEditing/EventEditingRepository";
import type { IRsvpToggleRepository, RsvpStatus } from "../RsvpToggle/RsvpToggleRepository";
import type { ISaveForLaterRepository } from "../SaveForLater/SaveForLaterRepo";
import { EventNotFound, type EventDetailError } from "./errors";

// ── View model ────────────────────────────────────────────────────────────────

export interface EventDetailViewModel extends IEvent {
  attendeeCount: number;
  currentUserRsvpStatus: RsvpStatus | null;
  waitlistPosition: number | null;
  currentUserSavedState: "saved" | "unsaved";
}

// ── Service interface ─────────────────────────────────────────────────────────

export interface IEventDetailPageService {
  getEventById(
    eventId: string,
    userId: string,
    role: UserRole,
  ): Promise<Result<EventDetailViewModel, EventDetailError>>;
}

// ── Implementation ─────────────────────────────────────────────────────────

class EventDetailService implements IEventDetailPageService {
  constructor(
    private readonly eventRepo: IEventEditingRepository,
    private readonly rsvpRepo: IRsvpToggleRepository,
    private readonly saveForLaterRepo: ISaveForLaterRepository,
  ) {}

  async getEventById(
    eventId: string,
    userId: string,
    role: UserRole,
  ): Promise<Result<EventDetailViewModel, EventDetailError>> {
    const eventResult = await this.eventRepo.findById(eventId);

    if (!eventResult.ok) {
      return Err(EventNotFound("Event not found"));
    }

    const event = eventResult.value;
    const isOwner = event.organizerId === userId;
    const isAdmin = role === "admin";

    if (event.status === "draft" && !isOwner && !isAdmin) {
      return Err(EventNotFound("Event not found"));
    }

    const [activeResult, userRsvpResult, waitlistPositionResult, savedResult] = await Promise.all([
      this.rsvpRepo.findActiveByEvent(eventId),
      this.rsvpRepo.findByEventAndUser(eventId, userId),
      this.rsvpRepo.countWaitlistedAhead(eventId, userId),
      this.saveForLaterRepo.findByUser(userId),
    ]);

    const attendeeCount = activeResult.ok ? activeResult.value.length : 0;
    const currentUserRsvp = userRsvpResult.ok ? userRsvpResult.value : null;
    const currentUserRsvpStatus =
      currentUserRsvp && currentUserRsvp.status !== "cancelled"
        ? currentUserRsvp.status
        : null;

    const waitlistPosition =
      currentUserRsvpStatus === "waitlisted" && waitlistPositionResult.ok
        ? waitlistPositionResult.value + 1
        : null;

    const isSaved = savedResult.ok
      ? savedResult.value.some((s) => s.eventId === eventId)
      : false;

    return Ok({
      ...event,
      attendeeCount,
      currentUserRsvpStatus,
      waitlistPosition,
      currentUserSavedState: isSaved ? "saved" : "unsaved",
    });
  }
}

// ── Factory ───────────────────────────────────────────────────────────────────

export function CreateEventDetailService(
  eventRepo: IEventEditingRepository,
  rsvpRepo: IRsvpToggleRepository,
  saveForLaterRepo: ISaveForLaterRepository,
): IEventDetailPageService {
  return new EventDetailService(eventRepo, rsvpRepo, saveForLaterRepo);
}
