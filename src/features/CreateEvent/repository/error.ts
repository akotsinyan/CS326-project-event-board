export type EventError =
  | { name: "ValidationError"; message: string }
  | { name: "UnknownError"; message: string };

export const ValidationError = (message: string): EventError => ({
  name: "ValidationError",
  message,
});

export const UnknownError = (message: string): EventError => ({
  name: "UnknownError",
  message,
});
