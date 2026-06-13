"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface ScheduleEvent {
  eventId: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
}

export interface EspnEventSelection {
  espnEventId: string;
  eventName: string;
  startDate: string;
}

export interface EspnEventPickerProps {
  onChange: (selection: EspnEventSelection | null) => void;
}

/** True if the event has not finished yet (upcoming or in progress) as of `now`. */
export function isUpcoming(event: ScheduleEvent, now: Date): boolean {
  const ref = event.endDate || event.startDate;
  if (!ref) return true; // keep events with no dates rather than hiding them
  const end = new Date(ref);
  if (Number.isNaN(end.getTime())) return true;
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return end.getTime() >= startOfToday.getTime();
}

/** Convert an ISO instant to a `YYYY-MM-DDTHH:mm` string for a datetime-local input. */
export function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export default function EspnEventPicker({ onChange }: EspnEventPickerProps) {
  const [rawEvents, setRawEvents] = useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState("");

  // Stable ref so the fetch effect needn't depend on (and re-run for) onChange.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  const events = useMemo(() => {
    const now = new Date();
    return rawEvents
      .filter((e) => isUpcoming(e, now))
      .sort((a, b) => (a.startDate < b.startDate ? -1 : a.startDate > b.startDate ? 1 : 0));
  }, [rawEvents]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    fetch("/api/field/schedule")
      .then(async (r) => {
        if (!r.ok) {
          throw new Error((await r.json().catch(() => ({}))).error ?? "Failed to load schedule");
        }
        return r.json();
      })
      .then((data: ScheduleEvent[]) => {
        if (cancelled) return;
        setRawEvents(Array.isArray(data) ? data : []);
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setError(e.message || "Failed to load schedule");
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSelect = (eventId: string) => {
    setSelectedId(eventId);
    if (!eventId) {
      onChange(null);
      return;
    }
    const event = events.find((e) => e.eventId === eventId);
    if (event) {
      onChange({ espnEventId: event.eventId, eventName: event.name, startDate: event.startDate });
    }
  };

  return (
    <div>
      {error && <p className="text-sm text-red-400 mb-1">{error}</p>}
      <select
        value={selectedId}
        onChange={(e) => handleSelect(e.target.value)}
        disabled={loading || (events.length === 0 && !error)}
        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm disabled:opacity-50"
      >
        <option value="">
          {loading
            ? "Loading schedule…"
            : events.length === 0
            ? "No upcoming events"
            : "Pick an event…"}
        </option>
        {events.map((e) => (
          <option key={e.eventId} value={e.eventId}>
            {e.name} ({e.startDate.slice(0, 10)})
          </option>
        ))}
      </select>
    </div>
  );
}
