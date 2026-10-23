import { useEffect, useState } from "react";
import type { Session } from "../../data/mockData";
import { addDays, minutesBetween, shortDate, to12h, to24h, uid, useData } from "../../data/store";
import { Btn, Field, Modal, Select, TextArea, TextInput } from "../ui";

interface Props {
  open: boolean;
  onClose: () => void;
  editing?: Session | null;
  /** Prefill from an existing class but create a new one. */
  template?: Session | null;
  defaultDate?: string;
}

export function ClassForm({ open, onClose, editing, template, defaultDate }: Props) {
  const { settings, addClasses, updateClass, updateSeries, today } = useData();
  const src = editing ?? template ?? null;

  const [f, setF] = useState({
    title: "", program: "", tag: "", level: "", location: "", instructor: "",
    date: "", start: "09:00", end: "10:00", price: "27", capacity: "12",
    status: "open" as "open" | "draft", description: "", repeat: "1", applySeries: false,
  });
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!open) return;
    setErr("");
    setF({
      title: src?.title ?? "",
      program: src?.program ?? "",
      tag: src?.tag ?? "",
      level: src?.level ?? "",
      location: src?.location ?? settings.locations[0] ?? "",
      instructor: src?.coach ?? settings.instructors[0] ?? "",
      date: template ? addDays(template.date ?? today, 7) : src?.date ?? defaultDate ?? today,
      start: to24h(src?.startTime) || "09:00",
      end: to24h(src?.endTime) || "10:00",
      price: String(src?.price ?? 27),
      capacity: String(src?.capacity ?? settings.defaultCapacity),
      status: src?.status === "draft" ? "draft" : "open",
      description: src?.description ?? "",
      repeat: "1",
      applySeries: false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id, template?.id]);

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const mins = f.start && f.end ? minutesBetween(f.start, f.end) : 0;

  const submit = () => {
    if (!f.title.trim()) return setErr("Add a class name.");
    if (!f.date) return setErr("Pick a date.");
    if (mins <= 0) return setErr("End time must be after the start time.");
    const price = Number(f.price);
    const capacity = Math.round(Number(f.capacity));
    if (!(price >= 0) || f.price === "") return setErr("Enter a valid price.");
    if (!(capacity >= 1)) return setErr("Capacity must be at least 1.");

    const base = {
      title: f.title.trim(),
      program: f.program.trim() || undefined,
      tag: f.tag.trim() || undefined,
      level: f.level.trim() || undefined,
      location: f.location,
      coach: f.instructor,
      price,
      capacity,
      status: f.status,
      description: f.description.trim(),
      startTime: to12h(f.start),
      endTime: to12h(f.end),
      durationMin: mins,
      time: `${to12h(f.start)} - ${to12h(f.end)}`,
    };

    if (editing) {
      const patchNoDate: Partial<Session> = { ...base, status: editing.status === "cancelled" ? "cancelled" : base.status };
      if (f.applySeries && editing.seriesId) updateSeries(editing.seriesId, editing.date ?? today, patchNoDate);
      else updateClass(editing.id, patchNoDate);
      updateClass(editing.id, { date: f.date, schedule: shortDate(f.date) });
    } else {
      const n = Math.max(1, Math.min(12, Math.round(Number(f.repeat) || 1)));
      const seriesId = n > 1 ? uid("series") : undefined;
      addClasses(
        Array.from({ length: n }, (_, i) => {
          const date = addDays(f.date, 7 * i);
          return {
            ...base,
            id: uid("cls"),
            type: "adult" as const,
            date,
            schedule: shortDate(date),
            sessionsIncluded: 1,
            seriesId,
          };
        })
      );
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={editing ? "Edit class" : template ? "Duplicate class" : "New class"}
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" onClick={submit}>
            {editing ? "Save changes" : Number(f.repeat) > 1 ? `Create ${Math.min(12, Number(f.repeat))} classes` : "Create class"}
          </Btn>
        </>
      }
    >
      <div className="grid gap-3.5 sm:grid-cols-2">
        <Field label="Class name" className="sm:col-span-2">
          <TextInput value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Aspen Open Friday Drill" />
        </Field>
        <Field label="Program / series label" hint="Shown under the class name">
          <TextInput value={f.program} onChange={(e) => set("program", e.target.value)} />
        </Field>
        <Field label="Drill / team tag" hint="Used for the player filter">
          <TextInput list="tag-list" value={f.tag} onChange={(e) => set("tag", e.target.value)} />
          <datalist id="tag-list">{settings.tags.map((t) => <option key={t} value={t} />)}</datalist>
        </Field>
        <Field label="Level">
          <TextInput list="level-list" value={f.level} onChange={(e) => set("level", e.target.value)} placeholder="e.g. 3.0-3.5 (optional)" />
          <datalist id="level-list">{settings.levels.map((t) => <option key={t} value={t} />)}</datalist>
        </Field>
        <Field label="Location">
          <Select value={f.location} onChange={(e) => set("location", e.target.value)}>
            {settings.locations.map((l) => <option key={l}>{l}</option>)}
          </Select>
        </Field>
        <Field label="Instructor">
          <Select value={f.instructor} onChange={(e) => set("instructor", e.target.value)}>
            {settings.instructors.map((l) => <option key={l}>{l}</option>)}
          </Select>
        </Field>
        <Field label="Status" hint="Draft classes are hidden from players">
          <Select value={f.status} onChange={(e) => set("status", e.target.value as "open" | "draft")} disabled={editing?.status === "cancelled"}>
            <option value="open">Open for booking</option>
            <option value="draft">Draft (hidden)</option>
          </Select>
        </Field>
        <Field label="Date">
          <TextInput type="date" value={f.date} onChange={(e) => set("date", e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start">
            <TextInput type="time" value={f.start} onChange={(e) => set("start", e.target.value)} />
          </Field>
          <Field label="End" hint={mins > 0 ? `${mins} min` : undefined}>
            <TextInput type="time" value={f.end} onChange={(e) => set("end", e.target.value)} />
          </Field>
        </div>
        <Field label="Price (USD)">
          <TextInput type="number" min="0" step="0.5" value={f.price} onChange={(e) => set("price", e.target.value)} />
        </Field>
        <Field label="Capacity (spots)">
          <TextInput type="number" min="1" value={f.capacity} onChange={(e) => set("capacity", e.target.value)} />
        </Field>
        <Field label="Description" className="sm:col-span-2" hint="Shown on the class page. Leave empty for none.">
          <TextArea value={f.description} onChange={(e) => set("description", e.target.value)} />
        </Field>

        {!editing && (
          <Field label="Repeat weekly" hint="Creates this class on the same weekday for this many weeks (1 to 12)" className="sm:col-span-2">
            <TextInput type="number" min="1" max="12" value={f.repeat} onChange={(e) => set("repeat", e.target.value)} className="max-w-[120px]" />
          </Field>
        )}
        {editing?.seriesId && (
          <label className="flex items-start gap-2 rounded-lg bg-ink-100 p-3 text-[13px] text-navy-900 sm:col-span-2">
            <input type="checkbox" checked={f.applySeries} onChange={(e) => set("applySeries", e.target.checked)} className="mt-0.5" />
            <span>
              Apply these changes to this and all later classes in the same weekly series
              <span className="block text-[11.5px] text-ink-500">The date of other classes stays as it is.</span>
            </span>
          </label>
        )}
      </div>
      {err && <p className="mt-3 text-[13px] font-medium text-red-600">{err}</p>}
    </Modal>
  );
}

export function JuniorForm({ open, onClose, editing }: { open: boolean; onClose: () => void; editing?: Session | null }) {
  const { settings, addClasses, updateClass } = useData();
  const [f, setF] = useState({ title: "", schedule: "", time: "", location: "", coach: "", price: "0", capacity: "16", sessions: "1", description: "", status: "open" as "open" | "draft" });
  const [err, setErr] = useState("");
  useEffect(() => {
    if (!open) return;
    setErr("");
    setF({
      title: editing?.title ?? "",
      schedule: editing?.schedule ?? "",
      time: editing?.time ?? "",
      location: editing?.location ?? "",
      coach: editing?.coach ?? settings.instructors[0] ?? "",
      price: String(editing?.price ?? 0),
      capacity: String(editing?.capacity ?? 16),
      sessions: String(editing?.sessionsIncluded ?? 1),
      description: editing?.description ?? "",
      status: editing?.status === "draft" ? "draft" : "open",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id]);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  const submit = () => {
    if (!f.title.trim()) return setErr("Add a program name.");
    const price = Number(f.price);
    if (!(price >= 0)) return setErr("Enter a valid price.");
    const patch: Partial<Session> = {
      title: f.title.trim(), schedule: f.schedule, time: f.time, location: f.location, coach: f.coach,
      price, capacity: Math.max(1, Math.round(Number(f.capacity) || 1)), sessionsIncluded: Math.max(1, Math.round(Number(f.sessions) || 1)),
      description: f.description, status: f.status,
    };
    if (editing) updateClass(editing.id, patch);
    else addClasses([{ ...(patch as Session), id: uid("jr"), type: "junior" }]);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} wide title={editing ? "Edit junior program" : "New junior program"}
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" onClick={submit}>{editing ? "Save changes" : "Create program"}</Btn></>}>
      <div className="grid gap-3.5 sm:grid-cols-2">
        <Field label="Program name" className="sm:col-span-2"><TextInput value={f.title} onChange={(e) => set("title", e.target.value)} /></Field>
        <Field label="Schedule text" hint="e.g. Mon - Fri"><TextInput value={f.schedule} onChange={(e) => set("schedule", e.target.value)} /></Field>
        <Field label="Time text" hint="e.g. 9:00 AM - 12:00 PM"><TextInput value={f.time} onChange={(e) => set("time", e.target.value)} /></Field>
        <Field label="Location"><TextInput value={f.location} onChange={(e) => set("location", e.target.value)} /></Field>
        <Field label="Coach"><TextInput value={f.coach} onChange={(e) => set("coach", e.target.value)} /></Field>
        <Field label="Price (USD)"><TextInput type="number" min="0" value={f.price} onChange={(e) => set("price", e.target.value)} /></Field>
        <Field label="Capacity"><TextInput type="number" min="1" value={f.capacity} onChange={(e) => set("capacity", e.target.value)} /></Field>
        <Field label="Sessions included"><TextInput type="number" min="1" value={f.sessions} onChange={(e) => set("sessions", e.target.value)} /></Field>
        <Field label="Status">
          <Select value={f.status} onChange={(e) => set("status", e.target.value as "open" | "draft")}>
            <option value="open">Open for booking</option>
            <option value="draft">Draft (hidden)</option>
          </Select>
        </Field>
        <Field label="Description" className="sm:col-span-2"><TextArea value={f.description} onChange={(e) => set("description", e.target.value)} /></Field>
      </div>
      {err && <p className="mt-3 text-[13px] font-medium text-red-600">{err}</p>}
    </Modal>
  );
}
