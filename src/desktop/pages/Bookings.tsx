import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Download, Plus, Search } from "lucide-react";
import type { Booking, PayMethod } from "../../data/types";
import { classKey, shortDate, useData } from "../../data/store";
import { cn } from "../../lib/utils";
import { AddBooking, classLabel } from "../AddBooking";
import { Btn, Empty, PageHeader, Pill, Select, SidePanel, Stat, TextInput, Th, Toast, downloadCsv, money } from "../ui";

const methodLabel: Record<PayMethod, string> = { card: "Card", ach: "ACH", cash: "Cash", comp: "Comp" };
const statusTone = { confirmed: "green", refunded: "red", credited: "blue", cancelled: "gray" } as const;
const statusLabel = { confirmed: "Confirmed", refunded: "Refunded", credited: "Credited", cancelled: "Cancelled" } as const;

export function Bookings() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const classId = params.get("class") ?? "all";
  const { classes, bookings, customers, updateBooking, resolveBooking } = useData();

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [adding, setAdding] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const sorted = useMemo(() => [...classes].sort((a, b) => classKey(a).localeCompare(classKey(b))), [classes]);
  const classById = (id: string) => classes.find((c) => c.id === id);
  const custById = (id: string) => customers.find((c) => c.id === id);

  const rows = useMemo(
    () =>
      bookings
        .filter((b) => classId === "all" || b.sessionId === classId)
        .filter((b) => status === "all" || b.status === status)
        .filter((b) => !q || `${b.playerName} ${custById(b.customerId)?.name ?? ""}`.toLowerCase().includes(q.toLowerCase()))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bookings, classId, status, q, customers]
  );

  const confirmed = rows.filter((b) => b.status === "confirmed");
  const total = confirmed.reduce((s, b) => s + b.amount, 0);
  const allPicked = rows.length > 0 && rows.every((r) => picked.has(r.id));
  const toggle = (id: string) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const chosen = bookings.filter((b) => picked.has(b.id));
  const chosenPaid = chosen.filter((b) => b.status === "confirmed");
  const open = bookings.find((b) => b.id === openId) ?? null;

  const exportRows = (list: Booking[]) =>
    downloadCsv("bookings.csv", [
      ["Player", "Family", "Email", "Class", "Date", "Paid", "Method", "Status", "Checked in"],
      ...list.map((b) => { const c = custById(b.customerId); const k = classById(b.sessionId); return [b.playerName, c?.name ?? "", c?.email ?? "", k?.title ?? "", k?.date ?? "", b.amount.toFixed(2), methodLabel[b.method], statusLabel[b.status], b.checkedIn ? "Yes" : "No"]; }),
    ]);

  return (
    <>
      <PageHeader title="Bookings" subtitle="Select bookings for bulk check-in, refunds or export. Click a row for details." actions={<><Btn onClick={() => exportRows(chosen.length ? chosen : rows)}><Download size={14} /> Export CSV</Btn><Btn variant="primary" onClick={() => setAdding(true)}><Plus size={15} /> Add booking</Btn></>} />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Select value={classId} onChange={(e) => (e.target.value === "all" ? setParams({}) : setParams({ class: e.target.value }))} className="w-full sm:w-auto sm:max-w-md">
          <option value="all">All classes</option>
          {sorted.map((c) => <option key={c.id} value={c.id}>{classLabel(c)}{c.status === "cancelled" ? " (cancelled)" : ""}</option>)}
        </Select>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-auto"><option value="all">Any status</option>{Object.entries(statusLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
        <div className="relative w-full sm:w-64"><Search size={15} className="pointer-events-none absolute left-3 top-2.5 text-ink-300" /><TextInput placeholder="Search player or family" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" /></div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Showing" value={rows.length} sub="bookings" />
        <Stat label="Paid" value={money(total)} sub={`${confirmed.length} confirmed`} />
        <Stat label="Checked in" value={confirmed.filter((b) => b.checkedIn).length} sub={`of ${confirmed.length}`} />
        <Stat label="Refunded / credited" value={rows.filter((b) => b.status === "refunded" || b.status === "credited").length} sub="in this view" />
      </div>

      {picked.size > 0 && (
        <div className="sticky top-2 z-20 mb-3 flex flex-wrap items-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-white shadow-[var(--shadow-float)]">
          <span className="mr-2 text-[13px] font-semibold">{picked.size} selected</span>
          <Btn size="sm" disabled={chosenPaid.length === 0} onClick={() => { chosenPaid.forEach((b) => updateBooking(b.id, { checkedIn: true })); setToast(`Checked in ${chosenPaid.length} players.`); setPicked(new Set()); }}>Check in</Btn>
          <Btn size="sm" disabled={chosenPaid.length === 0} onClick={() => { chosenPaid.forEach((b) => resolveBooking(b.id, "refund")); setToast(`Refunded ${chosenPaid.length} bookings (${money(chosenPaid.reduce((s, b) => s + b.amount, 0))}).`); setPicked(new Set()); }}>Refund</Btn>
          <Btn size="sm" disabled={chosenPaid.length === 0} onClick={() => { chosenPaid.forEach((b) => resolveBooking(b.id, "credit")); setToast(`Credited ${chosenPaid.length} bookings.`); setPicked(new Set()); }}>Credit</Btn>
          <Btn size="sm" onClick={() => exportRows(chosen)}><Download size={13} /> Export</Btn>
          <Btn size="sm" variant="ghost" className="ml-auto !text-white hover:!bg-white/10" onClick={() => setPicked(new Set())}>Clear</Btn>
        </div>
      )}

      <div className="flex items-start gap-5">
        <div className="min-w-0 flex-1">
          {rows.length === 0 ? <Empty>No bookings match these filters.</Empty> : (
            <div className="overflow-x-auto rounded-xl border border-ink-200 bg-white">
              <table className="w-full text-left text-[13px]">
                <thead className="border-b border-ink-100 bg-ink-100/50">
                  <tr>
                    <th className="w-10 px-3"><input type="checkbox" aria-label="Select all" checked={allPicked} onChange={() => setPicked(allPicked ? new Set() : new Set(rows.map((r) => r.id)))} /></th>
                    <Th>Player</Th>{classId === "all" && <Th className="hidden sm:table-cell">Class</Th>}<Th className="hidden md:table-cell">Booked</Th><Th>Paid</Th><Th className="hidden md:table-cell">Method</Th><Th>Status</Th><Th>In</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {rows.map((b) => {
                    const c = custById(b.customerId);
                    const k = classById(b.sessionId);
                    return (
                      <tr key={b.id} onClick={() => setOpenId(b.id)} className={cn("cursor-pointer hover:bg-ink-100/50", openId === b.id && "bg-pine-50")}>
                        <td className="px-3" onClick={(e) => e.stopPropagation()}><input type="checkbox" aria-label={`Select ${b.playerName}`} checked={picked.has(b.id)} onChange={() => toggle(b.id)} /></td>
                        <td className="px-3 py-2.5"><span className="font-semibold text-navy-900">{b.playerName}</span><span className="block text-[12px] text-ink-500">{c?.name}</span></td>
                        {classId === "all" && <td className="hidden px-3 py-2.5 text-ink-500 sm:table-cell">{k ? classLabel(k) : "Deleted class"}</td>}
                        <td className="hidden px-3 py-2.5 text-ink-500 md:table-cell">{shortDate(b.createdAt)}</td>
                        <td className="px-3 py-2.5 font-semibold text-navy-900">{money(b.amount)}{b.promoCode && <span className="block text-[11.5px] font-normal text-ink-500">{b.promoCode}</span>}</td>
                        <td className="hidden px-3 py-2.5 text-ink-500 md:table-cell">{methodLabel[b.method]}</td>
                        <td className="px-3 py-2.5"><Pill tone={statusTone[b.status]}>{statusLabel[b.status]}</Pill></td>
                        <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}><input type="checkbox" aria-label="Checked in" checked={b.checkedIn} disabled={b.status !== "confirmed"} onChange={(e) => updateBooking(b.id, { checkedIn: e.target.checked })} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {open && (() => {
          const c = custById(open.customerId);
          const k = classById(open.sessionId);
          const line = (l: string, v: React.ReactNode) => <div className="flex justify-between gap-3 border-b border-ink-100 py-2 text-[13px]"><span className="text-ink-500">{l}</span><span className="text-right font-semibold text-navy-900">{v}</span></div>;
          return (
            <SidePanel title={open.playerName} subtitle={<Pill tone={statusTone[open.status]}>{statusLabel[open.status]}</Pill>} onClose={() => setOpenId(null)}>
              {line("Class", k ? classLabel(k) : "Deleted class")}
              {line("Family", c?.name ?? "-")}
              {line("Email", c?.email || "-")}
              {line("Booked on", shortDate(open.createdAt))}
              {line("Paid", money(open.amount))}
              {open.promoCode && line("Promo", `${open.promoCode} (-${money(open.discount)})`)}
              {line("Method", methodLabel[open.method])}
              {line("Checked in", open.checkedIn ? "Yes" : "No")}
              {open.note && line("Note", open.note)}
              <div className="mt-4 flex flex-wrap gap-2">
                {open.status === "confirmed" && (
                  <>
                    <Btn size="sm" onClick={() => updateBooking(open.id, { checkedIn: !open.checkedIn })}>{open.checkedIn ? "Undo check-in" : "Check in"}</Btn>
                    <Btn size="sm" onClick={() => resolveBooking(open.id, "refund")}>Refund {money(open.amount)}</Btn>
                    <Btn size="sm" onClick={() => resolveBooking(open.id, "credit")}>Give credit</Btn>
                  </>
                )}
                {k && <Btn size="sm" onClick={() => navigate(`/classes?open=${k.id}`)}>Open class</Btn>}
                {c && <Btn size="sm" onClick={() => navigate(`/players?family=${c.id}`)}>Open family</Btn>}
              </div>
            </SidePanel>
          );
        })()}
      </div>
      <AddBooking open={adding} onClose={() => setAdding(false)} defaultClass={classId !== "all" ? classId : undefined} />
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
    </>
  );
}
