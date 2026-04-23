import type { Request, Response } from "express";
import type { IWaitlistPromotionService } from "./WaitlistPromotionService";
import { getAuthenticatedUser } from "../../session/AppSession";
import type { AppSessionStore } from "../../session/AppSession";

export interface IWaitlistPromotionController {
  getWaitlistPosition(req: Request, res: Response): Promise<void>;
}

class WaitlistPromotionController implements IWaitlistPromotionController {
  constructor(private readonly service: IWaitlistPromotionService) {}

  async getWaitlistPosition(req: Request, res: Response): Promise<void> {
    const store = req.session as AppSessionStore;
    const currentUser = getAuthenticatedUser(store);

    if (!currentUser) {
      res.status(401).render("partials/error", { message: "Please log in.", layout: false });
      return;
    }

    const eventId = typeof req.params.eventId === "string" ? req.params.eventId : "";
    const result = await this.service.getWaitlistPosition(eventId, currentUser.userId);

    if (!result.ok) {
      res.status(500).render("partials/error", { message: "Could not fetch waitlist position.", layout: false });
      return;
    }

    res.render("events/partials/waitlistPosition", { position: result.value, layout: false });
  }
}

export function CreateWaitlistPromotionController(
  service: IWaitlistPromotionService,
): IWaitlistPromotionController {
  return new WaitlistPromotionController(service);
}
