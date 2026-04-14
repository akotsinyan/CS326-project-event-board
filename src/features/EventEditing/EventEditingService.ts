// src/features/EventEditing/EventEditingService.ts

import { Ok, Err, type Result } from "../../lib/result";
import type {
  IEventEditingRepository,
  IEvent,
  UpdateEventInput,
} from "./EventEditingRepository";

// ── Error types ───────────────────────────────────────────────────────────────

export type EventEditingError =
  | { type: "EventNotFound" }
  | { type: "Unauthorized" }
  | { type: "InvalidState"; message: string }
  | { type: "InvalidInput"; message: string }
  | { type: "UnexpectedError"; message: string };

// ── Service interface ─────────────────────────────────────────────────────────

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

// ── Validation ────────────────────────────────────────────────────────────────

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

// ── Helpers ───────────────────────────────────────────────────────────────────

const EDITABLE_STATUSES = ["draft", "published"];

function canUserEdit(event: IEvent, actingUserId: string, actingUserRole: string): boolean {
  if (actingUserRole === "admin") return true;
  if (actingUserRole === "staff" && event.organizerId === actingUserId) return true;
  return false;
}

// ── Implementation ────────────────────────────────────────────────────────────

class EventEditingService implements IEventEditingService {
  constructor(private readonly repo: IEventEditingRepository) {}

  async getEventForEdit(
    eventId: string,
    actingUserId: string,
    actingUserRole: string
  ): Promise<Result<IEvent, EventEditingError>> {
    const result = await this.repo.findById(eventId);

    if (!result.ok) {
      if (result.value.type === "EventNotFound") {
        return Err({ type: "EventNotFound" as const });
      }
      return Err({ type: "UnexpectedError" as const, message: result.value.message });
    }

    const event = result.value;

    if (!canUserEdit(event, actingUserId, actingUserRole)) {
      return Err({ type: "Unauthorized" as const });
    }

    if (!EDITABLE_STATUSES.includes(event.status)) {
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
    // 1. Check the event exists, user has permission, and state allows editing
    const editCheck = await this.getEventForEdit(eventId, actingUserId, actingUserRole);
    if (!editCheck.ok) return editCheck;

    // 2. Validate the submitted input
    const validationError = validateInput(data);
    if (validationError) return Err(validationError);

    // 3. Persist the update
    const updateResult = await this.repo.update(eventId, data);
    if (!updateResult.ok) {
      if (updateResult.value.type === "EventNotFound") {
        return Err({ type: "EventNotFound" as const });
      }
      return Err({ type: "UnexpectedError" as const, message: updateResult.value.message });
    }

    return Ok(updateResult.value);
  }
}

// ── Factory function ──────────────────────────────────────────────────────────

export function CreateEventEditingService(
  repo: IEventEditingRepository
): IEventEditingService {
  return new EventEditingService(repo);
}