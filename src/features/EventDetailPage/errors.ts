// src/features/EventDetail/errors.ts

export type EventDetailError =
  | { name: "EventNotFound"; message: string }
  | { name: "AuthorizationRequired"; message: string }
  | { name: "UnexpectedDependencyError"; message: string };

// ── Constructors (match Auth style) ─────────────────────────────

export const EventNotFound = (message: string): EventDetailError => ({
  name: "EventNotFound",
  message,
});

export const AuthorizationRequired = (message: string): EventDetailError => ({
  name: "AuthorizationRequired",
  message,
});

export const UnexpectedDependencyError = (message: string): EventDetailError => ({
  name: "UnexpectedDependencyError",
  message,
});