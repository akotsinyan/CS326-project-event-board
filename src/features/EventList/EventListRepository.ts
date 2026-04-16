import { Ok, Err, type Result } from "../../lib/result";
import { type IEvent, createEvent } from "../CreateEvent/model/event";

// ── Filter types ──────────────────────────────────────────────────────────────

export type Timeframe = "all" | "this-week" | "this-weekend";

export interface EventListFilter {
  category?: string;
  timeframe?: Timeframe;
}

// ── Error types ───────────────────────────────────────────────────────────────

export type EventListRepoError = { type: "UnexpectedError"; message: string };

// ── Repository interface ──────────────────────────────────────────────────────

export interface IEventListRepository {
  findPublished(): Promise<Result<IEvent[], EventListRepoError>>;
  findAll(): Promise<Result<IEvent[], EventListRepoError>>;
}

// ── Seed data ─────────────────────────────────────────────────────────────────

const now = new Date();

function daysFromNow(days: number): Date {
  const d = new Date(now);
  d.setDate(d.getDate() + days);
  return d;
}

// Find the next Saturday (0 = same day if already Saturday)
function nextWeekday(targetDay: number): Date {
  const d = new Date(now);
  const current = d.getDay();
  const diff = (targetDay - current + 7) % 7;
  d.setDate(d.getDate() + diff);
  return d;
}

function makeEvent(
  id: string,
  title: string,
  category: string,
  startOffset: Date,
  hoursLong: number,
  organizerId: string,
  status: IEvent["status"] = "published"
): IEvent {
  const start = new Date(startOffset);
  start.setHours(10, 0, 0, 0);
  const end = new Date(start);
  end.setHours(start.getHours() + hoursLong);
  return createEvent(id, {
    title,
    description: "",
    location: "TBD",
    category,
    status,
    startDatetime: start,
    endDatetime: end,
    organizerId,
  });
}

const saturday = nextWeekday(6);
const sunday = nextWeekday(now.getDay() === 0 ? 7 : 0);

const SEED_EVENTS: IEvent[] = [
  makeEvent("evt-list-1", "Spring Hackathon", "tech", daysFromNow(2), 8, "user-staff"),
  makeEvent("evt-list-2", "Career Fair", "careers", daysFromNow(3), 6, "user-staff"),
  makeEvent("evt-list-3", "Open Mic Night", "social", saturday, 3, "user-staff"),
  makeEvent("evt-list-4", "Sunday Study Hall", "academic", sunday, 4, "user-staff"),
  makeEvent("evt-list-5", "Tech Talk: AI Trends", "tech", daysFromNow(10), 2, "user-staff"),
  makeEvent("evt-list-6", "Board Game Night", "social", daysFromNow(5), 3, "user-staff"),
  // Past events — referenced by RSVP dashboard seed data
  makeEvent("evt-past-1", "Winter Networking Mixer", "social",   daysFromNow(-14), 3, "user-staff", "past"),
  makeEvent("evt-past-2", "Resume Workshop",          "careers",  daysFromNow(-7),  2, "user-staff", "past"),
];

// ── In-memory implementation ──────────────────────────────────────────────────

class InMemoryEventListRepository implements IEventListRepository {
  constructor(private readonly events: IEvent[]) {}

  async findPublished(): Promise<Result<IEvent[], EventListRepoError>> {
    try {
      return Ok(this.events.filter((e) => e.status === "published"));
    } catch {
      return Err({ type: "UnexpectedError" as const, message: "Failed to fetch events." });
    }
  }

  async findAll(): Promise<Result<IEvent[], EventListRepoError>> {
    try {
      return Ok([...this.events]);
    } catch {
      return Err({ type: "UnexpectedError" as const, message: "Failed to fetch events." });
    }
  }
}

// ── Factory function ──────────────────────────────────────────────────────────

export function CreateInMemoryEventListRepository(): IEventListRepository {
  return new InMemoryEventListRepository([...SEED_EVENTS]);
}
