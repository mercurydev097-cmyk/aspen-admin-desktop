import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "./mockData";
import { buildSeed, DEMO_TODAY } from "./seed";
import type { Booking, BookingStatus, Customer, DataSnapshot, Promo, Settings } from "./types";

const KEY = "aspen-data-v1";

function load(): DataSnapshot {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (d && Array.isArray(d.classes) && Array.isArray(d.bookings) && d.settings) return d as DataSnapshot;
    }
  } catch {
    /* storage unavailable: fall back to seed */
  }
  return buildSeed();
}

export const uid = (p: string) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function shortDate(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

/** "08:30" -> "8:30 AM" */
export function to12h(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ap = h >= 12 ? "PM" : "AM";
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${ap}`;
}

/** "8:30 AM" -> "08:30" */
export function to24h(t?: string) {
  if (!t) return "";
  const m = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return "";
  let h = Number(m[1]) % 12;
  if (m[3].toUpperCase() === "PM") h += 12;
  return `${String(h).padStart(2, "0")}:${m[2]}`;
}

/** Sortable key: date then 24h start time (plain "10:00 AM" strings sort wrong). */
export function classKey(c: { date?: string; startTime?: string }) {
  return `${c.date ?? "9999-99-99"} ${to24h(c.startTime) || "00:00"}`;
}

export function minutesBetween(a: string, b: string) {
  const [ah, am] = a.split(":").map(Number);
  const [bh, bm] = b.split(":").map(Number);
  return bh * 60 + bm - (ah * 60 + am);
}

export function addDays(iso: string, n: number) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export type PromoCheck = { ok: true; promo: Promo } | { ok: false; reason: string };

interface DataShape extends DataSnapshot {
  today: string;
  // classes
  addClasses: (list: Session[]) => void;
  updateClass: (id: string, patch: Partial<Session>) => void;
  updateSeries: (seriesId: string, fromDate: string, patch: Partial<Session>) => void;
  deleteClass: (id: string) => void;
  cancelClass: (id: string, resolution: "refund" | "credit" | "none") => void;
  reopenClass: (id: string) => void;
  // bookings
  bookedCount: (sessionId: string) => number;
  isFull: (sessionId: string) => boolean;
  addBookings: (list: Booking[]) => void;
  updateBooking: (id: string, patch: Partial<Booking>) => void;
  resolveBooking: (id: string, to: "refund" | "credit") => void;
  // customers
  upsertCustomer: (c: Customer) => void;
  // promos
  upsertPromo: (p: Promo, oldCode?: string) => void;
  deletePromo: (code: string) => void;
  promoUses: (code: string) => number;
  checkPromo: (code: string) => PromoCheck;
  // settings
  updateSettings: (patch: Partial<Settings>) => void;
  resetData: () => void;
}

const Ctx = createContext<DataShape | null>(null);

const counts = (b: Booking) => b.status === "confirmed";

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<DataSnapshot>(load);

  // Another tab or app on this site (for example the desktop admin) changed the data: pick it up.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setData(load());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      /* ignore */
    }
  }, [data]);

  const value = useMemo<DataShape>(() => {
    const set = (fn: (d: DataSnapshot) => DataSnapshot) => setData(fn);
    const bookedCount = (sid: string) => data.bookings.filter((b) => b.sessionId === sid && counts(b)).length;
    const promoUses = (code: string) =>
      data.bookings.filter((b) => b.promoCode === code && b.status !== "refunded" && b.status !== "cancelled").length;
    return {
      ...data,
      today: DEMO_TODAY,
      addClasses: (list) => set((d) => ({ ...d, classes: [...d.classes, ...list] })),
      updateClass: (id, patch) =>
        set((d) => ({ ...d, classes: d.classes.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
      updateSeries: (seriesId, fromDate, patch) =>
        set((d) => ({
          ...d,
          classes: d.classes.map((c) =>
            c.seriesId === seriesId && (c.date ?? "") >= fromDate ? { ...c, ...patch } : c
          ),
        })),
      deleteClass: (id) =>
        set((d) => ({ ...d, classes: d.classes.filter((c) => c.id !== id) })),
      cancelClass: (id, resolution) =>
        set((d) => {
          const status: BookingStatus =
            resolution === "refund" ? "refunded" : resolution === "credit" ? "credited" : "cancelled";
          const affected = d.bookings.filter((b) => b.sessionId === id && b.status === "confirmed");
          const credits = new Map<string, number>();
          if (resolution === "credit") affected.forEach((b) => credits.set(b.customerId, (credits.get(b.customerId) ?? 0) + b.amount));
          return {
            ...d,
            classes: d.classes.map((c) => (c.id === id ? { ...c, status: "cancelled" } : c)),
            bookings: d.bookings.map((b) => (b.sessionId === id && b.status === "confirmed" ? { ...b, status } : b)),
            customers: d.customers.map((c) => (credits.has(c.id) ? { ...c, credit: c.credit + credits.get(c.id)! } : c)),
          };
        }),
      reopenClass: (id) =>
        set((d) => ({ ...d, classes: d.classes.map((c) => (c.id === id ? { ...c, status: "open" } : c)) })),
      bookedCount,
      isFull: (sid) => {
        const cls = data.classes.find((c) => c.id === sid);
        return !!cls?.capacity && bookedCount(sid) >= cls.capacity;
      },
      addBookings: (list) => set((d) => ({ ...d, bookings: [...d.bookings, ...list] })),
      updateBooking: (id, patch) =>
        set((d) => ({ ...d, bookings: d.bookings.map((b) => (b.id === id ? { ...b, ...patch } : b)) })),
      resolveBooking: (id, to) =>
        set((d) => {
          const b = d.bookings.find((x) => x.id === id);
          if (!b || b.status !== "confirmed") return d;
          return {
            ...d,
            bookings: d.bookings.map((x) =>
              x.id === id ? { ...x, status: to === "refund" ? "refunded" : "credited", checkedIn: false } : x
            ),
            customers:
              to === "credit"
                ? d.customers.map((c) => (c.id === b.customerId ? { ...c, credit: c.credit + b.amount } : c))
                : d.customers,
          };
        }),
      upsertCustomer: (c) =>
        set((d) => ({
          ...d,
          customers: d.customers.some((x) => x.id === c.id)
            ? d.customers.map((x) => (x.id === c.id ? c : x))
            : [...d.customers, c],
        })),
      upsertPromo: (p, oldCode) =>
        set((d) => {
          const key = oldCode ?? p.code;
          const exists = d.promos.some((x) => x.code === key);
          return {
            ...d,
            promos: exists ? d.promos.map((x) => (x.code === key ? p : x)) : [...d.promos, p],
            bookings:
              oldCode && oldCode !== p.code
                ? d.bookings.map((b) => (b.promoCode === oldCode ? { ...b, promoCode: p.code } : b))
                : d.bookings,
          };
        }),
      deletePromo: (code) => set((d) => ({ ...d, promos: d.promos.filter((p) => p.code !== code) })),
      promoUses,
      checkPromo: (raw) => {
        const code = raw.trim().toUpperCase();
        if (!code) return { ok: false, reason: "Enter a promo code." };
        const p = data.promos.find((x) => x.code.toUpperCase() === code);
        if (!p || !p.active) return { ok: false, reason: "This promo code is not valid." };
        if (p.expires && p.expires < DEMO_TODAY) return { ok: false, reason: "This promo code has expired." };
        if (p.limit && promoUses(p.code) >= p.limit) return { ok: false, reason: "This promo code has been fully used." };
        return { ok: true, promo: p };
      },
      updateSettings: (patch) => set((d) => ({ ...d, settings: { ...d.settings, ...patch } })),
      resetData: () => setData(buildSeed()),
    };
  }, [data]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}

