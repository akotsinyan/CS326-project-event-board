import { Ok, Err, type Result } from "../../lib/result";
import {
  EventNotFound,
  UnexpectedDependencyError,
  type EventDetailError,
} from "./errors";

// ── Domain Types ───────────────────────────────────────────────

export type EventStatus = "draft" | "published" | "cancelled";

export interface IEvent {
  id: string;
  title: string;
  description: string;
  location: string;
  category: string;
  status: EventStatus;
  capacity: number | null;
  attendeeCount: number;
  startDatetime: Date;
  endDatetime: Date;
  organizerId: string;
  organizerName: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── Interface ──────────────────────────────────────────────────

export interface IEventDetailPageRepository {
  findById(eventId: string): Promise<Result<IEvent, EventDetailError>>;
}

// ── Seed Data ──────────────────────────────────────────────────

const SEED_EVENTS: IEvent[] = [
  {
    id: "evt-1",
    title: "Spring Hackathon",
    description: "A fun all-day coding event.",
    location: "Room 101",
    category: "Tech",
    status: "published",
    capacity: 50,
    attendeeCount: 23,
    startDatetime: new Date("2026-05-01T10:00:00"),
    endDatetime: new Date("2026-05-01T18:00:00"),
    organizerId: "user-1",
    organizerName: "Alex",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "evt-2",
    title: "Draft Event",
    description: "Hidden event",
    location: "Secret",
    category: "Misc",
    status: "draft",
    capacity: null,
    attendeeCount: 3,
    startDatetime: new Date(),
    endDatetime: new Date(),
    organizerId: "user-2",
    organizerName: "Taylor",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// ── Implementation ─────────────────────────────────────────────

class InMemoryEventDetailRepository implements IEventDetailPageRepository {
  constructor(private readonly events: IEvent[]) { }

  async findById(eventId: string): Promise<Result<IEvent, EventDetailError>> {
    try {
      const event = this.events.find((e) => e.id === eventId);

      if (!event) {
        return Err(EventNotFound("Event not found"));
      }

      return Ok(event);
    } catch {
      return Err(UnexpectedDependencyError("Failed to fetch event"));
    }
  }
}

// ── Factory ───────────────────────────────────────────────────

export function CreateInMemoryEventDetailRepository(): IEventDetailPageRepository {
  return new InMemoryEventDetailRepository([...SEED_EVENTS]);
}