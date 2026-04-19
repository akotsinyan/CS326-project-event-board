import type { Request, Response } from "express";
import type { IEventPublishingService, EventPublishingError } from "./EventPublishingService";
import { getAuthenticatedUser, touchAppSession } from "../../session/AppSession";
import type { AppSessionStore } from "../../session/AppSession";

export interface IEventPublishingController {
  publishEvent(req: Request, res: Response): Promise<void>;
  cancelEvent(req: Request, res: Response): Promise<void>;
}

class EventPublishingController implements IEventPublishingController {
  constructor(private readonly service: IEventPublishingService) {}

  async publishEvent(req: Request, res: Response): Promise<void> {
    await this.handleTransition(req, res, "publish");
  }

  async cancelEvent(req: Request, res: Response): Promise<void> {
    await this.handleTransition(req, res, "cancel");
  }

  private async handleTransition(
    req: Request,
    res: Response,
    action: "publish" | "cancel"
  ): Promise<void> {
    const store = req.session as AppSessionStore;
    touchAppSession(store);
    const currentUser = getAuthenticatedUser(store);

    if (!currentUser) {
      res.status(401).render("partials/error", { message: "Please log in to continue.", layout: false });
      return;
    }

    const eventId = typeof req.params.eventId === "string" ? req.params.eventId : "";

    const result = action === "publish"
      ? await this.service.publishEvent(eventId, currentUser.userId, currentUser.role)
      : await this.service.cancelEvent(eventId, currentUser.userId, currentUser.role);

    if (!result.ok) {
      const err = result.value as EventPublishingError;
      const status =
        err.type === "EventNotFound" ? 404
        : err.type === "Unauthorized" ? 403
        : 400;
      const message =
        err.type === "EventNotFound" ? "Event not found."
        : err.type === "Unauthorized" ? "You are not allowed to perform this action."
        : "message" in err ? err.message
        : "Invalid operation.";

      res.status(status).render("partials/error", { message, layout: false });
      return;
    }

    const event = result.value;
    const redirectUrl = `/events/${event.id}`;

    if (req.get("HX-Request") === "true") {
      const canActOnUpdated =
        currentUser.role === "admin" ||
        (currentUser.role === "staff" && event.organizerId === currentUser.userId);
      const canPublish = event.status === "draft" && canActOnUpdated;
      const canCancel = event.status === "published" && canActOnUpdated;
      const canEdit = event.status === "draft" && canActOnUpdated;
      const statusColors: Record<string, string> = {
        published: "bg-green-100 text-green-800 border-green-200",
        draft: "bg-yellow-100 text-yellow-800 border-yellow-200",
        cancelled: "bg-red-100 text-red-800 border-red-200",
        past: "bg-slate-100 text-slate-600 border-slate-200",
      };
      res.render("events/partials/publishingControls", {
        event,
        canEdit,
        canPublish,
        canCancel,
        statusBadgeClass: statusColors[event.status] ?? "bg-slate-100 text-slate-600 border-slate-200",
        layout: false,
      });
      return;
    }

    res.redirect(redirectUrl);
  }
}

export function CreateEventPublishingController(
  service: IEventPublishingService
): IEventPublishingController {
  return new EventPublishingController(service);
}
