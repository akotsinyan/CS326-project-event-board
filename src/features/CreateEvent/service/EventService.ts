import { Err, Ok, Result } from "../../../lib/result";
import { IEvent } from "../model/event";
import { EventError, ValidationError } from "../repository/error";
import {
  CreateEventInput,
  IEventRepository,
} from "../repository/EventRepository";

export interface IEventService {
  createEvent(eventData: CreateEventInput): Promise<Result<IEvent, EventError>>;
  searchEvents(query: string): Promise<Result<IEvent[], EventError>>;
}

class EventService implements IEventService {
  private requiredFields: (keyof CreateEventInput)[] = [
    "title",
    "description",
    "location",
    "startDatetime",
    "endDatetime",
    "organizerId",
  ];

  constructor(private readonly repository: IEventRepository) {}

  normalize(eventData: CreateEventInput): CreateEventInput {
    return {
      ...eventData,
      title: eventData.title.trim(),
      description: eventData.description.trim(),
      location: eventData.location.trim(),
      category: eventData.category?.trim(),
      organizerId: eventData.organizerId.trim(),
    };
  }

  validateMissingFields(eventData: CreateEventInput): Result<null, EventError> {
    for (const field of this.requiredFields) {
      if (!eventData[field]) {
        return Err(ValidationError(`Missing required field: ${field}`));
      }
    }
    return Ok(null);
  }

  validate(eventData: CreateEventInput): Result<null, EventError> {
    const missingFieldsResult = this.validateMissingFields(eventData);

    if (!missingFieldsResult.ok) {
      return missingFieldsResult;
    }

    if (eventData.startDatetime >= eventData.endDatetime) {
      return Err(ValidationError("Start datetime must be before end datetime"));
    }

    if (eventData.capacity !== undefined && eventData.capacity < 0) {
      return Err(ValidationError("Capacity must be a non-negative number"));
    }

    return Ok(null);
  }

  async createEvent(
    eventData: CreateEventInput,
  ): Promise<Result<IEvent, EventError>> {
    const normalizedData = this.normalize(eventData);
    const validationResult = this.validate(normalizedData);

    if (!validationResult.ok) {
      return validationResult;
    }

    return this.repository.add(normalizedData);
  }

  async searchEvents(query: string): Promise<Result<IEvent[], EventError>> {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return Err(ValidationError("Missing search query"));
    }
    return this.repository.search(trimmedQuery);
  }
}

export const createEventService = (
  repository: IEventRepository,
): EventService => {
  return new EventService(repository);
};
