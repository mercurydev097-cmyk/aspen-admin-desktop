import { useState } from "react";
import { Plus, X } from "lucide-react";
import { useData } from "../../data/store";
import { Btn, Field, Modal, PageHeader, Panel, TextArea, TextInput } from "../ui";

function ListEditor({ label, items, onChange, inUse }: { label: string; items: string[]; onChange: (v: string[]) => void; inUse?: (v: string) => number }) {
  const [v, setV] = useState("");
  const add = () => {
    const t = v.trim();
    if (!t || items.includes(t)) return;
    onChange([...items, t]);
    setV("");
  };
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-500">{label}</p>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {items.map((i) => {
          const used = inUse?.(i) ?? 0;
          return (
            <span key={i} className="inline-flex items-center gap-1 rounded-full bg-ink-100 py-1 pl-3 pr-1.5 text-[12.5px] font-medium text-navy-900">
              {i}
              <button disabled={used > 0 || items.length <= 1} title={used > 0 ? `Used by ${used} class${used === 1 ? "" : "es"}` : "Remove"} onClick={() => onChange(items.filter((x) => x !== i))} className="rounded-full p-0.5 text-ink-500 hover:bg-white disabled:opacity-30">
                <X size={13} />
              </button>
            </span>
          );
        })}
      </div>
      <div className="flex max-w-sm gap-2">
        <TextInput value={v} placeholder={`Add ${label.toLowerCase().replace(/s$/, "")}`} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
        <Btn onClick={add}><Plus size={14} /> Add</Btn>
      </div>
    </div>
  );
}

export function SettingsPage() {
  const { settings, updateSettings, classes, resetData } = useData();
  const [confirmReset, setConfirmReset] = useState(false);
  const a = settings.about;
  const setAbout = (patch: Partial<typeof a>) => updateSettings({ about: { ...a, ...patch } });
  const n = settings.notifications;

  return (
    <>
      <PageHeader title="Settings" subtitle="Everything saves as you type." />
      <div className="space-y-5">
        <Panel title="Lists used across the app">
          <div className="grid gap-6 md:grid-cols-2">
            <ListEditor label="Locations" items={settings.locations} onChange={(v) => updateSettings({ locations: v })} inUse={(x) => classes.filter((c) => c.location === x).length} />
            <ListEditor label="Instructors" items={settings.instructors} onChange={(v) => updateSettings({ instructors: v })} inUse={(x) => classes.filter((c) => c.coach === x).length} />
            <ListEditor label="Levels" items={settings.levels} onChange={(v) => updateSettings({ levels: v })} inUse={(x) => classes.filter((c) => c.level === x).length} />
            <ListEditor label="Drill tags" items={settings.tags} onChange={(v) => updateSettings({ tags: v })} inUse={(x) => classes.filter((c) => c.tag === x).length} />
          </div>
          <p className="mt-3 text-[12px] text-ink-500">Locations and drill tags appear as filters for players. An item can be removed only when no class uses it.</p>
        </Panel>

        <Panel title="Booking rules">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Default capacity"><TextInput type="number" min="1" value={settings.defaultCapacity} onChange={(e) => updateSettings({ defaultCapacity: Math.max(1, Number(e.target.value) || 1) })} /></Field>
            <Field label="Cancel cutoff (hours)"><TextInput type="number" min="0" value={settings.cancelCutoffHours} onChange={(e) => updateSettings({ cancelCutoffHours: Math.max(0, Number(e.target.value) || 0) })} /></Field>
            <Field label="Timezone" hint="Times show to players in Central time"><TextInput value="America/Chicago (Central)" readOnly disabled /></Field>
            <Field label="Cancellation policy" className="sm:col-span-3"><TextArea value={settings.cancelPolicy} onChange={(e) => updateSettings({ cancelPolicy: e.target.value })} /></Field>
          </div>
        </Panel>

        <Panel title="Player messages">
          <p className="mb-3 text-[12.5px] text-ink-500">Variables you can use: {"{{player}} {{class}} {{date}} {{time}} {{location}} {{resolution}}"}. This prototype shows the text but does not send real messages.</p>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Booking confirmation"><TextArea value={n.confirmation} onChange={(e) => updateSettings({ notifications: { ...n, confirmation: e.target.value } })} /></Field>
            <Field label="Class cancelled"><TextArea value={n.cancellation} onChange={(e) => updateSettings({ notifications: { ...n, cancellation: e.target.value } })} /></Field>
            <Field label="Day-before reminder"><TextArea value={n.reminder} onChange={(e) => updateSettings({ notifications: { ...n, reminder: e.target.value } })} /></Field>
          </div>
        </Panel>

        <Panel title="About page (shown in the player app)">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Established (year)"><TextInput type="number" value={a.established} onChange={(e) => setAbout({ established: Number(e.target.value) || a.established })} /></Field>
            <Field label="Years coaching"><TextInput type="number" value={a.yearsCoaching} onChange={(e) => setAbout({ yearsCoaching: Number(e.target.value) || 0 })} /></Field>
            <Field label="Award line" hint="Shown as a stat chip"><TextInput value={a.award} onChange={(e) => setAbout({ award: e.target.value })} /></Field>
            <Field label="Coach name"><TextInput value={a.coachName} onChange={(e) => setAbout({ coachName: e.target.value })} /></Field>
            <Field label="Coach title" className="sm:col-span-2"><TextInput value={a.coachTitle} onChange={(e) => setAbout({ coachTitle: e.target.value })} /></Field>
          </div>
          <div className="mt-4 space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-ink-500">Paragraphs</p>
            {a.paragraphs.map((p, i) => (
              <div key={i} className="flex gap-2">
                <TextArea value={p} onChange={(e) => setAbout({ paragraphs: a.paragraphs.map((x, j) => (j === i ? e.target.value : x)) })} />
                <Btn size="sm" variant="ghost" disabled={a.paragraphs.length <= 1} onClick={() => setAbout({ paragraphs: a.paragraphs.filter((_, j) => j !== i) })} aria-label="Remove paragraph"><X size={14} /></Btn>
              </div>
            ))}
            <Btn size="sm" onClick={() => setAbout({ paragraphs: [...a.paragraphs, ""] })}><Plus size={13} /> Add paragraph</Btn>
          </div>
          <div className="mt-5 grid gap-6 md:grid-cols-2">
            <ListEditor label="Courts" items={a.courts} onChange={(v) => setAbout({ courts: v })} />
            <ListEditor label="Leagues" items={a.leagues} onChange={(v) => setAbout({ leagues: v })} />
          </div>
        </Panel>

        <Panel title="Demo data">
          <p className="mb-3 text-[13px] text-ink-500">Put every class, booking, player, promo code and setting back to the starting demo data.</p>
          <Btn variant="danger" onClick={() => setConfirmReset(true)}>Reset demo data</Btn>
        </Panel>
      </div>

      <Modal open={confirmReset} onClose={() => setConfirmReset(false)} title="Reset demo data?" footer={<><Btn onClick={() => setConfirmReset(false)}>Cancel</Btn><Btn variant="primary" onClick={() => { resetData(); setConfirmReset(false); }}>Reset</Btn></>}>
        <p className="text-[13.5px] text-navy-900">Everything you changed in this browser will be replaced with the original sample data.</p>
      </Modal>
    </>
  );
}
