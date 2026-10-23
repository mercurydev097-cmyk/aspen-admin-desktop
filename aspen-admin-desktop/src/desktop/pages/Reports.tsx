import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { addDays, shortDate, useData } from "../../data/store";
import { Btn, Empty, PageHeader, Panel, Select, Stat, TextInput, downloadCsv, money } from "../ui";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function Bars({ data, fmt = money }: { data: { label: string; value: number }[]; fmt?: (n: number) => string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ul className="space-y-2">
      {data.map((d) => (
        <li key={d.label} className="grid grid-cols-[110px_1fr_64px] items-center gap-3 sm:grid-cols-[170px_1fr_80px] text-[12.5px]">
          <span className="truncate text-navy-900" title={d.label}>{d.label}</span>
          <span className="h-2.5 overflow-hidden rounded-full bg-ink-100"><span className="block h-full rounded-full bg-pine-600" style={{ width: `${(d.value / max) * 100}%` }} /></span>
          <span className="text-right font-semibold text-navy-900">{fmt(d.value)}</span>
        </li>
      ))}
    </ul>
  );
}

export function Reports() {
  const { bookings, classes, customers, settings, today } = useData();
  const [range, setRange] = useState<"7" | "14" | "30" | "all" | "custom">("30");
  const [from, setFrom] = useState(addDays(today, -30));
  const [to, setTo] = useState(today);

  const start = range === "all" ? "0000-00-00" : range === "custom" ? from : addDays(today, -Number(range));
  const end = range === "custom" ? to : today;
  const inRange = useMemo(() => bookings.filter((b) => b.createdAt >= start && b.createdAt <= end), [bookings, start, end]);
  const paid = inRange.filter((b) => b.status === "confirmed" && b.amount > 0);
  const classOf = (id: string) => classes.find((c) => c.id === id);

  const p = settings.payments;
  const fee = (m: string, a: number) => (m === "card" ? a * (p.cardPct / 100) + p.cardFixed : m === "ach" ? p.achFee : 0);
  const gross = paid.reduce((s, b) => s + b.amount, 0);
  const fees = paid.reduce((s, b) => s + fee(b.method, b.amount), 0);
  const discounts = inRange.filter((b) => b.status === "confirmed").reduce((s, b) => s + b.discount, 0);
  const returned = inRange.filter((b) => b.status === "refunded" || b.status === "credited");
  const refundRate = inRange.length ? Math.round((returned.length / inRange.length) * 100) : 0;

  const daily = useMemo(() => {
    const m = new Map<string, number>();
    paid.forEach((b) => m.set(b.createdAt, (m.get(b.createdAt) ?? 0) + b.amount));
    const keys = Array.from(m.keys()).sort();
    if (!keys.length) return [] as [string, number][];
    const out: [string, number][] = [];
    for (let d = keys[0]; d <= keys[keys.length - 1]; d = addDays(d, 1)) out.push([d, m.get(d) ?? 0]);
    return out.slice(-45);
  }, [paid]);
  const maxDay = Math.max(1, ...daily.map((d) => d[1]));

  const byDrill = useMemo(() => {
    const m = new Map<string, number>();
    paid.forEach((b) => { const t = classOf(b.sessionId)?.tag ?? "No tag"; m.set(t, (m.get(t) ?? 0) + b.amount); });
    return Array.from(m.entries()).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 10);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paid, classes]);

  const byMethod = useMemo(() => {
    const m = new Map<string, number>();
    paid.forEach((b) => m.set(b.method, (m.get(b.method) ?? 0) + b.amount));
    return Array.from(m.entries()).map(([label, value]) => ({ label: label === "ach" ? "ACH" : label[0].toUpperCase() + label.slice(1), value })).sort((a, b) => b.value - a.value);
  }, [paid]);

  // Attendance: average fill by weekday over all dated adult classes that are not cancelled
  const fillByDow = useMemo(() => {
    const acc = DOW.map(() => ({ booked: 0, cap: 0 }));
    classes.filter((c) => c.type === "adult" && c.date && c.status !== "cancelled" && c.capacity).forEach((c) => {
      const d = new Date(`${c.date}T12:00:00`).getDay();
      acc[d].booked += bookings.filter((b) => b.sessionId === c.id && b.status === "confirmed").length;
      acc[d].cap += c.capacity!;
    });
    return acc.map((a, i) => ({ label: DOW[i], value: a.cap ? Math.round((a.booked / a.cap) * 100) : 0, has: a.cap > 0 })).filter((d) => d.has);
  }, [classes, bookings]);

  // Retention: players with 2+ confirmed bookings
  const players = useMemo(() => {
    const m = new Map<string, { name: string; family: string; n: number; spend: number }>();
    bookings.filter((b) => b.status === "confirmed").forEach((b) => {
      const key = `${b.customerId}|${b.playerName}`;
      const cur = m.get(key) ?? { name: b.playerName, family: customers.find((c) => c.id === b.customerId)?.name ?? "", n: 0, spend: 0 };
      m.set(key, { ...cur, n: cur.n + 1, spend: cur.spend + b.amount });
    });
    return Array.from(m.values()).sort((a, b) => b.spend - a.spend);
  }, [bookings, customers]);
  const repeat = players.filter((x) => x.n >= 2).length;
  const repeatRate = players.length ? Math.round((repeat / players.length) * 100) : 0;
  const avgPerPlayer = players.length ? players.reduce((s, x) => s + x.n, 0) / players.length : 0;

  const weak = classes
    .filter((c) => c.type === "adult" && c.status === "open" && (c.date ?? "") >= today && c.capacity)
    .map((c) => ({ c, pct: Math.round((bookings.filter((b) => b.sessionId === c.id && b.status === "confirmed").length / c.capacity!) * 100) }))
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 6);

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="Sales are counted by the day the booking was made."
        actions={
          <>
            <Select value={range} onChange={(e) => setRange(e.target.value as typeof range)} className="w-auto">
              <option value="7">Last 7 days</option><option value="14">Last 14 days</option><option value="30">Last 30 days</option><option value="all">All time</option><option value="custom">Custom range</option>
            </Select>
            {range === "custom" && (<><TextInput type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-36" /><TextInput type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-36" /></>)}
            <Btn onClick={() => downloadCsv("sales-report.csv", [["Date", "Player", "Class", "Drill", "Paid", "Method", "Promo", "Discount"], ...paid.map((b) => [b.createdAt, b.playerName, classOf(b.sessionId)?.title ?? "", classOf(b.sessionId)?.tag ?? "", b.amount.toFixed(2), b.method, b.promoCode ?? "", b.discount.toFixed(2)])])}><Download size={14} /> Export sales</Btn>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Gross sales" value={money(gross)} sub={`${paid.length} paid bookings`} />
        <Stat label="Est. fees" value={money(fees)} sub={`${gross ? ((fees / gross) * 100).toFixed(1) : "0.0"}% of sales`} />
        <Stat label="Est. payout" value={money(gross - fees)} />
        <Stat label="Avg per booking" value={money(paid.length ? gross / paid.length : 0)} sub={`${money(discounts)} in discounts`} />
        <Stat label="Refund / credit rate" value={`${refundRate}%`} sub={`${returned.length} of ${inRange.length} bookings`} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Panel title="Sales per day" className="lg:col-span-2">
          {daily.length === 0 ? <Empty>No sales in this range.</Empty> : (
            <div className="flex h-48 items-end gap-1">
              {daily.map(([d, v]) => (
                <div key={d} className="group relative flex flex-1 flex-col items-center justify-end">
                  <span className="pointer-events-none absolute -top-6 hidden whitespace-nowrap rounded bg-navy-900 px-1.5 py-0.5 text-[10.5px] text-white group-hover:block">{shortDate(d)}: {money(v)}</span>
                  <div className="w-full rounded-t bg-pine-600/90 group-hover:bg-pine-600" style={{ height: `${Math.max(v ? 3 : 1, (v / maxDay) * 160)}px` }} />
                </div>
              ))}
            </div>
          )}
          {daily.length > 0 && <div className="mt-1 flex justify-between text-[11px] text-ink-500"><span>{shortDate(daily[0][0])}</span><span>{shortDate(daily[daily.length - 1][0])}</span></div>}
        </Panel>
        <Panel title="By payment method">{byMethod.length === 0 ? <Empty>No sales.</Empty> : <Bars data={byMethod} />}</Panel>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Panel title="Revenue by drill (top 10)" action={<Btn size="sm" onClick={() => downloadCsv("revenue-by-drill.csv", [["Drill", "Revenue"], ...byDrill.map((d) => [d.label, d.value.toFixed(2)])])}><Download size={13} /></Btn>}>
          {byDrill.length === 0 ? <Empty>No sales.</Empty> : <Bars data={byDrill} />}
        </Panel>
        <Panel title="Average fill by weekday"><Bars data={fillByDow} fmt={(n) => `${n}%`} /></Panel>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Panel title="Retention">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Players" value={players.length} />
            <Stat label="Repeat players" value={`${repeatRate}%`} sub={`${repeat} booked 2+ times`} />
            <Stat label="Bookings per player" value={avgPerPlayer.toFixed(1)} className="col-span-2" />
          </div>
        </Panel>
        <Panel title="Top players by spend" action={<Btn size="sm" onClick={() => downloadCsv("players.csv", [["Player", "Family", "Bookings", "Spend"], ...players.map((x) => [x.name, x.family, x.n, x.spend.toFixed(2)])])}><Download size={13} /></Btn>}>
          <ul className="divide-y divide-ink-100 text-[13px]">
            {players.slice(0, 8).map((x) => (
              <li key={x.name + x.family} className="flex items-center justify-between py-1.5"><span className="text-navy-900">{x.name}<span className="ml-1.5 text-[11.5px] text-ink-500">{x.n} bookings</span></span><span className="font-semibold text-navy-900">{money(x.spend)}</span></li>
            ))}
          </ul>
        </Panel>
        <Panel title="Upcoming classes to promote">
          <ul className="divide-y divide-ink-100 text-[13px]">
            {weak.map(({ c, pct }) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-1.5"><span className="min-w-0 truncate text-navy-900">{c.title}<span className="block text-[11.5px] text-ink-500">{shortDate(c.date!)} · {c.startTime}</span></span><span className="font-semibold text-gold-500">{pct}%</span></li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
