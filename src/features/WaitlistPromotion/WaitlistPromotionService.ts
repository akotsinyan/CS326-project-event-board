import { Ok, Err, type Result } from "../../lib/result";
import type { IWaitlistPromotionRepository } from "./WaitlistPromotionRepository";

export type WaitlistPromotionError = {
  type: "UnexpectedError";
  message: string;
};

export interface IWaitlistPromotionService {
  promoteFromWaitlist(
    eventId: string,
  ): Promise<Result<{ promoted: boolean; userId: string | null }, WaitlistPromotionError>>;

  getWaitlistPosition(
    eventId: string,
    userId: string,
  ): Promise<Result<number | null, WaitlistPromotionError>>;
}

class WaitlistPromotionService implements IWaitlistPromotionService {
  constructor(private readonly repo: IWaitlistPromotionRepository) {}

  async promoteFromWaitlist(
    eventId: string,
  ): Promise<Result<{ promoted: boolean; userId: string | null }, WaitlistPromotionError>> {
    const result = await this.repo.promoteFromWaitlist(eventId);

    if (!result.ok) {
      return Err({
        type: "UnexpectedError" as const,
        message: result.value.message,
      });
    }

    return Ok(result.value);
  }

  async getWaitlistPosition(
    eventId: string,
    userId: string,
  ): Promise<Result<number | null, WaitlistPromotionError>> {
    const result = await this.repo.getWaitlistPosition(eventId, userId);

    if (!result.ok) {
      return Err({
        type: "UnexpectedError" as const,
        message: result.value.message,
      });
    }

    return Ok(result.value);
  }
}

export function CreateWaitlistPromotionService(
  repo: IWaitlistPromotionRepository,
): IWaitlistPromotionService {
  return new WaitlistPromotionService(repo);
}