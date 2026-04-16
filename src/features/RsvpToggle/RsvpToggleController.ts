import type { Request, Response } from "express";
import type { IRsvpToggleService, RsvpToggleError } from "./RsvpToggleService";
import { getAuthenticatedUser } from "../../session/AppSession";
import type { AppSessionStore } from "../../session/AppSession";

export interface IRsvpToggleController {
  toggleRsvp(req: Request, res: Response): Promise<void>;
  getRsvpStatus(req: Request, res: Response): Promise<void>;
}

class RsvpToggleController implements IRsvpToggleController {
  constructor(private readonly rsvpService: IRsvpToggleService) {}

  async toggleRsvp(req: Request, res: Response): Promise<void> {
    const store = req.session as AppSessionStore;
    const authedUser = getAuthenticatedUser(store);

    if (!authedUser) {
      res.status(401).render("partials/error", { message: "You must be logged in to RSVP.", layout: false });
      return;
    }

    const eventId = typeof req.params.eventId === "string" ? req.params.eventId : "";

    const result = await this.rsvpService.toggleRsvp(eventId, authedUser.userId, authedUser.role);

    if (!result.ok) {
      const error = result.value as RsvpToggleError;
      const status =
        error.type === "EventNotFound" ? 404
        : error.type === "Unauthorized" ? 403
        : error.type === "InvalidState" ? 400
        : 500;
      const message =
        "message" in error ? error.message : error.type === "EventNotFound" ? "Event not found." : "Something went wrong.";
      res.status(status).render("partials/error", { message, layout: false });
      return;
    }

    const redirectUrl = `/events/${eventId}`;
    if (req.get("HX-Request") === "true") {
      res.set("HX-Redirect", redirectUrl).sendStatus(204);
    } else {
      res.redirect(redirectUrl);
    }
  }

  async getRsvpStatus(req: Request, res: Response): Promise<void> {
    const store = req.session as AppSessionStore;
    const authedUser = getAuthenticatedUser(store);

    if (!authedUser) {
      res.status(401).json({ error: "Not authenticated." });
      return;
    }

    const eventId = typeof req.params.eventId === "string" ? req.params.eventId : "";
    const result = await this.rsvpService.getRsvpStatus(eventId, authedUser.userId);

    if (!result.ok) {
      res.status(500).json({ error: "Failed to fetch RSVP status." });
      return;
    }

    res.json(result.value);
  }
}

export function CreateRsvpToggleController(
  rsvpService: IRsvpToggleService,
): IRsvpToggleController {
  return new RsvpToggleController(rsvpService);
}
