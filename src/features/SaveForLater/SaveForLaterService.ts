import { type Result, Err } from "../../lib/result";
import type { ISaveForLaterRepository } from "./SaveForLaterRepo";
import {
  SaveEventError,
  ValidationError,
  Unauthorized,
} from "./errors";
import type { IUserSummary } from "../../auth/User";

// ── Interface ────────────────────────────────────────

export interface ISaveForLaterService {
  toggleSave(
    user: IUserSummary | null,
    eventId: string,
  ): Promise<Result<"saved" | "unsaved", SaveEventError>>;

  listSaved(
    user: IUserSummary | null,
  ): Promise<Result<string[], SaveEventError>>;
}

// ── Implementation ───────────────────────────────────

class SaveForLaterService implements ISaveForLaterService {
  constructor(private readonly repo: ISaveForLaterRepository) { }

  async toggleSave(
    user: IUserSummary | null,
    eventId: string,
  ): Promise<Result<"saved" | "unsaved", SaveEventError>> {
    if (!user) {
      return Err(Unauthorized("You must be logged in."));
    }

    if (user.role !== "user") {
      return Err(Unauthorized("Only members can save events."));
    }

    if (!eventId) {
      return Err(ValidationError("Invalid event ID."));
    }

    return this.repo.toggle(user.id, eventId);
  }

  async listSaved(
    user: IUserSummary | null,
  ): Promise<Result<string[], SaveEventError>> {
    if (!user) {
      return Err(Unauthorized("You must be logged in."));
    }

    if (user.role !== "user") {
      return Err(Unauthorized("Only members have saved events."));
    }

    const result = await this.repo.findByUser(user.id);

    if (!result.ok) return result;

    return {
      ok: true,
      value: result.value.map((s) => s.eventId),
    };
  }
}

// ── Factory ──────────────────────────────────────────

export function CreateSaveForLaterService(
  repo: ISaveForLaterRepository,
): ISaveForLaterService {
  return new SaveForLaterService(repo);
}