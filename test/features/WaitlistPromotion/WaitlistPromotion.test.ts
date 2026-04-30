import { describe, expect, it } from "@jest/globals";
import { CreateInMemoryRsvpToggleRepository } from "../../../src/features/RsvpToggle/RsvpToggleRepository";
import { CreateWaitlistPromotionRepository } from "../../../src/features/WaitlistPromotion/WaitlistPromotionRepository";
import { CreateWaitlistPromotionService } from "../../../src/features/WaitlistPromotion/WaitlistPromotionService";

function makeService() {
  const rsvpRepo = CreateInMemoryRsvpToggleRepository();
  const waitlistRepo = CreateWaitlistPromotionRepository(rsvpRepo);
  return { service: CreateWaitlistPromotionService(waitlistRepo), rsvpRepo };
}

describe("WaitlistPromotionService", () => {
  describe("promoteFromWaitlist", () => {
    it("promotes the first waitlisted user when one exists", async () => {
      const { service } = makeService();

      // evt-list-2: user-reader is waitlisted (seed data)
      const result = await service.promoteFromWaitlist("evt-list-2");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.promoted).toBe(true);
        expect(result.value.userId).toBe("user-reader");
      }
    });

    it("returns promoted: false when no one is waitlisted for the event", async () => {
      const { service } = makeService();

      // evt-list-3: no seed RSVPs at all
      const result = await service.promoteFromWaitlist("evt-list-3");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.promoted).toBe(false);
        expect(result.value.userId).toBeNull();
      }
    });

    it("promotes the earliest-waitlisted user when multiple users are waiting", async () => {
      const { service, rsvpRepo } = makeService();

      // Add two users to the waitlist for evt-list-3 (no existing RSVPs)
      // User A joined first, User B joined second
      await rsvpRepo.create("evt-list-3", "user-a", "waitlisted");
      // We can't directly control createdAt via create(), but we can verify the
      // promotion picks the first-created (by insertion order in the in-memory store)
      await rsvpRepo.create("evt-list-3", "user-b", "waitlisted");

      const result = await service.promoteFromWaitlist("evt-list-3");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.promoted).toBe(true);
        expect(result.value.userId).toBe("user-a");
      }
    });
  });

  describe("getWaitlistPosition", () => {
    it("returns the position (1-indexed) for a waitlisted user", async () => {
      const { service } = makeService();

      // user-reader is waitlisted on evt-list-2 with no one ahead of them (seed data)
      const result = await service.getWaitlistPosition("evt-list-2", "user-reader");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(1);
      }
    });

    it("returns null when the user has no RSVP for the event", async () => {
      const { service } = makeService();

      // user-reader has no RSVP for evt-list-3
      const result = await service.getWaitlistPosition("evt-list-3", "user-reader");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBeNull();
      }
    });

    it("returns null when the user is going (not waitlisted)", async () => {
      const { service } = makeService();

      // user-reader is "going" on evt-list-1
      const result = await service.getWaitlistPosition("evt-list-1", "user-reader");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBeNull();
      }
    });

    it("returns a non-null position for every waitlisted user", async () => {
      const { service, rsvpRepo } = makeService();

      await rsvpRepo.create("evt-list-3", "user-a", "waitlisted");
      await rsvpRepo.create("evt-list-3", "user-b", "waitlisted");

      const posA = await service.getWaitlistPosition("evt-list-3", "user-a");
      const posB = await service.getWaitlistPosition("evt-list-3", "user-b");

      expect(posA.ok).toBe(true);
      expect(posB.ok).toBe(true);

      if (posA.ok && posB.ok) {
        expect(posA.value).not.toBeNull();
        expect(posB.value).not.toBeNull();
      }
    });
  });
});
