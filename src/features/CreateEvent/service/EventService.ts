import { Err, Ok, type Result } from "../../../lib/result";
import type { IEvent } from "../model/event";
import type { IEventEditingRepository } from "../../EventEditing/EventEditingRepository";

// ── Error types ───────────────────────────────────────────────────────────────

export type EventError = { name: "ValidationError"; message: string };

export const ValidationError = (message: string): EventError => ({
  name: "ValidationError",
  message,
});

// ── Service interface ─────────────────────────────────────────────────────────

export interface IEventService {
  createEvent(data: {
    title: string;
    description: string;
    location: string;
    startDatetime: Date;
    endDatetime: Date;
    organizerId: string;
    organizerName: string;
    category?: string;
    capacity?: number | null;
  }): Promise<Result<IEvent, EventError>>;
}

// ── Implementation ────────────────────────────────────────────────────────────

class EventService implements IEventService {
  constructor(private readonly repo: IEventEditingRepository) {}

  private validate(data: {
    title: string;
    description: string;
    location: string;
    startDatetime: Date;
    endDatetime: Date;
    organizerId: string;
    capacity?: number | null;
  }): EventError | null {
    if (!data.title.trim()) return ValidationError("Title is required.");
    if (!data.description.trim()) return ValidationError("Description is required.");
    if (!data.location.trim()) return ValidationError("Location is required.");
    if (!(data.startDatetime instanceof Date) || isNaN(data.startDatetime.getTime())) {
      return ValidationError("Start date is invalid.");
    }
    if (!(data.endDatetime instanceof Date) || isNaN(data.endDatetime.getTime())) {
      return ValidationError("End date is invalid.");
    }
    if (data.startDatetime >= data.endDatetime) {
      return ValidationError("Start time must be before end time.");
    }
    if (data.capacity !== undefined && data.capacity !== null && (!Number.isInteger(data.capacity) || data.capacity < 1)) {
      return ValidationError("Capacity must be a positive integer.");
    }
    return null;
  }

  async createEvent(data: {
    title: string;
    description: string;
    location: string;
    startDatetime: Date;
    endDatetime: Date;
    organizerId: string;
    organizerName: string;
    category?: string;
    capacity?: number | null;
  }): Promise<Result<IEvent, EventError>> {
    const normalized = {
      ...data,
      title: data.title.trim(),
      description: data.description.trim(),
      location: data.location.trim(),
      category: data.category?.trim(),
    };

    const validationError = this.validate(normalized);
    if (validationError) return Err(validationError);

    const result = await this.repo.add({ ...normalized, status: "draft" });
    if (!result.ok) {
      return Err(ValidationError("Failed to save event. Please try again."));
    }

    return Ok(result.value);
  }
}

// ── Factory function ──────────────────────────────────────────────────────────

export function createEventService(repo: IEventEditingRepository): IEventService {
  return new EventService(repo);
}
