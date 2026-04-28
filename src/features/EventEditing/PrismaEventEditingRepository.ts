import { Ok, Err, type Result } from "../../lib/result";
import { getPrismaClient } from "../../lib/prisma";
import { toEvent } from "../CreateEvent/model/event";
import type { IEvent, EventStatus, CreateEventData } from "../CreateEvent/model/event";
import type {
  IEventEditingRepository,
  EventEditingRepoError,
  UpdateEventInput,
} from "./EventEditingRepository";

class PrismaEventEditingRepository implements IEventEditingRepository {
  private get prisma() {
    return getPrismaClient();
  }

  async findById(eventId: string): Promise<Result<IEvent, EventEditingRepoError>> {
    try {
      const event = await this.prisma.event.findUnique({ where: { id: eventId } });
      if (!event) return Err({ type: "EventNotFound" as const });
      return Ok(toEvent(event));
    } catch {
      return Err({ type: "UnexpectedError" as const, message: "Failed to find event." });
    }
  }

  async findAll(): Promise<Result<IEvent[], EventEditingRepoError>> {
    try {
      const events = await this.prisma.event.findMany();
      return Ok(events.map(toEvent));
    } catch {
      return Err({ type: "UnexpectedError" as const, message: "Failed to fetch events." });
    }
  }

  async findPublished(): Promise<Result<IEvent[], EventEditingRepoError>> {
    try {
      const events = await this.prisma.event.findMany({ where: { status: "published" } });
      return Ok(events.map(toEvent));
    } catch {
      return Err({ type: "UnexpectedError" as const, message: "Failed to fetch published events." });
    }
  }

  async add(data: CreateEventData): Promise<Result<IEvent, EventEditingRepoError>> {
    try {
      const id = `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const event = await this.prisma.event.create({
        data: {
          id,
          title: data.title,
          description: data.description,
          location: data.location,
          category: data.category ?? "general",
          capacity: data.capacity ?? null,
          status: data.status ?? "draft",
          startDatetime: data.startDatetime,
          endDatetime: data.endDatetime,
          organizerId: data.organizerId,
          organizerName: data.organizerName ?? "",
          createdAt: data.createdAt ?? new Date(),
        },
      });
      return Ok(toEvent(event));
    } catch {
      return Err({ type: "UnexpectedError" as const, message: "Failed to create event." });
    }
  }

  async update(eventId: string, data: UpdateEventInput): Promise<Result<IEvent, EventEditingRepoError>> {
    try {
      const event = await this.prisma.event.update({
        where: { id: eventId },
        data,
      });
      return Ok(toEvent(event));
    } catch {
      return Err({ type: "EventNotFound" as const });
    }
  }

  async updateStatus(eventId: string, status: EventStatus): Promise<Result<IEvent, EventEditingRepoError>> {
    try {
      const event = await this.prisma.event.update({
        where: { id: eventId },
        data: { status },
      });
      return Ok(toEvent(event));
    } catch {
      return Err({ type: "EventNotFound" as const });
    }
  }

  async search(query: string): Promise<Result<IEvent[], EventEditingRepoError>> {
    try {
      const all = await this.prisma.event.findMany();
      if (!query.trim()) return Ok(all.map(toEvent));
      const q = query.toLowerCase();
      return Ok(
        all
          .filter(
            (e) =>
              e.title.toLowerCase().includes(q) ||
              e.description.toLowerCase().includes(q) ||
              e.location.toLowerCase().includes(q),
          )
          .map(toEvent),
      );
    } catch {
      return Err({ type: "UnexpectedError" as const, message: "Failed to search events." });
    }
  }
}

export function CreatePrismaEventEditingRepository(): IEventEditingRepository {
  return new PrismaEventEditingRepository();
}
