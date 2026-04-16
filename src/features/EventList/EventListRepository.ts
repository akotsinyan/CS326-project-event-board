// The canonical event repository is IEventEditingRepository.
// These aliases let EventListService keep its own named types.
export type {
  IEventEditingRepository as IEventListRepository,
  EventEditingRepoError as EventListRepoError,
} from "../EventEditing/EventEditingRepository";

export type Timeframe = "all" | "this-week" | "this-weekend";

export interface EventListFilter {
  category?: string;
  timeframe?: Timeframe;
  query?: string;
}
