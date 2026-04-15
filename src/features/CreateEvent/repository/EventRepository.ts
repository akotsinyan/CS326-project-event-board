import { Result } from "../../../lib/result";
import { IEvent } from "../model/event";
import { EventError } from "./error";

export interface CreateEventInput {
  title: string;
  description: string;
  location: string;
  category?: string;
  capacity?: number;
  startDatetime: Date;
  endDatetime: Date;
  organizerId: string;
}

export interface IEventRepository {
  add(data: CreateEventInput): Promise<Result<IEvent, EventError>>;
  findAll(): Promise<Result<IEvent[], EventError>>;
}
