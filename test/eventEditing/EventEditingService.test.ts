import { CreateInMemoryEventEditingRepository } from "../../src/features/EventEditing/EventEditingRepository";
import { CreateEventEditingService } from "../../src/features/EventEditing/EventEditingService";
 
function setup() {
  const repo = CreateInMemoryEventEditingRepository();
  const service = CreateEventEditingService(repo);
  return { repo, service };
}
 
describe("EventEditingService", () => {
 
  // ── getEventForEdit ───────────────────────────────────────────────────────
 
  describe("getEventForEdit", () => {
    it("returns the event when the organizer requests it", async () => {
      const { service } = setup();
      const result = await service.getEventForEdit("evt-list-1", "user-staff", "staff");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBe("evt-list-1");
        expect(result.value.title).toBe("Spring Hackathon");
      }
    });
 
    it("returns the event when an admin requests it", async () => {
      const { service } = setup();
      const result = await service.getEventForEdit("evt-list-1", "user-admin", "admin");
      expect(result.ok).toBe(true);
    });
 
    it("returns EventNotFound for a non-existent event", async () => {
      const { service } = setup();
      const result = await service.getEventForEdit("evt-999", "user-staff", "staff");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.value.type).toBe("EventNotFound");
      }
    });
 
    it("returns Unauthorized when a member tries to edit", async () => {
      const { service } = setup();
      const result = await service.getEventForEdit("evt-list-1", "user-reader", "user");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.value.type).toBe("Unauthorized");
      }
    });
 
    it("returns Unauthorized when a staff member tries to edit someone else's event", async () => {
      const { service } = setup();
      const result = await service.getEventForEdit("evt-list-1", "user-other-staff", "staff");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.value.type).toBe("Unauthorized");
      }
    });
 
    it("returns InvalidState for a cancelled event", async () => {
      const { repo, service } = setup();
      await repo.updateStatus("evt-list-1", "cancelled");
      const result = await service.getEventForEdit("evt-list-1", "user-staff", "staff");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.value.type).toBe("InvalidState");
      }
    });
 
    it("returns InvalidState for a past event", async () => {
      const { service } = setup();
      const result = await service.getEventForEdit("evt-past-1", "user-staff", "staff");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.value.type).toBe("InvalidState");
      }
    });
  });
 
  // ── updateEvent ───────────────────────────────────────────────────────────
 
  describe("updateEvent", () => {
    it("successfully updates the title of an event", async () => {
      const { service } = setup();
      const result = await service.updateEvent(
        "evt-list-1",
        { title: "Updated Hackathon" },
        "user-staff",
        "staff"
      );
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.title).toBe("Updated Hackathon");
      }
    });
 
    it("successfully updates multiple fields at once", async () => {
      const { service } = setup();
      const result = await service.updateEvent(
        "evt-list-1",
        { title: "New Title", location: "Room 202", capacity: 30 },
        "user-staff",
        "staff"
      );
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.title).toBe("New Title");
        expect(result.value.location).toBe("Room 202");
        expect(result.value.capacity).toBe(30);
      }
    });
 
    it("returns EventNotFound for a non-existent event", async () => {
      const { service } = setup();
      const result = await service.updateEvent(
        "evt-999",
        { title: "Whatever" },
        "user-staff",
        "staff"
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.value.type).toBe("EventNotFound");
      }
    });
 
    it("returns Unauthorized when a member tries to update", async () => {
      const { service } = setup();
      const result = await service.updateEvent(
        "evt-list-1",
        { title: "Hacked" },
        "user-reader",
        "user"
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.value.type).toBe("Unauthorized");
      }
    });
 
    it("returns InvalidInput when title is empty", async () => {
      const { service } = setup();
      const result = await service.updateEvent(
        "evt-list-1",
        { title: "   " },
        "user-staff",
        "staff"
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.value.type).toBe("InvalidInput");
      }
    });
 
    it("returns InvalidInput when end time is before start time", async () => {
      const { service } = setup();
      const result = await service.updateEvent(
        "evt-list-1",
        {
          startDatetime: new Date("2025-06-01T18:00:00"),
          endDatetime: new Date("2025-06-01T10:00:00"),
        },
        "user-staff",
        "staff"
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.value.type).toBe("InvalidInput");
      }
    });
 
    it("returns InvalidInput when capacity is less than 1", async () => {
      const { service } = setup();
      const result = await service.updateEvent(
        "evt-list-1",
        { capacity: 0 },
        "user-staff",
        "staff"
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.value.type).toBe("InvalidInput");
      }
    });
 
    it("allows admin to update any event regardless of ownership", async () => {
      const { service } = setup();
      const result = await service.updateEvent(
        "evt-list-1",
        { title: "Admin Override Title" },
        "user-admin",
        "admin"
      );
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.title).toBe("Admin Override Title");
      }
    });
 
    it("allows setting capacity to null for unlimited", async () => {
      const { service } = setup();
      const result = await service.updateEvent(
        "evt-list-1",
        { capacity: null },
        "user-staff",
        "staff"
      );
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.capacity).toBeNull();
      }
    });
 
    it("returns InvalidState when trying to update a cancelled event", async () => {
      const { repo, service } = setup();
      await repo.updateStatus("evt-list-1", "cancelled");
      const result = await service.updateEvent(
        "evt-list-1",
        { title: "Too Late" },
        "user-staff",
        "staff"
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.value.type).toBe("InvalidState");
      }
    });
  });
});