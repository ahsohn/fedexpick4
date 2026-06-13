# ESPN Event Picker — Design

**Date:** 2026-06-12
**Status:** Approved

## Problem

When a commissioner creates a tournament (Admin → Tournaments), the ESPN event
must be linked by typing/pasting a raw **ESPN Event ID** into a text box. Finding
that ID requires opening `/api/field/schedule` in a browser and matching by name.
This is error-prone and clumsy.

GolfLeagueManager solves the same problem with an `EspnEventPicker` dropdown that
lists the season's ESPN events and auto-fills the event ID (and name) on
selection. This spec brings the same convenience to FedEx Pick 4.

## Goal

Replace the manual lookup with a dropdown of the season's ESPN events on the
Create Tournament form. Selecting an event auto-fills the ESPN Event ID, the
tournament name, and the pick deadline, while still allowing the commissioner to
edit any field and to enter an ESPN Event ID manually as a fallback.

## Non-Goals

- **Season selector.** This app's schedule endpoint is hardwired to the current
  year and the whole app is current-season-oriented. Omitted to keep scope tight;
  can be added later for past-season backfill.
- Changing the tournament data model or the create/update API.
- Editing the linked event after creation (the existing edit paths are unchanged).

## Existing pieces reused

- **`GET /api/field/schedule`** — already returns the current season's events as
  `ESPNScheduleEvent[]`:
  ```ts
  interface ESPNScheduleEvent {
    eventId: string;
    name: string;
    startDate: string; // ISO
    endDate: string;   // ISO (may be empty)
    status: string;    // ESPN status description
  }
  ```
  No API changes are required.
- **`src/app/admin/tournaments/page.tsx`** — the Create Tournament form with
  `name`, `espnEventId`, and `deadline` fields.

## Design

### 1. New component: `src/components/EspnEventPicker.tsx`

A client component, styled to the app's dark Tailwind theme
(`bg-gray-800 border-gray-700` etc.) to match the existing form controls.

**Props**

```ts
interface EspnEventPickerProps {
  onChange: (
    selection: { espnEventId: string; eventName: string; startDate: string } | null
  ) => void;
}
```

**Behavior**

- On mount, `fetch("/api/field/schedule")`.
- **Filter to upcoming + in-progress:** keep events where
  `new Date(endDate || startDate)` is on or after the start of today. Events that
  have already finished are hidden.
- **Sort** remaining events by `startDate` ascending (soonest first).
- Render a single `<select>`:
  - First option: `"Pick an event…"` (empty value).
  - Each event: `"{name} ({startDate sliced to YYYY-MM-DD})"`.
- States:
  - **Loading** — show "Loading schedule…", disable the select.
  - **Error** — show an error message in red; the parent's manual ESPN Event ID
    field remains usable so creation is never blocked by a schedule failure.
  - **Empty** (no upcoming events) — disabled select with the placeholder only.
- On change: if a value is selected, call
  `onChange({ espnEventId, eventName, startDate })`; if cleared, call
  `onChange(null)`.

**Pure helpers (kept exportable for clarity/testability)**

- `isUpcoming(event, now)` → boolean (the date filter above).
- `toDatetimeLocal(iso)` → `"YYYY-MM-DDTHH:mm"` for the `datetime-local` input,
  converting the ISO instant to the browser's local time.

### 2. Wire into `src/app/admin/tournaments/page.tsx`

- Render `<EspnEventPicker onChange={...} />` at the top of the Create form,
  above the existing Name / ESPN Event ID / Deadline fields, with a label
  "ESPN Event".
- `onChange` handler, given a non-null selection:
  - **ESPN Event ID** → always set to `selection.espnEventId` (the existing text
    input shows and can override this value).
  - **Name** → set to `selection.eventName` **only if the name field is currently
    empty** (never clobber a name the admin already typed).
  - **Deadline** → set to `toDatetimeLocal(selection.startDate)` **only if the
    deadline field is currently empty**. This is a convenience default the admin
    can adjust; ESPN's start time is the event start, not the intended pick
    deadline.
  - On `null` (cleared): leave the fields as-is (no destructive reset).
- The existing manual **ESPN Event ID** text field stays as the fallback/override.
- After a successful create, the form already resets its fields; the picker's
  selection is local UI state and resets on its own / can be left as-is.

## Error handling

- Schedule fetch failure: surfaced inline in the picker; tournament creation can
  still proceed via the manual ESPN Event ID field.
- No new failure modes in the create API — payload shape is unchanged.

## Testing / verification

- This repo has no test runner configured. Verification is:
  - `npx tsc --noEmit` passes.
  - Manual check in `npm run dev`: open Admin → Tournaments, confirm the dropdown
    lists upcoming events, selecting one fills ID + name + deadline, manual
    override still works, and creation succeeds.
- Pure helpers (`isUpcoming`, `toDatetimeLocal`) are written as standalone
  exported functions so they can be unit-tested if a runner is added later.

## Files touched

- **New:** `src/components/EspnEventPicker.tsx`
- **Edit:** `src/app/admin/tournaments/page.tsx`
