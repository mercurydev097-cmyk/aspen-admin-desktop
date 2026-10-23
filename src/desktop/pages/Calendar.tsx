import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import type { Session } from "../../data/mockData";
import { addDays, classKey, shortDate, useData } from "../../data/store";
import { cn } from "../../lib/utils";
import { Btn, PageHeader, Select, Toast } from "../ui";
import { ClassPanel } from "../ClassPanel";
import { SidePanel } from "../ui";
import { ClassForm } from "./ClassForm";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function monthStartOf(iso: string) {
  return `${iso.slice(0, 7)}-01`;
}
function addMonths(iso: string, n: number) {
  const d = new Date(`${iso}T12:00:00`);
  d.setMonth(d.getMonth() + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export function Calendar() {
  const navigate = useNavigate();
  const { classes, settings, today, bookedCount, updateClass } = useData();
  const [month, setMonth] = useState(monthStartOf(today));
  const [loc, setLoc] = useState("all");
  const [selId, setSelId] = useState<string | null>(null);
  const [newOn, setNewOn] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [dayOpen, setDayOpen] = useState<string | null>(null);
  const [overDay, setOverDay] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; undo?: () => void } | null>(null);

  const first = new Date(`${month}T12:00:00`);
  const gridStart = addDays(month, -first.getDay());
  const monthEnd = addDays(addMonths(month, 1), -1);
  const days = useMemo(() => {
    const out: string[] = [];
    let d = gridStart;
    while (d <= monthEnd || out.length % 7 !== 0) {
      out.push(d);
      d = addDays(d, 1);
    }
    return out;
  }, [gridStart, monthEnd]);

  const byDay = useMemo(() => {
    const m = new Map<string, Session[]>();
    classes
      .filter((c) => c.type === "adult" && c.date && (loc === "all" || c.location === loc))
      .sort((a, b) => classKey(a).localeCompare(classKey(b)))
      .forEach((c) => m.set(c.date!, [...(m.get(c.date!) ?? []), c]));
    return m;
  }, [classes, loc]);

  const sel = classes.find((c) => c.id === selId) ?? null;

  const move = (id: string, date: string) => {
    const c = classes.find((x) => x.id === id);
    if (!c || c.date === date) return;
    if (c.status === "cancelled") return setToast({ msg: "Cancelled classes can't be moved. Reopen it first." });
    const prev = { date: c.date!, schedule: c.schedule };
    updateClass(id, { date, schedule: shortDate(date) });
    const n = bookedCount(id);
    setToast({
      msg: `Moved ${c.title} to ${shortDate(date)}.${n ? ` ${n} booked player${n === 1 ? "" : "s"} keep their spot.` : ""}`,
      undo: () => updateClass(id, prev),
    });
  };

  const monthLabel = first.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <>
      <PageHeader
        title="Calendar"
        subtitle="On a computer, drag a class onto another day to move it. Click a class for its roster."
        actions={
          <>
            <Select value={loc} onChange={(e) => setLoc(e.target.value)} className="w-auto">
              <option value="all">All locations</option>
              {settings.locations.map((l) => <option key={l}>{l}</option>)}
            </Select>
            <Btn variant="primary" onClick={() => setNewOn(today)}><Plus size={15} /> New class</Btn>
          </>
        }
      />
      <div className="flex items-start gap-5">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex items-center gap-2">
            <Btn size="sm" onClick={() => setMonth(addMonths(month, -1))} aria-label="Previous month"><ChevronLeft size={15} /></Btn>
            <h2 className="w-36 text-center sm:w-44 text-[16px] font-bold text-navy-900">{monthLabel}</h2>
            <Btn size="sm" onClick={() => setMonth(addMonths(month, 1))} aria-label="Next month"><ChevronRight size={15} /></Btn>
            <Btn size="sm" variant="ghost" onClick={() => setMonth(monthStartOf(today))}>Today</Btn>
          </div>
          <div className="overflow-hidden rounded-xl border border-ink-200 bg-white">
            <div className="grid grid-cols-7 border-b border-ink-100 bg-ink-100/50">
              {DOW.map((d) => <div key={d} className="px-1 py-2 text-center text-[10px] font-bold uppercase tracking-wide text-ink-500 md:px-2 md:text-left md:text-[11px]">{d}</div>)}
            </div>
            <div className="grid grid-cols-7">
              {days.map((d) => {
                const list = byDay.get(d) ?? [];
                const inMonth = d.slice(0, 7) === month.slice(0, 7);
                const showAll = expanded === d;
                const shown = showAll ? list : list.slice(0, 4);
                return (
                  <div
                    key={d}
                    onDragOver={(e) => { e.preventDefault(); setOverDay(d); }}
                    onDragLeave={() => setOverDay((x) => (x === d ? null : x))}
                    onDrop={(e) => { e.preventDefault(); setOverDay(null); move(e.dataTransfer.getData("text/plain"), d); }}
                    onClick={() => { if (window.matchMedia("(max-width: 767px)").matches) setDayOpen(d); }}
                    className={cn("group min-h-[64px] border-b border-r border-ink-100 p-1 md:min-h-[124px] md:p-1.5", !inMonth && "bg-ink-100/40", overDay === d && "bg-pine-50 ring-2 ring-inset ring-pine-600")}
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className={cn("flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[12px] font-semibold", d === today ? "bg-navy-900 text-white" : inMonth ? "text-navy-900" : "text-ink-300")}>{Number(d.slice(8))}</span>
                      <button aria-label={`Add class on ${d}`} onClick={() => setNewOn(d)} className="rounded p-0.5 text-ink-300 opacity-0 hover:bg-ink-100 hover:text-navy-900 group-hover:opacity-100"><Plus size={14} /></button>
                    </div>
                    {list.length > 0 && (
                      <div className="flex flex-wrap items-center gap-0.5 px-0.5 md:hidden">
                        {list.slice(0, 4).map((c) => (
                          <span key={c.id} className={cn("h-1.5 w-1.5 rounded-full", c.status === "cancelled" ? "bg-red-600" : c.status === "draft" ? "bg-gold-500" : "bg-pine-600")} />
                        ))}
                        <span className="text-[10px] font-semibold text-ink-500">{list.length}</span>
                      </div>
                    )}
                    <div className="hidden space-y-1 md:block">
                      {shown.map((c) => (
                        <button
                          key={c.id}
                          draggable
                          onDragStart={(e) => e.dataTransfer.setData("text/plain", c.id)}
                          onClick={() => setSelId(c.id)}
                          className={cn(
                            "block w-full cursor-grab rounded-md px-1.5 py-1 text-left text-[11px] leading-tight active:cursor-grabbing",
                            c.status === "cancelled" ? "bg-red-50 text-red-600" : c.status === "draft" ? "bg-gold-50 text-gold-500" : "bg-pine-50 text-pine-600",
                            selId === c.id && "ring-2 ring-navy-900"
                          )}
                        >
                          <span className="font-bold">{c.startTime}</span> <span className="font-semibold text-navy-900">{c.title}</span>
                          <span className="block opacity-80">{bookedCount(c.id)}/{c.capacity} · {c.location}</span>
                        </button>
                      ))}
                      {list.length > 4 && (
                        <button onClick={() => setExpanded(showAll ? null : d)} className="px-1 text-[11px] font-semibold text-pine-600">{showAll ? "Show less" : `+${list.length - 4} more`}</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <p className="mt-2 text-[12px] text-ink-500">Tap a day on a phone to see its classes. Green is open, amber is draft (hidden from players), red is cancelled. <button onClick={() => navigate("/classes")} className="font-semibold text-pine-600">Open the list view</button></p>
        </div>
        {sel && <ClassPanel key={sel.id} cls={sel} onClose={() => setSelId(null)} />}
        {dayOpen && !sel && (
          <SidePanel title={shortDate(dayOpen)} subtitle={`${(byDay.get(dayOpen) ?? []).length} classes`} onClose={() => setDayOpen(null)}
            footer={<Btn variant="primary" onClick={() => { setNewOn(dayOpen); }}><Plus size={15} /> New class</Btn>}>
            {(byDay.get(dayOpen) ?? []).length === 0 ? <p className="text-[13px] text-ink-500">No classes this day.</p> : (
              <ul className="divide-y divide-ink-100">
                {(byDay.get(dayOpen) ?? []).map((c) => (
                  <li key={c.id}>
                    <button onClick={() => setSelId(c.id)} className="flex w-full items-center justify-between gap-3 py-2.5 text-left">
                      <span className="min-w-0"><span className="block truncate text-[13.5px] font-semibold text-navy-900">{c.title}</span><span className="text-[12px] text-ink-500">{c.startTime} · {c.location}</span></span>
                      <span className="shrink-0 text-[12px] font-semibold text-navy-900">{bookedCount(c.id)}/{c.capacity}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </SidePanel>
        )}
      </div>
      <ClassForm open={!!newOn} onClose={() => setNewOn(null)} defaultDate={newOn ?? undefined} />
      {toast && <Toast msg={toast.msg} onUndo={toast.undo} onClose={() => setToast(null)} />}
    </>
  );
}
