import { Ok, Err, type Result } from "../../lib/result";
import type { IRsvp, RsvpRepoError } from "../RsvpToggle/RsvpToggleRepository";

// ── Error types ───────────────────────────────────────────────────────────────

export type WaitlistPromotionError = { type: "UnexpectedError"; message: string };

export interface WaitlistPromotionResult {
  promoted: boolean;
  userId: string | null;
}

// ── Repository interfaces ─────────────────────────────────────────────────────

export interface IWaitlistPromotionRsvpRepository {
  findByEventAndUser(eventId: string, userId: string): Promise<Result<IRsvp | null, RsvpRepoError>>;
  findWaitlistedByEvent(eventId: string): Promise<Result<IRsvp[], RsvpRepoError>>;
  countWaitlistedAhead(eventId: string, userId: string): Promise<Result<number, RsvpRepoError>>;
  updateStatus(rsvpId: string, status: "going" | "waitlisted" | "cancelled"): Promise<Result<IRsvp, RsvpRepoError>>;
}

export interface IWaitlistPromotionRepository {
  promoteFromWaitlist(eventId: string): Promise<Result<WaitlistPromotionResult, WaitlistPromotionError>>;
  getWaitlistPosition(eventId: string, userId: string): Promise<Result<number | null, WaitlistPromotionError>>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toPromotionError(err: RsvpRepoError): WaitlistPromotionError {
  const message = err.type === "UnexpectedError" ? err.message : "RSVP repository error.";
  return { type: "UnexpectedError", message };
}

// ── Implementation ────────────────────────────────────────────────────────────

class WaitlistPromotionRepository implements IWaitlistPromotionRepository {
  constructor(private readonly rsvpRepo: IWaitlistPromotionRsvpRepository) {}

  async promoteFromWaitlist(eventId: string): Promise<Result<WaitlistPromotionResult, WaitlistPromotionError>> {
    const waitlistedResult = await this.rsvpRepo.findWaitlistedByEvent(eventId);
    if (!waitlistedResult.ok) {
      return Err(toPromotionError(waitlistedResult.value as RsvpRepoError));
    }

    const nextInLine = (waitlistedResult.value as IRsvp[])[0];
    if (!nextInLine) {
      return Ok({ promoted: false, userId: null });
    }

    const updateResult = await this.rsvpRepo.updateStatus(nextInLine.id, "going");
    if (!updateResult.ok) {
      return Err(toPromotionError(updateResult.value as RsvpRepoError));
    }

    return Ok({ promoted: true, userId: (updateResult.value as IRsvp).userId });
  }

  async getWaitlistPosition(eventId: string, userId: string): Promise<Result<number | null, WaitlistPromotionError>> {
    const existingResult = await this.rsvpRepo.findByEventAndUser(eventId, userId);
    if (!existingResult.ok) {
      return Err(toPromotionError(existingResult.value as RsvpRepoError));
    }

    const existing = existingResult.value as IRsvp | null;
    if (!existing || existing.status !== "waitlisted") {
      return Ok(null);
    }

    const countResult = await this.rsvpRepo.countWaitlistedAhead(eventId, userId);
    if (!countResult.ok) {
      return Err(toPromotionError(countResult.value as RsvpRepoError));
    }

    return Ok((countResult.value as number) + 1);
  }
}

// ── Factory function ──────────────────────────────────────────────────────────

export function CreateWaitlistPromotionRepository(
  rsvpRepo: IWaitlistPromotionRsvpRepository,
): IWaitlistPromotionRepository {
  return new WaitlistPromotionRepository(rsvpRepo);
}
