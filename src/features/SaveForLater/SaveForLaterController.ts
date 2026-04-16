import type { Response, Request } from "express";
import type { ISaveForLaterService } from "./SaveForLaterService";
import type { ILoggingService } from "../../service/LoggingService";
import type { SaveEventError } from "./errors";
import { getAuthenticatedUser } from "../../session/AppSession";
import type { IUserSummary } from "../../auth/User";
import type { IAuthenticatedUserSession } from "../../session/AppSession";

// ── Interface ────────────────────────────────────────

export interface ISaveForLaterController {
  toggleFromButton(req: Request, res: Response): Promise<void>;
  showSavedPage(req: Request, res: Response): Promise<void>;
}

// ── Helper: map session → domain user ────────────────

function mapSessionToUser(
  sessionUser: IAuthenticatedUserSession | null,
): IUserSummary | null {
  if (!sessionUser) return null;

  return {
    id: sessionUser.userId,
    role: sessionUser.role,
    displayName: sessionUser.displayName,
    email: sessionUser.email,
  };
}

// ── Implementation ───────────────────────────────────

class SaveForLaterController implements ISaveForLaterController {
  constructor(
    private readonly service: ISaveForLaterService,
    private readonly logger: ILoggingService,
  ) { }

  private mapErrorStatus(error: SaveEventError): number {
    if (error.name === "ValidationError") return 400;
    if (error.name === "Unauthorized") return 403;
    if (error.name === "EventNotFound") return 404;
    return 500;
  }

  async toggleFromButton(req: Request, res: Response): Promise<void> {
    const sessionUser = getAuthenticatedUser(req.session);
    const user = mapSessionToUser(sessionUser);

    const eventId =
      typeof req.params.eventId === "string" ? req.params.eventId : "";

    const result = await this.service.toggleSave(user, eventId);

    if (!result.ok) {
      const error = result.value as SaveEventError;
      this.logger.warn(`Save toggle failed: ${error.message}`);
      res
        .status(this.mapErrorStatus(error))
        .render("partials/error", {
          message: error.message,
          layout: false,
        });
      return;
    }

    // HTMX-friendly partial update
    res.render("events/partials/saveButton", {
      state: result.value, // "saved" | "unsaved"
      eventId,
      layout: false,
    });
  }

  async showSavedPage(req: Request, res: Response): Promise<void> {
    const sessionUser = getAuthenticatedUser(req.session);
    const user = mapSessionToUser(sessionUser);

    const result = await this.service.listSaved(user);

    if (!result.ok) {
      const error = result.value as SaveEventError;
      this.logger.warn(`Load saved events failed: ${error.message}`);
      res.status(this.mapErrorStatus(error)).render("saved/index", {
        savedEvents: [],
        pageError: error.message,
      });
      return;
    }

    res.render("saved/index", {
      savedEvents: result.value,
      pageError: null,
    });
  }
}

// ── Factory ──────────────────────────────────────────

export function CreateSaveForLaterController(
  service: ISaveForLaterService,
  logger: ILoggingService,
): ISaveForLaterController {
  return new SaveForLaterController(service, logger);
}