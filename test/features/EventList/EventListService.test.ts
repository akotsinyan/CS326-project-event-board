import { CreateEventListService } from "../../../src/features/EventList/EventListService";
import type { IEventListRepository } from "../../../src/features/EventList/EventListRepository";
import type { IEvent } from "../../../src/features/CreateEvent/model/event";
import { Ok, Err } from "../../../src/lib/result";

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

function makeRepo(events: IEvent[]): IEventListRepository {
  return {
    findPublished: async () => Ok(events.filter((e) => e.status === "published")),
    findAll: async () => Ok([...events]),
    findById: async (id) => {
      const e = events.find((x) => x.id === id);
      return e ? Ok(e) : Err({ type: "EventNotFound" as const });
    },
    add: async () => Err({ type: "UnexpectedError" as const, message: "not implemented" }),
    update: async () => Err({ type: "UnexpectedError" as const, message: "not implemented" }),
    updateStatus: async () => Err({ type: "UnexpectedError" as const, message: "not implemented" }),
    search: async () => Ok([...events]),
  };
}

describe("EventListService.getFilteredEvents", () => {
  const tomorrow = new Date(Date.now() + 86400000);
  const inTenDays = new Date(Date.now() + 864000000);

  describe("no filters", () => {
    it("returns all published upcoming events when no filter is applied", async () => {
      const events = [
        makeEvent({ id: "e1", category: "tech", startDatetime: tomorrow }),
        makeEvent({ id: "e2", category: "social", startDatetime: inTenDays }),
      ];
      const service = CreateEventListService(makeRepo(events));

      const result = await service.getFilteredEvents({});

      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toHaveLength(2);
    });

    it("excludes draft and cancelled events", async () => {
      const events = [
        makeEvent({ id: "e1", status: "published", startDatetime: tomorrow }),
        makeEvent({ id: "e2", status: "draft", startDatetime: tomorrow }),
        makeEvent({ id: "e3", status: "cancelled", startDatetime: tomorrow }),
      ];
      const service = CreateEventListService(makeRepo(events));

      const result = await service.getFilteredEvents({});

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0].id).toBe("e1");
      }
    });

    it("excludes events whose start time is in the past", async () => {
      const yesterday = new Date(Date.now() - 86400000);
      const events = [
        makeEvent({ id: "e1", startDatetime: yesterday }),
        makeEvent({ id: "e2", startDatetime: tomorrow }),
      ];
      const service = CreateEventListService(makeRepo(events));

      const result = await service.getFilteredEvents({});

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0].id).toBe("e2");
      }
    });

    it("returns results sorted by startDatetime ascending", async () => {
      const events = [
        makeEvent({ id: "e1", startDatetime: inTenDays }),
        makeEvent({ id: "e2", startDatetime: tomorrow }),
      ];
      const service = CreateEventListService(makeRepo(events));

      const result = await service.getFilteredEvents({});

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value[0].id).toBe("e2");
        expect(result.value[1].id).toBe("e1");
      }
    });
  });

  describe("category filter", () => {
    it("returns only events matching the given category", async () => {
      const events = [
        makeEvent({ id: "e1", category: "tech", startDatetime: tomorrow }),
        makeEvent({ id: "e2", category: "social", startDatetime: tomorrow }),
        makeEvent({ id: "e3", category: "tech", startDatetime: inTenDays }),
      ];
      const service = CreateEventListService(makeRepo(events));

      const result = await service.getFilteredEvents({ category: "tech" });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(2);
        expect(result.value.every((e) => e.category === "tech")).toBe(true);
      }
    });

    it("is case-insensitive for category matching", async () => {
      const events = [makeEvent({ id: "e1", category: "Tech", startDatetime: tomorrow })];
      const service = CreateEventListService(makeRepo(events));

      const result = await service.getFilteredEvents({ category: "TECH" });

      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toHaveLength(1);
    });

    it("returns empty array when no events match the category", async () => {
      const events = [makeEvent({ id: "e1", category: "tech", startDatetime: tomorrow })];
      const service = CreateEventListService(makeRepo(events));

      const result = await service.getFilteredEvents({ category: "careers" });

      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toHaveLength(0);
    });
  });

  describe("timeframe filter", () => {
    it("returns only upcoming events when timeframe is 'all'", async () => {
      const events = [makeEvent({ id: "e1", startDatetime: tomorrow })];
      const service = CreateEventListService(makeRepo(events));

      const result = await service.getFilteredEvents({ timeframe: "all" });

      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toHaveLength(1);
    });

    it("returns InvalidFilter error for an unrecognised timeframe value", async () => {
      const events = [makeEvent({ id: "e1", startDatetime: tomorrow })];
      const service = CreateEventListService(makeRepo(events));

      const result = await service.getFilteredEvents({ timeframe: "next-month" as never });

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.value.type).toBe("InvalidFilter");
    });

    it("filters this-week events within the current Mon–Sun window", async () => {
      const now = new Date();
      const day = now.getDay();
      const daysUntilMonday = day === 0 ? 1 : 8 - day;
      const nextMonday = new Date(now);
      nextMonday.setDate(now.getDate() + daysUntilMonday);
      nextMonday.setHours(0, 0, 0, 0);

      const thisWeekEvent = makeEvent({ id: "e1", startDatetime: tomorrow });
      const nextWeekEvent = makeEvent({ id: "e2", startDatetime: nextMonday });
      const service = CreateEventListService(makeRepo([thisWeekEvent, nextWeekEvent]));

      const result = await service.getFilteredEvents({ timeframe: "this-week" });

      expect(result.ok).toBe(true);
      if (result.ok) {
        const ids = result.value.map((e) => e.id);
        expect(ids).toContain("e1");
        expect(ids).not.toContain("e2");
      }
    });
  });

  describe("search query filter", () => {
    it("returns only events whose title, description, or location contain the query string", async () => {
      const events = [
        makeEvent({ id: "e1", title: "Spring Hackathon 2024" }),
        makeEvent({ id: "e2", description: "Meet recruiters and hiring managers 2024"}),
        makeEvent({ id: "e3", location: "Main Hall 2024"}),
        makeEvent({ id: "e4", title: "Unrelated Event", description: "Nothing to see here", location: "Room 2"}),
      ];
      const service = CreateEventListService(makeRepo(events));

      let result = await service.getFilteredEvents({ query: "main" });
      
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0].id).toBe("e3");
      }

      result = await service.getFilteredEvents({ query: "recruiters" });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0].id).toBe("e2");
      }

      result = await service.getFilteredEvents({ query: "hackathon" });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0].id).toBe("e1");
      }

      result = await service.getFilteredEvents({ query: "2024" });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(3);
        const ids = result.value.map((e) => e.id);
        expect(ids).toContain("e1");
        expect(ids).toContain("e2");
        expect(ids).toContain("e3");
        expect(ids).not.toContain("e4");
      }
    });

    it("is case-insensitive for search query matching", async () => {
      const events = [makeEvent({ id: "e1", title: "Spring Hackathon 2024" })]; 
      const service = CreateEventListService(makeRepo(events));

      const result = await service.getFilteredEvents({ query: "sPRiNg" });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0].id).toBe("e1");
      }
    });

    it("returns empty array when no events match the search query", async () => {
      const events = [makeEvent({ id: "e1", title: "Spring Hackathon 2024" })];
      const service = CreateEventListService(makeRepo(events));

      const result = await service.getFilteredEvents({ query: "Non-existent-Event" });

      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toHaveLength(0);
    });

    it("returns all events when search query is empty", async () => {
      const events = [
        makeEvent({ id: "e1", title: "Spring Hackathon 2024" }),
        makeEvent({ id: "e2", description: "Career Fair 2024" }),
      ];
      const service = CreateEventListService(makeRepo(events));

      let result = await service.getFilteredEvents({ query: "" });

      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toHaveLength(2);
    });
  });


  describe("combined filters", () => {
    it("applies both category and timeframe filters together", async () => {
      const events = [
        makeEvent({ id: "e1", category: "tech", startDatetime: tomorrow }),
        makeEvent({ id: "e2", category: "social", startDatetime: tomorrow }),
        makeEvent({ id: "e3", category: "tech", startDatetime: inTenDays }),
      ];
      const service = CreateEventListService(makeRepo(events));

      const result = await service.getFilteredEvents({ category: "tech", timeframe: "this-week" });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.every((e) => e.category === "tech")).toBe(true);
        expect(result.value.every((e) => e.startDatetime > new Date())).toBe(true);
      }
    });

    it("applies category, timeframe, and search query filters together", async () => {
      const events = [
        makeEvent({ id: "e1", category: "tech", title: "Hackathon", startDatetime: tomorrow }),
        makeEvent({ id: "e2", category: "tech", title: "Career Fair", startDatetime: tomorrow }),
        makeEvent({ id: "e3", category: "social", title: "Hackathon", startDatetime: tomorrow }),
        makeEvent({ id: "e4", category: "tech", title: "Hackathon", startDatetime: inTenDays }),
      ];
      const service = CreateEventListService(makeRepo(events));

      const result = await service.getFilteredEvents({ category: "tech", timeframe: "this-week", query: "hackathon" });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0].id).toBe("e1");
      }
    });
  });
});
