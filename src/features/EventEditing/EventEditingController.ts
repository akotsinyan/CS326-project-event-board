import type { Request, Response } from "express";
import type { IEventEditingService, EventEditingError } from "./EventEditingService";
import type { AppSessionStore } from "../../session/AppSession";
import { getAuthenticatedUser, touchAppSession } from "../../session/AppSession";

export interface IEventEditingController {
  showEditForm(req: Request, res: Response): Promise<void>;
  submitEditForm(req: Request, res: Response): Promise<void>;
}

class EventEditingController implements IEventEditingController {
  constructor(private readonly service: IEventEditingService) {}

  async showEditForm(req: Request, res: Response): Promise<void> {
    const store = req.session as AppSessionStore;
    const currentUser = getAuthenticatedUser(store);
    const session = touchAppSession(store);

    if (!currentUser) {
      res.redirect("/login");
      return;
    }

    const eventId = typeof req.params.eventId === "string" ? req.params.eventId : "";

    const result = await this.service.getEventForEdit(
      eventId,
      currentUser.userId,
      currentUser.role
    );

    if (!result.ok) {
      const error = result.value as EventEditingError;

      if (error.type === "EventNotFound") {
        res.status(404).render("partials/error", { message: "Event not found.", layout: false });
        return;
      }
      if (error.type === "Unauthorized") {
        res.status(403).render("partials/error", {
          message: "You are not allowed to edit this event.",
          layout: false,
        });
        return;
      }
      if (error.type === "InvalidState") {
        res.status(400).render("partials/error", {
          message: error.message,
          layout: false,
        });
        return;
      }

      res.status(500).render("partials/error", {
        message: "Unexpected error.",
        layout: false,
      });
      return;
    }

    res.render("events/edit", {
      session,
      event: result.value,
      pageError: null,
    });
  }

  async submitEditForm(req: Request, res: Response): Promise<void> {
    const store = req.session as AppSessionStore;
    const currentUser = getAuthenticatedUser(store);
    const session = touchAppSession(store);

    if (!currentUser) {
      res.redirect("/login");
      return;
    }

    const eventId = typeof req.params.eventId === "string" ? req.params.eventId : "";
    const isHtmx = req.get("HX-Request") === "true";

    const data = {
      title: typeof req.body.title === "string" ? req.body.title.trim() : undefined,
      description: typeof req.body.description === "string" ? req.body.description.trim() : undefined,
      location: typeof req.body.location === "string" ? req.body.location.trim() : undefined,
      category: typeof req.body.category === "string" ? req.body.category.trim() : undefined,
      startDatetime:
        typeof req.body.startDatetime === "string" && req.body.startDatetime
          ? new Date(req.body.startDatetime)
          : undefined,
      endDatetime:
        typeof req.body.endDatetime === "string" && req.body.endDatetime
          ? new Date(req.body.endDatetime)
          : undefined,
      capacity:
        typeof req.body.capacity === "string" && req.body.capacity.trim() !== ""
          ? Number(req.body.capacity)
          : null,
    };

    const result = await this.service.updateEvent(
      eventId,
      data,
      currentUser.userId,
      currentUser.role
    );

    if (!result.ok) {
      const error = result.value as EventEditingError;

      if (error.type === "EventNotFound") {
        res.status(404).render("partials/error", { message: "Event not found.", layout: false });
        return;
      }

      if (error.type === "Unauthorized") {
        res.status(403).render("partials/error", {
          message: "You are not allowed to edit this event.",
          layout: false,
        });
        return;
      }

      // InvalidState or InvalidInput — show error
      const errorMessage = "message" in error ? error.message : "Could not save changes.";

      if (isHtmx) {
        // Return just the error partial — HTMX swaps it into #edit-error
        res.status(400).render("partials/error", { message: errorMessage, layout: false });
        return;
      }

      // Fallback for non-HTMX (no JS) — full page reload with error
      const eventResult = await this.service.getEventForEdit(
        eventId,
        currentUser.userId,
        currentUser.role
      );
      const event = eventResult.ok ? { ...eventResult.value, ...data } : data;
      res.status(400).render("events/edit", { session, event, pageError: errorMessage });
      return;
    }

    // Success — redirect to event detail page
    if (isHtmx) {
      // HTMX redirect using HX-Redirect header
      res.set("HX-Redirect", `/events/${result.value.id}`);
      res.status(200).send();
      return;
    }

    res.redirect(`/events/${result.value.id}`);
  }
}

export function CreateEventEditingController(
  service: IEventEditingService
): IEventEditingController {
  return new EventEditingController(service);
}