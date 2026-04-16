// Re-exports from the canonical event repository so existing imports keep working.
export type {
  IEventEditingRepository as IEventRepository,
  EventEditingRepoError as EventRepoError,
  UpdateEventInput,
  CreateEventData,
} from "../../EventEditing/EventEditingRepository";
