import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Navigate, NavLink, Outlet, useNavigate } from "react-router-dom";
import { BarChart3, CalendarDays, CalendarRange, CreditCard, ExternalLink, LayoutDashboard, ListChecks, LogOut, Search, Settings, Ticket, Users } from "lucide-react";
import { useData } from "../data/store";
import { cn } from "../lib/utils";
import { Btn, Field, Modal, TextInput } from "./ui";

export const PLAYER_APP = "https://mercurydev097-cmyk.github.io/aspen-tennis-academy-app/";
const KEY = "aspen-admin-session";
let memFlag = false;
export const DEMO_EMAIL = "admin@aspentennis.demo";
export const DEMO_PASSWORD = "aspen2026";

const isAdmin = () => {
  try {
    return sessionStorage.getItem(KEY) === "1" || memFlag;
  } catch {
    return memFlag;
  }
};
const setAdmin = (on: boolean) => {
  memFlag = on;
  try {
    if (on) sessionStorage.setItem(KEY, "1");
    else sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
};

export function RequireAdmin({ children }: { children: ReactNode }) {
  return isAdmin() ? <>{children}</> : <Navigate to="/login" replace />;
}

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (email.trim().toLowerCase() === DEMO_EMAIL && pw === DEMO_PASSWORD) {
      setAdmin(true);
      navigate("/", { replace: true });
    } else setErr("Incorrect email or password.");
  };
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-200 p-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl bg-white p-7 shadow-[var(--shadow-float)]">
        <p className="text-[12px] font-extrabold tracking-[0.25em] text-pine-600">ASPEN</p>
        <h1 className="mt-1 text-[22px] font-extrabold text-navy-900">Admin desktop</h1>
        <p className="mt-1 text-[13px] text-ink-500">Classes, bookings, players and reports.</p>
        <div className="mt-5 space-y-3.5">
          <Field label="Email"><TextInput value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" /></Field>
          <Field label="Password"><TextInput type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" /></Field>
          {err && <p className="text-[12.5px] font-medium text-red-600">{err}</p>}
          <Btn variant="primary" type="submit" className="w-full py-2.5">Sign in</Btn>
        </div>
        <div className="mt-5 rounded-lg bg-gold-50 p-3 text-[12px] text-ink-500">
          <p className="font-bold text-navy-900">Demo login (prototype only, not real security)</p>
          <p className="mt-1">Email: {DEMO_EMAIL}</p>
          <p>Password: {DEMO_PASSWORD}</p>
          <button type="button" onClick={() => { setEmail(DEMO_EMAIL); setPw(DEMO_PASSWORD); }} className="mt-2 font-semibold text-pine-600">Fill in demo login</button>
        </div>
      </form>
    </div>
  );
}

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/calendar", label: "Calendar", icon: CalendarRange },
  { to: "/classes", label: "Classes", icon: CalendarDays },
  { to: "/bookings", label: "Bookings", icon: Ticket },
  { to: "/players", label: "Players", icon: Users },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/pricing", label: "Pricing & payments", icon: CreditCard },
  { to: "/settings", label: "Settings", icon: Settings },
];

function Palette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { classes, customers } = useData();
  const [q, setQ] = useState("");
  useEffect(() => { if (open) setQ(""); }, [open]);
  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    const pages = nav.filter((n) => !t || n.label.toLowerCase().includes(t)).map((n) => ({ key: `p-${n.to}`, label: n.label, hint: "Page", to: n.to }));
    if (!t) return pages;
    const cl = classes.filter((c) => `${c.title} ${c.tag ?? ""}`.toLowerCase().includes(t)).slice(0, 6).map((c) => ({ key: `c-${c.id}`, label: c.title, hint: c.date ? `Class · ${c.date}` : "Program", to: `/classes?open=${c.id}` }));
    const fm = customers.filter((c) => `${c.name} ${c.email} ${c.players.map((p) => p.name).join(" ")}`.toLowerCase().includes(t)).slice(0, 5).map((c) => ({ key: `f-${c.id}`, label: c.name, hint: "Family", to: `/players?family=${c.id}` }));
    return [...cl, ...fm, ...pages];
  }, [q, classes, customers]);
  const go = (to: string) => { navigate(to); onClose(); };
  return (
    <Modal open={open} onClose={onClose} title="Search">
      <TextInput autoFocus placeholder="Search classes, families, pages" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && results[0] && go(results[0].to)} />
      <ul className="mt-3 max-h-80 divide-y divide-ink-100 overflow-y-auto">
        {results.map((r) => (
          <li key={r.key}>
            <button onClick={() => go(r.to)} className="flex w-full items-center justify-between gap-3 px-1 py-2.5 text-left text-[13.5px] hover:bg-ink-100">
              <span className="font-semibold text-navy-900">{r.label}</span>
              <span className="text-[12px] text-ink-500">{r.hint}</span>
            </button>
          </li>
        ))}
        {results.length === 0 && <li className="py-6 text-center text-[13px] text-ink-500">Nothing found.</li>}
      </ul>
    </Modal>
  );
}

export function Shell() {
  const navigate = useNavigate();
  const [palette, setPalette] = useState(false);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((p) => !p);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);
  const signOut = () => { setAdmin(false); navigate("/login"); };
  const link = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-[13.5px] font-semibold transition-colors",
      isActive ? "bg-white/12 text-white" : "text-white/65 hover:bg-white/8 hover:text-white"
    );
  return (
    <div className="min-h-screen bg-surface text-navy-900 lg:flex">
      <aside className="sticky top-0 z-30 bg-navy-900 lg:flex lg:h-screen lg:w-60 lg:shrink-0 lg:flex-col">
        <div className="flex items-center justify-between px-4 py-2.5 lg:block lg:px-5 lg:py-5">
          <div>
            <p className="text-[11px] font-extrabold tracking-[0.3em] text-ball">ASPEN</p>
            <p className="text-[13px] font-semibold text-white/80">Admin</p>
          </div>
          <div className="flex items-center gap-1 lg:hidden">
            <button onClick={() => setPalette(true)} className="rounded-lg p-2 text-white/70 hover:bg-white/10" aria-label="Search"><Search size={18} /></button>
            <a href={PLAYER_APP} target="_blank" rel="noreferrer" className="rounded-lg p-2 text-white/70 hover:bg-white/10" aria-label="Open player app"><ExternalLink size={18} /></a>
            <button onClick={signOut} className="rounded-lg p-2 text-white/70 hover:bg-white/10" aria-label="Sign out"><LogOut size={18} /></button>
          </div>
        </div>
        <button onClick={() => setPalette(true)} className="mx-3 mb-3 hidden items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-[13px] text-white/70 hover:bg-white/15 lg:flex">
          <Search size={15} /> Search <kbd className="ml-auto rounded bg-white/10 px-1.5 text-[11px]">Ctrl K</kbd>
        </button>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2.5 lg:flex-1 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:pb-0">
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={link}>
              <n.icon size={17} /> {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden space-y-0.5 border-t border-white/10 p-3 lg:block">
          <a href={PLAYER_APP} target="_blank" rel="noreferrer" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-semibold text-white/65 hover:bg-white/8 hover:text-white"><ExternalLink size={16} /> Open player app</a>
          <button onClick={signOut} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-semibold text-white/65 hover:bg-white/8 hover:text-white"><LogOut size={16} /> Sign out</button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-5 lg:px-8 lg:py-6">
        <div className="mb-5 flex items-center justify-between gap-4 rounded-lg bg-gold-50 px-3.5 py-2 text-[12px] text-ink-500">
          <span>Prototype with demo data, saved in this browser. Shares data with the player app when both are open in the same browser.</span>
          <span className="hidden shrink-0 items-center gap-1.5 lg:flex"><ListChecks size={13} /> Admin</span>
        </div>
        <Outlet />
      </main>
      <Palette open={palette} onClose={() => setPalette(false)} />
    </div>
  );
}
