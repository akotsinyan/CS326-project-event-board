import { CreateInMemoryRsvpToggleRepository } from "../../src/features/RsvpToggle/RsvpToggleRepository";
import { CreateRsvpToggleService } from "../../src/features/RsvpToggle/RsvpToggleService";
import { CreateInMemoryEventEditingRepository } from "../../src/features/EventEditing/EventEditingRepository";

function setup() {
  const rsvpRepo  = CreateInMemoryRsvpToggleRepository([]);
  const eventRepo = CreateInMemoryEventEditingRepository();
  const service   = CreateRsvpToggleService(rsvpRepo, eventRepo, null);
  return { rsvpRepo, eventRepo, service };
}

describe("RsvpToggleService", () => {

  // ── toggleRsvp ────────────────────────────────────────────────────────────

  describe("toggleRsvp", () => {
    it("creates a new RSVP with status 'going' for a published event", async () => {
      const { service } = setup();
      const result = await service.toggleRsvp("evt-list-1", "user-reader", "user");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.rsvp.status).toBe("going");
        expect(result.value.action).toBe("created");
        expect(result.value.attendeeCount).toBe(1);
      }
    });

    it("cancels an existing going RSVP on second toggle", async () => {
      const { service } = setup();
      await service.toggleRsvp("evt-list-1", "user-reader", "user"); // → going
      const result = await service.toggleRsvp("evt-list-1", "user-reader", "user"); // → cancelled
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.rsvp.status).toBe("cancelled");
        expect(result.value.action).toBe("cancelled");
        expect(result.value.attendeeCount).toBe(0);
      }
    });

    it("reactivates a cancelled RSVP on third toggle", async () => {
      const { service } = setup();
      await service.toggleRsvp("evt-list-1", "user-reader", "user"); // → going
      await service.toggleRsvp("evt-list-1", "user-reader", "user"); // → cancelled
      const result = await service.toggleRsvp("evt-list-1", "user-reader", "user"); // → reactivated
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.rsvp.status).toBe("going");
        expect(result.value.action).toBe("reactivated");
      }
    });

    it("places user on waitlist when event is at capacity", async () => {
      const { rsvpRepo, eventRepo, service } = setup();
      // evt-list-1 has capacity 50 — fill it up with fake RSVPs
      await eventRepo.update("evt-list-1", { capacity: 1 });
      await service.toggleRsvp("evt-list-1", "user-other", "user"); // fills the one slot
      const result = await service.toggleRsvp("evt-list-1", "user-reader", "user");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.rsvp.status).toBe("waitlisted");
        expect(result.value.action).toBe("waitlisted");
      }
    });

    it("returns Unauthorized when a staff member tries to RSVP", async () => {
      const { service } = setup();
      const result = await service.toggleRsvp("evt-list-1", "user-staff", "staff");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.value.type).toBe("Unauthorized");
      }
    });

    it("returns Unauthorized when an admin tries to RSVP", async () => {
      const { service } = setup();
      const result = await service.toggleRsvp("evt-list-1", "user-admin", "admin");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.value.type).toBe("Unauthorized");
      }
    });

    it("returns EventNotFound for a non-existent event", async () => {
      const { service } = setup();
      const result = await service.toggleRsvp("evt-999", "user-reader", "user");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.value.type).toBe("EventNotFound");
      }
    });

    it("returns InvalidState for a draft event", async () => {
      const { service } = setup();
      const result = await service.toggleRsvp("evt-draft-1", "user-reader", "user");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.value.type).toBe("InvalidState");
      }
    });

    it("returns InvalidState for a past event", async () => {
      const { service } = setup();
      const result = await service.toggleRsvp("evt-past-1", "user-reader", "user");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.value.type).toBe("InvalidState");
      }
    });

    it("returns InvalidState for a cancelled event", async () => {
      const { eventRepo, service } = setup();
      await eventRepo.updateStatus("evt-list-1", "cancelled");
      const result = await service.toggleRsvp("evt-list-1", "user-reader", "user");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.value.type).toBe("InvalidState");
      }
    });
  });

  // ── getRsvpStatus ─────────────────────────────────────────────────────────

  describe("getRsvpStatus", () => {
    it("returns null when user has no RSVP", async () => {
      const { service } = setup();
      const result = await service.getRsvpStatus("evt-list-1", "user-reader");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBeNull();
      }
    });

    it("returns the RSVP after toggling", async () => {
      const { service } = setup();
      await service.toggleRsvp("evt-list-1", "user-reader", "user");
      const result = await service.getRsvpStatus("evt-list-1", "user-reader");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).not.toBeNull();
        expect(result.value?.status).toBe("going");
      }
    });

    it("returns cancelled status after two toggles", async () => {
      const { service } = setup();
      await service.toggleRsvp("evt-list-1", "user-reader", "user");
      await service.toggleRsvp("evt-list-1", "user-reader", "user");
      const result = await service.getRsvpStatus("evt-list-1", "user-reader");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value?.status).toBe("cancelled");
      }
    });
  });
});