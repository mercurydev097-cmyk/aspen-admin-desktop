import { useEffect, type ReactNode, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes, type ButtonHTMLAttributes } from "react";
import { X } from "lucide-react";
import { cn } from "../lib/utils";

export const inputCls =
  "w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-[14px] text-navy-900 placeholder:text-ink-300 focus:border-navy-600 focus:outline-none focus:ring-2 focus:ring-navy-600/15";

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink-500">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11.5px] text-ink-500">{hint}</span>}
    </label>
  );
}

export function TextInput(p: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...p} className={cn(inputCls, p.className)} />;
}
export function Select(p: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...p} className={cn(inputCls, "pr-8", p.className)} />;
}
export function TextArea(p: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...p} className={cn(inputCls, "min-h-[88px] leading-relaxed", p.className)} />;
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost"; size?: "sm" | "md" };
export function Btn({ variant = "secondary", size = "md", className, ...p }: BtnProps) {
  return (
    <button
      {...p}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-semibold transition-colors disabled:pointer-events-none disabled:opacity-45",
        size === "sm" ? "px-2.5 py-1.5 text-[12px]" : "px-3.5 py-2 text-[13px]",
        variant === "primary" && "bg-navy-900 text-white hover:bg-navy-800",
        variant === "secondary" && "border border-ink-200 bg-white text-navy-900 hover:border-ink-300 hover:bg-ink-100",
        variant === "danger" && "border border-red-200 bg-white text-red-600 hover:bg-red-50",
        variant === "ghost" && "text-navy-900 hover:bg-ink-100",
        className
      )}
    />
  );
}

const pillTones = {
  green: "bg-pine-100 text-pine-600",
  amber: "bg-gold-100 text-gold-500",
  red: "bg-red-50 text-red-600",
  gray: "bg-ink-100 text-ink-500",
  blue: "bg-sky-50 text-sky-700",
};
export function Pill({ tone = "gray", children }: { tone?: keyof typeof pillTones; children: ReactNode }) {
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold", pillTones[tone])}>{children}</span>;
}

export function Panel({ title, action, children, className }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border border-ink-200 bg-white", className)}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-ink-100 px-4 py-3">
          <h2 className="text-[14px] font-bold text-navy-900">{title}</h2>
          {action}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Stat({ label, value, sub, icon, className }: { label: string; value: ReactNode; sub?: ReactNode; icon?: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-ink-200 bg-white p-4", className)}>
      <div className="flex items-center justify-between text-ink-500">
        <span className="text-[11px] font-bold uppercase tracking-wide">{label}</span>
        {icon}
      </div>
      <p className="mt-2 text-[24px] font-extrabold leading-none text-navy-900">{value}</p>
      {sub && <p className="mt-1.5 text-[12px] text-ink-500">{sub}</p>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-[24px] font-extrabold text-navy-900">{title}</h1>
        {subtitle && <p className="mt-0.5 text-[13px] text-ink-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Tabs<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="mb-4 inline-flex rounded-lg bg-ink-100 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-md px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
            value === o.value ? "bg-white text-navy-900 shadow-sm" : "text-ink-500 hover:text-navy-900"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Modal({ open, title, onClose, children, footer, wide }: { open: boolean; title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy-900/45 p-0 sm:items-center sm:p-6" onMouseDown={onClose}>
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className={cn("flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white shadow-[var(--shadow-float)] sm:rounded-2xl", wide ? "sm:max-w-3xl" : "sm:max-w-lg")}
      >
        <header className="flex items-center justify-between border-b border-ink-100 px-5 py-3.5">
          <h2 className="text-[16px] font-bold text-navy-900">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-ink-500 hover:bg-ink-100">
            <X size={18} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-ink-100 px-5 py-3">{footer}</footer>}
      </div>
    </div>
  );
}

export function FillBar({ booked, capacity }: { booked: number; capacity?: number }) {
  if (!capacity) return <span className="text-[12px] text-ink-500">{booked} booked</span>;
  const pct = Math.min(100, Math.round((booked / capacity) * 100));
  return (
    <div className="min-w-[88px]">
      <div className="flex justify-between text-[11.5px] font-semibold text-navy-900">
        <span>{booked}/{capacity}</span>
        <span className="text-ink-500">{pct}%</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-100">
        <div className={cn("h-full rounded-full", pct >= 100 ? "bg-gold-500" : "bg-pine-600")} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-xl bg-ink-100 p-8 text-center text-[13px] text-ink-500">{children}</div>;
}

export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const blob = new Blob([rows.map((r) => r.map(esc).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const money = (n: number) => `$${n.toFixed(2)}`;

export function SidePanel({ title, subtitle, onClose, children, footer }: { title: string; subtitle?: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  return (
    <>
    <div className="fixed inset-0 z-30 bg-navy-900/40 lg:hidden" onClick={onClose} />
    <aside className="fixed inset-x-0 bottom-0 top-14 z-40 flex flex-col overflow-hidden rounded-t-2xl border border-ink-200 bg-white shadow-[var(--shadow-float)] lg:sticky lg:inset-auto lg:top-6 lg:z-auto lg:max-h-[calc(100vh-3rem)] lg:w-[440px] lg:shrink-0 lg:rounded-xl lg:shadow-[var(--shadow-card)]">
      <header className="flex items-start justify-between gap-3 border-b border-ink-100 px-4 py-3">
        <div className="min-w-0">
          <h2 className="truncate text-[15px] font-bold text-navy-900">{title}</h2>
          {subtitle && <div className="mt-0.5 text-[12.5px] text-ink-500">{subtitle}</div>}
        </div>
        <button onClick={onClose} aria-label="Close panel" className="rounded-full p-1.5 text-ink-500 hover:bg-ink-100">
          <X size={17} />
        </button>
      </header>
      <div className="flex-1 overflow-y-auto p-4">{children}</div>
      {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-ink-100 px-4 py-3">{footer}</footer>}
    </aside>
    </>
  );
}

export function Toast({ msg, onUndo, onClose }: { msg: string; onUndo?: () => void; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 7000);
    return () => clearTimeout(t);
  }, [msg, onClose]);
  return (
    <div className="fixed bottom-4 left-1/2 z-[60] flex w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 items-center gap-4 rounded-xl bg-navy-900 px-4 py-3 text-[13px] text-white shadow-[var(--shadow-float)]">
      <span>{msg}</span>
      {onUndo && (
        <button onClick={() => { onUndo(); onClose(); }} className="font-bold text-ball">
          Undo
        </button>
      )}
      <button onClick={onClose} aria-label="Dismiss" className="text-white/60 hover:text-white"><X size={15} /></button>
    </div>
  );
}

export function Th({ children, onClick, active, dir, className }: { children?: ReactNode; onClick?: () => void; active?: boolean; dir?: 1 | -1; className?: string }) {
  return (
    <th className={cn("px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-ink-500", onClick && "cursor-pointer select-none hover:text-navy-900", className)} onClick={onClick}>
      {children}
      {active && <span className="ml-1">{dir === 1 ? "▲" : "▼"}</span>}
    </th>
  );
}
