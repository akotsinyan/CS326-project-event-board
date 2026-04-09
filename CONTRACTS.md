# CONTRACTS.md
 
 
## Shared Types
 
### `Result<T>`
Represents either a success or an error.
 
```ts
type Result<T> =
  | { ok: true;  value: T }
  | { ok: false; error: EventError }
```
 
### `EventError`
All named errors that service methods can return.
 
```ts
type EventError =
  | { type: "EventNotFound" }
  | { type: "Unauthorized" }
  | { type: "InvalidInput"; message: string }
  | { type: "EventNotPublished" }
  | { type: "EventFull" }
  | { type: "AlreadyRSVPed" }
  | { type: "NotRSVPed" }
  | { type: "UnexpectedError" }
```
 
---
 
## Contracts
 
### `createEvent` — Tony
**Used by:** Event Creation, any feature that links to a newly created event.
 
```ts
createEvent(data: CreateEventInput): Promise<Result<Event>>
```
 
| | |
|---|---|
| **Success** | Returns a new `Event` object with a unique `id`, `status: "draft"`, and all fields from `CreateEventInput`. |
| **Errors** | `InvalidInput`, `Unauthorized` |
 
---
 
### `getEventById` — Alex
**Used by:** Event Detail Page, RSVP Toggle, Event Editing, dashboards.
 
```ts
getEventById(eventId: string): Promise<Result<Event>>
```
 
| | |
|---|---|
| **Success** | Returns the full `Event` object for the given `eventId`. |
| **Errors** | `EventNotFound`, `Unauthorized` |
 
---
 
### `updateEvent` — Bhawna
**Used by:** Event Editing, any feature that re-fetches event data after a change.
 
```ts
updateEvent(eventId: string, data: UpdateEventInput): Promise<Result<Event>>
```
 
| | |
|---|---|
| **Success** | Returns the updated `Event` object with all changes applied. |
| **Errors** | `EventNotFound`, `Unauthorized`, `InvalidInput` |
 
---
 
### `toggleRSVP` — Bhawna
**Used by:** RSVP Toggle, Attendee List, Waitlist Promotion, dashboards.
 
```ts
toggleRSVP(eventId: string, userId: string): Promise<Result<{ rsvped: boolean; attendeeCount: number }>>
```
 
| | |
|---|---|
| **Success** | Adds or removes the RSVP and returns `{ rsvped: boolean, attendeeCount: number }`. `rsvped: true` means the user is now RSVPed; `false` means they were removed. |
| **Errors** | `EventNotFound`, `EventFull`, `EventNotPublished` |
 
---
 
### `setEventStatus` — Bhawna
**Used by:** Event Publishing and Cancellation, RSVP access control, dashboards.
 
```ts
setEventStatus(eventId: string, status: "draft" | "published" | "cancelled"): Promise<Result<Event>>
```
 
| | |
|---|---|
| **Success** | Returns the updated `Event` object with the new `status`. |
| **Errors** | `EventNotFound`, `Unauthorized` |
 
---
 
### `filterEvents` — Alexandra
**Used by:** Category and Date Filter, event browsing.
 
```ts
filterEvents(filters: FilterInput): Promise<Result<Event[]>>
```
 
| | |
|---|---|
| **Success** | Returns an array of `Event` objects matching the filters. Returns an empty array `[]` if no matches — never `null`. |
| **Errors** | `UnexpectedError` |
 
---
 
### `getUserRSVPs` — Alexandra
**Used by:** My RSVPs Dashboard.
 
```ts
getUserRSVPs(userId: string): Promise<Result<Event[]>>
```
 
| | |
|---|---|
| **Success** | Returns an array of `Event` objects the user has RSVPed to. Returns `[]` if none. |
| **Errors** | `UnexpectedError` |
 
---
 
### `getOrganizerEvents` — Alexandra
**Used by:** Organizer Event Dashboard.
 
```ts
getOrganizerEvents(userId: string): Promise<Result<Event[]>>
```
 
| | |
|---|---|
| **Success** | Returns an array of `Event` objects created by the given organizer. Returns `[]` if none. |
| **Errors** | `Unauthorized` |
 
---
 
### `promoteFromWaitlist` — Murali
**Used by:** Waitlist Promotion, depends on `toggleRSVP` capacity logic.
 
```ts
promoteFromWaitlist(eventId: string): Promise<Result<{ promoted: boolean; userId: string | null }>>
```
 
| | |
|---|---|
| **Success** | Promotes the next user from the waitlist. Returns `{ promoted: true, userId: string }` if someone was promoted, or `{ promoted: false, userId: null }` if the waitlist is empty. |
| **Errors** | `EventNotFound`, `UnexpectedError` |
 
---
 
### `searchEvents` — Tony
**Used by:** Event Search, event discovery.
 
```ts
searchEvents(query: string): Promise<Result<Event[]>>
```
 
| | |
|---|---|
| **Success** | Returns an array of `Event` objects whose title, description, or tags match `query`. Returns `[]` if no matches. |
| **Errors** | `UnexpectedError` |
 
---
 
### `archivePastEvents` — Murali
**Used by:** Past Event Archiving, system maintenance.
 
```ts
archivePastEvents(): Promise<Result<{ archivedCount: number }>>
```
 
| | |
|---|---|
| **Success** | Moves all past events to `status: "archived"` and returns `{ archivedCount: number }`. |
| **Errors** | `UnexpectedError` |
 
---
 
### `getAttendees` — AleMoo
**Used by:** Attendee List (Organizer view).
 
```ts
getAttendees(eventId: string): Promise<Result<User[]>>
```
 
| | |
|---|---|
| **Success** | Returns an array of `User` objects who have RSVPed to the event. Returns `[]` if none. |
| **Errors** | `EventNotFound`, `Unauthorized` |
 
---
 
### `addComment` — Tony
**Used by:** Event Comments.
 
```ts
addComment(eventId: string, userId: string, text: string): Promise<Result<Comment>>
```
 
| | |
|---|---|
| **Success** | Returns the created `Comment` object with a unique `id`, `eventId`, `userId`, `text`, and `createdAt` timestamp. |
| **Errors** | `EventNotFound`, `InvalidInput` |
 
---
 
### `toggleSaveEvent` — Alex
**Used by:** Save for Later, personalization features.
 
```ts
toggleSaveEvent(eventId: string, userId: string): Promise<Result<{ saved: boolean }>>
```
 
| | |
|---|---|
| **Success** | Saves or unsaves the event for the user. Returns `{ saved: true }` if now saved, `{ saved: false }` if removed. |
| **Errors** | `EventNotFound` |