import { Err, Ok, Result } from "../../../lib/result";
import { createEvent, IEvent } from "../model/event";
import { EventError, ValidationError } from "./error";
import { IEventRepository, CreateEventInput } from "./EventRepository";

// ── Seed data ─────────────────────────────────────────────────────────────────

const now = new Date();

function daysFromNow(days: number): Date {
  const d = new Date(now);
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
  const d = new Date(now);
  const diff = (targetDay - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + diff);
  d.setHours(10, 0, 0, 0);
  return d;
}

const saturday = nextWeekday(6);
const sunday = nextWeekday(now.getDay() === 0 ? 7 : 0);

const SEED_EVENTS: IEvent[] = [
  createEvent("evt-list-1", {
    title: "Spring Hackathon", description: "", location: "Room 101",
    category: "tech", status: "published", organizerId: "user-staff",
    startDatetime: daysFromNow(2), endDatetime: hoursAfter(daysFromNow(2), 8),
  }),
  createEvent("evt-list-2", {
    title: "Career Fair", description: "", location: "Main Hall",
    category: "careers", status: "published", organizerId: "user-staff",
    startDatetime: daysFromNow(3), endDatetime: hoursAfter(daysFromNow(3), 6),
  }),
  createEvent("evt-list-3", {
    title: "Open Mic Night", description: "", location: "Student Union",
    category: "social", status: "published", organizerId: "user-staff",
    startDatetime: saturday, endDatetime: hoursAfter(saturday, 3),
  }),
  createEvent("evt-list-4", {
    title: "Sunday Study Hall", description: "", location: "Library",
    category: "academic", status: "published", organizerId: "user-staff",
    startDatetime: sunday, endDatetime: hoursAfter(sunday, 4),
  }),
  createEvent("evt-list-5", {
    title: "Tech Talk: AI Trends", description: "", location: "Lecture Hall A",
    category: "tech", status: "published", organizerId: "user-staff",
    startDatetime: daysFromNow(10), endDatetime: hoursAfter(daysFromNow(10), 2),
  }),
  createEvent("evt-list-6", {
    title: "Board Game Night", description: "", location: "Commons Room",
    category: "social", status: "published", organizerId: "user-staff",
    startDatetime: daysFromNow(5), endDatetime: hoursAfter(daysFromNow(5), 3),
  }),
  createEvent("evt-past-1", {
    title: "Winter Networking Mixer", description: "", location: "Rooftop Lounge",
    category: "social", status: "past", organizerId: "user-staff",
    startDatetime: daysFromNow(-14), endDatetime: hoursAfter(daysFromNow(-14), 3),
  }),
  createEvent("evt-past-2", {
    title: "Resume Workshop", description: "", location: "Career Center",
    category: "careers", status: "past", organizerId: "user-staff",
    startDatetime: daysFromNow(-7), endDatetime: hoursAfter(daysFromNow(-7), 2),
  }),
];

// ── Implementation ────────────────────────────────────────────────────────────

class InMemoryEventRepository implements IEventRepository {
  private events: IEvent[];

  constructor(seed: IEvent[]) {
    this.events = [...seed];
  }

  async add(data: CreateEventInput): Promise<Result<IEvent, EventError>> {
    const id = crypto.randomUUID();
    if (
      !data.title ||
      !data.description ||
      !data.location ||
      !data.startDatetime ||
      !data.endDatetime ||
      !data.organizerId
    ) {
      return Err(ValidationError("Repository: Missing required fields"));
    }
    const event = createEvent(id, data);
    this.events.push(event);
    return Ok(event);
  }

  async findAll(): Promise<Result<IEvent[], EventError>> {
    return Ok([...this.events]);
  }
}

export function CreateInMemoryEventRepository(): IEventRepository {
  return new InMemoryEventRepository(SEED_EVENTS);
}

export default InMemoryEventRepository;
