import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Search, Trash2 } from "lucide-react";
import type { Customer } from "../../data/types";
import { NTRP } from "../../data/seed";
import { shortDate, uid, useData } from "../../data/store";
import { Toggle } from "../../components/Toggle";
import { Btn, Empty, Field, Modal, PageHeader, Pill, Select, SidePanel, TextArea, TextInput, money } from "../ui";
import { cn } from "../../lib/utils";

export function Players() {
  const { customers, bookings, upsertCustomer, today } = useData();
  const [q, setQ] = useState("");
  const [params] = useSearchParams();
  const [openId, setOpenId] = useState<string | null>(params.get("family"));
  const [adding, setAdding] = useState(false);

  const stats = (c: Customer) => {
    const mine = bookings.filter((b) => b.customerId === c.id);
    return {
      count: mine.filter((b) => b.status === "confirmed").length,
      spend: mine.filter((b) => b.status === "confirmed").reduce((s, b) => s + b.amount, 0),
    };
  };

  const rows = useMemo(
    () =>
      customers
        .filter((c) => !q || `${c.name} ${c.email} ${c.players.map((p) => p.name).join(" ")}`.toLowerCase().includes(q.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [customers, q]
  );
  const open = customers.find((c) => c.id === openId) ?? null;

  return (
    <>
      <PageHeader
        title="Players & families"
        subtitle="One account per family. Players, levels, history and credit."
        actions={<Btn variant="primary" onClick={() => setAdding(true)}><Plus size={15} /> Add family</Btn>}
      />
      <div className="relative mb-4 w-full sm:max-w-sm">
        <Search size={15} className="pointer-events-none absolute left-3 top-2.5 text-ink-300" />
        <TextInput placeholder="Search name, email or player" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
      </div>

      <div className="flex items-start gap-5">
      <div className="min-w-0 flex-1">
      {rows.length === 0 ? (
        <Empty>No families match.</Empty>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-ink-200 bg-white">
          <table className="w-full text-left text-[13px]">
            <thead className="border-b border-ink-100 bg-ink-100/50 text-[11px] uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-4 py-2.5 font-bold">Family</th>
                <th className="hidden px-2 py-2.5 font-bold sm:table-cell">Players</th>
                <th className="hidden px-2 py-2.5 text-right font-bold md:table-cell">Bookings</th>
                <th className="px-2 py-2.5 text-right font-bold">Spent</th>
                <th className="px-4 py-2.5 text-right font-bold">Credit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {rows.map((c) => {
                const s = stats(c);
                return (
                  <tr key={c.id} onClick={() => setOpenId(c.id)} className={cn("cursor-pointer hover:bg-ink-100/50", openId === c.id && "bg-pine-50")}>
                    <td className="px-4 py-2.5"><span className="font-semibold text-navy-900">{c.name}</span><span className="block text-[12px] text-ink-500">{c.email}</span></td>
                    <td className="hidden px-2 py-2.5 text-ink-500 sm:table-cell">{c.players.map((p) => p.name.split(" ")[0] + (p.level ? ` (${p.level})` : "")).join(", ")}</td>
                    <td className="hidden px-2 py-2.5 text-right font-semibold text-navy-900 md:table-cell">{s.count}</td>
                    <td className="px-2 py-2.5 text-right font-semibold text-navy-900">{money(s.spend)}</td>
                    <td className="px-4 py-2.5 text-right">{c.credit > 0 ? <Pill tone="blue">{money(c.credit)}</Pill> : <span className="text-ink-300">-</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      </div>
      {open && <Detail key={open.id} c={open} onClose={() => setOpenId(null)} />}
      </div>
      {adding && (
        <AddFamily
          onClose={() => setAdding(false)}
          onSave={(c) => {
            upsertCustomer(c);
            setAdding(false);
            setOpenId(c.id);
          }}
          today={today}
        />
      )}
    </>
  );
}

function Detail({ c, onClose }: { c: Customer; onClose: () => void }) {
  const { bookings, classes, upsertCustomer } = useData();
  const [draft, setDraft] = useState<Customer>(c);
  const [creditAdj, setCreditAdj] = useState("");
  const dirty = JSON.stringify(draft) !== JSON.stringify(c);
  const history = bookings.filter((b) => b.customerId === c.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const setPlayer = (id: string, patch: Partial<Customer["players"][number]>) =>
    setDraft((d) => ({ ...d, players: d.players.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));

  const save = () => {
    upsertCustomer(draft);
    onClose();
  };

  return (
    <SidePanel title={c.name} subtitle={c.email} onClose={onClose}
      footer={<><Btn onClick={onClose}>Close</Btn><Btn variant="primary" disabled={!dirty} onClick={save}>Save changes</Btn></>}>
      <div className="grid grid-cols-1 gap-3.5">
        <Field label="Name"><TextInput value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
        <Field label="Email"><TextInput type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /></Field>
        <Field label="Phone"><TextInput value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} /></Field>
        <Field label="Account credit" hint={`Current: ${money(draft.credit)}`}>
          <div className="flex gap-2">
            <TextInput type="number" step="0.5" placeholder="e.g. 10 or -5" value={creditAdj} onChange={(e) => setCreditAdj(e.target.value)} />
            <Btn onClick={() => { const n = Number(creditAdj); if (n) setDraft({ ...draft, credit: Math.max(0, draft.credit + n) }); setCreditAdj(""); }}>Adjust</Btn>
          </div>
        </Field>
        <label className="flex items-center justify-between gap-3 rounded-lg bg-ink-100 p-3 text-[13px] text-navy-900 ">
          One-click checkout enabled (saved payment method)
          <Toggle checked={draft.oneClick} onChange={(v) => setDraft({ ...draft, oneClick: v })} />
        </label>
      </div>

      <h3 className="mb-2 mt-5 text-[12px] font-bold uppercase tracking-wide text-ink-500">Players</h3>
      <div className="space-y-2">
        {draft.players.map((p) => (
          <div key={p.id} className="grid grid-cols-[1fr_120px_auto] items-center gap-2">
            <TextInput value={p.name} onChange={(e) => setPlayer(p.id, { name: e.target.value })} />
            {p.type === "adult" ? (
              <Select value={p.level} onChange={(e) => setPlayer(p.id, { level: e.target.value })}>
                <option value="">NTRP level</option>
                {NTRP.map((n) => <option key={n} value={n}>NTRP {n}</option>)}
              </Select>
            ) : (
              <span className="text-[13px] text-ink-500">Junior</span>
            )}
            <Btn size="sm" variant="ghost" disabled={draft.players.length <= 1 || history.some((b) => b.playerName === p.name && b.status === "confirmed")} title="Remove (only players without bookings)" onClick={() => setDraft({ ...draft, players: draft.players.filter((x) => x.id !== p.id) })}>
              <Trash2 size={14} />
            </Btn>
          </div>
        ))}
        <Btn size="sm" onClick={() => setDraft({ ...draft, players: [...draft.players, { id: uid("p"), name: "", level: "3.0", type: "adult" }] })}><Plus size={13} /> Add player</Btn>
      </div>

      <Field label="Notes (admin only)" className="mt-5"><TextArea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></Field>

      <h3 className="mb-2 mt-5 text-[12px] font-bold uppercase tracking-wide text-ink-500">Booking history</h3>
      {history.length === 0 ? (
        <p className="text-[13px] text-ink-500">No bookings yet.</p>
      ) : (
        <ul className="divide-y divide-ink-100 text-[13px]">
          {history.map((b) => {
            const k = classes.find((x) => x.id === b.sessionId);
            return (
              <li key={b.id} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0"><span className="block truncate font-semibold text-navy-900">{k?.title ?? "Deleted class"}</span><span className="text-[12px] text-ink-500">{b.playerName} · {k?.date ? shortDate(k.date) : k?.schedule}</span></span>
                <span className="flex shrink-0 items-center gap-2"><Pill tone={b.status === "confirmed" ? "green" : b.status === "credited" ? "blue" : b.status === "refunded" ? "red" : "gray"}>{b.status}</Pill><span className="font-semibold text-navy-900">{money(b.amount)}</span></span>
              </li>
            );
          })}
        </ul>
      )}
    </SidePanel>
  );
}

function AddFamily({ onClose, onSave, today }: { onClose: () => void; onSave: (c: Customer) => void; today: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [level, setLevel] = useState("3.0");
  const [err, setErr] = useState("");
  const save = () => {
    if (!name.trim()) return setErr("Enter a name.");
    onSave({
      id: uid("c"), name: name.trim(), email: email.trim(), phone: phone.trim(),
      players: [{ id: uid("p"), name: name.trim(), level, type: "adult" }],
      notes: "", credit: 0, oneClick: false, createdAt: today,
    });
  };
  return (
    <Modal open onClose={onClose} title="Add family" footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" onClick={save}>Add family</Btn></>}>
      <div className="space-y-3.5">
        <Field label="Name"><TextInput value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Email"><TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Phone"><TextInput value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
        <Field label="Player level (NTRP)">
          <Select value={level} onChange={(e) => setLevel(e.target.value)}>{NTRP.map((n) => <option key={n}>{n}</option>)}</Select>
        </Field>
        {err && <p className="text-[13px] font-medium text-red-600">{err}</p>}
      </div>
    </Modal>
  );
}
