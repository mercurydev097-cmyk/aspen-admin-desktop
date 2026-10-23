import type { ProgramType } from "./mockData";

export type PayMethod = "card" | "ach" | "cash" | "comp";
export type BookingStatus = "confirmed" | "refunded" | "credited" | "cancelled";

export interface Booking {
  id: string;
  sessionId: string;
  customerId: string;
  playerName: string;
  amount: number; // what the player actually paid (after discount)
  discount: number;
  promoCode?: string;
  method: PayMethod;
  status: BookingStatus;
  checkedIn: boolean;
  createdAt: string; // ISO date yyyy-mm-dd
  note?: string;
}

export interface CustomerPlayer {
  id: string;
  name: string;
  level: string; // NTRP, e.g. "3.0"
  type: ProgramType;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  players: CustomerPlayer[];
  notes: string;
  credit: number;
  oneClick: boolean;
  createdAt: string;
}

export interface Promo {
  code: string;
  type: "percent" | "amount";
  value: number;
  active: boolean;
  limit?: number;
  expires?: string; // ISO date
}

export interface AboutContent {
  paragraphs: string[];
  established: number;
  yearsCoaching: number;
  award: string;
  courts: string[];
  leagues: string[];
  coachName: string;
  coachTitle: string;
}

export interface Settings {
  locations: string[];
  instructors: string[];
  levels: string[];
  tags: string[];
  defaultCapacity: number;
  cancelCutoffHours: number;
  cancelPolicy: string;
  notifications: { confirmation: string; cancellation: string; reminder: string };
  payments: {
    card: boolean;
    ach: boolean;
    achFee: number;
    cardPct: number;
    cardFixed: number;
    oneClickDefault: boolean;
  };
  about: AboutContent;
}

export interface DataSnapshot {
  classes: import("./mockData").Session[];
  bookings: Booking[];
  customers: Customer[];
  promos: Promo[];
  settings: Settings;
}
