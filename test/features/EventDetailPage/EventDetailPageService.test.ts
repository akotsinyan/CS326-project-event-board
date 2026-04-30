import { describe, expect, it, beforeEach } from "@jest/globals";
import { CreateEventDetailService } from "../../../src/features/EventDetailPage/EventDetailPageService";
import { CreateInMemoryEventEditingRepository } from "../../../src/features/EventEditing/EventEditingRepository";
import { CreateInMemoryRsvpToggleRepository } from "../../../src/features/RsvpToggle/RsvpToggleRepository";
import { CreateInMemorySaveForLaterRepository } from "../../../src/features/SaveForLater/SaveForLaterRepo";

describe("EventDetailPageService unit tests", () => {
  let service: ReturnType<typeof CreateEventDetailService>;
  let eventRepo: ReturnType<typeof CreateInMemoryEventEditingRepository>;
  let rsvpRepo: ReturnType<typeof CreateInMemoryRsvpToggleRepository>;
  let saveRepo: ReturnType<typeof CreateInMemorySaveForLaterRepository>;

  beforeEach(async () => {
    eventRepo = CreateInMemoryEventEditingRepository();
    rsvpRepo = CreateInMemoryRsvpToggleRepository();
    saveRepo = CreateInMemorySaveForLaterRepository();
    service = CreateEventDetailService(eventRepo, rsvpRepo, saveRepo);
  });

  describe("Published events", () => {
    it("returns event for any user viewing published event", async () => {
      const result = await service.getEventById("evt-list-1", "user-1", "user");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.status).toBe("published");
        expect(result.value.currentUserSavedState).toBe("unsaved");
      }
    });
  });

  describe("Missing events", () => {
    it("returns EventNotFound error for non-existent event", async () => {
      const result = await service.getEventById("evt-does-not-exist", "user-1", "user");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.value.name).toBe("EventNotFound");
      }
    });
  });

  describe("Draft visibility rule", () => {
    it("allows organizer to view their own draft event", async () => {
      const result = await service.getEventById("evt-draft-1", "user-staff", "staff");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.status).toBe("draft");
      }
    });

    it("allows admin to view any draft event", async () => {
      const result = await service.getEventById("evt-draft-1", "random-user", "admin");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.status).toBe("draft");
      }
    });

    it("prevents member from viewing draft event", async () => {
      const result = await service.getEventById("evt-draft-1", "user-1", "user");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.value.name).toBe("EventNotFound");
      }
    });

    it("prevents non-owner staff from viewing draft event", async () => {
      const result = await service.getEventById("evt-draft-1", "other-staff", "staff");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.value.name).toBe("EventNotFound");
      }
    });
  });

  describe("Saved state tracking", () => {
    it("includes saved state in view model", async () => {
      const result = await service.getEventById("evt-list-1", "user-1", "user");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveProperty("currentUserSavedState");
        expect(["saved", "unsaved"]).toContain(result.value.currentUserSavedState);
      }
    });

    it("reflects saved state when user has saved event", async () => {
      await saveRepo.toggle("user-1", "evt-list-1");

      const result = await service.getEventById("evt-list-1", "user-1", "user");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.currentUserSavedState).toBe("saved");
      }
    });
  });
});
