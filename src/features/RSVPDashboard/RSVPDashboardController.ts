import type { Request, Response } from "express";
import type { IRSVPDashboardService, RSVPDashboardError } from "./RSVPDashboardService";
import { getAuthenticatedUser, touchAppSession } from "../../session/AppSession";
import type { AppSessionStore } from "../../session/AppSession";

export interface IRSVPDashboardController {
  showDashboard(req: Request, res: Response): Promise<void>;
}

class RSVPDashboardController implements IRSVPDashboardController {
  constructor(private readonly service: IRSVPDashboardService) {}

  async showDashboard(req: Request, res: Response): Promise<void> {
    const store = req.session as AppSessionStore;
    const session = touchAppSession(store);
    const currentUser = getAuthenticatedUser(store);

    if (!currentUser) {
      res.redirect("/login");
      return;
    }

    const result = await this.service.getDashboard(currentUser.userId, currentUser.role);

    if (!result.ok) {
      const err = result.value as RSVPDashboardError;
      if (err.type === "Unauthorized") {
        res.status(403).render("partials/error", { message: err.message, layout: false });
        return;
      }
      res.status(500).render("partials/error", { message: err.message, layout: false });
      return;
    }

    res.render("rsvps/dashboard", {
      session,
      upcoming: result.value.upcoming,
      pastOrCancelled: result.value.pastOrCancelled,
    });
  }
}

export function CreateRSVPDashboardController(service: IRSVPDashboardService): IRSVPDashboardController {
  return new RSVPDashboardController(service);
}
