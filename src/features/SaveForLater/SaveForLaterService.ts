import { Ok, type Result, Err } from "../../lib/result";
import type { ISaveForLaterRepository } from "./SaveForLaterRepo";
import { SaveEventError, ValidationError, Unauthorized, UnexpectedDependencyError } from "./errors";
import type { IUserSummary } from "../../auth/User";
import type { IEventEditingRepository } from "../EventEditing/EventEditingRepository";
import type { IEvent } from "../CreateEvent/model/event";

// ── Interface ────────────────────────────────────────

export interface ISaveForLaterService {
  toggleSave(
    user: IUserSummary | null,
    eventId: string,
  ): Promise<Result<"saved" | "unsaved", SaveEventError>>;

  listSaved(
    user: IUserSummary | null,
  ): Promise<Result<IEvent[], SaveEventError>>;
}

// ── Implementation ───────────────────────────────────

class SaveForLaterService implements ISaveForLaterService {
  constructor(
    private readonly repo: ISaveForLaterRepository,
    private readonly eventRepo: IEventEditingRepository,
  ) {}

  async toggleSave(
    user: IUserSummary | null,
    eventId: string,
  ): Promise<Result<"saved" | "unsaved", SaveEventError>> {
    if (!user) return Err(Unauthorized("You must be logged in."));
    if (user.role !== "user") return Err(Unauthorized("Only members can save events."));
    if (!eventId) return Err(ValidationError("Invalid event ID."));
    return this.repo.toggle(user.id, eventId);
  }

  async listSaved(
    user: IUserSummary | null,
  ): Promise<Result<IEvent[], SaveEventError>> {
    if (!user) return Err(Unauthorized("You must be logged in."));
    if (user.role !== "user") return Err(Unauthorized("Only members have saved events."));

    const savedResult = await this.repo.findByUser(user.id);
    if (!savedResult.ok) return Err(savedResult.value as SaveEventError);

    const eventsResult = await this.eventRepo.findAll();
    if (!eventsResult.ok) return Err(UnexpectedDependencyError("Failed to load event details."));

    const eventMap = new Map(eventsResult.value.map((e) => [e.id, e]));
    const events = savedResult.value
      .map((s) => eventMap.get(s.eventId))
      .filter((e): e is IEvent => e !== undefined);

    return Ok(events);
  }
}

// ── Factory ──────────────────────────────────────────

export function CreateSaveForLaterService(
  repo: ISaveForLaterRepository,
  eventRepo: IEventEditingRepository,
): ISaveForLaterService {
  return new SaveForLaterService(repo, eventRepo);
}
