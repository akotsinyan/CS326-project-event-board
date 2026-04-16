// The canonical event repository is IEventEditingRepository.
// EventDetailPage service uses it directly.
export type {
  IEventEditingRepository as IEventDetailPageRepository,
} from "../EventEditing/EventEditingRepository";
