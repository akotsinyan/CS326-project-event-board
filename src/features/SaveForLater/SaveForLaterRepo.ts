import { Ok, Err, type Result } from "../../lib/result";
import {
  SaveEventError,
  UnexpectedDependencyError,
} from "./errors";

// ── Types ─────────────────────────────────────────────

export interface ISavedEvent {
  userId: string;
  eventId: string;
  createdAt: Date;
}

export interface ISaveForLaterRepository {
  toggle(userId: string, eventId: string): Promise<Result<"saved" | "unsaved", SaveEventError>>;
  findByUser(userId: string): Promise<Result<ISavedEvent[], SaveEventError>>;
}

// ── In-memory implementation ─────────────────────────

class InMemorySaveForLaterRepository implements ISaveForLaterRepository {
  private saved: ISavedEvent[] = [];

  async toggle(userId: string, eventId: string): Promise<Result<"saved" | "unsaved", SaveEventError>> {
    try {
      const index = this.saved.findIndex(
        (s) => s.userId === userId && s.eventId === eventId,
      );

      if (index !== -1) {
        this.saved.splice(index, 1);
        return Ok("unsaved" as const);
      }

      this.saved.push({
        userId,
        eventId,
        createdAt: new Date(),
      });

      return Ok("saved"as const);
    } catch {
      return Err(UnexpectedDependencyError("Failed to toggle saved event."));
    }
  }

  async findByUser(userId: string): Promise<Result<ISavedEvent[], SaveEventError>> {
    try {
      return Ok(this.saved.filter((s) => s.userId === userId));
    } catch {
      return Err(UnexpectedDependencyError("Failed to load saved events."));
    }
  }
}

// ── Factory ──────────────────────────────────────────

export function CreateInMemorySaveForLaterRepository(): ISaveForLaterRepository {
  return new InMemorySaveForLaterRepository();
}