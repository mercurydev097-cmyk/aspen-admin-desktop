import { useMemo, useState } from "react";
import { Download, Pencil, Plus } from "lucide-react";
import type { PayMethod, Promo } from "../../data/types";
import { Toggle } from "../../components/Toggle";
import { useData } from "../../data/store";
import { Btn, Empty, Field, Modal, PageHeader, Panel, Pill, Select, Stat, Tabs, TextInput, downloadCsv, money } from "../ui";

type Tab = "promos" | "pricing" | "payments";

export function Pricing() {
  const [tab, setTab] = useState<Tab>("promos");
  return (
    <>
      <PageHeader title="Pricing & payments" subtitle="Promo codes, class prices, payment methods and revenue reports." />
      <Tabs value={tab} onChange={setTab} options={[{ value: "promos", label: "Promo codes" }, { value: "pricing", label: "Class pricing" }, { value: "payments", label: "Payments & reports" }]} />
      {tab === "promos" && <Promos />}
      {tab === "pricing" && <ClassPricing />}
      {tab === "payments" && <Payments />}
    </>
  );
}

function Promos() {
  const { promos, upsertPromo, deletePromo, promoUses, today } = useData();
  const [edit, setEdit] = useState<{ promo?: Promo } | null>(null);
  return (
    <>
      <div className="mb-3 flex justify-end"><Btn variant="primary" onClick={() => setEdit({})}><Plus size={15} /> New promo code</Btn></div>
      {promos.length === 0 ? <Empty>No promo codes yet.</Empty> : (
        <div className="overflow-x-auto rounded-xl border border-ink-200 bg-white">
          <table className="w-full min-w-[640px] text-left text-[13px]">
            <thead className="border-b border-ink-100 bg-ink-100/50 text-[11px] uppercase tracking-wide text-ink-500">
              <tr><th className="px-4 py-2.5 font-bold">Code</th><th className="px-2 py-2.5 font-bold">Discount</th><th className="px-2 py-2.5 font-bold">Used</th><th className="px-2 py-2.5 font-bold">Expires</th><th className="px-2 py-2.5 font-bold">Active</th><th className="px-4 py-2.5" /></tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {promos.map((p) => {
                const uses = promoUses(p.code);
                const expired = !!p.expires && p.expires < today;
                return (
                  <tr key={p.code}>
                    <td className="px-4 py-2.5 font-bold tracking-wide text-navy-900">{p.code}</td>
                    <td className="px-2 py-2.5 text-navy-900">{p.type === "percent" ? `${p.value}% off` : `${money(p.value)} off`}</td>
                    <td className="px-2 py-2.5 text-ink-500">{uses}{p.limit ? ` / ${p.limit}` : ""}</td>
                    <td className="px-2 py-2.5 text-ink-500">{p.expires ? <>{p.expires} {expired && <Pill tone="red">Expired</Pill>}</> : "Never"}</td>
                    <td className="px-2 py-2.5"><Toggle checked={p.active} onChange={(v) => upsertPromo({ ...p, active: v })} /></td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex justify-end gap-1.5">
                        <Btn size="sm" onClick={() => setEdit({ promo: p })}><Pencil size={13} /> Edit</Btn>
                        <Btn size="sm" variant="danger" disabled={uses > 0} title={uses > 0 ? "Already used. Turn it off instead." : "Delete"} onClick={() => deletePromo(p.code)}>Delete</Btn>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {edit && <PromoForm promo={edit.promo} onClose={() => setEdit(null)} />}
    </>
  );
}

function PromoForm({ promo, onClose }: { promo?: Promo; onClose: () => void }) {
  const { promos, upsertPromo } = useData();
  const [code, setCode] = useState(promo?.code ?? "");
  const [type, setType] = useState<Promo["type"]>(promo?.type ?? "percent");
  const [value, setValue] = useState(String(promo?.value ?? 10));
  const [limit, setLimit] = useState(promo?.limit ? String(promo.limit) : "");
  const [expires, setExpires] = useState(promo?.expires ?? "");
  const [err, setErr] = useState("");
  const save = () => {
    const c = code.trim().toUpperCase().replace(/\s+/g, "");
    const v = Number(value);
    if (!c) return setErr("Enter a code.");
    if (promos.some((p) => p.code === c && p.code !== promo?.code)) return setErr("That code already exists.");
    if (!(v > 0)) return setErr("Enter a discount above 0.");
    if (type === "percent" && v > 100) return setErr("A percent discount can be at most 100.");
    upsertPromo({ code: c, type, value: v, active: promo?.active ?? true, limit: limit ? Math.round(Number(limit)) : undefined, expires: expires || undefined }, promo?.code);
    onClose();
  };
  return (
    <Modal open onClose={onClose} title={promo ? "Edit promo code" : "New promo code"} footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" onClick={save}>Save</Btn></>}>
      <div className="grid gap-3.5 sm:grid-cols-2">
        <Field label="Code" className="sm:col-span-2"><TextInput value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. SPRING10" /></Field>
        <Field label="Type"><Select value={type} onChange={(e) => setType(e.target.value as Promo["type"])}><option value="percent">Percent off</option><option value="amount">Dollar amount off</option></Select></Field>
        <Field label={type === "percent" ? "Percent" : "Dollars"}><TextInput type="number" min="0" step="0.5" value={value} onChange={(e) => setValue(e.target.value)} /></Field>
        <Field label="Usage limit" hint="Leave empty for unlimited"><TextInput type="number" min="1" value={limit} onChange={(e) => setLimit(e.target.value)} /></Field>
        <Field label="Expires" hint="Leave empty for never"><TextInput type="date" value={expires} onChange={(e) => setExpires(e.target.value)} /></Field>
      </div>
      {err && <p className="mt-3 text-[13px] font-medium text-red-600">{err}</p>}
    </Modal>
  );
}

function ClassPricing() {
  const { classes, today, updateClass, settings } = useData();
  const [vals, setVals] = useState<Record<string, string>>({});
  const [done, setDone] = useState("");

  const groups = useMemo(() => {
    const m = new Map<string, typeof classes>();
    classes
      .filter((c) => c.type === "adult" && c.status !== "cancelled" && (c.date ?? "") >= today)
      .forEach((c) => {
        const k = c.tag ?? "No tag";
        m.set(k, [...(m.get(k) ?? []), c]);
      });
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [classes, today]);

  const apply = (tag: string, list: typeof classes) => {
    const n = Number(vals[tag]);
    if (!(n >= 0) || vals[tag] === undefined || vals[tag] === "") return;
    list.forEach((c) => updateClass(c.id, { price: n }));
    setVals((v) => ({ ...v, [tag]: "" }));
    setDone(`Updated ${list.length} upcoming class${list.length === 1 ? "" : "es"} for "${tag}" to ${money(n)}.`);
  };

  return (
    <>
      <p className="mb-3 text-[13px] text-ink-500">Set one price for every upcoming class of a drill. Past classes and existing bookings keep what was paid. Default capacity is {settings.defaultCapacity} spots (change in Settings).</p>
      {done && <p className="mb-3 rounded-lg bg-pine-50 px-3 py-2 text-[13px] font-medium text-pine-600">{done}</p>}
      {groups.length === 0 ? <Empty>No upcoming classes.</Empty> : (
        <div className="overflow-x-auto rounded-xl border border-ink-200 bg-white">
          <table className="w-full min-w-[620px] text-left text-[13px]">
            <thead className="border-b border-ink-100 bg-ink-100/50 text-[11px] uppercase tracking-wide text-ink-500">
              <tr><th className="px-4 py-2.5 font-bold">Drill / tag</th><th className="px-2 py-2.5 font-bold">Upcoming</th><th className="px-2 py-2.5 font-bold">Current price</th><th className="px-4 py-2.5 text-right font-bold">New price for all</th></tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {groups.map(([tag, list]) => {
                const prices = Array.from(new Set(list.map((c) => c.price))).sort((a, b) => a - b);
                return (
                  <tr key={tag}>
                    <td className="px-4 py-2.5 font-semibold text-navy-900">{tag}</td>
                    <td className="px-2 py-2.5 text-ink-500">{list.length}</td>
                    <td className="px-2 py-2.5 text-navy-900">{prices.map(money).join(" / ")}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-2">
                        <TextInput className="w-24" type="number" min="0" step="0.5" placeholder="$" value={vals[tag] ?? ""} onChange={(e) => setVals((v) => ({ ...v, [tag]: e.target.value }))} />
                        <Btn onClick={() => apply(tag, list)} disabled={!vals[tag]}>Apply</Btn>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

const methods: PayMethod[] = ["card", "ach", "cash", "comp"];
const methodName: Record<PayMethod, string> = { card: "Card", ach: "ACH direct debit", cash: "Cash", comp: "Comp" };

function Payments() {
  const { settings, updateSettings, bookings, classes } = useData();
  const p = settings.payments;
  const set = (patch: Partial<typeof p>) => updateSettings({ payments: { ...p, ...patch } });

  const paid = bookings.filter((b) => b.status === "confirmed");
  const feeFor = (m: PayMethod, amt: number) => (m === "card" ? amt * (p.cardPct / 100) + p.cardFixed : m === "ach" ? p.achFee : 0);
  const byMethod = methods.map((m) => {
    const list = paid.filter((b) => b.method === m && b.amount > 0);
    const gross = list.reduce((s, b) => s + b.amount, 0);
    const fees = list.reduce((s, b) => s + feeFor(m, b.amount), 0);
    return { m, n: list.length, gross, fees, net: gross - fees };
  });
  const totals = byMethod.reduce((a, r) => ({ gross: a.gross + r.gross, fees: a.fees + r.fees, net: a.net + r.net }), { gross: 0, fees: 0, net: 0 });
  const discounts = paid.reduce((s, b) => s + b.discount, 0);

  const byTag = useMemo(() => {
    const m = new Map<string, { n: number; rev: number }>();
    paid.forEach((b) => {
      const tag = classes.find((c) => c.id === b.sessionId)?.tag ?? "No tag";
      const cur = m.get(tag) ?? { n: 0, rev: 0 };
      m.set(tag, { n: cur.n + 1, rev: cur.rev + b.amount });
    });
    return Array.from(m.entries()).sort((a, b) => b[1].rev - a[1].rev);
  }, [paid, classes]);

  return (
    <div className="space-y-5">
      <Panel title="Payment methods players can use">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <label className="flex items-center justify-between gap-3 text-[13.5px] text-navy-900">Card payments<Toggle checked={p.card} onChange={(v) => set({ card: v || !p.ach })} /></label>
            <label className="flex items-center justify-between gap-3 text-[13.5px] text-navy-900">ACH bank debit<Toggle checked={p.ach} onChange={(v) => set({ ach: v || !p.card })} /></label>
            <label className="flex items-center justify-between gap-3 text-[13.5px] text-navy-900">One-click checkout on by default<Toggle checked={p.oneClickDefault} onChange={(v) => set({ oneClickDefault: v })} /></label>
            <p className="text-[12px] text-ink-500">At least one method must stay on.</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Card %"><TextInput type="number" step="0.1" min="0" value={p.cardPct} onChange={(e) => set({ cardPct: Number(e.target.value) })} /></Field>
            <Field label="Card fixed $"><TextInput type="number" step="0.05" min="0" value={p.cardFixed} onChange={(e) => set({ cardFixed: Number(e.target.value) })} /></Field>
            <Field label="ACH fee $" hint="Shown to players"><TextInput type="number" step="0.05" min="0" value={p.achFee} onChange={(e) => set({ achFee: Number(e.target.value) })} /></Field>
            <p className="text-[12px] text-ink-500 sm:col-span-3">Card fee rates are estimates for reporting. Check your real processor rates.</p>
          </div>
        </div>
      </Panel>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Gross sales" value={money(totals.gross)} sub={`${paid.length} paid bookings`} />
        <Stat label="Est. fees" value={money(totals.fees)} />
        <Stat label="Est. payout" value={money(totals.net)} sub="gross minus fees" />
        <Stat label="Discounts given" value={money(discounts)} sub="from promo codes" />
      </div>

      <Panel title="Revenue by payment method">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-[13px]">
            <thead className="text-[11px] uppercase tracking-wide text-ink-500"><tr><th className="pb-2 font-bold">Method</th><th className="pb-2 text-right font-bold">Bookings</th><th className="pb-2 text-right font-bold">Gross</th><th className="pb-2 text-right font-bold">Est. fees</th><th className="pb-2 text-right font-bold">Est. net</th></tr></thead>
            <tbody className="divide-y divide-ink-100">
              {byMethod.map((r) => (
                <tr key={r.m}><td className="py-2 font-semibold text-navy-900">{methodName[r.m]}</td><td className="py-2 text-right text-ink-500">{r.n}</td><td className="py-2 text-right text-navy-900">{money(r.gross)}</td><td className="py-2 text-right text-ink-500">{money(r.fees)}</td><td className="py-2 text-right font-semibold text-navy-900">{money(r.net)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Revenue by drill" action={<Btn size="sm" onClick={() => downloadCsv("revenue-by-drill.csv", [["Drill", "Bookings", "Revenue"], ...byTag.map(([t, v]) => [t, v.n, v.rev.toFixed(2)])])}><Download size={13} /> Export CSV</Btn>}>
        <ul className="divide-y divide-ink-100 text-[13px]">
          {byTag.map(([t, v]) => (
            <li key={t} className="flex items-center justify-between py-2"><span className="text-navy-900">{t}</span><span className="font-semibold text-navy-900">{money(v.rev)} <span className="font-normal text-ink-500">· {v.n}</span></span></li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
