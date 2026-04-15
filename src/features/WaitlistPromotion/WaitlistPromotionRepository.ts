import { Ok, Err, type Result } from "../../lib/result";
import type {
  IRsvp,
  IRsvpToggleRepository,
} from "../RsvpToggle/RsvpToggleRepository";

export type WaitlistPromotionError = {
  type: "UnexpectedError";
  message: string;
};

export interface WaitlistPromotionResult {
  promoted: boolean;
  userId: string | null;
}

export interface IWaitlistPromotionRepository {
  promoteFromWaitlist(
    eventId: string,
  ): Promise<Result<WaitlistPromotionResult, WaitlistPromotionError>>;

  getWaitlistPosition(
    eventId: string,
    userId: string,
  ): Promise<Result<number | null, WaitlistPromotionError>>;
}

class WaitlistPromotionRepository implements IWaitlistPromotionRepository {
  constructor(private readonly rsvpRepo: IRsvpToggleRepository) {}

  async promoteFromWaitlist(
    eventId: string,
  ): Promise<Result<WaitlistPromotionResult, WaitlistPromotionError>> {
    const waitlistedResult = await this.rsvpRepo.findWaitlistedByEvent(eventId);

    if (!waitlistedResult.ok) {
      return Err({
        type: "UnexpectedError" as const,
        message:
          waitlistedResult.value.type === "UnexpectedError"
            ? waitlistedResult.value.message
            : "Failed to find waitlisted users.",
      });
    }

    const nextInLine: IRsvp | undefined = waitlistedResult.value[0];

    if (!nextInLine) {
      return Ok({
        promoted: false,
        userId: null,
      });
    }

    const updateResult = await this.rsvpRepo.updateStatus(nextInLine.id, "going");

    if (!updateResult.ok) {
      return Err({
        type: "UnexpectedError" as const,
        message:
          updateResult.value.type === "UnexpectedError"
            ? updateResult.value.message
            : "Failed to promote waitlisted user.",
      });
    }

    return Ok({
      promoted: true,
      userId: updateResult.value.userId,
    });
  }

  async getWaitlistPosition(
    eventId: string,
    userId: string,
  ): Promise<Result<number | null, WaitlistPromotionError>> {
    const existingResult = await this.rsvpRepo.findByEventAndUser(eventId, userId);

    if (!existingResult.ok) {
      return Err({
        type: "UnexpectedError" as const,
        message:
          existingResult.value.type === "UnexpectedError"
            ? existingResult.value.message
            : "Failed to find RSVP.",
      });
    }

    if (!existingResult.value || existingResult.value.status !== "waitlisted") {
      return Ok(null);
    }

    const countResult = await this.rsvpRepo.countWaitlistedAhead(eventId, userId);

    if (!countResult.ok) {
      return Err({
        type: "UnexpectedError" as const,
        message:
          countResult.value.type === "UnexpectedError"
            ? countResult.value.message
            : "Failed to calculate waitlist position.",
      });
    }

    return Ok(countResult.value + 1);
  }
}

export function CreateWaitlistPromotionRepository(
  rsvpRepo: IRsvpToggleRepository,
): IWaitlistPromotionRepository {
  return new WaitlistPromotionRepository(rsvpRepo);
}