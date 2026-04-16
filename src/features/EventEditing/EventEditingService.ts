import { Ok, Err, type Result } from "../../lib/result";
import type {
  IEventEditingRepository,
  IEvent,
  UpdateEventInput,
} from "./EventEditingRepository";

export type EventEditingError =
  | { type: "EventNotFound" }
  | { type: "Unauthorized" }
  | { type: "InvalidState"; message: string }
  | { type: "InvalidInput"; message: string }
  | { type: "UnexpectedError"; message: string };

export interface IEventEditingService {
  getEventForEdit(
    eventId: string,
    actingUserId: string,
    actingUserRole: string
  ): Promise<Result<IEvent, EventEditingError>>;
  updateEvent(
    eventId: string,
    data: UpdateEventInput,
    actingUserId: string,
    actingUserRole: string
  ): Promise<Result<IEvent, EventEditingError>>;
}

function validateInput(data: UpdateEventInput): { type: "InvalidInput"; message: string } | null {
  if (data.title !== undefined && data.title.trim().length === 0) {
    return { type: "InvalidInput" as const, message: "Title cannot be empty." };
  }
  if (data.startDatetime !== undefined && data.endDatetime !== undefined) {
    if (data.endDatetime <= data.startDatetime) {
      return { type: "InvalidInput" as const, message: "End time must be after start time." };
    }
  }
  if (data.capacity !== undefined && data.capacity !== null && data.capacity < 1) {
    return { type: "InvalidInput" as const, message: "Capacity must be at least 1." };
  }
  return null;
}

const EDITABLE_STATUSES = ["draft", "published"] as const;

function canUserEdit(event: IEvent, actingUserId: string, actingUserRole: string): boolean {
  if (actingUserRole === "admin") return true;
  if (actingUserRole === "staff" && event.organizerId === actingUserId) return true;
  return false;
}

class EventEditingService implements IEventEditingService {
  constructor(private readonly repo: IEventEditingRepository) {}

  async getEventForEdit(
    eventId: string,
    actingUserId: string,
    actingUserRole: string
  ): Promise<Result<IEvent, EventEditingError>> {
    const result = await this.repo.findById(eventId);

    if (!result.ok) {
      const e = result.value as { type?: string; message?: string };

      if (e.type === "EventNotFound") {
        return Err({ type: "EventNotFound" as const });
      }

      return Err({
        type: "UnexpectedError" as const,
        message: e.message ?? "Unexpected error.",
      });
    }

    const event = result.value;

    if (!canUserEdit(event, actingUserId, actingUserRole)) {
      return Err({ type: "Unauthorized" as const });
    }

    if (!EDITABLE_STATUSES.includes(event.status as (typeof EDITABLE_STATUSES)[number])) {
      return Err({
        type: "InvalidState" as const,
        message: `Cannot edit an event with status "${event.status}".`,
      });
    }

    return Ok(event);
  }

  async updateEvent(
    eventId: string,
    data: UpdateEventInput,
    actingUserId: string,
    actingUserRole: string
  ): Promise<Result<IEvent, EventEditingError>> {
    const editCheck = await this.getEventForEdit(eventId, actingUserId, actingUserRole);
    if (!editCheck.ok) return editCheck;

    const validationError = validateInput(data);
    if (validationError) return Err(validationError);

    const updateResult = await this.repo.update(eventId, data);

    if (!updateResult.ok) {
      const e = updateResult.value as { type?: string; message?: string };

      if (e.type === "EventNotFound") {
        return Err({ type: "EventNotFound" as const });
      }

      return Err({
        type: "UnexpectedError" as const,
        message: e.message ?? "Unexpected error.",
      });
    }

    return Ok(updateResult.value);
  }
}

export function CreateEventEditingService(
  repo: IEventEditingRepository
): IEventEditingService {
  return new EventEditingService(repo);
}