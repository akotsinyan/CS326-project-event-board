export type EventStatus = "draft" | "published" | "cancelled" | "past";

export interface IEvent {
  id: string;
  title: string;
  description: string;
  location: string;
  category: string;
  capacity?: number;
  status: EventStatus;
  startDatetime: Date;
  endDatetime: Date;
  organizerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEventData {
  title: string;
  description: string;
  location: string;
  category?: string;
  capacity?: number;
  status?: EventStatus;
  startDatetime: Date;
  endDatetime: Date;
  organizerId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

class Event implements IEvent {
  id: string;
  title: string;
  description: string;
  location: string;
  category: string;
  capacity?: number;
  status: EventStatus;
  startDatetime: Date;
  endDatetime: Date;
  organizerId: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(id: string, data: CreateEventData) {
    this.id = id;
    this.title = data.title;
    this.description = data.description;
    this.location = data.location;
    this.category = data.category ?? "general";
    this.capacity = data.capacity;
    this.status = data.status ?? "draft";
    this.startDatetime = data.startDatetime;
    this.endDatetime = data.endDatetime;
    this.organizerId = data.organizerId;
    this.createdAt = data.createdAt ?? new Date();
    this.updatedAt = data.updatedAt ?? new Date();
  }
}

export function createEvent(id: string, data: CreateEventData): IEvent {
  return new Event(id, data);
}

// For prisma repository
export function toEvent(model: {
  id: string;
  title: string;
  description: string;
  location: string;
  category: string;
  capacity?: number;
  status: string;
  startDatetime: Date;
  endDatetime: Date;
  organizerId: string;
  createdAt: Date;
  updatedAt: Date;
}): IEvent {
  return new Event(model.id, {
    title: model.title,
    description: model.description,
    location: model.location,
    category: model.category,
    capacity: model.capacity,
    status: toEventStatus(model.status),
    startDatetime: model.startDatetime,
    endDatetime: model.endDatetime,
    organizerId: model.organizerId,
    createdAt: model.createdAt,
    updatedAt: model.updatedAt,
  });
}

function toEventStatus(status: string): EventStatus {
  const validStatuses: EventStatus[] = [
    "draft",
    "published",
    "cancelled",
    "past",
  ];
  if (validStatuses.includes(status as EventStatus)) {
    return status as EventStatus;
  }
  return "draft";
}
