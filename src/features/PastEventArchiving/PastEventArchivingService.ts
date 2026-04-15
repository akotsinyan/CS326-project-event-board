import { Ok, Err, type Result } from "../../lib/result";

export type EventStatus = "draft" | "published" | "cancelled" | "past";

export interface IArchivableEvent {
  id: string;
  title: string;
  description: string;
  location: string;
  category: string;
  status: EventStatus;
  capacity: number | null;
  startDatetime: Date;
  endDatetime: Date;
  organizerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IArchivableEventRepository {
  listAll(): Promise<Result<IArchivableEvent[], { type: "UnexpectedError"; message: string }>>;
  updateStatus(
    eventId: string,
    status: EventStatus,
  ): Promise<Result<IArchivableEvent, { type: "EventNotFound" } | { type: "UnexpectedError"; message: string }>>;
}

export type PastEventArchivingError = {
  type: "UnexpectedError";
  message: string;
};

export interface ArchivePastEventsResult {
  archivedCount: number;
}

export interface IPastEventArchivingService {
  archivePastEvents(
    now?: Date,
  ): Promise<Result<ArchivePastEventsResult, PastEventArchivingError>>;

  getArchivedEvents(
    now?: Date,
  ): Promise<Result<IArchivableEvent[], PastEventArchivingError>>;
}

class PastEventArchivingService implements IPastEventArchivingService {
  constructor(private readonly eventRepo: IArchivableEventRepository) {}

  async archivePastEvents(
    now: Date = new Date(),
  ): Promise<Result<ArchivePastEventsResult, PastEventArchivingError>> {
    const allEventsResult = await this.eventRepo.listAll();

    if (!allEventsResult.ok) {
      return Err({
        type: "UnexpectedError" as const,
        message: allEventsResult.value.message,
      });
    }

    let archivedCount = 0;

    for (const event of allEventsResult.value) {
      const shouldArchive =
        event.endDatetime.getTime() < now.getTime() &&
        event.status !== "past" &&
        event.status !== "cancelled";

      if (!shouldArchive) {
        continue;
      }

      const updateResult = await this.eventRepo.updateStatus(event.id, "past");

      if (!updateResult.ok) {
        return Err({
          type: "UnexpectedError" as const,
          message:
            updateResult.value.type === "UnexpectedError"
              ? updateResult.value.message
              : "Failed to archive event.",
        });
      }

      archivedCount += 1;
    }

    return Ok({ archivedCount });
  }

  async getArchivedEvents(
    now: Date = new Date(),
  ): Promise<Result<IArchivableEvent[], PastEventArchivingError>> {
    const archiveResult = await this.archivePastEvents(now);

    if (!archiveResult.ok) {
      return archiveResult;
    }

    const allEventsResult = await this.eventRepo.listAll();

    if (!allEventsResult.ok) {
      return Err({
        type: "UnexpectedError" as const,
        message: allEventsResult.value.message,
      });
    }

    const archivedEvents = allEventsResult.value
      .filter((event) => event.status === "past")
      .sort((a, b) => b.endDatetime.getTime() - a.endDatetime.getTime());

    return Ok(archivedEvents);
  }
}

export function CreatePastEventArchivingService(
  eventRepo: IArchivableEventRepository,
): IPastEventArchivingService {
  return new PastEventArchivingService(eventRepo);
}