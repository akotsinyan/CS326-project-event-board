import { PrismaClient } from "@prisma/client";
import { Ok, Err, type Result } from "../../lib/result";
import type {
  IEventEditingRepository,
  IEvent,
  EventEditingRepoError,
  CreateEventData,
  UpdateEventInput,
  EventStatus,
} from "./EventEditingRepository";

function toIEvent(row: {
  id: string;
  title: string;
  description: string;
  location: string;
  category: string;
  capacity: number | null;
  status: string;
  startDatetime: Date;
  endDatetime: Date;
  organizerId: string;
  organizerName: string;
  createdAt: Date;
  updatedAt: Date;
}): IEvent {
  const validStatuses: EventStatus[] = ["draft", "published", "cancelled", "past"];
  const status: EventStatus = validStatuses.includes(row.status as EventStatus)
    ? (row.status as EventStatus)
    : "draft";
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    location: row.location,
    category: row.category,
    capacity: row.capacity,
    status,
    startDatetime: row.startDatetime,
    endDatetime: row.endDatetime,
    organizerId: row.organizerId,
    organizerName: row.organizerName,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

class PrismaEventEditingRepository implements IEventEditingRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(eventId: string): Promise<Result<IEvent, EventEditingRepoError>> {
    try {
      const row = await this.prisma.event.findUnique({ where: { id: eventId } });
      if (!row) return Err({ type: "EventNotFound" as const });
      return Ok(toIEvent(row));
    } catch {
      return Err({ type: "UnexpectedError" as const, message: "Failed to find event." });
    }
  }

  async findAll(): Promise<Result<IEvent[], EventEditingRepoError>> {
    try {
      const rows = await this.prisma.event.findMany({ orderBy: { startDatetime: "asc" } });
      return Ok(rows.map(toIEvent));
    } catch {
      return Err({ type: "UnexpectedError" as const, message: "Failed to fetch events." });
    }
  }

  async findPublished(): Promise<Result<IEvent[], EventEditingRepoError>> {
    try {
      const rows = await this.prisma.event.findMany({
        where: { status: "published" },
        orderBy: { startDatetime: "asc" },
      });
      return Ok(rows.map(toIEvent));
    } catch {
      return Err({ type: "UnexpectedError" as const, message: "Failed to fetch published events." });
    }
  }

  async add(data: CreateEventData): Promise<Result<IEvent, EventEditingRepoError>> {
    try {
      const row = await this.prisma.event.create({
        data: {
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
        },
      });
      return Ok(toIEvent(row));
    } catch {
      return Err({ type: "UnexpectedError" as const, message: "Failed to create event." });
    }
  }

  async update(eventId: string, data: UpdateEventInput): Promise<Result<IEvent, EventEditingRepoError>> {
    try {
      const row = await this.prisma.event.update({
        where: { id: eventId },
        data: {
          ...(data.title !== undefined && { title: data.title }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.location !== undefined && { location: data.location }),
          ...(data.category !== undefined && { category: data.category }),
          ...("capacity" in data && { capacity: data.capacity }),
          ...(data.startDatetime !== undefined && { startDateTime: data.startDatetime }),
          ...(data.endDatetime !== undefined && { endDateTime: data.endDatetime }),
        },
      });
      return Ok(toIEvent(row));
    } catch (err: unknown) {
      if (isPrismaNotFound(err)) return Err({ type: "EventNotFound" as const });
      return Err({ type: "UnexpectedError" as const, message: "Failed to update event." });
    }
  }

  async updateStatus(eventId: string, status: EventStatus): Promise<Result<IEvent, EventEditingRepoError>> {
    try {
      const row = await this.prisma.event.update({
        where: { id: eventId },
        data: { status },
      });
      return Ok(toIEvent(row));
    } catch (err: unknown) {
      if (isPrismaNotFound(err)) return Err({ type: "EventNotFound" as const });
      return Err({ type: "UnexpectedError" as const, message: "Failed to update event status." });
    }
  }

  async search(query: string): Promise<Result<IEvent[], EventEditingRepoError>> {
    try {
      if (!query.trim()) {
        const rows = await this.prisma.event.findMany({ orderBy: { startDatetime: "asc" } });
        return Ok(rows.map(toIEvent));
      }
      const rows = await this.prisma.event.findMany({
        where: {
          OR: [
            { title: { contains: query } },
            { description: { contains: query } },
            { location: { contains: query } },
          ],
        },
        orderBy: { startDatetime: "asc" },
      });
      return Ok(rows.map(toIEvent));
    } catch {
      return Err({ type: "UnexpectedError" as const, message: "Failed to search events." });
    }
  }
}

function isPrismaNotFound(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "P2025"
  );
}

export function CreatePrismaEventEditingRepository(prisma: PrismaClient): IEventEditingRepository {
  return new PrismaEventEditingRepository(prisma);
}
