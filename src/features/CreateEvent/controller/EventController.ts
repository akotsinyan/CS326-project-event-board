import { Response } from "express";
import { IAppBrowserSession } from "../../../session/AppSession";
import { IEventService } from "../service/EventService";
import { ILoggingService } from "../../../service/LoggingService";
import { EventError } from "../repository/error";

export interface IEventController {
  renderCreateEventPage(res: Response, pageError?: string): void;
  create(
    res: Response,
    session: IAppBrowserSession,
    title: string,
    description: string,
    location: string,
    startDatetime: Date,
    endDatetime: Date,
    category?: string,
    capacity?: number,
  ): Promise<void>;
}

class EventController implements IEventController {
  constructor(
    private readonly service: IEventService,
    private readonly logger: ILoggingService,
  ) {}

  private mapErrorStatus(error: EventError): number {
    if (error.name === "ValidationError") {
      return 400;
    }
    return 500;
  }

  private getUserId(session: IAppBrowserSession): string {
    return session.authenticatedUser?.userId ?? "";
  }

  private handleError(res: Response, error: any): void {
    if (error.name && error.message) {
      const status = this.mapErrorStatus(error);
      const log = status >= 500 ? this.logger.error : this.logger.warn;
      log.call(this.logger, `Create event failed: ${error.message}`);
      res
        .status(status)
        .render("partials/error", { message: error.message, layout: false });
      return;
    }

    this.logger.error(`Create event failed with unknown error: ${error}`);
    res.status(500).render("partials/error", {
      message: "Unable to create event: An unexpected error occurred.",
      layout: false,
    });
  }

  renderCreateEventPage(res: Response, pageError?: string): void {
    res.render("/events/new", { pageError });
  }

  async create(
    res: Response,
    session: IAppBrowserSession,
    title: string,
    description: string,
    location: string,
    startDatetime: Date,
    endDatetime: Date,
    category?: string,
    capacity?: number,
  ): Promise<void> {
    const organizerId = this.getUserId(session);

    const result = await this.service.createEvent({
      title,
      description,
      location,
      startDatetime,
      endDatetime,
      category,
      capacity,
      organizerId,
    });

    if (!result.ok) {
      this.handleError(res, result.value);
      return;
    }

    const event = result.value;
    this.logger.info(`Event created successfully: ${event.id}`);
    res.render("/home", { session });
  }
}

export function createEventController(
  service: IEventService,
  logger: ILoggingService,
): IEventController {
  return new EventController(service, logger);
}
