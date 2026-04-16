import { Ok, Err, type Result } from "../../lib/result";
import {
  type IEvent,
  type EventStatus,
  type CreateEventData,
  createEvent,
} from "../CreateEvent/model/event";

export type { IEvent, EventStatus, CreateEventData };

// ── Input types ───────────────────────────────────────────────────────────────

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
// This is the single shared event repository used by all features.

export interface IEventEditingRepository {
  findById(eventId: string): Promise<Result<IEvent, EventEditingRepoError>>;
  findAll(): Promise<Result<IEvent[], EventEditingRepoError>>;
  findPublished(): Promise<Result<IEvent[], EventEditingRepoError>>;
  add(data: CreateEventData): Promise<Result<IEvent, EventEditingRepoError>>;
  update(eventId: string, data: UpdateEventInput): Promise<Result<IEvent, EventEditingRepoError>>;
  updateStatus(eventId: string, status: EventStatus): Promise<Result<IEvent, EventEditingRepoError>>;
  search(query: string): Promise<Result<IEvent[], EventEditingRepoError>>;
}

// ── Seed data ─────────────────────────────────────────────────────────────────

const _now = new Date();

function daysFromNow(days: number): Date {
  const d = new Date(_now);
  d.setDate(d.getDate() + days);
  d.setHours(10, 0, 0, 0);
  return d;
}

function hoursAfter(start: Date, hours: number): Date {
  const d = new Date(start);
  d.setHours(d.getHours() + hours);
  return d;
}

function nextWeekday(targetDay: number): Date {
  const d = new Date(_now);
  const diff = (targetDay - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + diff);
  d.setHours(10, 0, 0, 0);
  return d;
}

const saturday = nextWeekday(6);
const sunday = nextWeekday(_now.getDay() === 0 ? 7 : 0);

const SEED_EVENTS: IEvent[] = [
  createEvent("evt-list-1", {
    title: "Spring Hackathon",
    description: "An all-day coding challenge open to all skill levels. Form a team and build something cool.",
    location: "Room 101",
    category: "tech",
    status: "published",
    capacity: 50,
    organizerId: "user-staff",
    organizerName: "Sam Staff",
    startDatetime: daysFromNow(2),
    endDatetime: hoursAfter(daysFromNow(2), 8),
  }),
  createEvent("evt-list-2", {
    title: "Career Fair",
    description: "Meet recruiters and hiring managers from top companies across the industry.",
    location: "Main Hall",
    category: "careers",
    status: "published",
    capacity: 200,
    organizerId: "user-staff",
    organizerName: "Sam Staff",
    startDatetime: daysFromNow(3),
    endDatetime: hoursAfter(daysFromNow(3), 6),
  }),
  createEvent("evt-list-3", {
    title: "Open Mic Night",
    description: "Share your talent — comedy, music, poetry, or anything you love performing.",
    location: "Student Union",
    category: "social",
    status: "published",
    capacity: 60,
    organizerId: "user-staff",
    organizerName: "Sam Staff",
    startDatetime: saturday,
    endDatetime: hoursAfter(saturday, 3),
  }),
  createEvent("evt-list-4", {
    title: "Sunday Study Hall",
    description: "A quiet, collaborative study session. Tutors will be on hand for several subjects.",
    location: "Library",
    category: "academic",
    status: "published",
    capacity: null,
    organizerId: "user-staff",
    organizerName: "Sam Staff",
    startDatetime: sunday,
    endDatetime: hoursAfter(sunday, 4),
  }),
  createEvent("evt-list-5", {
    title: "Tech Talk: AI Trends",
    description: "A panel discussion on the latest advances in AI and what they mean for students and industry.",
    location: "Lecture Hall A",
    category: "tech",
    status: "published",
    capacity: 120,
    organizerId: "user-staff",
    organizerName: "Sam Staff",
    startDatetime: daysFromNow(10),
    endDatetime: hoursAfter(daysFromNow(10), 2),
  }),
  createEvent("evt-list-6", {
    title: "Board Game Night",
    description: "Casual board game night with a huge library of games to choose from.",
    location: "Commons Room",
    category: "social",
    status: "published",
    capacity: null,
    organizerId: "user-staff",
    organizerName: "Sam Staff",
    startDatetime: daysFromNow(5),
    endDatetime: hoursAfter(daysFromNow(5), 3),
  }),
  createEvent("evt-draft-1", {
    title: "End-of-Year Gala",
    description: "Annual end-of-year celebration. Details TBD.",
    location: "Grand Ballroom",
    category: "social",
    status: "draft",
    capacity: 300,
    organizerId: "user-staff",
    organizerName: "Sam Staff",
    startDatetime: daysFromNow(30),
    endDatetime: hoursAfter(daysFromNow(30), 4),
  }),
  createEvent("evt-past-1", {
    title: "Winter Networking Mixer",
    description: "An evening of networking and light refreshments.",
    location: "Rooftop Lounge",
    category: "social",
    status: "past",
    capacity: null,
    organizerId: "user-staff",
    organizerName: "Sam Staff",
    startDatetime: daysFromNow(-14),
    endDatetime: hoursAfter(daysFromNow(-14), 3),
  }),
  createEvent("evt-past-2", {
    title: "Resume Workshop",
    description: "Get your resume reviewed by career coaches and industry professionals.",
    location: "Career Center",
    category: "careers",
    status: "past",
    capacity: null,
    organizerId: "user-staff",
    organizerName: "Sam Staff",
    startDatetime: daysFromNow(-7),
    endDatetime: hoursAfter(daysFromNow(-7), 2),
  }),
];

// ── In-memory implementation ──────────────────────────────────────────────────

class InMemoryEventEditingRepository implements IEventEditingRepository {
  private readonly events: IEvent[];

  constructor(seed: IEvent[]) {
    this.events = [...seed];
  }

  async findById(eventId: string): Promise<Result<IEvent, EventEditingRepoError>> {
    try {
      const event = this.events.find((e) => e.id === eventId) ?? null;
      if (!event) return Err({ type: "EventNotFound" as const });
      return Ok(event);
    } catch {
      return Err({ type: "UnexpectedError" as const, message: "Failed to find event." });
    }
  }

  async findAll(): Promise<Result<IEvent[], EventEditingRepoError>> {
    try {
      return Ok([...this.events]);
    } catch {
      return Err({ type: "UnexpectedError" as const, message: "Failed to fetch events." });
    }
  }

  async findPublished(): Promise<Result<IEvent[], EventEditingRepoError>> {
    try {
      return Ok(this.events.filter((e) => e.status === "published"));
    } catch {
      return Err({ type: "UnexpectedError" as const, message: "Failed to fetch events." });
    }
  }

  async add(data: CreateEventData): Promise<Result<IEvent, EventEditingRepoError>> {
    try {
      const id = `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const event = createEvent(id, data);
      this.events.push(event);
      return Ok(event);
    } catch {
      return Err({ type: "UnexpectedError" as const, message: "Failed to create event." });
    }
  }

  async update(eventId: string, data: UpdateEventInput): Promise<Result<IEvent, EventEditingRepoError>> {
    try {
      const index = this.events.findIndex((e) => e.id === eventId);
      if (index === -1) return Err({ type: "EventNotFound" as const });
      const updated: IEvent = { ...this.events[index], ...data, updatedAt: new Date() };
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

  async search(query: string): Promise<Result<IEvent[], EventEditingRepoError>> {
    try {
      if (!query.trim()) return Ok([...this.events]);
      const q = query.toLowerCase();
      const matches = this.events.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          e.location.toLowerCase().includes(q),
      );
      return Ok(matches);
    } catch {
      return Err({ type: "UnexpectedError" as const, message: "Failed to search events." });
    }
  }
}

// ── Factory function ──────────────────────────────────────────────────────────

export function CreateInMemoryEventEditingRepository(): IEventEditingRepository {
  return new InMemoryEventEditingRepository(SEED_EVENTS);
}
