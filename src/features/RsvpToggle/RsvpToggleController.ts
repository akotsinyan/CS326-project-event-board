import type { Request, Response } from "express";
import type { IRsvpToggleService, RsvpToggleError } from "./RsvpToggleService";
import type { AppSessionStore } from "../../session/AppSession";

export interface IRsvpToggleController {
  toggleRsvp(req: Request, res: Response): Promise<void>;
  getRsvpStatus(req: Request, res: Response): Promise<void>;
}

class RsvpToggleController implements IRsvpToggleController {
  constructor(private readonly rsvpService: IRsvpToggleService) {}

  async toggleRsvp(req: Request, res: Response): Promise<void> {
    const session = req.session as AppSessionStore;
    const authedUser = session.app?.authenticatedUser ?? null;

    if (!authedUser) {
      res.status(401).render("error", { message: "You must be logged in to RSVP." });
      return;
    }

    const eventId = Array.isArray(req.params.eventId) ? req.params.eventId[0] : req.params.eventId;
    const userId = authedUser.userId;
    const userRole = authedUser.role;

    const result = await this.rsvpService.toggleRsvp(eventId, userId, userRole);

    if (!result.ok) {
      const error = result.value as RsvpToggleError;

      if (error.type === "EventNotFound") {
        res.status(404).render("error", { message: "Event not found." });
      } else if (error.type === "Unauthorized") {
        res.status(403).render("error", { message: "Organizers and admins cannot RSVP." });
      } else if (error.type === "InvalidState") {
        res.status(400).render("error", { message: error.message });
      } else {
        res.status(500).render("error", { message: "Something went wrong." });
      }
      return;
    }

    res.redirect(`/events/${eventId}`);
  }

  async getRsvpStatus(req: Request, res: Response): Promise<void> {
    const session = req.session as AppSessionStore;
    const authedUser = session.app?.authenticatedUser ?? null;

    if (!authedUser) {
      res.status(401).json({ error: "Not authenticated." });
      return;
    }

    const eventId = Array.isArray(req.params.eventId) ? req.params.eventId[0] : req.params.eventId;
    const result = await this.rsvpService.getRsvpStatus(eventId, authedUser.userId);

    if (!result.ok) {
      res.status(404).json({ error: "Event not found." });
      return;
    }

    res.json(result.value);
  }
}

export function CreateRsvpToggleController(
  rsvpService: IRsvpToggleService
): IRsvpToggleController {
  return new RsvpToggleController(rsvpService);
}