import { Ok, Err, type Result } from "../../lib/result";
import type { IEvent } from "../CreateEvent/model/event";
import type { IRsvp, IRsvpToggleRepository } from "../RsvpToggle/RsvpToggleRepository";
import type { IEventListRepository } from "../EventList/EventListRepository";

// ── Output types ──────────────────────────────────────────────────────────────

export interface RSVPDashboardEntry {
  rsvpId: string;
  eventId: string;
  rsvpStatus: IRsvp["status"];
  eventTitle: string;
  eventCategory: string;
  eventLocation: string;
  eventStartDatetime: Date;
  eventEndDatetime: Date;
  eventStatus: string;
}

export interface RSVPDashboard {
  upcoming: RSVPDashboardEntry[];
  pastOrCancelled: RSVPDashboardEntry[];
}

// ── Error types ───────────────────────────────────────────────────────────────

export type RSVPDashboardError =
  | { type: "Unauthorized"; message: string }
  | { type: "UnexpectedError"; message: string };

// ── Service interface ─────────────────────────────────────────────────────────

export interface IRSVPDashboardService {
  getDashboard(userId: string, userRole: string): Promise<Result<RSVPDashboard, RSVPDashboardError>>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toEntry(rsvp: IRsvp, event: IEvent): RSVPDashboardEntry {
  return {
    rsvpId: rsvp.id,
    eventId: event.id,
    rsvpStatus: rsvp.status,
    eventTitle: event.title,
    eventCategory: event.category,
    eventLocation: event.location,
    eventStartDatetime: event.startDatetime,
    eventEndDatetime: event.endDatetime,
    eventStatus: event.status,
  };
}

function isUpcoming(entry: RSVPDashboardEntry, now: Date): boolean {
  return (
    (entry.rsvpStatus === "going" || entry.rsvpStatus === "waitlisted") &&
    entry.eventStartDatetime > now &&
    entry.eventStatus !== "cancelled"
  );
}

// ── Implementation ────────────────────────────────────────────────────────────

class RSVPDashboardService implements IRSVPDashboardService {
  constructor(
    private readonly rsvpRepo: IRsvpToggleRepository,
    private readonly eventRepo: IEventListRepository
  ) {}

  async getDashboard(userId: string, userRole: string): Promise<Result<RSVPDashboard, RSVPDashboardError>> {
    if (userRole !== "user") {
      return Err({ type: "Unauthorized" as const, message: "Only members can view the RSVP dashboard." });
    }

    const [rsvpResult, eventResult] = await Promise.all([
      this.rsvpRepo.findByUserId(userId),
      this.eventRepo.findAll(),
    ]);

    if (!rsvpResult.ok) {
      return Err({ type: "UnexpectedError" as const, message: "Failed to load RSVPs." });
    }
    if (!eventResult.ok) {
      return Err({ type: "UnexpectedError" as const, message: "Failed to load events." });
    }

    const eventMap = new Map<string, IEvent>(eventResult.value.map((e) => [e.id, e]));
    const now = new Date();

    const entries: RSVPDashboardEntry[] = [];
    for (const rsvp of rsvpResult.value) {
      const event = eventMap.get(rsvp.eventId);
      if (event) entries.push(toEntry(rsvp, event));
    }

    const upcoming = entries
      .filter((e) => isUpcoming(e, now))
      .sort((a, b) => a.eventStartDatetime.getTime() - b.eventStartDatetime.getTime());

    const pastOrCancelled = entries
      .filter((e) => !isUpcoming(e, now))
      .sort((a, b) => b.eventStartDatetime.getTime() - a.eventStartDatetime.getTime());

    return Ok({ upcoming, pastOrCancelled });
  }
}

// ── Factory function ──────────────────────────────────────────────────────────

export function CreateRSVPDashboardService(
  rsvpRepo: IRsvpToggleRepository,
  eventRepo: IEventListRepository
): IRSVPDashboardService {
  return new RSVPDashboardService(rsvpRepo, eventRepo);
}
