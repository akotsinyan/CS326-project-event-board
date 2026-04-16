import { Ok, Err, type Result } from "../../lib/result";
import type { IEvent } from "../CreateEvent/model/event";
import type { IEventEditingRepository, EventEditingRepoError } from "../EventEditing/EventEditingRepository";

// ── Error types ───────────────────────────────────────────────────────────────

export type PastEventArchivingError = { type: "UnexpectedError"; message: string };

export interface ArchivePastEventsResult {
  archivedCount: number;
}

// ── Service interface ─────────────────────────────────────────────────────────

export interface IPastEventArchivingService {
  archivePastEvents(now?: Date): Promise<Result<ArchivePastEventsResult, PastEventArchivingError>>;
  getArchivedEvents(now?: Date): Promise<Result<IEvent[], PastEventArchivingError>>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toArchivingError(err: EventEditingRepoError): PastEventArchivingError {
  const message = err.type === "UnexpectedError" ? err.message : "Event operation failed.";
  return { type: "UnexpectedError", message };
}

// ── Implementation ────────────────────────────────────────────────────────────

class PastEventArchivingService implements IPastEventArchivingService {
  constructor(private readonly eventRepo: IEventEditingRepository) {}

  async archivePastEvents(
    now: Date = new Date(),
  ): Promise<Result<ArchivePastEventsResult, PastEventArchivingError>> {
    const allResult = await this.eventRepo.findAll();
    if (!allResult.ok) {
      return Err(toArchivingError(allResult.value as EventEditingRepoError));
    }

    let archivedCount = 0;

    for (const event of allResult.value as IEvent[]) {
      const shouldArchive =
        event.endDatetime.getTime() < now.getTime() &&
        event.status !== "past" &&
        event.status !== "cancelled";

      if (!shouldArchive) continue;

      const updateResult = await this.eventRepo.updateStatus(event.id, "past");
      if (!updateResult.ok) {
        return Err(toArchivingError(updateResult.value as EventEditingRepoError));
      }

      archivedCount += 1;
    }

    return Ok({ archivedCount });
  }

  async getArchivedEvents(
    now: Date = new Date(),
  ): Promise<Result<IEvent[], PastEventArchivingError>> {
    const archiveResult = await this.archivePastEvents(now);
    if (!archiveResult.ok) {
      return Err(archiveResult.value as PastEventArchivingError);
    }

    const allResult = await this.eventRepo.findAll();
    if (!allResult.ok) {
      return Err(toArchivingError(allResult.value as EventEditingRepoError));
    }

    const archived = (allResult.value as IEvent[])
      .filter((e) => e.status === "past")
      .sort((a, b) => b.endDatetime.getTime() - a.endDatetime.getTime());

    return Ok(archived);
  }
}

// ── Factory function ──────────────────────────────────────────────────────────

export function CreatePastEventArchivingService(
  eventRepo: IEventEditingRepository,
): IPastEventArchivingService {
  return new PastEventArchivingService(eventRepo);
}
