import { beforeEach, describe, expect, it } from "@jest/globals";
import { CreateInMemorySaveForLaterRepository } from "../../../src/features/SaveForLater/SaveForLaterRepo";
import { CreateSaveForLaterService } from "../../../src/features/SaveForLater/SaveForLaterService";
import { CreateInMemoryEventEditingRepository } from "../../../src/features/EventEditing/EventEditingRepository";

describe("SaveForLaterService unit tests", () => {
  let service: ReturnType<typeof CreateSaveForLaterService>;
  let eventRepo: ReturnType<typeof CreateInMemoryEventEditingRepository>;

  beforeEach(async () => {
    const saveRepo = CreateInMemorySaveForLaterRepository();
    eventRepo = CreateInMemoryEventEditingRepository();
    service = CreateSaveForLaterService(saveRepo, eventRepo);

    const event1 = await eventRepo.add({
      title: "Event 1",
      description: "Test event 1",
      organizerId: "org-1",
      organizerName: "Organizer",
      startDatetime: new Date(),
      endDatetime: new Date(),
      location: "ILC",
      category: "tech",
      capacity: 50,
      status: "published",
    });

    const event2 = await eventRepo.add({
      title: "Event 2",
      description: "Test event 2",
      organizerId: "org-1",
      organizerName: "Organizer",
      startDatetime: new Date(),
      endDatetime: new Date(),
      location: "Lederle",
      category: "tech",
      capacity: 50,
      status: "published",
    });
  });

  it("toggles save from unsaved to saved", async () => {
    const user = { id: "user-1", role: "user" as const, displayName: "Test User", email: "test@example.com" };
    const events = await eventRepo.findAll();

    expect(events.ok).toBe(true);
    if (!events.ok) return;

    const eventId = events.value[0].id;
    const result = await service.toggleSave(user, eventId);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe("saved");
    }
  });

  it("lists saved events for a user", async () => {
    const user = { id: "user-1", role: "user" as const, displayName: "Test User", email: "test@example.com" };
    const events = await eventRepo.findAll();

    expect(events.ok).toBe(true);
    if (!events.ok) return;

    const eventId = events.value[0].id;
    await service.toggleSave(user, eventId);

    const savedResult = await service.listSaved(user);

    expect(savedResult.ok).toBe(true);
    if (savedResult.ok) {
      expect(savedResult.value.length).toBe(1);
      expect(savedResult.value[0].id).toBe(eventId);
    }
  });

  it("returns error when role other than user tries to save", async () => {
    const adminUser = { id: "admin-1", role: "admin" as const, displayName: "Admin", email: "admin@example.com" };
    const events = await eventRepo.findAll();

    expect(events.ok).toBe(true);
    if (!events.ok) return;

    const eventId = events.value[0].id;
    const result = await service.toggleSave(adminUser, eventId);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.name).toBe("Unauthorized");
    }
  });
});
