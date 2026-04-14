import type { Request, Response } from "express";
import type { IEventListService, EventListError } from "./EventListService";
import { VALID_TIMEFRAMES } from "./EventListService";
import type { EventListFilter, Timeframe } from "./EventListRepository";
import { getAuthenticatedUser, touchAppSession } from "../../session/AppSession";
import type { AppSessionStore } from "../../session/AppSession";

export interface IEventListController {
  showEventList(req: Request, res: Response): Promise<void>;
}

class EventListController implements IEventListController {
  constructor(private readonly service: IEventListService) {}

  async showEventList(req: Request, res: Response): Promise<void> {
    const store = req.session as AppSessionStore;
    const session = touchAppSession(store);
    const currentUser = getAuthenticatedUser(store);

    if (!currentUser) {
      res.redirect("/login");
      return;
    }

    const rawCategory = typeof req.query.category === "string" ? req.query.category.trim() : undefined;
    const rawTimeframe = typeof req.query.timeframe === "string" ? req.query.timeframe.trim() : undefined;

    const timeframe: Timeframe | undefined =
      rawTimeframe && VALID_TIMEFRAMES.includes(rawTimeframe as Timeframe)
        ? (rawTimeframe as Timeframe)
        : undefined;

    const filter: EventListFilter = {
      category: rawCategory || undefined,
      timeframe,
    };

    const result = await this.service.getFilteredEvents(filter);

    if (!result.ok) {
      const err = result.value as EventListError;
      res.status(500).render("partials/error", { message: err.message, layout: false });
      return;
    }

    res.render("events/index", {
      session,
      events: result.value,
      filter: {
        category: rawCategory ?? "",
        timeframe: rawTimeframe ?? "all",
      },
    });
  }
}

export function CreateEventListController(service: IEventListService): IEventListController {
  return new EventListController(service);
}
