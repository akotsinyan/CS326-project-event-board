import { CreateRSVPDashboardService } from "../../../src/features/RSVPDashboard/RSVPDashboardService";
import type { IRsvpToggleRepository, IRsvp } from "../../../src/features/RsvpToggle/RsvpToggleRepository";
import type { IEventEditingRepository, IEvent } from "../../../src/features/EventEditing/EventEditingRepository";
import { Ok, Err } from "../../../src/lib/result";

function makeEvent(overrides: Partial<IEvent> = {}): IEvent {
  const start = new Date(Date.now() + 86400000);
  return {
    id: "evt-1",
    title: "Test Event",
    description: "",
    location: "Room 1",
    category: "tech",
    status: "published",
    capacity: null,
    startDatetime: start,
    endDatetime: new Date(start.getTime() + 7200000),
    organizerId: "user-staff",
    organizerName: "Sam Staff",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeRsvp(overrides: Partial<IRsvp> = {}): IRsvp {
  return {
    id: "rsvp-1",
    eventId: "evt-1",
    userId: "user-reader",
    status: "going",
    createdAt: new Date(),
    ...overrides,
  };
}

function makeRsvpRepo(rsvps: IRsvp[]): IRsvpToggleRepository {
  return {
    findByUserId: async (userId) => Ok(rsvps.filter((r) => r.userId === userId)),
    findByEventAndUser: async () => Ok(null),
    findActiveByEvent: async () => Ok([]),
    findWaitlistedByEvent: async () => Ok([]),
    countWaitlistedAhead: async () => Ok(0),
    create: async () => Err({ type: "UnexpectedError" as const, message: "not implemented" }),
    updateStatus: async () => Err({ type: "UnexpectedError" as const, message: "not implemented" }),
  };
}

function makeEventRepo(events: IEvent[]): IEventEditingRepository {
  return {
    findAll: async () => Ok([...events]),
    findById: async (id) => {
      const e = events.find((x) => x.id === id);
      return e ? Ok(e) : Err({ type: "EventNotFound" as const });
    },
    findPublished: async () => Ok(events.filter((e) => e.status === "published")),
    add: async () => Err({ type: "UnexpectedError" as const, message: "not implemented" }),
    update: async () => Err({ type: "UnexpectedError" as const, message: "not implemented" }),
    updateStatus: async () => Err({ type: "UnexpectedError" as const, message: "not implemented" }),
    search: async () => Ok([...events]),
  };
}

describe("RSVPDashboardService.getDashboard", () => {
  describe("access control", () => {
    it("returns Unauthorized when a staff member requests the dashboard", async () => {
      const service = CreateRSVPDashboardService(makeRsvpRepo([]), makeEventRepo([]));

      const result = await service.getDashboard("user-staff", "staff");

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.value.type).toBe("Unauthorized");
    });

    it("returns Unauthorized when an admin requests the dashboard", async () => {
      const service = CreateRSVPDashboardService(makeRsvpRepo([]), makeEventRepo([]));

      const result = await service.getDashboard("user-admin", "admin");

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.value.type).toBe("Unauthorized");
    });

    it("succeeds for a user with role 'user'", async () => {
      const service = CreateRSVPDashboardService(makeRsvpRepo([]), makeEventRepo([]));

      const result = await service.getDashboard("user-reader", "user");

      expect(result.ok).toBe(true);
    });
  });

  describe("grouping", () => {
    it("places a going RSVP for a future event in upcoming", async () => {
      const event = makeEvent({ id: "evt-future", status: "published" });
      const rsvp = makeRsvp({ eventId: "evt-future", status: "going" });
      const service = CreateRSVPDashboardService(makeRsvpRepo([rsvp]), makeEventRepo([event]));

      const result = await service.getDashboard("user-reader", "user");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.upcoming).toHaveLength(1);
        expect(result.value.pastOrCancelled).toHaveLength(0);
        expect(result.value.upcoming[0].rsvpStatus).toBe("going");
      }
    });

    it("places a waitlisted RSVP for a future event in upcoming", async () => {
      const event = makeEvent({ id: "evt-future", status: "published" });
      const rsvp = makeRsvp({ eventId: "evt-future", status: "waitlisted" });
      const service = CreateRSVPDashboardService(makeRsvpRepo([rsvp]), makeEventRepo([event]));

      const result = await service.getDashboard("user-reader", "user");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.upcoming).toHaveLength(1);
        expect(result.value.upcoming[0].rsvpStatus).toBe("waitlisted");
      }
    });

    it("places a cancelled RSVP in pastOrCancelled regardless of event date", async () => {
      const event = makeEvent({ id: "evt-future", status: "published" });
      const rsvp = makeRsvp({ eventId: "evt-future", status: "cancelled" });
      const service = CreateRSVPDashboardService(makeRsvpRepo([rsvp]), makeEventRepo([event]));

      const result = await service.getDashboard("user-reader", "user");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.upcoming).toHaveLength(0);
        expect(result.value.pastOrCancelled).toHaveLength(1);
      }
    });

    it("places a going RSVP for a past event in pastOrCancelled", async () => {
      const pastStart = new Date(Date.now() - 86400000);
      const event = makeEvent({ id: "evt-past", startDatetime: pastStart, status: "past" });
      const rsvp = makeRsvp({ eventId: "evt-past", status: "going" });
      const service = CreateRSVPDashboardService(makeRsvpRepo([rsvp]), makeEventRepo([event]));

      const result = await service.getDashboard("user-reader", "user");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.upcoming).toHaveLength(0);
        expect(result.value.pastOrCancelled).toHaveLength(1);
      }
    });

    it("places a going RSVP for a cancelled event in pastOrCancelled", async () => {
      const event = makeEvent({ id: "evt-cancelled", status: "cancelled" });
      const rsvp = makeRsvp({ eventId: "evt-cancelled", status: "going" });
      const service = CreateRSVPDashboardService(makeRsvpRepo([rsvp]), makeEventRepo([event]));

      const result = await service.getDashboard("user-reader", "user");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.upcoming).toHaveLength(0);
        expect(result.value.pastOrCancelled).toHaveLength(1);
      }
    });
  });

  describe("sorting", () => {
    it("sorts upcoming RSVPs by event start date ascending", async () => {
      const sooner = makeEvent({ id: "evt-soon", startDatetime: new Date(Date.now() + 86400000) });
      const later = makeEvent({ id: "evt-late", startDatetime: new Date(Date.now() + 864000000) });
      const rsvps = [
        makeRsvp({ id: "r1", eventId: "evt-late", status: "going" }),
        makeRsvp({ id: "r2", eventId: "evt-soon", status: "going" }),
      ];
      const service = CreateRSVPDashboardService(makeRsvpRepo(rsvps), makeEventRepo([sooner, later]));

      const result = await service.getDashboard("user-reader", "user");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.upcoming[0].eventId).toBe("evt-soon");
        expect(result.value.upcoming[1].eventId).toBe("evt-late");
      }
    });

    it("sorts pastOrCancelled RSVPs by event start date descending", async () => {
      const older = new Date(Date.now() - 864000000);
      const newer = new Date(Date.now() - 86400000);
      const events = [
        makeEvent({ id: "evt-old", startDatetime: older, status: "past" }),
        makeEvent({ id: "evt-new", startDatetime: newer, status: "past" }),
      ];
      const rsvps = [
        makeRsvp({ id: "r1", eventId: "evt-old", status: "going" }),
        makeRsvp({ id: "r2", eventId: "evt-new", status: "going" }),
      ];
      const service = CreateRSVPDashboardService(makeRsvpRepo(rsvps), makeEventRepo(events));

      const result = await service.getDashboard("user-reader", "user");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.pastOrCancelled[0].eventId).toBe("evt-new");
        expect(result.value.pastOrCancelled[1].eventId).toBe("evt-old");
      }
    });
  });

  describe("edge cases", () => {
    it("returns empty sections when the user has no RSVPs", async () => {
      const service = CreateRSVPDashboardService(makeRsvpRepo([]), makeEventRepo([]));

      const result = await service.getDashboard("user-reader", "user");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.upcoming).toHaveLength(0);
        expect(result.value.pastOrCancelled).toHaveLength(0);
      }
    });

    it("ignores RSVPs whose event no longer exists in the store", async () => {
      const rsvp = makeRsvp({ eventId: "evt-ghost" });
      const service = CreateRSVPDashboardService(makeRsvpRepo([rsvp]), makeEventRepo([]));

      const result = await service.getDashboard("user-reader", "user");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.upcoming).toHaveLength(0);
        expect(result.value.pastOrCancelled).toHaveLength(0);
      }
    });
  });
});
