import { CreateEventPublishingService } from "../../../src/features/EventPublishing/EventPublishingService";
import type { IEventEditingRepository, IEvent, EventEditingRepoError } from "../../../src/features/EventEditing/EventEditingRepository";
import type { Result } from "../../../src/lib/result";
import { Ok, Err } from "../../../src/lib/result";

function makeEvent(overrides: Partial<IEvent> = {}): IEvent {
  return {
    id: "evt-test-1",
    title: "Test Event",
    description: "A test event",
    location: "Room 1",
    category: "tech",
    status: "draft",
    capacity: 50,
    startDatetime: new Date(Date.now() + 86400000),
    endDatetime: new Date(Date.now() + 90000000),
    organizerId: "user-staff",
    organizerName: "Sam Staff",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeRepo(event: IEvent): IEventEditingRepository {
  const store = [event];
  return {
    findById: async (id) => {
      const e = store.find((x) => x.id === id);
      if (!e) return Err({ type: "EventNotFound" as const });
      return Ok(e);
    },
    findAll: async () => Ok([...store]),
    findPublished: async () => Ok(store.filter((e) => e.status === "published")),
    add: async () => Err({ type: "UnexpectedError" as const, message: "not implemented" }),
    update: async () => Err({ type: "UnexpectedError" as const, message: "not implemented" }),
    updateStatus: async (id, status) => {
      const idx = store.findIndex((x) => x.id === id);
      if (idx === -1) return Err({ type: "EventNotFound" as const });
      store[idx] = { ...store[idx], status };
      return Ok(store[idx]);
    },
    search: async () => Ok([...store]),
  };
}

describe("EventPublishingService", () => {
  describe("publishEvent", () => {
    it("publishes a draft event when the organizer acts on their own event", async () => {
      const event = makeEvent({ id: "evt-1", status: "draft", organizerId: "user-staff" });
      const service = CreateEventPublishingService(makeRepo(event));

      const result = await service.publishEvent("evt-1", "user-staff", "staff");

      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.status).toBe("published");
    });

    it("publishes any draft event when an admin acts", async () => {
      const event = makeEvent({ id: "evt-1", status: "draft", organizerId: "user-staff" });
      const service = CreateEventPublishingService(makeRepo(event));

      const result = await service.publishEvent("evt-1", "user-admin", "admin");

      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.status).toBe("published");
    });

    it("returns Unauthorized when staff tries to publish another organizer's event", async () => {
      const event = makeEvent({ id: "evt-1", status: "draft", organizerId: "user-staff" });
      const service = CreateEventPublishingService(makeRepo(event));

      const result = await service.publishEvent("evt-1", "user-other-staff", "staff");

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.value.type).toBe("Unauthorized");
    });

    it("returns InvalidTransition when trying to publish an already-published event", async () => {
      const event = makeEvent({ id: "evt-1", status: "published", organizerId: "user-staff" });
      const service = CreateEventPublishingService(makeRepo(event));

      const result = await service.publishEvent("evt-1", "user-staff", "staff");

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.value.type).toBe("InvalidTransition");
    });

    it("returns InvalidTransition when trying to publish a cancelled event", async () => {
      const event = makeEvent({ id: "evt-1", status: "cancelled", organizerId: "user-staff" });
      const service = CreateEventPublishingService(makeRepo(event));

      const result = await service.publishEvent("evt-1", "user-staff", "staff");

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.value.type).toBe("InvalidTransition");
    });

    it("returns EventNotFound when the event does not exist", async () => {
      const event = makeEvent({ id: "evt-1" });
      const service = CreateEventPublishingService(makeRepo(event));

      const result = await service.publishEvent("evt-nonexistent", "user-staff", "staff");

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.value.type).toBe("EventNotFound");
    });
  });

  describe("cancelEvent", () => {
    it("cancels a published event when the organizer acts on their own event", async () => {
      const event = makeEvent({ id: "evt-1", status: "published", organizerId: "user-staff" });
      const service = CreateEventPublishingService(makeRepo(event));

      const result = await service.cancelEvent("evt-1", "user-staff", "staff");

      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.status).toBe("cancelled");
    });

    it("allows admin to cancel any published event regardless of organizer", async () => {
      const event = makeEvent({ id: "evt-1", status: "published", organizerId: "user-staff" });
      const service = CreateEventPublishingService(makeRepo(event));

      const result = await service.cancelEvent("evt-1", "user-admin-different", "admin");

      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.status).toBe("cancelled");
    });

    it("returns Unauthorized when staff tries to cancel another organizer's event", async () => {
      const event = makeEvent({ id: "evt-1", status: "published", organizerId: "user-staff" });
      const service = CreateEventPublishingService(makeRepo(event));

      const result = await service.cancelEvent("evt-1", "user-other", "staff");

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.value.type).toBe("Unauthorized");
    });

    it("returns InvalidTransition when trying to cancel a draft event", async () => {
      const event = makeEvent({ id: "evt-1", status: "draft", organizerId: "user-staff" });
      const service = CreateEventPublishingService(makeRepo(event));

      const result = await service.cancelEvent("evt-1", "user-staff", "staff");

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.value.type).toBe("InvalidTransition");
    });

    it("returns InvalidTransition when trying to cancel an already-cancelled event", async () => {
      const event = makeEvent({ id: "evt-1", status: "cancelled", organizerId: "user-staff" });
      const service = CreateEventPublishingService(makeRepo(event));

      const result = await service.cancelEvent("evt-1", "user-staff", "staff");

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.value.type).toBe("InvalidTransition");
    });

    it("returns EventNotFound when the event does not exist", async () => {
      const event = makeEvent({ id: "evt-1" });
      const service = CreateEventPublishingService(makeRepo(event));

      const result = await service.cancelEvent("evt-nonexistent", "user-staff", "staff");

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.value.type).toBe("EventNotFound");
    });
  });
});
