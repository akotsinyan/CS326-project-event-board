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
  search(
    res: Response,
    query: string,
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

  private handleError(purpose: string, error: any): {status: number; message: string} {
    if (error.name && error.message) {
      const status = this.mapErrorStatus(error);
      const log = status >= 500 ? this.logger.error : this.logger.warn;
      log.call(this.logger, `${purpose} failed: ${error.message}`);
      return { status, message: error.message };
    }

    this.logger.error(`${purpose} failed with unknown error: ${error}`);
    return { status: 500, message: "An unexpected error occurred. Please try again later." };
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
      const { status, message } = this.handleError("Create event", result.value);
      res.status(status).render("events/new", { pageError: message });
      return;
    }

    const event = result.value;
    this.logger.info(`Event created successfully: ${event.id}`);
    res.render("/home", { session });
  }

  async search(
    res: Response,
    query: string,
  ): Promise<void> {
    const result = await this.service.searchEvents(query);

    if (!result.ok) {
      const { status, message } = this.handleError("Search events", result.value);
      res.status(status).render("partials/error", { message });
      return;
    }

    const events = result.value;
    this.logger.info(`Events searched successfully: ${events.length}`);
    res.render("events/index", { events });
  }
}

export function createEventController(
  service: IEventService,
  logger: ILoggingService,
): IEventController {
  return new EventController(service, logger);
}
