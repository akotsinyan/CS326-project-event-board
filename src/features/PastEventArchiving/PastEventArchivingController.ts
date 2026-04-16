import type { Request, Response } from "express";
import type { IPastEventArchivingService } from "./PastEventArchivingService";
import type { AppSessionStore } from "../../session/AppSession";
import {
  getAuthenticatedUser,
  touchAppSession,
} from "../../session/AppSession";

export interface IPastEventArchivingController {
  showArchive(req: Request, res: Response): Promise<void>;
}

class PastEventArchivingController implements IPastEventArchivingController {
  constructor(private readonly service: IPastEventArchivingService) {}

  async showArchive(req: Request, res: Response): Promise<void> {
    const store = req.session as AppSessionStore;
    const currentUser = getAuthenticatedUser(store);
    const session = touchAppSession(store);

    if (!currentUser) {
      res.redirect("/login");
      return;
    }

    const result = await this.service.getArchivedEvents();

    if (!result.ok) {
      const err = result.value as { message: string };
      res.status(500).render("partials/error", { message: err.message, layout: false });
      return;
    }

    res.render("events/archive", {
      session,
      events: result.value,
      pageError: null,
    });
  }
}

export function CreatePastEventArchivingController(
  service: IPastEventArchivingService,
): IPastEventArchivingController {
  return new PastEventArchivingController(service);
}