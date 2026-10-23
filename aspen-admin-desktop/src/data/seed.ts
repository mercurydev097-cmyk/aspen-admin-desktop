import { academy, sessions, type Session } from "./mockData";
import type { Booking, Customer, DataSnapshot, PayMethod, Promo, Settings } from "./types";

/** The prototype pretends today is this date, so "upcoming" views have data. */
export const DEMO_TODAY = "2026-10-23";

export const NTRP = ["2.5", "3.0", "3.5", "4.0", "4.5"];

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");

function seedClasses(): Session[] {
  return sessions.map((s) => ({
    ...s,
    capacity: s.id === "mix-drill-1026" ? 8 : s.type === "adult" ? 12 : 16,
    seriesId: s.date ? `series-${slug(s.title)}-${slug(s.location)}` : undefined,
  }));
}

const names: [string, string, string, string[]][] = [
  ["c-sarah", "Sarah Mitchell", "sarah.mitchell@email.com", ["Sarah Mitchell:3.0"]],
  ["c-1", "Jordan Ellis", "jordan.ellis@example.com", ["Jordan Ellis:3.5"]],
  ["c-2", "Priya Raman", "priya.raman@example.com", ["Priya Raman:3.0", "Dev Raman:3.5"]],
  ["c-3", "Megan Brooks", "megan.brooks@example.com", ["Megan Brooks:3.0"]],
  ["c-4", "Carla Ruiz", "carla.ruiz@example.com", ["Carla Ruiz:3.5"]],
  ["c-5", "Tom Becker", "tom.becker@example.com", ["Tom Becker:4.0"]],
  ["c-6", "Hannah Cole", "hannah.cole@example.com", ["Hannah Cole:2.5"]],
  ["c-7", "Denise Walker", "denise.walker@example.com", ["Denise Walker:3.0"]],
  ["c-8", "Luis Ortega", "luis.ortega@example.com", ["Luis Ortega:3.5", "Ana Ortega:3.0"]],
  ["c-9", "Kim Tran", "kim.tran@example.com", ["Kim Tran:3.0"]],
  ["c-10", "Beth Sanders", "beth.sanders@example.com", ["Beth Sanders:4.0"]],
];

function seedCustomers(): Customer[] {
  return names.map(([id, name, email, players], i) => ({
    id,
    name,
    email,
    phone: `(281) 555-01${String(10 + i * 7).padStart(2, "0")}`,
    players: [
      ...players.map((p, j) => {
        const [pn, lvl] = p.split(":");
        return { id: `${id}-p${j}`, name: pn, level: lvl, type: "adult" as const };
      }),
      ...(id === "c-sarah"
        ? [{ id: "c-sarah-max", name: "Max Mitchell", level: "", type: "junior" as const }]
        : []),
    ],
    notes: id === "c-sarah" ? "Books for the whole family. Prefers Aspen evenings." : "",
    credit: id === "c-5" ? 25 : 0,
    oneClick: i % 2 === 0,
    createdAt: `2026-09-${String(1 + i).padStart(2, "0")}`,
  }));
}

function seedBookings(classes: Session[], customers: Customer[]): Booking[] {
  const pool = customers.flatMap((c) =>
    c.players.filter((p) => p.type === "adult").map((p) => ({ c, p }))
  );
  const out: Booking[] = [];
  const adult = classes.filter((s) => s.type === "adult");
  adult.forEach((s, i) => {
    const cancelled = s.status === "cancelled";
    const n = s.id === "mix-drill-1026" ? 8 : cancelled ? 4 : 2 + ((i * 7 + 3) % 9);
    const used = new Set<string>();
    for (let j = 0; j < n; j++) {
      let idx = (i * 3 + j * 5) % pool.length;
      let guard = 0;
      while (used.has(pool[idx].p.id) && guard++ < pool.length) idx = (idx + 1) % pool.length;
      const { c, p } = pool[idx];
      if (used.has(p.id)) continue;
      used.add(p.id);
      const promo = j % 7 === 3;
      const discount = promo ? Math.round(s.price * 0.1 * 100) / 100 : 0;
      const day = 21 + ((i * 5 + j * 3) % 32); // 21 Sep .. 22 Oct
      const created = new Date(2026, 8, day);
      const iso = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, "0")}-${String(created.getDate()).padStart(2, "0")}`;
      const method: PayMethod = j % 3 === 0 ? "ach" : "card";
      out.push({
        id: `b-seed-${i}-${j}`,
        sessionId: s.id,
        customerId: c.id,
        playerName: p.name,
        amount: s.price - discount,
        discount,
        promoCode: promo ? "DEMO10" : undefined,
        method,
        status: cancelled ? "refunded" : "confirmed",
        checkedIn: false,
        createdAt: iso,
      });
    }
  });
  // Make sure Sarah's booking from the player app demo exists on her Wednesday class.
  if (!out.some((b) => b.sessionId === "open-wednesday-1028" && b.customerId === "c-sarah")) {
    out.push({
      id: "b-seed-sarah",
      sessionId: "open-wednesday-1028",
      customerId: "c-sarah",
      playerName: "Sarah Mitchell",
      amount: 30,
      discount: 0,
      method: "card",
      status: "confirmed",
      checkedIn: false,
      createdAt: "2026-10-20",
    });
  }
  return out;
}

const seedPromos: Promo[] = [
  { code: "DEMO10", type: "percent", value: 10, active: true },
  { code: "FALL5", type: "amount", value: 5, active: true, limit: 50, expires: "2026-12-31" },
  { code: "WELCOME15", type: "percent", value: 15, active: false },
  { code: "TEAMCAPTAIN", type: "amount", value: 10, active: true, limit: 20 },
];

function seedSettings(classes: Session[]): Settings {
  const adult = classes.filter((s) => s.type === "adult");
  const uniq = (xs: (string | undefined)[]) =>
    Array.from(new Set(xs.filter(Boolean) as string[])).sort();
  return {
    locations: uniq(adult.map((s) => s.location)),
    instructors: ["Ashlee Gardner"],
    levels: ["2.5-3.0", "3.0-3.5", "3.5 & higher"],
    tags: uniq(adult.map((s) => s.tag)),
    defaultCapacity: 12,
    cancelCutoffHours: 12,
    cancelPolicy:
      "Players may cancel up to 12 hours before class for a full refund to the original payment method or as account credit. Later cancellations are not refunded.",
    notifications: {
      confirmation:
        "Hi {{player}}, you're booked into {{class}} on {{date}} at {{time}} ({{location}}). See you on court!",
      cancellation:
        "Hi {{player}}, {{class}} on {{date}} has been cancelled. Your {{resolution}} has been issued. Sorry for the change.",
      reminder:
        "Reminder: {{class}} starts tomorrow at {{time}} at {{location}}. Reply to this message if you can no longer attend.",
    },
    payments: { card: true, ach: true, achFee: 0, cardPct: 2.9, cardFixed: 0.3, oneClickDefault: true },
    about: {
      paragraphs: [...academy.about],
      established: academy.established,
      yearsCoaching: 24,
      award: "Best of Fulshear 2023-2025",
      courts: [...academy.courts],
      leagues: [...academy.leagues],
      coachName: "Ashlee B. Gardner",
      coachTitle: "Founder & Head Coach · Southern Utah University, Division I",
    },
  };
}

export function buildSeed(): DataSnapshot {
  const classes = seedClasses();
  const customers = seedCustomers();
  return {
    classes,
    customers,
    bookings: seedBookings(classes, customers),
    promos: seedPromos,
    settings: seedSettings(classes),
  };
}
