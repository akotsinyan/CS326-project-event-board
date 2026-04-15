import { Ok, Err, type Result } from "../../lib/result";
import type { IEvent } from "../CreateEvent/model/event";
import type { IEventListRepository, EventListFilter, Timeframe, EventListRepoError } from "./EventListRepository";

// ── Error types ───────────────────────────────────────────────────────────────

export type EventListError =
  | { type: "InvalidFilter"; message: string }
  | { type: "UnexpectedError"; message: string };

// ── Service interface ─────────────────────────────────────────────────────────

export interface IEventListService {
  getFilteredEvents(filter: EventListFilter): Promise<Result<IEvent[], EventListError>>;
}

// ── Timeframe helpers ─────────────────────────────────────────────────────────

export const VALID_TIMEFRAMES: Timeframe[] = ["all", "this-week", "this-weekend"];

function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

function getWeekBounds(now: Date): { weekStart: Date; weekEnd: Date } {
  const day = now.getDay();
  const day = now.getDay(); // 0 = Sunday
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const weekStart = startOfDay(now);
  weekStart.setDate(weekStart.getDate() + mondayOffset);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  return { weekStart, weekEnd };
}

function getWeekendBounds(now: Date): { saturdayStart: Date; sundayEnd: Date } {
  const day = now.getDay();
  const daysUntilSaturday = day === 0 ? 6 : 6 - day;
  const saturdayStart = startOfDay(now);
  saturdayStart.setDate(saturdayStart.getDate() + daysUntilSaturday);
  const sundayEnd = new Date(saturdayStart);
  sundayEnd.setDate(sundayEnd.getDate() + 2);
  return { saturdayStart, sundayEnd };
}

function applyTimeframe(events: IEvent[], timeframe: Timeframe, now: Date): IEvent[] {
  const upcoming = events.filter((e) => e.startDatetime >= now);
  if (timeframe === "all") return upcoming;
  if (timeframe === "this-week") {
    const { weekStart, weekEnd } = getWeekBounds(now);
    return upcoming.filter((e) => e.startDatetime >= weekStart && e.startDatetime < weekEnd);
  }
  const { saturdayStart, sundayEnd } = getWeekendBounds(now);
  return upcoming.filter((e) => e.startDatetime >= saturdayStart && e.startDatetime < sundayEnd);
}

// ── Implementation ────────────────────────────────────────────────────────────

class EventListService implements IEventListService {
  constructor(private readonly repo: IEventListRepository) {}

  async getFilteredEvents(filter: EventListFilter): Promise<Result<IEvent[], EventListError>> {
    const timeframe: Timeframe = filter.timeframe ?? "all";

    if (filter.timeframe !== undefined && !VALID_TIMEFRAMES.includes(filter.timeframe)) {
      return Err({ type: "InvalidFilter" as const, message: `Unknown timeframe: "${filter.timeframe}".` });
    }

    const repoResult = await this.repo.findPublished();
    if (!repoResult.ok) {
      const { message } = repoResult.value as EventListRepoError;
      return Err({ type: "UnexpectedError" as const, message });
    }

    let events = repoResult.value;

    if (filter.category) {
      const cat = filter.category.toLowerCase();
      events = events.filter((e) => e.category.toLowerCase() === cat);
    }

    events = applyTimeframe(events, timeframe, new Date());
    events.sort((a, b) => a.startDatetime.getTime() - b.startDatetime.getTime());

    return Ok(events);
  }
}

// ── Factory function ──────────────────────────────────────────────────────────

export function CreateEventListService(repo: IEventListRepository): IEventListService {
  return new EventListService(repo);
}
