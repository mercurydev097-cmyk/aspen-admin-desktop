import { useState } from "react";
import { Copy, Download, Pencil, Plus, Trash2 } from "lucide-react";
import type { Session } from "../data/mockData";
import { shortDate, useData } from "../data/store";
import { AddBooking } from "./AddBooking";
import { Btn, FillBar, Modal, Pill, SidePanel, downloadCsv, money } from "./ui";
import { ClassForm, JuniorForm } from "./pages/ClassForm";

export function CancelClassModal({ ids, onClose }: { ids: string[]; onClose: () => void }) {
  const { classes, bookings, cancelClass } = useData();
  const [resolution, setResolution] = useState<"refund" | "credit" | "none">("refund");
  const targets = classes.filter((c) => ids.includes(c.id) && c.status !== "cancelled");
  const paid = bookings.filter((b) => targets.some((t) => t.id === b.sessionId) && b.status === "confirmed");
  const total = paid.reduce((s, b) => s + b.amount, 0);
  return (
    <Modal open onClose={onClose} title={targets.length > 1 ? `Cancel ${targets.length} classes?` : "Cancel this class?"}
      footer={<><Btn onClick={onClose}>Keep</Btn><Btn variant="primary" disabled={targets.length === 0} onClick={() => { targets.forEach((t) => cancelClass(t.id, resolution)); onClose(); }}>Cancel {targets.length > 1 ? "classes" : "class"}</Btn></>}>
      <div className="space-y-3 text-[13.5px] text-navy-900">
        {targets.length === 0 ? <p>These classes are already cancelled.</p> : (
          <>
            <p>{targets.length === 1 ? <><strong>{targets[0].title}</strong>{targets[0].date ? `, ${shortDate(targets[0].date)} at ${targets[0].startTime}` : ""}.</> : "The selected classes"} stay visible to players as Cancelled and can no longer be booked.</p>
            {paid.length === 0 ? <p className="text-ink-500">No paid bookings, so nobody needs a refund.</p> : (
              <>
                <p>{paid.length} paid booking{paid.length === 1 ? "" : "s"} ({money(total)}). What should happen to them?</p>
                {([["refund", "Refund to the original payment method"], ["credit", "Give each family account credit"], ["none", "Do nothing for now (I will handle it manually)"]] as const).map(([v, label]) => (
                  <label key={v} className="flex items-center gap-2"><input type="radio" checked={resolution === v} onChange={() => setResolution(v)} /> {label}</label>
                ))}
                <p className="rounded-lg bg-ink-100 p-3 text-[12px] text-ink-500">Players are told using the cancellation message in Settings. This prototype does not send real messages or move real money.</p>
              </>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}

export function ClassPanel({ cls, onClose }: { cls: Session; onClose: () => void }) {
  const { bookings, customers, bookedCount, reopenClass, deleteClass, updateBooking, resolveBooking } = useData();
  const [form, setForm] = useState<"edit" | "dup" | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const roster = bookings.filter((b) => b.sessionId === cls.id).sort((a, b) => a.playerName.localeCompare(b.playerName));
  const confirmed = roster.filter((b) => b.status === "confirmed");
  const hasBookings = roster.length > 0;
  const junior = cls.type === "junior";

  const row = (label: string, value: React.ReactNode) => (
    <div className="flex justify-between gap-3 border-b border-ink-100 py-2 text-[13px]">
      <span className="text-ink-500">{label}</span>
      <span className="text-right font-semibold text-navy-900">{value}</span>
    </div>
  );

  return (
    <SidePanel
      title={cls.title}
      subtitle={cls.status === "cancelled" ? <Pill tone="red">Cancelled</Pill> : cls.status === "draft" ? <Pill tone="amber">Draft (hidden)</Pill> : <Pill tone="green">Open</Pill>}
      onClose={onClose}
    >
      <div className="mb-3 flex flex-wrap gap-1.5">
        <Btn size="sm" onClick={() => setForm("edit")}><Pencil size={13} /> Edit</Btn>
        {!junior && <Btn size="sm" onClick={() => setForm("dup")}><Copy size={13} /> Duplicate</Btn>}
        {cls.status === "cancelled" ? (
          <Btn size="sm" onClick={() => reopenClass(cls.id)}>Reopen</Btn>
        ) : (
          !junior && <Btn size="sm" variant="danger" onClick={() => setCancelling(true)}>Cancel class</Btn>
        )}
        <Btn size="sm" variant="ghost" disabled={hasBookings} title={hasBookings ? "Has bookings. Cancel it instead." : "Delete"} onClick={() => setDeleting(true)}><Trash2 size={13} /></Btn>
      </div>

      {cls.date ? row("When", `${shortDate(cls.date)}, ${cls.time}`) : row("When", `${cls.schedule}, ${cls.time}`)}
      {row("Location", cls.location)}
      {row("Instructor", cls.coach)}
      {cls.level && row("Level", cls.level)}
      {cls.tag && row("Drill", cls.tag)}
      {row("Price", money(cls.price))}
      {row("Spots", <span className="inline-block w-32 text-left"><FillBar booked={bookedCount(cls.id)} capacity={cls.capacity} /></span>)}
      {cls.description && <p className="mt-3 text-[12.5px] leading-relaxed text-ink-500">{cls.description}</p>}

      <div className="mb-2 mt-5 flex items-center justify-between">
        <h3 className="text-[12px] font-bold uppercase tracking-wide text-ink-500">Roster ({confirmed.length})</h3>
        <div className="flex gap-1.5">
          <Btn size="sm" disabled={cls.status === "cancelled"} onClick={() => confirmed.forEach((b) => !b.checkedIn && updateBooking(b.id, { checkedIn: true }))}>Check in all</Btn>
          <Btn size="sm" onClick={() => downloadCsv(`roster-${cls.id}.csv`, [["Player", "Family", "Email", "Paid", "Status", "Checked in"], ...roster.map((b) => { const c = customers.find((x) => x.id === b.customerId); return [b.playerName, c?.name ?? "", c?.email ?? "", b.amount.toFixed(2), b.status, b.checkedIn ? "Yes" : "No"]; })])}><Download size={13} /></Btn>
          <Btn size="sm" variant="primary" disabled={cls.status === "cancelled"} onClick={() => setAdding(true)}><Plus size={13} /> Add</Btn>
        </div>
      </div>
      {roster.length === 0 ? (
        <p className="text-[13px] text-ink-500">No bookings yet.</p>
      ) : (
        <ul className="divide-y divide-ink-100">
          {roster.map((b) => (
            <li key={b.id} className="flex items-center gap-2.5 py-2 text-[13px]">
              <input type="checkbox" aria-label="Checked in" checked={b.checkedIn} disabled={b.status !== "confirmed"} onChange={(e) => updateBooking(b.id, { checkedIn: e.target.checked })} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-navy-900">{b.playerName}</span>
                <span className="text-[11.5px] text-ink-500">{b.status === "confirmed" ? `${money(b.amount)} · ${b.method}` : b.status}</span>
              </span>
              {b.status === "confirmed" && (
                <span className="flex gap-1">
                  <Btn size="sm" onClick={() => resolveBooking(b.id, "refund")}>Refund</Btn>
                  <Btn size="sm" onClick={() => resolveBooking(b.id, "credit")}>Credit</Btn>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {junior ? (
        <JuniorForm open={form === "edit"} onClose={() => setForm(null)} editing={cls} />
      ) : (
        <ClassForm open={form !== null} onClose={() => setForm(null)} editing={form === "edit" ? cls : null} template={form === "dup" ? cls : null} />
      )}
      {cancelling && <CancelClassModal ids={[cls.id]} onClose={() => setCancelling(false)} />}
      <AddBooking open={adding} onClose={() => setAdding(false)} defaultClass={cls.id} />
      <Modal open={deleting} onClose={() => setDeleting(false)} title="Delete this class?" footer={<><Btn onClick={() => setDeleting(false)}>Keep</Btn><Btn variant="danger" onClick={() => { deleteClass(cls.id); setDeleting(false); onClose(); }}>Delete</Btn></>}>
        <p className="text-[13.5px] text-navy-900">{cls.title} has no bookings. Deleting removes it for good.</p>
      </Modal>
    </SidePanel>
  );
}
