import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Download, Plus, Search } from "lucide-react";
import type { Session } from "../../data/mockData";
import { addDays, classKey, shortDate, useData } from "../../data/store";
import { cn } from "../../lib/utils";
import { Btn, Empty, Field, FillBar, Modal, PageHeader, Pill, Select, Tabs, TextInput, Th, Toast, downloadCsv, money } from "../ui";
import { CancelClassModal, ClassPanel } from "../ClassPanel";
import { ClassForm, JuniorForm } from "./ClassForm";

type SortKey = "when" | "title" | "fill" | "price";
type Bulk = "price" | "capacity" | "move" | "cancel" | "delete" | null;

export function Classes() {
  const [params, setParams] = useSearchParams();
  const { classes, bookings, settings, today, bookedCount, updateClass, deleteClass } = useData();

  const [segment, setSegment] = useState<"adult" | "junior">("adult");
  const [q, setQ] = useState("");
  const [loc, setLoc] = useState("all");
  const [tag, setTag] = useState("all");
  const [status, setStatus] = useState("all");
  const [showPast, setShowPast] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "when", dir: 1 });
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(params.get("open"));
  const [creating, setCreating] = useState(false);
  const [bulk, setBulk] = useState<Bulk>(null);
  const [num, setNum] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const rows = useMemo(() => {
    const list = classes
      .filter((c) => c.type === segment)
      .filter((c) => segment === "junior" || showPast || (c.date ?? "") >= today)
      .filter((c) => (loc === "all" || c.location === loc) && (tag === "all" || c.tag === tag) && (status === "all" || (c.status ?? "open") === status))
      .filter((c) => !q || `${c.title} ${c.tag ?? ""} ${c.program ?? ""}`.toLowerCase().includes(q.toLowerCase()));
    const val = (c: Session) =>
      sort.key === "when" ? classKey(c) : sort.key === "title" ? c.title.toLowerCase() : sort.key === "price" ? c.price : (c.capacity ? bookedCount(c.id) / c.capacity : 0);
    return list.sort((a, b) => {
      const x = val(a), y = val(b);
      return (x < y ? -1 : x > y ? 1 : 0) * sort.dir;
    });
  }, [classes, segment, q, loc, tag, status, showPast, sort, today, bookedCount]);

  const sortBy = (key: SortKey) => setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: 1 }));
  const allPicked = rows.length > 0 && rows.every((r) => picked.has(r.id));
  const toggleAll = () => setPicked(allPicked ? new Set() : new Set(rows.map((r) => r.id)));
  const toggle = (id: string) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const selected = classes.filter((c) => picked.has(c.id));
  const deletable = selected.filter((c) => !bookings.some((b) => b.sessionId === c.id));
  const open = classes.find((c) => c.id === openId) ?? null;
  const setOpen = (id: string | null) => { setOpenId(id); if (params.get("open")) setParams({}); };

  const applyBulk = () => {
    const n = Number(num);
    if (bulk === "price") {
      if (!(n >= 0) || num === "") return;
      selected.forEach((c) => updateClass(c.id, { price: n }));
      setToast(`Set the price to ${money(n)} on ${selected.length} classes.`);
    } else if (bulk === "capacity") {
      if (!(n >= 1)) return;
      selected.forEach((c) => updateClass(c.id, { capacity: Math.round(n) }));
      setToast(`Set capacity to ${Math.round(n)} on ${selected.length} classes.`);
    } else if (bulk === "move") {
      if (!n || !Number.isInteger(n)) return;
      selected.filter((c) => c.date && c.status !== "cancelled").forEach((c) => { const d = addDays(c.date!, n); updateClass(c.id, { date: d, schedule: shortDate(d) }); });
      setToast(`Moved ${selected.filter((c) => c.date && c.status !== "cancelled").length} classes by ${n} day${Math.abs(n) === 1 ? "" : "s"}.`);
    } else if (bulk === "delete") {
      deletable.forEach((c) => deleteClass(c.id));
      setToast(`Deleted ${deletable.length} classes.`);
    }
    setBulk(null);
    setNum("");
    setPicked(new Set());
  };

  const setStatusBulk = (s: "open" | "draft") => {
    const t = selected.filter((c) => c.status !== "cancelled");
    t.forEach((c) => updateClass(c.id, { status: s }));
    setToast(`${s === "open" ? "Published" : "Hid"} ${t.length} classes.`);
    setPicked(new Set());
  };

  const exportCsv = () =>
    downloadCsv("classes.csv", [
      ["Date", "Start", "End", "Class", "Location", "Instructor", "Level", "Drill", "Price", "Capacity", "Booked", "Status"],
      ...(selected.length ? selected : rows).map((c) => [c.date ?? c.schedule, c.startTime ?? "", c.endTime ?? "", c.title, c.location, c.coach, c.level ?? "", c.tag ?? "", c.price.toFixed(2), c.capacity ?? "", bookedCount(c.id), c.status ?? "open"]),
    ]);

  return (
    <>
      <PageHeader
        title="Classes"
        subtitle="Select several classes for bulk changes. Click a row for details and the roster."
        actions={<><Btn onClick={exportCsv}><Download size={14} /> Export CSV</Btn><Btn variant="primary" onClick={() => setCreating(true)}><Plus size={15} /> New class</Btn></>}
      />
      <Tabs value={segment} onChange={(v) => { setSegment(v); setPicked(new Set()); setOpen(null); }} options={[{ value: "adult", label: "Adult classes" }, { value: "junior", label: "Junior programs" }]} />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search size={15} className="pointer-events-none absolute left-3 top-2.5 text-ink-300" />
          <TextInput placeholder="Search classes" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        {segment === "adult" && (
          <>
            <Select value={loc} onChange={(e) => setLoc(e.target.value)} className="w-auto"><option value="all">All locations</option>{settings.locations.map((l) => <option key={l}>{l}</option>)}</Select>
            <Select value={tag} onChange={(e) => setTag(e.target.value)} className="w-auto max-w-[220px]"><option value="all">All drills</option>{settings.tags.map((l) => <option key={l}>{l}</option>)}</Select>
          </>
        )}
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-auto"><option value="all">Any status</option><option value="open">Open</option><option value="draft">Draft</option><option value="cancelled">Cancelled</option></Select>
        {segment === "adult" && <label className="flex items-center gap-1.5 text-[13px] text-ink-500"><input type="checkbox" checked={showPast} onChange={(e) => setShowPast(e.target.checked)} /> Show past</label>}
      </div>

      {picked.size > 0 && (
        <div className="sticky top-2 z-20 mb-3 flex flex-wrap items-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-white shadow-[var(--shadow-float)]">
          <span className="mr-2 text-[13px] font-semibold">{picked.size} selected</span>
          <Btn size="sm" onClick={() => { setNum(""); setBulk("price"); }}>Set price</Btn>
          <Btn size="sm" onClick={() => { setNum(""); setBulk("capacity"); }}>Set capacity</Btn>
          {segment === "adult" && <Btn size="sm" onClick={() => { setNum("7"); setBulk("move"); }}>Move by days</Btn>}
          <Btn size="sm" onClick={() => setStatusBulk("open")}>Publish</Btn>
          <Btn size="sm" onClick={() => setStatusBulk("draft")}>Hide (draft)</Btn>
          {segment === "adult" && <Btn size="sm" variant="danger" onClick={() => setBulk("cancel")}>Cancel classes</Btn>}
          <Btn size="sm" variant="danger" disabled={deletable.length === 0} onClick={() => setBulk("delete")}>Delete ({deletable.length})</Btn>
          <Btn size="sm" variant="ghost" className="ml-auto !text-white hover:!bg-white/10" onClick={() => setPicked(new Set())}>Clear</Btn>
        </div>
      )}

      <div className="flex items-start gap-5">
        <div className="min-w-0 flex-1">
          {rows.length === 0 ? <Empty>No classes match these filters.</Empty> : (
            <div className="overflow-x-auto rounded-xl border border-ink-200 bg-white">
              <table className="w-full text-left text-[13px]">
                <thead className="border-b border-ink-100 bg-ink-100/50">
                  <tr>
                    <th className="w-10 px-3"><input type="checkbox" aria-label="Select all" checked={allPicked} onChange={toggleAll} /></th>
                    <Th onClick={() => sortBy("when")} active={sort.key === "when"} dir={sort.dir}>{segment === "adult" ? "Date & time" : "Schedule"}</Th>
                    <Th onClick={() => sortBy("title")} active={sort.key === "title"} dir={sort.dir}>Class</Th>
                    <Th className="hidden md:table-cell">Location</Th>
                    <Th onClick={() => sortBy("fill")} active={sort.key === "fill"} dir={sort.dir} className="hidden sm:table-cell">Fill</Th>
                    <Th onClick={() => sortBy("price")} active={sort.key === "price"} dir={sort.dir} className="text-right">Price</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {rows.map((c) => (
                    <tr key={c.id} onClick={() => setOpen(c.id)} className={cn("cursor-pointer hover:bg-ink-100/50", openId === c.id && "bg-pine-50", c.status === "cancelled" && "opacity-70")}>
                      <td className="px-3" onClick={(e) => e.stopPropagation()}><input type="checkbox" aria-label={`Select ${c.title}`} checked={picked.has(c.id)} onChange={() => toggle(c.id)} /></td>
                      <td className="px-3 py-2.5 text-ink-500">{c.date ? <>{shortDate(c.date)}<span className="block text-[12px]">{c.startTime} · {c.durationMin} min</span></> : <>{c.schedule}<span className="block text-[12px]">{c.time}</span></>}</td>
                      <td className="px-3 py-2.5"><span className={cn("font-semibold text-navy-900", c.status === "cancelled" && "line-through")}>{c.title}</span><span className="block text-[12px] text-ink-500">{c.tag ?? c.program ?? ""}{c.level ? ` · Level ${c.level}` : ""}</span></td>
                      <td className="hidden px-3 py-2.5 text-ink-500 md:table-cell">{c.location}</td>
                      <td className="hidden w-36 px-3 py-2.5 sm:table-cell"><FillBar booked={bookedCount(c.id)} capacity={c.capacity} /></td>
                      <td className="px-3 py-2.5 text-right font-semibold text-navy-900">{money(c.price)}</td>
                      <td className="px-3 py-2.5">{c.status === "cancelled" ? <Pill tone="red">Cancelled</Pill> : c.status === "draft" ? <Pill tone="amber">Draft</Pill> : <Pill tone="green">Open</Pill>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {open && <ClassPanel key={open.id} cls={open} onClose={() => setOpen(null)} />}
      </div>

      {segment === "adult" ? <ClassForm open={creating} onClose={() => setCreating(false)} /> : <JuniorForm open={creating} onClose={() => setCreating(false)} />}
      {bulk === "cancel" && <CancelClassModal ids={selected.map((c) => c.id)} onClose={() => { setBulk(null); setPicked(new Set()); }} />}

      <Modal
        open={bulk === "price" || bulk === "capacity" || bulk === "move" || bulk === "delete"}
        onClose={() => setBulk(null)}
        title={bulk === "price" ? "Set price" : bulk === "capacity" ? "Set capacity" : bulk === "move" ? "Move classes" : "Delete classes"}
        footer={<><Btn onClick={() => setBulk(null)}>Cancel</Btn><Btn variant={bulk === "delete" ? "danger" : "primary"} onClick={applyBulk}>{bulk === "delete" ? `Delete ${deletable.length}` : "Apply"}</Btn></>}
      >
        {bulk === "delete" ? (
          <p className="text-[13.5px] text-navy-900">Deletes {deletable.length} of the {selected.length} selected classes. Classes with bookings are skipped (cancel them instead). This cannot be undone.</p>
        ) : (
          <Field
            label={bulk === "price" ? "New price (USD)" : bulk === "capacity" ? "New capacity (spots)" : "Days to move (negative moves earlier)"}
            hint={`Applies to ${selected.length} selected classes${bulk === "move" ? ". Booked players keep their spot. Cancelled classes are skipped." : "."}`}
          >
            <TextInput autoFocus type="number" value={num} onChange={(e) => setNum(e.target.value)} />
          </Field>
        )}
      </Modal>
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
    </>
  );
}
