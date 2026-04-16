import { Ok, Err, type Result } from "../../lib/result";
import type {
  IEventEditingRepository,
  IEvent,
  EventEditingRepoError,
} from "../EventEditing/EventEditingRepository";

// ── Error types ───────────────────────────────────────────────────────────────

export type EventPublishingError =
  | { type: "EventNotFound" }
  | { type: "Unauthorized" }
  | { type: "InvalidTransition"; message: string }
  | { type: "UnexpectedError"; message: string };

// ── Service interface ─────────────────────────────────────────────────────────

export interface IEventPublishingService {
  publishEvent(
    eventId: string,
    actingUserId: string,
    actingUserRole: string
  ): Promise<Result<IEvent, EventPublishingError>>;

  cancelEvent(
    eventId: string,
    actingUserId: string,
    actingUserRole: string
  ): Promise<Result<IEvent, EventPublishingError>>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function canActOnEvent(event: IEvent, actingUserId: string, actingUserRole: string): boolean {
  if (actingUserRole === "admin") return true;
  if (actingUserRole === "staff" && event.organizerId === actingUserId) return true;
  return false;
}

function mapRepoError(err: EventEditingRepoError): EventPublishingError {
  if (err.type === "EventNotFound") return { type: "EventNotFound" as const };
  return { type: "UnexpectedError" as const, message: err.message };
}

// ── Implementation ────────────────────────────────────────────────────────────

class EventPublishingService implements IEventPublishingService {
  constructor(private readonly repo: IEventEditingRepository) {}

  async publishEvent(
    eventId: string,
    actingUserId: string,
    actingUserRole: string
  ): Promise<Result<IEvent, EventPublishingError>> {
    const findResult = await this.repo.findById(eventId);
    if (!findResult.ok) {
      return Err(mapRepoError(findResult.value as EventEditingRepoError));
    }

    const event = findResult.value as IEvent;

    if (!canActOnEvent(event, actingUserId, actingUserRole)) {
      return Err({ type: "Unauthorized" as const });
    }

    if (event.status !== "draft") {
      return Err({
        type: "InvalidTransition" as const,
        message: `Cannot publish an event with status "${event.status}". Only draft events can be published.`,
      });
    }

    const updateResult = await this.repo.updateStatus(eventId, "published");
    if (!updateResult.ok) {
      return Err(mapRepoError(updateResult.value as EventEditingRepoError));
    }

    return Ok(updateResult.value as IEvent);
  }

  async cancelEvent(
    eventId: string,
    actingUserId: string,
    actingUserRole: string
  ): Promise<Result<IEvent, EventPublishingError>> {
    const findResult = await this.repo.findById(eventId);
    if (!findResult.ok) {
      return Err(mapRepoError(findResult.value as EventEditingRepoError));
    }

    const event = findResult.value as IEvent;

    if (!canActOnEvent(event, actingUserId, actingUserRole)) {
      return Err({ type: "Unauthorized" as const });
    }

    if (event.status !== "published") {
      return Err({
        type: "InvalidTransition" as const,
        message: `Cannot cancel an event with status "${event.status}". Only published events can be cancelled.`,
      });
    }

    const updateResult = await this.repo.updateStatus(eventId, "cancelled");
    if (!updateResult.ok) {
      return Err(mapRepoError(updateResult.value as EventEditingRepoError));
    }

    return Ok(updateResult.value as IEvent);
  }
}

// ── Factory function ──────────────────────────────────────────────────────────

export function CreateEventPublishingService(
  repo: IEventEditingRepository
): IEventPublishingService {
  return new EventPublishingService(repo);
}
