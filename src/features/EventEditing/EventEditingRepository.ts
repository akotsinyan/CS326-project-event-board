// src/features/EventEditing/EventEditingRepository.ts

import { Ok, Err, type Result } from "../../lib/result";

// ── Domain types ──────────────────────────────────────────────────────────────

export type EventStatus = "draft" | "published" | "cancelled" | "past";

export interface IEvent {
  id: string;
  title: string;
  description: string;
  location: string;
  category: string;
  status: EventStatus;
  capacity: number | null;
  startDatetime: Date;
  endDatetime: Date;
  organizerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateEventInput {
  title?: string;
  description?: string;
  location?: string;
  category?: string;
  capacity?: number | null;
  startDatetime?: Date;
  endDatetime?: Date;
}

// ── Error types ───────────────────────────────────────────────────────────────

export type EventEditingRepoError =
  | { type: "EventNotFound" }
  | { type: "UnexpectedError"; message: string };

// ── Repository interface ──────────────────────────────────────────────────────

export interface IEventEditingRepository {
  findById(eventId: string): Promise<Result<IEvent, EventEditingRepoError>>;
  update(eventId: string, data: UpdateEventInput): Promise<Result<IEvent, EventEditingRepoError>>;
  updateStatus(eventId: string, status: EventStatus): Promise<Result<IEvent, EventEditingRepoError>>;
}

// ── Seed data ─────────────────────────────────────────────────────────────────

const SEED_EVENTS: IEvent[] = [
  {
    id: "evt-1",
    title: "Spring Hackathon",
    description: "A fun all-day coding event.",
    location: "Room 101",
    category: "tech",
    status: "published",
    capacity: 50,
    startDatetime: new Date("2025-06-01T10:00:00"),
    endDatetime: new Date("2025-06-01T18:00:00"),
    organizerId: "user-staff",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "evt-2",
    title: "Career Fair",
    description: "Meet employers from across the industry.",
    location: "Main Hall",
    category: "careers",
    status: "draft",
    capacity: null,
    startDatetime: new Date("2025-07-15T09:00:00"),
    endDatetime: new Date("2025-07-15T17:00:00"),
    organizerId: "user-staff",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// ── In-memory implementation ──────────────────────────────────────────────────

class InMemoryEventEditingRepository implements IEventEditingRepository {
  constructor(private readonly events: IEvent[]) {}

  async findById(eventId: string): Promise<Result<IEvent, EventEditingRepoError>> {
    try {
      const event = this.events.find((e) => e.id === eventId) ?? null;
      if (!event) return Err({ type: "EventNotFound" as const });
      return Ok(event);
    } catch {
      return Err({ type: "UnexpectedError" as const, message: "Failed to find event." });
    }
  }

  async update(eventId: string, data: UpdateEventInput): Promise<Result<IEvent, EventEditingRepoError>> {
    try {
      const index = this.events.findIndex((e) => e.id === eventId);
      if (index === -1) return Err({ type: "EventNotFound" as const });

      const existing = this.events[index];
      const updated: IEvent = { ...existing, ...data, updatedAt: new Date() };
      this.events[index] = updated;
      return Ok(updated);
    } catch {
      return Err({ type: "UnexpectedError" as const, message: "Failed to update event." });
    }
  }

  async updateStatus(eventId: string, status: EventStatus): Promise<Result<IEvent, EventEditingRepoError>> {
    try {
      const index = this.events.findIndex((e) => e.id === eventId);
      if (index === -1) return Err({ type: "EventNotFound" as const });

      const updated: IEvent = { ...this.events[index], status, updatedAt: new Date() };
      this.events[index] = updated;
      return Ok(updated);
    } catch {
      return Err({ type: "UnexpectedError" as const, message: "Failed to update event status." });
    }
  }
}

// ── Factory function ──────────────────────────────────────────────────────────

export function CreateInMemoryEventEditingRepository(): IEventEditingRepository {
  return new InMemoryEventEditingRepository([...SEED_EVENTS]);
}