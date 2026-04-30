import { PrismaClient } from "@prisma/client";
import { Ok, Err, type Result } from "../../lib/result";
import type {
  IEvent,
  IEventEditingRepository,
  UpdateEventInput,
  EventEditingRepoError,
} from "./EventEditingRepository";

export class PrismaEventEditingRepository implements IEventEditingRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(eventId: string): Promise<Result<IEvent, EventEditingRepoError>> {
    try {
      const event = await this.prisma.event.findUnique({
        where: { id: eventId },
      });

      if (!event) {
        return Err({ type: "EventNotFound" } as const);
      }

      return Ok(event as IEvent);
    } catch {
      return Err({
        type: "UnexpectedError",
        message: "Failed to find event.",
      } as const);
    }
  }

  async findAll(): Promise<Result<IEvent[], EventEditingRepoError>> {
    try {
      const events = await this.prisma.event.findMany({
        orderBy: { startDatetime: "asc" },
      });

      return Ok(events as IEvent[]);
    } catch {
      return Err({
        type: "UnexpectedError",
        message: "Failed to list events.",
      } as const);
    }
  }

  async findPublished(): Promise<Result<IEvent[], EventEditingRepoError>> {
    try {
      const events = await this.prisma.event.findMany({
        where: { status: "published" },
        orderBy: { startDatetime: "asc" },
      });

      return Ok(events as IEvent[]);
    } catch {
      return Err({
        type: "UnexpectedError",
        message: "Failed to list published events.",
      } as const);
    }
  }

  async add(data: IEvent): Promise<Result<IEvent, EventEditingRepoError>> {
    try {
      const event = await this.prisma.event.create({
        data: {
          id: data.id,
          title: data.title,
          description: data.description,
          location: data.location,
          category: data.category,
          status: data.status,
          capacity: data.capacity,
          startDatetime: data.startDatetime,
          endDatetime: data.endDatetime,
          organizerId: data.organizerId,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        },
      });

      return Ok(event as IEvent);
    } catch {
      return Err({
        type: "UnexpectedError",
        message: "Failed to create event.",
      } as const);
    }
  }

  async update(
    eventId: string,
    data: UpdateEventInput
  ): Promise<Result<IEvent, EventEditingRepoError>> {
    try {
      const event = await this.prisma.event.update({
        where: { id: eventId },
        data: {
          title: data.title,
          description: data.description,
          location: data.location,
          category: data.category,
          capacity: data.capacity,
          startDatetime: data.startDatetime,
          endDatetime: data.endDatetime,
        },
      });

      return Ok(event as IEvent);
    } catch {
      return Err({
        type: "UnexpectedError",
        message: "Failed to update event.",
      } as const);
    }
  }

  async updateStatus(
    eventId: string,
    status: IEvent["status"]
  ): Promise<Result<IEvent, EventEditingRepoError>> {
    try {
      const event = await this.prisma.event.update({
        where: { id: eventId },
        data: { status },
      });

      return Ok(event as IEvent);
    } catch {
      return Err({
        type: "UnexpectedError",
        message: "Failed to update event status.",
      } as const);
    }
  }

  async search(query: string): Promise<Result<IEvent[], EventEditingRepoError>> {
    try {
      const events = await this.prisma.event.findMany({
        where: {
          OR: [
            { title: { contains: query } },
            { description: { contains: query } },
            { location: { contains: query } },
            { category: { contains: query } },
          ],
        },
        orderBy: { startDatetime: "asc" },
      });

      return Ok(events as IEvent[]);
    } catch {
      return Err({
        type: "UnexpectedError",
        message: "Failed to search events.",
      } as const);
    }
  }
}

export function CreatePrismaEventEditingRepository(
  prisma: PrismaClient
): IEventEditingRepository {
  return new PrismaEventEditingRepository(prisma);
}
