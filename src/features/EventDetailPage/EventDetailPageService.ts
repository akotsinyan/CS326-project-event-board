import { Ok, Err, type Result } from "../../lib/result";
import type { UserRole } from "../../auth/User";
import type { IEvent, IEventDetailPageRepository } from "./EventDetailPageRepository";
import {
  EventNotFound,
  type EventDetailError,
} from "./errors";

// ── Interface ──────────────────────────────────────────────────

export interface IEventDetailPageService {
  getEventById(
    eventId: string,
    userId: string,
    role: UserRole
  ): Promise<Result<IEvent, EventDetailError>>;
}

// ── Implementation ─────────────────────────────────────────────

class EventDetailService implements IEventDetailPageService {
  constructor(private readonly repo: IEventDetailPageRepository) { }

  async getEventById(
    eventId: string,
    userId: string,
    role: UserRole
  ): Promise<Result<IEvent, EventDetailError>> {
    const result = await this.repo.findById(eventId);

    if (!result.ok) {
      return Err(result.value as EventDetailError);
    }

    const event = result.value;

    const isOwner = event.organizerId === userId;
    const isAdmin = role === "admin";

    // 🔥 visibility rule
    if (event.status === "draft" && !isOwner && !isAdmin) {
      return Err(EventNotFound("Event not found"));
    }

    return Ok(event);
  }
}

// ── Factory ───────────────────────────────────────────────────

export function CreateEventDetailService(
  repo: IEventDetailPageRepository
): IEventDetailPageService {
  return new EventDetailService(repo);
}