import { Err, Ok, Result } from "../../../lib/result";
import { createEvent, IEvent } from "../model/event";
import { EventError, ValidationError } from "./error";
import { IEventRepository, CreateEventInput } from "./EventRepository";

class InMemoryEventRepository implements IEventRepository {
  private events: IEvent[] = [];

  async add(data: CreateEventInput): Promise<Result<IEvent, EventError>> {
    const id = crypto.randomUUID();
    if (
      !data.title ||
      !data.description ||
      !data.location ||
      !data.startDatetime ||
      !data.endDatetime ||
      !data.organizerId
    ) {
      return Err(ValidationError("Repository: Missing required fields"));
    }
    const event = createEvent(id, data);
    this.events.push(event);
    return Ok(event);
  }
}

export function createInMemoryEventRepository(): IEventRepository {
  return new InMemoryEventRepository();
}
