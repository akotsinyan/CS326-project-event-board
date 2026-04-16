// The canonical event store lives in EventEditingRepository.
// This file re-exports the factory so existing imports keep working.
export {
  CreateInMemoryEventEditingRepository as createInMemoryEventRepository,
} from "../../EventEditing/EventEditingRepository";
