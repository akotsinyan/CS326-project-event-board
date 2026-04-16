export type RSVPStatus = "attending" | "waitlisted" | "cancelled";

export interface IRSVP {
  id: string;
  userId: string;
  eventId: string;
  status: RSVPStatus;
  createdAt: Date;
}
