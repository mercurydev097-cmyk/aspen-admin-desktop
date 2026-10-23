import { useState } from "react";
import type { Session } from "../data/mockData";
import type { Customer, PayMethod } from "../data/types";
import { classKey, shortDate, uid, useData } from "../data/store";
import { Btn, Field, Modal, Select, TextInput, money } from "./ui";

export const classLabel = (c: Session) => (c.date ? `${shortDate(c.date)} ${c.startTime} · ${c.title}` : c.title);

export function AddBooking({ open, onClose, defaultClass }: { open: boolean; onClose: () => void; defaultClass?: string }) {
  const { classes, customers, bookings, today, bookedCount, isFull, addBookings, upsertCustomer } = useData();
  const choices = classes
    .filter((c) => c.status === "open" || c.status === undefined)
    .filter((c) => !c.date || c.date >= today)
    .sort((a, b) => classKey(a).localeCompare(classKey(b)));

  const [sid, setSid] = useState("");
  const [cid, setCid] = useState("");
  const [pid, setPid] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [method, setMethod] = useState<PayMethod>("card");
  const [amount, setAmount] = useState("");
  const [override, setOverride] = useState(false);
  const [err, setErr] = useState("");
  const [wasOpen, setWasOpen] = useState(false);

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setSid(defaultClass && choices.some((c) => c.id === defaultClass) ? defaultClass : choices[0]?.id ?? "");
      setCid(customers[0]?.id ?? "new");
      setPid(""); setName(""); setEmail(""); setMethod("card"); setAmount(""); setOverride(false); setErr("");
    }
  }

  const cls = choices.find((c) => c.id === sid);
  const cust = customers.find((c) => c.id === cid);
  const players = (cust?.players ?? []).filter((p) => p.type === (cls?.type ?? "adult"));
  const full = cls ? isFull(cls.id) : false;
  const price = method === "comp" ? 0 : amount !== "" ? Number(amount) : cls?.price ?? 0;

  const submit = () => {
    if (!cls) return setErr("Pick a class.");
    if (full && !override) return setErr("This class is full. Tick the box to add them anyway.");
    let customerId = cid;
    let playerName = "";
    let created: Customer | undefined;
    if (cid === "new") {
      if (!name.trim()) return setErr("Enter the player's name.");
      customerId = uid("c");
      playerName = name.trim();
      created = { id: customerId, name: playerName, email: email.trim(), phone: "", players: [{ id: uid("p"), name: playerName, level: "", type: cls.type }], notes: "Walk-in added by admin.", credit: 0, oneClick: false, createdAt: today };
    } else {
      const p = players.find((x) => x.id === pid) ?? players[0];
      if (!p) return setErr("This family has no matching player. Add one on the Players page first.");
      playerName = p.name;
      if (bookings.some((b) => b.sessionId === cls.id && b.customerId === cid && b.playerName === playerName && b.status === "confirmed"))
        return setErr(`${playerName} is already booked into this class.`);
    }
    if (!(price >= 0)) return setErr("Enter a valid amount.");
    if (created) upsertCustomer(created);
    addBookings([{ id: uid("b"), sessionId: cls.id, customerId, playerName, amount: price, discount: 0, method, status: "confirmed", checkedIn: false, createdAt: today, note: "Added by admin" }]);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Add booking" footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" onClick={submit}>Add booking</Btn></>}>
      <div className="space-y-3.5">
        <Field label="Class">
          <Select value={sid} onChange={(e) => setSid(e.target.value)}>
            {choices.map((c) => <option key={c.id} value={c.id}>{classLabel(c)} ({bookedCount(c.id)}/{c.capacity})</option>)}
          </Select>
        </Field>
        <Field label="Family">
          <Select value={cid} onChange={(e) => { setCid(e.target.value); setPid(""); }}>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            <option value="new">+ New walk-in</option>
          </Select>
        </Field>
        {cid === "new" ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Player name"><TextInput value={name} onChange={(e) => setName(e.target.value)} /></Field>
            <Field label="Email (optional)"><TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          </div>
        ) : (
          <Field label="Player">
            <Select value={pid || players[0]?.id || ""} onChange={(e) => setPid(e.target.value)}>
              {players.map((p) => <option key={p.id} value={p.id}>{p.name}{p.level ? ` (NTRP ${p.level})` : ""}</option>)}
              {players.length === 0 && <option value="">No matching player</option>}
            </Select>
          </Field>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Payment">
            <Select value={method} onChange={(e) => setMethod(e.target.value as PayMethod)}>
              <option value="card">Card</option><option value="ach">ACH</option><option value="cash">Cash</option><option value="comp">Comp (free)</option>
            </Select>
          </Field>
          <Field label="Amount" hint={cls ? `Class price ${money(cls.price)}` : undefined}>
            <TextInput type="number" min="0" step="0.5" value={method === "comp" ? "0" : amount} placeholder={cls ? String(cls.price) : ""} disabled={method === "comp"} onChange={(e) => setAmount(e.target.value)} />
          </Field>
        </div>
        {full && (
          <label className="flex items-center gap-2 rounded-lg bg-gold-50 p-3 text-[13px] text-navy-900">
            <input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} /> This class is full. Add them anyway.
          </label>
        )}
        {err && <p className="text-[13px] font-medium text-red-600">{err}</p>}
      </div>
    </Modal>
  );
}
