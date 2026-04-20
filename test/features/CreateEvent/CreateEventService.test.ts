import { IEvent } from "../../../src/features/CreateEvent/model/event";
import { createEventService } from "../../../src/features/CreateEvent/service/EventService";
import { IEventEditingRepository } from "../../../src/features/EventEditing/EventEditingRepository";
import { Ok } from "../../../src/lib/result";

function makeEvent(overrides: Partial<IEvent> = {}): IEvent {
  const base = new Date(Date.now() + 86400000);
  return {
    id: "evt-1",
    title: "Test Event",
    description: "A description",
    location: "Room 1",
    category: "tech",
    status: "published",
    capacity: null,
    startDatetime: base,
    endDatetime: new Date(base.getTime() + 7200000),
    organizerId: "user-staff",
    organizerName: "Sam Staff",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeRepo(): IEventEditingRepository {
  const defaultEvent = makeEvent();

  return {
    add: jest.fn().mockResolvedValue(Ok(defaultEvent)),
    search: jest.fn().mockResolvedValue(Ok([defaultEvent])),
    findAll: jest.fn().mockResolvedValue(Ok([defaultEvent])),
    findById: jest.fn().mockResolvedValue(Ok(defaultEvent)),
    findPublished: jest.fn().mockResolvedValue(Ok([defaultEvent])),
    update: jest.fn().mockResolvedValue(Ok(defaultEvent)),
    updateStatus: jest.fn().mockResolvedValue(Ok(defaultEvent)),
  };
}

describe("CreateEventService", () => {
  it("normalizes title, description and location by trimming whitespace", async () => {
    const repo = makeRepo();
    const service = createEventService(repo);

    const result = await service.createEvent(makeEvent({
      title: "  My Event  ",
      description: "  An event description.  ",
      location: "  Conference Room A  ",
    }));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(repo.add).toHaveBeenCalledWith(expect.objectContaining({
        title: "My Event",
        description: "An event description.",
        location: "Conference Room A",
      }));
    }
  });

  it("returns validation error if required fields are missing or invalid", async () => {
    const repo = makeRepo();
    const service = createEventService(repo);

    const inputs = [
      { title: "  "},
      { description: "  "},
      { location: "  "},
      { startDatetime: new Date("invalid")},
      { endDatetime: new Date("invalid")},
      { startDatetime: new Date(Date.now() + 3600000), endDatetime: new Date()},
      { capacity: 0 },
      { capacity: -5 },
      { capacity: 2.5 },
    ];

    for (const input of inputs) {
      const result = await service.createEvent(makeEvent(input));
      expect(result.ok).toBe(false);

      if (!result.ok) {
        expect(result.value).toHaveProperty("name", "ValidationError");
        expect(result.value).toHaveProperty("message");
      }

      expect(repo.add).not.toHaveBeenCalled();
    }
  });
});