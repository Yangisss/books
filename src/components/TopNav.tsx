import { useEffect, useState, type CSSProperties } from "react";
import {
  BookOpen,
  CalendarDays,
  Home,
  ShieldAlert,
  Lock,
  Clock3,
  MapPin,
} from "lucide-react";
import { CLASSES, getAdminKey, setAdminKey, setClass, useClassInfo } from "../lib/cls";
import { checkAdminKey, isShared, isStatic } from "../lib/storage";
import { AirAlertPill } from "./AirAlertSection";
import { useAirAlertsShared } from "../lib/alertsContext";
import { verdict } from "../lib/alerts";

export type SiteTab = "home" | "alerts" | "schedule" | "subjects";

const TABS: Array<{
  id: SiteTab;
  label: string;
  short: string;
  icon: typeof Home;
}> = [
  { id: "home", label: "Головна", short: "Головна", icon: Home },
  { id: "alerts", label: "Тривога", short: "Тривога", icon: ShieldAlert },
  { id: "schedule", label: "Розклад", short: "Розклад", icon: CalendarDays },
  { id: "subjects", label: "Предмети", short: "Предмети", icon: BookOpen },
];

function ClassSelectCompact() {
  const { id: cls } = useClassInfo();
  return (
    <div className="relative flex items-center">
      <select
        value={cls}
        onChange={(e) => setClass(e.target.value)}
        aria-label="Обрати клас"
        className="cls-select cursor-pointer appearance-none rounded-full border border-ink/10 bg-white/70 py-2 pl-3.5 pr-7 font-display text-[11px] font-bold uppercase tracking-widest text-ink shadow-sm backdrop-blur transition-all hover:border-ink/20 focus:outline-none focus:ring-2 focus:ring-cobalt/30"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' fill='none' stroke='%2317140c' stroke-width='1.8'%3E%3Cpath d='M1 1l4 4 4-4'/%3E%3C/svg%3E\")",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 10px center",
        }}
      >
        {CLASSES.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function AdminButtonCompact() {
  const [on, setOn] = useState(() => !!getAdminKey() || !isShared());
  useEffect(() => {
    const h = () => setOn(!!getAdminKey() || !isShared());
    window.addEventListener("vdsh2-admin", h);
    window.addEventListener("vdsh2-probed", h);
    return () => {
      window.removeEventListener("vdsh2-admin", h);
      window.removeEventListener("vdsh2-probed", h);
    };
  }, []);
  if (isStatic() && !isShared()) return null;
  const toggle = async () => {
    if (isShared() && getAdminKey()) {
      setAdminKey("");
      window.dispatchEvent(new Event("vdsh2-admin"));
      return;
    }
    const k = prompt("Код власника сайту (його знаєш лише ти):");
    if (k === null) return;
    if (isShared() && !(await checkAdminKey(k))) {
      alert("Не той код — спробуй ще.");
      return;
    }
    setAdminKey(k);
    window.dispatchEvent(new Event("vdsh2-admin"));
  };
  return (
    <button
      onClick={toggle}
      className={`flex h-9 w-9 items-center justify-center rounded-full border shadow-sm backdrop-blur transition-all sm:h-auto sm:w-auto sm:px-3.5 sm:py-2 ${
        on
          ? "border-transparent bg-sun text-ink"
          : "border-ink/10 bg-white/70 text-ink-soft hover:border-ink/20 hover:text-ink"
      }`}
      title={on ? "Режим власника" : "Код власника"}
    >
      <Lock className="h-3.5 w-3.5" />
      <span className="hidden sm:ml-1 sm:inline font-display text-[10px] font-bold uppercase tracking-widest">
        {on ? "власник" : "код"}
      </span>
    </button>
  );
}

function LiveClockMini() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const time = now.toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" });
  return (
    <div className="hidden items-center gap-2 rounded-full border border-ink/10 bg-white/70 px-3.5 py-2 shadow-sm backdrop-blur lg:flex">
      <Clock3 className="h-3.5 w-3.5 text-cobalt" />
      <span className="font-display text-[11px] font-bold tracking-widest tabular-nums">{time}</span>
    </div>
  );
}

export default function TopNav({
  active,
  onChange,
}: {
  active: SiteTab;
  onChange: (t: SiteTab) => void;
}) {
  const { label: clsLabel } = useClassInfo();
  const { state } = useAirAlertsShared();
  const v = verdict(state);
  const isAlertActive = v.tone === "danger" || v.tone === "warn";

  return (
    <div className="sticky top-0 z-40 w-full border-b border-ink/10 bg-cream/90 backdrop-blur-xl supports-[backdrop-filter]:bg-cream/75">
      {/* Верхній ряд — лого, клас, дії */}
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-2.5 sm:px-6 sm:py-3">
        <button
          onClick={() => onChange("home")}
          className="group flex items-center gap-2.5 text-left"
          aria-label="На головну"
        >
          <div className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-ink shadow-md transition-transform group-hover:scale-105 sm:h-10 sm:w-10 sm:rounded-2xl">
            <span className="absolute left-0 top-0 h-1/2 w-full bg-cobalt/90" />
            <span className="absolute bottom-0 left-0 h-1/2 w-full bg-sun/90" />
            <span className="relative font-display text-[11px] font-bold text-white mix-blend-difference">
              11
            </span>
          </div>
          <div className="hidden leading-tight sm:block">
            <p className="font-display text-[11px] font-extrabold uppercase tracking-widest">Мої предмети</p>
            <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-ink-soft">
              <MapPin className="h-3 w-3" />
              {clsLabel} · Школа №2
            </p>
          </div>
          <span className="font-display text-[12px] font-extrabold uppercase tracking-widest sm:hidden">
            11-А
          </span>
        </button>

        {/* Десктоп — вкладки по центру */}
        <nav
          className="hidden items-center gap-1.5 rounded-full border border-ink/10 bg-white/60 p-1 shadow-sm backdrop-blur lg:flex"
          aria-label="Навігація сайтом"
        >
          {TABS.map((t) => {
            const Icon = t.icon;
            const isActive = active === t.id;
            const showAlertDot = t.id === "alerts" && isAlertActive;
            return (
              <button
                key={t.id}
                onClick={() => onChange(t.id)}
                className={`relative flex items-center gap-1.5 rounded-full px-4 py-2 font-display text-[11px] font-bold uppercase tracking-widest transition-all duration-300 ${
                  isActive
                    ? "bg-ink text-cream shadow-[0_10px_24px_-12px_rgba(23,20,12,0.6)]"
                    : "text-ink-soft hover:bg-ink/5 hover:text-ink"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
                {showAlertDot && (
                  <span className="relative ml-0.5 flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Дії справа */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="hidden sm:flex items-center gap-2">
            <ClassSelectCompact />
            <AdminButtonCompact />
          </div>
          {/* На мобілці — тільки клас і тривога компактно */}
          <div className="flex sm:hidden items-center gap-1.5">
            <ClassSelectCompact />
          </div>
          <AirAlertPill />
          <LiveClockMini />
        </div>
      </div>

      {/* Мобільний ряд вкладок — зручні великі пігулки, скрол без смуги */}
      <div className="border-t border-ink/5 bg-cream/60 backdrop-blur lg:hidden">
        <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto px-2 py-2">
          {TABS.map((t) => {
            const Icon = t.icon;
            const isActive = active === t.id;
            const showAlertDot = t.id === "alerts" && isAlertActive;
            return (
              <button
                key={t.id}
                onClick={() => onChange(t.id)}
                className={`relative flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2.5 font-display text-[11px] font-bold uppercase tracking-widest transition-all ${
                  isActive
                    ? "bg-ink text-cream shadow-[0_8px_20px_-10px_rgba(23,20,12,0.5)]"
                    : "border border-ink/10 bg-white/70 text-ink-soft"
                }`}
                style={{ minHeight: 40 } as CSSProperties}
              >
                <Icon className="h-4 w-4" />
                {t.short}
                {showAlertDot && (
                  <span className="relative ml-0.5 flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                  </span>
                )}
              </button>
            );
          })}
          <span className="ml-2 hidden items-center gap-1 rounded-full bg-white/60 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-ink-soft sm:flex">
            {clsLabel} · 2026/27
          </span>
        </div>
      </div>
    </div>
  );
}
