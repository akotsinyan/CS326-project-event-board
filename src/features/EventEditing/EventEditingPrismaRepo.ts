import { PrismaClient } from "@prisma/client";
import { Result, Err, Ok } from "../../lib/result";
import {
  IEventEditingRepository,
  IEvent,
  EventEditingRepoError,
  CreateEventData,
  UpdateEventInput,
  EventStatus,
} from "./EventEditingRepository";

class PrismaEventEditingRepository implements IEventEditingRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(
    eventId: string,
  ): Promise<Result<IEvent, EventEditingRepoError>> {
    return Err({
      type: "UnexpectedError" as const,
      message: "PrismaEventEditingRepository.findById is not implemented yet.",
    });
  }

  async findAll(): Promise<Result<IEvent[], EventEditingRepoError>> {
    return Err({
      type: "UnexpectedError" as const,
      message: "PrismaEventEditingRepository.findAll is not implemented yet.",
    });
  }

  async findPublished(): Promise<Result<IEvent[], EventEditingRepoError>> {
    return Err({
      type: "UnexpectedError" as const,
      message:
        "PrismaEventEditingRepository.findPublished is not implemented yet.",
    });
  }

  async add(
    data: CreateEventData,
  ): Promise<Result<IEvent, EventEditingRepoError>> {
    try {
      const created = await this.prisma.event.create({
        data: {
          title: data.title,
          description: data.description,
          location: data.location,
          category: data.category ?? "general",
          capacity: data.capacity ?? 0,
          status: data.status,
          startDateTime: data.startDatetime,
          endDateTime: data.endDatetime,
          organizerId: data.organizerId,
          organizerName: data.organizerName ?? "",
        },
      });
      return Ok({
        id: String(created.id),
        title: created.title,
        description: created.description,
        location: created.location,
        category: created.category,
        capacity: created.capacity,
        status: created.status as EventStatus,
        startDatetime: created.startDateTime,
        endDatetime: created.endDateTime,
        organizerId: String(created.organizerId),
        organizerName: created.organizerName,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
      });
    } catch (error) {
      console.error("Error creating event:", error);
      return Err({
        type: "UnexpectedError" as const,
        message: "Failed to create event.",
      });
    }
  }

  async update(
    eventId: string,
    data: UpdateEventInput,
  ): Promise<Result<IEvent, EventEditingRepoError>> {
    return Err({
      type: "UnexpectedError" as const,
      message: "PrismaEventEditingRepository.update is not implemented yet.",
    });
  }

  async updateStatus(
    eventId: string,
    status: EventStatus,
  ): Promise<Result<IEvent, EventEditingRepoError>> {
    return Err({
      type: "UnexpectedError" as const,
      message:
        "PrismaEventEditingRepository.updateStatus is not implemented yet.",
    });
  }

  async search(
    query: string,
  ): Promise<Result<IEvent[], EventEditingRepoError>> {
    return Err({
      type: "UnexpectedError" as const,
      message: "PrismaEventEditingRepository.search is not implemented yet.",
    });
  }
}

export function CreatePrismaEventEditingRepository(
  prisma: PrismaClient,
): IEventEditingRepository {
  return new PrismaEventEditingRepository(prisma);
}
