import { PrismaClient } from "@prisma/client";
import { Ok, Err, type Result } from "../../lib/result";
import {
  type ISaveForLaterRepository,
  type ISavedEvent,
} from "./SaveForLaterRepo";
import { UnexpectedDependencyError, type SaveEventError } from "./errors";

class PrismaSaveForLaterRepository implements ISaveForLaterRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async toggle(
    userId: string,
    eventId: string,
  ): Promise<Result<"saved" | "unsaved", SaveEventError>> {
    try {
      // Check if already saved
      const existing = await this.prisma.savedEvent.findUnique({
        where: {
          userId_eventId: {
            userId,
            eventId,
          },
        },
      });

      if (existing) {
        // If already saved, delete it
        await this.prisma.savedEvent.delete({
          where: {
            userId_eventId: {
              userId,
              eventId,
            },
          },
        });
        return Ok("unsaved" as const);
      }

      // If not saved, create it
      await this.prisma.savedEvent.create({
        data: {
          userId,
          eventId,
          createdAt: new Date(),
        },
      });
      return Ok("saved" as const);
    } catch (error) {
      console.error("Error toggling saved event:", error);
      return Err(
        UnexpectedDependencyError("Failed to toggle saved event."),
      );
    }
  }

  async findByUser(userId: string): Promise<Result<ISavedEvent[], SaveEventError>> {
    try {
      const saved = await this.prisma.savedEvent.findMany({
        where: { userId },
      });

      return Ok(
        saved.map((s) => ({
          userId: s.userId,
          eventId: s.eventId,
          createdAt: s.createdAt,
        })),
      );
    } catch (error) {
      console.error("Error finding saved events:", error);
      return Err(
        UnexpectedDependencyError("Failed to load saved events."),
      );
    }
  }
}

export function CreatePrismaSaveForLaterRepository(
  prisma: PrismaClient,
): ISaveForLaterRepository {
  return new PrismaSaveForLaterRepository(prisma);
}
