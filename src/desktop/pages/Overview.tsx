import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, CalendarCheck, DollarSign, Percent, Ticket, Undo2 } from "lucide-react";
import { addDays, classKey, shortDate, useData } from "../../data/store";
import { Empty, FillBar, Panel, PageHeader, Pill, Stat, money } from "../ui";

function mondayOf(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  const diff = (d.getDay() + 6) % 7;
  return addDays(iso, -diff);
}

export function Overview() {
  const navigate = useNavigate();
  const { classes, bookings, customers, today, bookedCount } = useData();

  const stats = useMemo(() => {
    const paid = bookings.filter((b) => b.status === "confirmed");
    const revenue = paid.reduce((s, b) => s + b.amount, 0);
    const returned = bookings.filter((b) => b.status === "refunded" || b.status === "credited");
    const upcoming = classes.filter((c) => c.type === "adult" && c.status === "open" && (c.date ?? "") >= today);
    const cap = upcoming.reduce((s, c) => s + (c.capacity ?? 0), 0);
    const booked = upcoming.reduce((s, c) => s + bookedCount(c.id), 0);
    return {
      revenue,
      paidCount: paid.length,
      refunds: returned.reduce((s, b) => s + b.amount, 0),
      returnedCount: returned.length,
      upcoming,
      fill: cap ? Math.round((booked / cap) * 100) : 0,
      booked,
      cap,
    };
  }, [bookings, classes, today, bookedCount]);

  const weekly = useMemo(() => {
    const map = new Map<string, number>();
    bookings
      .filter((b) => b.status === "confirmed")
      .forEach((b) => map.set(mondayOf(b.createdAt), (map.get(mondayOf(b.createdAt)) ?? 0) + b.amount));
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0])).slice(-6);
  }, [bookings]);
  const maxWeek = Math.max(1, ...weekly.map((w) => w[1]));

  const next7 = classes
    .filter((c) => c.type === "adult" && c.date && c.date >= today && c.date <= addDays(today, 7) && c.status !== "draft")
    .sort((a, b) => classKey(a).localeCompare(classKey(b)));

  const alerts: { tone: "red" | "amber" | "blue"; text: string; to: string }[] = [];
  classes
    .filter((c) => c.type === "adult" && c.status === "open" && c.date && c.date >= today && c.date <= addDays(today, 3))
    .forEach((c) => {
      const n = bookedCount(c.id);
      if (c.capacity && n / c.capacity < 0.3)
        alerts.push({ tone: "amber", text: `${c.title} (${shortDate(c.date!)}) is only ${n}/${c.capacity} full`, to: `/bookings?class=${c.id}` });
      if (c.capacity && n >= c.capacity)
        alerts.push({ tone: "blue", text: `${c.title} (${shortDate(c.date!)}) is full`, to: `/bookings?class=${c.id}` });
    });
  classes
    .filter((c) => c.status === "cancelled" && bookings.some((b) => b.sessionId === c.id && b.status === "confirmed"))
    .forEach((c) => alerts.push({ tone: "red", text: `${c.title} is cancelled but still has paid bookings to resolve`, to: `/bookings?class=${c.id}` }));
  const drafts = classes.filter((c) => c.status === "draft").length;
  if (drafts) alerts.push({ tone: "blue", text: `${drafts} draft class${drafts === 1 ? " is" : "es are"} hidden from players`, to: "/classes" });

  const top = [...classes]
    .filter((c) => c.type === "adult")
    .map((c) => ({ c, n: bookedCount(c.id), rev: bookings.filter((b) => b.sessionId === c.id && b.status === "confirmed").reduce((s, b) => s + b.amount, 0) }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 5);

  const recent = [...bookings].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6);
  const classById = (id: string) => classes.find((c) => c.id === id);

  return (
    <>
      <PageHeader title="Overview" subtitle={`Demo date: ${shortDate(today)}, ${new Date(`${today}T12:00:00`).getFullYear()} (Central time)`} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Revenue" value={money(stats.revenue)} sub={`${stats.paidCount} paid bookings`} icon={<DollarSign size={16} />} />
        <Stat label="Upcoming classes" value={stats.upcoming.length} sub="open and bookable" icon={<CalendarCheck size={16} />} />
        <Stat label="Fill rate" value={`${stats.fill}%`} sub={`${stats.booked} of ${stats.cap} spots`} icon={<Percent size={16} />} />
        <Stat label="Players" value={customers.length} sub="family accounts" icon={<Ticket size={16} />} />
        <Stat label="Refunded / credited" value={money(stats.refunds)} sub={`${stats.returnedCount} bookings`} icon={<Undo2 size={16} />} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Panel title="Sales by week" className="lg:col-span-2">
          {weekly.length === 0 ? (
            <Empty>No sales yet.</Empty>
          ) : (
            <div className="flex h-44 items-end gap-3">
              {weekly.map(([wk, v]) => (
                <div key={wk} className="flex flex-1 flex-col items-center justify-end gap-1.5">
                  <span className="text-[11px] font-semibold text-navy-900">{money(v)}</span>
                  <div className="w-full max-w-[56px] rounded-t-md bg-pine-600" style={{ height: `${Math.max(6, (v / maxWeek) * 120)}px` }} />
                  <span className="text-[11px] text-ink-500">{shortDate(wk)}</span>
                </div>
              ))}
            </div>
          )}
          <p className="mt-2 text-[11.5px] text-ink-500">Weeks start Monday. Counts paid bookings by the day they were booked.</p>
        </Panel>

        <Panel title="Needs attention">
          {alerts.length === 0 ? (
            <p className="text-[13px] text-ink-500">Nothing needs attention.</p>
          ) : (
            <ul className="space-y-2">
              {alerts.map((a, i) => (
                <li key={i}>
                  <button onClick={() => navigate(a.to)} className="flex w-full items-start gap-2 rounded-lg p-2 text-left text-[13px] text-navy-900 hover:bg-ink-100">
                    <AlertTriangle size={15} className={a.tone === "red" ? "mt-0.5 shrink-0 text-red-600" : a.tone === "amber" ? "mt-0.5 shrink-0 text-gold-500" : "mt-0.5 shrink-0 text-sky-600"} />
                    {a.text}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Panel title="Next 7 days" className="lg:col-span-2" action={<button onClick={() => navigate("/classes")} className="text-[12.5px] font-semibold text-pine-600">Open schedule</button>}>
          {next7.length === 0 ? (
            <Empty>No classes in the next 7 days.</Empty>
          ) : (
            <div className="divide-y divide-ink-100">
              {next7.map((c) => (
                <button key={c.id} onClick={() => navigate(`/bookings?class=${c.id}`)} className="grid w-full grid-cols-[88px_1fr_auto] items-center gap-3 py-2.5 text-left hover:bg-ink-100/60 sm:grid-cols-[88px_1fr_120px_90px]">
                  <span className="text-[12px] font-semibold text-ink-500">
                    {shortDate(c.date!)}
                    <br />
                    {c.startTime}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[13.5px] font-semibold text-navy-900">{c.title}</span>
                    <span className="text-[12px] text-ink-500">{c.location}</span>
                  </span>
                  <span className="hidden sm:block">
                    <FillBar booked={bookedCount(c.id)} capacity={c.capacity} />
                  </span>
                  <span className="justify-self-end">
                    {c.status === "cancelled" ? <Pill tone="red">Cancelled</Pill> : <Pill tone="green">Open</Pill>}
                  </span>
                </button>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Most popular classes">
          <ul className="space-y-2.5">
            {top.map(({ c, n, rev }) => (
              <li key={c.id} className="flex items-center justify-between gap-3 text-[13px]">
                <span className="min-w-0 truncate text-navy-900">
                  {c.title}
                  <span className="block text-[11.5px] text-ink-500">{shortDate(c.date!)}</span>
                </span>
                <span className="shrink-0 text-right font-semibold text-navy-900">
                  {n} <span className="text-ink-500">· {money(rev)}</span>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel title="Recent bookings" className="mt-5" action={<button onClick={() => navigate("/bookings")} className="text-[12.5px] font-semibold text-pine-600">All bookings</button>}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-[13px]">
            <thead className="text-[11px] uppercase tracking-wide text-ink-500">
              <tr>
                <th className="pb-2 font-bold">Player</th>
                <th className="pb-2 font-bold">Class</th>
                <th className="pb-2 font-bold">Booked</th>
                <th className="pb-2 text-right font-bold">Paid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {recent.map((b) => (
                <tr key={b.id}>
                  <td className="py-2 font-semibold text-navy-900">{b.playerName}</td>
                  <td className="py-2 text-ink-500">{classById(b.sessionId)?.title ?? "Deleted class"}</td>
                  <td className="py-2 text-ink-500">{shortDate(b.createdAt)}</td>
                  <td className="py-2 text-right font-semibold text-navy-900">{money(b.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
