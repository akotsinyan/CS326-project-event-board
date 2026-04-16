export type SaveEventError =
  | { name: "ValidationError"; message: string }
  | { name: "EventNotFound"; message: string }
  | { name: "Unauthorized"; message: string }
  | { name: "UnexpectedDependencyError"; message: string };

export const ValidationError = (message: string): SaveEventError => ({
  name: "ValidationError",
  message,
});

export const EventNotFound = (message: string): SaveEventError => ({
  name: "EventNotFound",
  message,
});

export const Unauthorized = (message: string): SaveEventError => ({
  name: "Unauthorized",
  message,
});

export const UnexpectedDependencyError = (message: string): SaveEventError => ({
  name: "UnexpectedDependencyError",
  message,
});