import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  Eye,
  Megaphone,
  Plane,
  Radio,
  Shield,
  ShieldAlert,
  Signal,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useInView } from "../hooks/useInView";
import { useAirAlertsShared } from "../lib/alertsContext";
import { WATCH, fmtDuration, threatLevelTitle, verdict, type Threat } from "../lib/alerts";
import { cn } from "../utils/cn";

/* ------------- маленькі іконки під тип загрози (без нових залежностей) ------------- */
function ThreatIcon({ type }: { type: Threat["type"] }) {
  if (type === "uav" || type === "recon") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="6" cy="6" r="2.5" />
        <circle cx="18" cy="6" r="2.5" />
        <circle cx="6" cy="18" r="2.5" />
        <circle cx="18" cy="18" r="2.5" />
        <path d="M8 8l8 8M8 16l8-8" />
        <circle cx="12" cy="12" r="1.2" fill="currentColor" />
      </svg>
    );
  }
  if (type === "missile" || type === "ballistic") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 4l6 6-2 2-4-4-1-1-5 5H6l-2-2 7-7 3 1z" />
        <path d="M10 12l-4 4 2 2 4-4" />
        <path d="M14 8c3 3 3 6 1 8" />
      </svg>
    );
  }
  if (type === "kab") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 13a7 7 0 0 1 14 0c0 3-1 4-2 5H7c-1-1-2-2-2-5z" />
        <path d="M12 6v3M12 3v1.5" />
      </svg>
    );
  }
  if (type === "mig31k") return <Plane className="h-5 w-5" />;
  return <AlertTriangle className="h-5 w-5" />;
}

/* ------------- картка статусу в хедері Hero ------------- */
export function AirAlertPill({ compact = false }: { compact?: boolean }) {
  const { state } = useAirAlertsShared();
  const v = verdict(state);
  const stale = state.lastOkAt !== null && Date.now() - state.lastOkAt > 90_000;
  return (
    <a
      href="#trygoga"
      title="Стан повітряної тривоги в Одесі"
      className={cn(
        "group flex items-center gap-2 rounded-full border px-3.5 py-2 font-display text-[10px] font-bold uppercase tracking-widest shadow-sm transition-all duration-300 backdrop-blur-none sm:backdrop-blur",
        v.tone === "danger" && "border-red-500/30 bg-red-500/15 text-red-700 hover:bg-red-500/25",
        v.tone === "warn" && "border-amber-500/30 bg-amber-400/20 text-amber-800 hover:bg-amber-400/30",
        v.tone === "watch" && "border-sun/50 bg-sun/20 text-ink hover:bg-sun/30",
        v.tone === "ok" && "border-emerald-500/25 bg-emerald-500/10 text-emerald-800 hover:bg-emerald-500/15"
      )}
    >
      <span className="relative flex h-2 w-2">
        {v.tone !== "ok" && (
          <span
            className={cn(
              "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
              v.tone === "danger" ? "bg-red-500" : v.tone === "warn" ? "bg-amber-500" : "bg-sun"
            )}
          />
        )}
        <span
          className={cn(
            "relative inline-flex h-2 w-2 rounded-full",
            v.tone === "danger"
              ? "bg-red-500"
              : v.tone === "warn"
                ? "bg-amber-500"
                : v.tone === "watch"
                  ? "bg-sun"
                  : "bg-emerald-500"
          )}
        />
      </span>
      {!compact && <span className="hidden sm:inline">{v.gotoClass === "no" ? "Тривога · в укриття" : v.gotoClass === "wait" ? "Стежимо · зачекай" : "Тривоги немає"}</span>}
      {compact && (
        <span>
          {v.gotoClass === "no" ? "Тривога" : v.gotoClass === "wait" ? "Стежимо" : "Тихо"}
        </span>
      )}
      {stale && <WifiOff className="h-3 w-3 opacity-60" />}
    </a>
  );
}

/* ------------- червона смуга під час тривоги (у Hero) ------------- */
export function AirAlertStickyBar() {
  const { state } = useAirAlertsShared();
  const v = verdict(state);
  const now = Date.now();
  if (v.tone === "ok") return null;
  const started = state.raion?.since ?? state.oblast?.since;
  return (
    <div
      className={cn(
        "relative overflow-hidden py-3 font-display text-[11px] font-bold uppercase tracking-[0.25em] text-white shadow-[0_20px_50px_-20px_rgba(0,0,0,0.6)]",
        v.tone === "danger" ? "bg-red-600" : v.tone === "warn" ? "bg-amber-500 text-ink" : "bg-sun text-ink"
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0",
          v.tone === "danger" && "bg-[repeating-linear-gradient(45deg,transparent,transparent_16px,rgba(255,255,255,0.12)_16px,rgba(255,255,255,0.12)_32px)]"
        )}
      />
      <div className="relative mx-auto flex max-w-7xl items-center justify-center gap-3 px-6">
        <span className="relative flex h-2.5 w-2.5">
          <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-80", v.tone === "danger" ? "bg-white" : "bg-ink/70")} />
          <span className={cn("relative inline-flex h-2.5 w-2.5 rounded-full", v.tone === "danger" ? "bg-white" : "bg-ink")} />
        </span>
        <span className="truncate">{v.title}</span>
        {started && (
          <span className={cn("hidden rounded-full px-2 py-0.5 text-[10px] sm:inline-block", v.tone === "danger" ? "bg-white/15" : "bg-ink/10")}>
            триває {fmtDuration(started, now)}
          </span>
        )}
        <a href="#trygoga" className="ml-2 inline-flex items-center gap-1 underline decoration-dotted underline-offset-4">
          деталі
        </a>
      </div>
    </div>
  );
}

/* ------------- основна секція ------------- */
export default function AirAlertSection() {
  const { state } = useAirAlertsShared();
  const { ref, inView } = useInView<HTMLDivElement>();
  const [tab, setTab] = useState<"now" | "threats" | "news" | "history">("now");
  const v = verdict(state);
  const now = Date.now();

  const historyBySwitch = useMemo(() => {
    const h = [...state.history].reverse();
    // групуємо суміжні події
    const rows: Array<{ at: number; kind: "start" | "end" | "threat" | "clear"; label: string }> = [];
    let prev: { r: boolean; o: boolean; t: boolean } | null = null;
    for (const e of h) {
      const cur = { r: e.alertRaion, o: e.alertOblast, t: e.threatCount > 0 };
      if (!prev) {
        if (cur.r) rows.push({ at: e.at, kind: "start", label: "Тривога в Одеському районі" });
        else if (cur.o) rows.push({ at: e.at, kind: "start", label: "Тривога в Одеській області" });
        else if (cur.t) rows.push({ at: e.at, kind: "threat", label: "Загрози в напрямку області" });
        else rows.push({ at: e.at, kind: "clear", label: "Тривоги немає" });
      } else {
        if (cur.r && !prev.r) rows.push({ at: e.at, kind: "start", label: "Тривога в Одеському районі" });
        else if (!cur.r && cur.o && !prev.o) rows.push({ at: e.at, kind: "start", label: "Тривога в області" });
        else if (!cur.r && !cur.o && (prev.r || prev.o)) rows.push({ at: e.at, kind: "end", label: "Відбій тривоги" });
        if (cur.t && !prev.t && !cur.r && !cur.o) rows.push({ at: e.at, kind: "threat", label: "Загрози в напрямку області" });
        if (!cur.t && !cur.r && !cur.o && (prev.t || prev.r || prev.o)) rows.push({ at: e.at, kind: "clear", label: "Небо чисте" });
      }
      prev = cur;
    }
    // обмежити останніми 20 рядками
    return rows.slice(0, 20);
  }, [state.history]);

  const statusCard = (() => {
    const gotoText =
      v.gotoClass === "no"
        ? { strong: "До школи НЕ йти", soft: "Прямуй в укриття або лишайся вдома. Слухай офіційні сигнали." }
        : v.gotoClass === "wait"
          ? { strong: "Поки що не виходь", soft: "Зачекай відбою — зазвичай тривога триває 20–60 хв." }
          : { strong: "Можна йти на урок", soft: "Проте телефона тримай поруч — усе може змінитися за хвилини." };

    const toneStyles = {
      ok: {
        card: "border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-paper to-paper",
        badge: "bg-emerald-500 text-white",
        dot: "bg-emerald-500",
        ring: "bg-emerald-500",
        ringPulse: "bg-emerald-500/40",
        icon: <Shield className="h-8 w-8" />,
      },
      watch: {
        card: "border-sun/50 bg-gradient-to-br from-sun/20 via-paper to-paper",
        badge: "bg-sun text-ink",
        dot: "bg-sun",
        ring: "bg-sun",
        ringPulse: "bg-sun/50",
        icon: <Eye className="h-8 w-8" />,
      },
      warn: {
        card: "border-amber-500/40 bg-gradient-to-br from-amber-400/20 via-paper to-paper",
        badge: "bg-amber-500 text-ink",
        dot: "bg-amber-500",
        ring: "bg-amber-500",
        ringPulse: "bg-amber-500/40",
        icon: <ShieldAlert className="h-8 w-8" />,
      },
      danger: {
        card: "border-red-500/40 bg-gradient-to-br from-red-500/15 via-paper to-paper",
        badge: "bg-red-600 text-white",
        dot: "bg-red-600",
        ring: "bg-red-600",
        ringPulse: "bg-red-600/40",
        icon: <AlertTriangle className="h-8 w-8" />,
      },
    }[v.tone];

    const started = state.raion?.since ?? state.oblast?.since;

    return (
      <div className={cn("anim-fade-up relative overflow-hidden rounded-[1.75rem] border p-7 shadow-[0_18px_50px_-30px_rgba(23,20,12,0.6)]", toneStyles.card)}>
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full blur-3xl opacity-40" style={{ backgroundColor: v.tone === "ok" ? "#10b981" : v.tone === "danger" ? "#ef4444" : v.tone === "warn" ? "#f59e0b" : "#f2b705" }} />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-5">
            <div className="relative shrink-0">
              {v.tone !== "ok" && (
                <>
                  <span className={cn("absolute inset-0 animate-ping rounded-full", toneStyles.ringPulse)} />
                  <span className={cn("absolute inset-2 rounded-full opacity-30", toneStyles.ring)} />
                </>
              )}
              <span className={cn("relative flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-lg", toneStyles.badge)}>
                {toneStyles.icon}
              </span>
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-display text-[9px] font-bold uppercase tracking-widest", toneStyles.badge)}>
                  <span className={cn("h-1.5 w-1.5 rounded-full", toneStyles.dot)} />
                  {v.tone === "danger" ? "Небезпечно" : v.tone === "warn" ? "Увага" : v.tone === "watch" ? "Моніторимо" : "Безпечно"}
                </span>
                <span className="rounded-full border border-ink/10 bg-white/70 px-2.5 py-1 font-display text-[9px] font-bold uppercase tracking-widest text-ink-soft">
                  <MapPin /> {WATCH.label}
                </span>
                {state.connected === "live" && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 font-display text-[9px] font-bold uppercase tracking-widest text-emerald-700">
                    <Signal className="h-3 w-3" /> реальний час
                  </span>
                )}
                {state.connected === "polling" && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-ink/15 bg-white/70 px-2.5 py-1 font-display text-[9px] font-bold uppercase tracking-widest text-ink-soft">
                    <Wifi className="h-3 w-3" /> оновлення 15с
                  </span>
                )}
                {state.connected === "offline" && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1 font-display text-[9px] font-bold uppercase tracking-widest text-red-700">
                    <WifiOff className="h-3 w-3" /> немає зв'язку
                  </span>
                )}
              </div>
              <h3 className="mt-3 font-display text-2xl font-extrabold uppercase tracking-tight sm:text-3xl">
                {v.title}
              </h3>
              <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-soft">{v.sub}</p>
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col lg:items-end">
            <div className="rounded-2xl border border-ink/10 bg-paper px-4 py-3 text-right">
              <p className="font-display text-[9px] font-bold uppercase tracking-widest text-ink-soft">Вердикт для уроку</p>
              <p className="mt-1 font-display text-base font-extrabold leading-tight">
                {gotoText.strong}
              </p>
              <p className="mt-1 text-xs text-ink-soft">{gotoText.soft}</p>
            </div>
            {started && (
              <div className="rounded-2xl border border-ink/10 bg-paper px-4 py-3 text-right">
                <p className="font-display text-[9px] font-bold uppercase tracking-widest text-ink-soft">Тривога триває</p>
                <p className="mt-1 font-display text-base font-extrabold tabular-nums leading-tight">
                  {fmtDuration(started, now)}
                </p>
                <p className="mt-1 text-xs text-ink-soft">з {new Date(started).toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" })}</p>
              </div>
            )}
            {state.lastOkAt && (
              <p className="text-right text-[10px] font-semibold uppercase tracking-widest text-ink-soft/70">
                оновлено {new Date(state.lastOkAt).toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  })();

  return (
    <section id="trygoga" className="relative mx-auto max-w-7xl px-6 pb-16 pt-20">
      <div ref={ref} className={cn("reveal", inView && "is-visible", "flex flex-wrap items-end justify-between gap-6")}>
        <div>
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.25em] text-red-600">
            <Radio className="h-4 w-4" />
            Повітряна тривога · Одеса та Одеський район
          </p>
          <h2 className="mt-3 font-display text-4xl font-extrabold uppercase tracking-tight sm:text-5xl">
            Йти на урок <span className="font-accent normal-case italic tracking-normal text-ink/70">чи ні?</span>
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
            Дані в реальному часі з офіційних джерел ДСНС і волонтерських карток повітряних загроз.
            Сторінка оновлюється сама через WebSocket, а при проблемах зі з'єднанням — опитує сервер
            щокілька секунд. {WATCH.note}
          </p>
        </div>
        <a
          href="https://neptun.in.ua/"
          target="_blank"
          rel="noreferrer noopener"
          className="group inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white/70 px-4 py-2 font-display text-[11px] font-bold uppercase tracking-widest text-ink-soft backdrop-blur transition-all hover:-translate-y-0.5 hover:border-ink/25 hover:text-ink"
        >
          Джерело: NEPTUN
          <ExternalLink className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </a>
      </div>

      <div className="mt-8">{statusCard}</div>

      {/* таби */}
      <div className={cn("reveal", inView && "is-visible", "mt-8 inline-flex rounded-full border border-ink/10 bg-white/70 p-1 backdrop-blur")}>
        {tabBtn("now", "Зараз", Shield)}
        {tabBtn("threats", "Загрози", AlertTriangle)}
        {tabBtn("news", "Новини", Megaphone)}
        {tabBtn("history", "Історія", CalendarClock)}
      </div>

      <div className="mt-6">
        {tab === "now" && <NowTab state={state} v={v} />}
        {tab === "threats" && <ThreatsTab state={state} />}
        {tab === "news" && <NewsTab state={state} />}
        {tab === "history" && <HistoryTab rows={historyBySwitch} />}
      </div>

      <p className="mt-8 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-soft/60">
        Інформація подана для зручності. Головний сигнал — офіційні сирени та повідомлення ДСНС.
      </p>
    </section>
  );

  function tabBtn(id: typeof tab, label: string, Icon: typeof Shield) {
    const on = tab === id;
    return (
      <button
        onClick={() => setTab(id)}
        className={cn(
          "flex items-center gap-2 rounded-full px-4 py-2 font-display text-[11px] font-bold uppercase tracking-widest transition-all duration-300",
          on ? "bg-ink text-cream shadow-[0_14px_30px_-12px_rgba(23,20,12,0.5)]" : "text-ink-soft hover:text-ink"
        )}
      >
        <Icon className="h-3.5 w-3.5" />
        {label}
      </button>
    );
  }
}

function MapPin() {
  return (
    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s7-6.5 7-12a7 7 0 10-14 0c0 5.5 7 12 7 12z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}

/* ------------- вкладка «Зараз» ------------- */
function NowTab({
  state,
  v,
}: {
  state: ReturnType<typeof useAirAlertsShared>["state"];
  v: ReturnType<typeof verdict>;
}) {
  const started = state.raion?.since ?? state.oblast?.since;
  const now = Date.now();
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <MiniStat
        label="Одеський район"
        sub="центр Одеси · Великодолинське"
        big={state.raion ? "ТРИВОГА" : "тихо"}
        tone={state.raion ? "danger" : "ok"}
        small={state.raion && started ? `триває ${fmtDuration(started, now)}` : "тривоги немає"}
      />
      <MiniStat
        label="Одеська область"
        sub="загалом"
        big={state.oblast ? "частково" : "тихо"}
        tone={state.oblast ? "warn" : "ok"}
        small={state.oblast && started ? `з ${new Date(started).toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" })}` : "тривоги по області немає"}
      />
      <MiniStat
        label="Повітряні цілі"
        sub="БпЛА, ракети, МіГи поруч"
        big={String(state.threats.length)}
        tone={state.threats.length > 0 ? "warn" : "ok"}
        small={state.threats.length ? "стеж за повiтрям" : "зафіксованих цілей немає"}
      />

      <div className="relative overflow-hidden rounded-[1.75rem] border border-ink/10 bg-paper p-6 lg:col-span-3">
        <div className="flex items-start gap-3">
          <span className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white",
            v.tone === "danger" ? "bg-red-600" : v.tone === "warn" ? "bg-amber-500" : v.tone === "watch" ? "bg-sun" : "bg-emerald-500"
          )}>
            {v.gotoClass === "yes" ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
          </span>
          <div>
            <p className="font-display text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-soft">
              Рішення на сьогодні
            </p>
            <p className="mt-1 font-display text-lg font-bold leading-snug">
              {v.gotoClass === "yes" && "Все спокійно — можна збирати портфель і йти до школи."}
              {v.gotoClass === "wait" && "Не виходь завчасно. Слідкуй за оновленнями на цій сторінці та сиренами."}
              {v.gotoClass === "no" && "До школи сьогодні не йди. Прямуй в укриття або лишайся в безпечному місці."}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              Пам'ятай: сторінка — помічник, а не офіційне джерело. Головне — сигнал сирени,
              повідомлення ДСНС та вчителі. Якщо не впевнений — залишайся в безпеці.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  sub,
  big,
  tone,
  small,
}: {
  label: string;
  sub: string;
  big: string;
  tone: "ok" | "warn" | "danger";
  small: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-[1.75rem] border border-ink/10 bg-paper p-6">
      <span className={cn(
        "absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl opacity-40",
        tone === "danger" ? "bg-red-500" : tone === "warn" ? "bg-amber-400" : "bg-emerald-400"
      )} />
      <div className="relative">
        <p className="font-display text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-soft">{label}</p>
        <p className="mt-0.5 text-[11px] font-semibold text-ink-soft/80">{sub}</p>
        <p className={cn(
          "mt-4 font-display text-3xl font-extrabold uppercase tracking-tight",
          tone === "danger" ? "text-red-600" : tone === "warn" ? "text-amber-600" : "text-emerald-700"
        )}>
          {big}
        </p>
        <p className="mt-2 text-xs font-semibold text-ink-soft">{small}</p>
      </div>
    </div>
  );
}

/* ------------- вкладка «Загрози» ------------- */
function ThreatsTab({ state }: { state: ReturnType<typeof useAirAlertsShared>["state"] }) {
  if (state.threats.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-[1.75rem] border border-ink/10 bg-paper p-10 text-center">
        <CheckCircle2 className="h-10 w-10 text-emerald-500" />
        <p className="font-display text-lg font-bold">Повітряних цілей поруч не видно</p>
        <p className="max-w-md text-sm text-ink-soft">У межах Одещини зараз не фіксуються БпЛА, ракети чи вильоти МіГ-31К.</p>
      </div>
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {state.threats.map((t) => {
        const meta = threatLevelTitle(t);
        const danger = t.type === "ballistic" || t.type === "missile" || t.type === "kab";
        return (
          <article
            key={t.id}
            className={cn(
              "flex items-start gap-4 rounded-3xl border p-5",
              danger ? "border-red-500/30 bg-red-500/5" : "border-ink/10 bg-paper"
            )}
          >
            <span className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white",
              danger ? "bg-red-600" : t.type === "mig31k" ? "bg-night" : t.type === "uav" ? "bg-sun text-ink" : "bg-cobalt"
            )}>
              <ThreatIcon type={t.type} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-[10px] font-bold uppercase tracking-widest text-ink-soft">
                {meta}
                {t.confidenceLevel && (
                  <span className="ml-2 rounded-full bg-ink/10 px-1.5 py-0.5 text-[9px]">
                    {t.confidenceLevel === "high" ? "впевнено" : t.confidenceLevel === "medium" ? "імовірно" : "не точно"}
                  </span>
                )}
              </p>
              <h4 className="mt-1 font-display text-base font-bold">
                {t.locality || t.district || t.region || "Невідома локація"}
              </h4>
              <p className="mt-1 text-sm text-ink-soft">
                {t.explanationShort || (t.district ? `${t.district}, ${t.region}` : t.region)}
              </p>
              {t.velocity?.speedKmh && (
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-widest text-ink-soft/70">
                  швидкість ~{Math.round(t.velocity.speedKmh)} км/год
                  {t.updatedAt && ` · оновлено ${new Date(t.updatedAt).toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" })}`}
                </p>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}

/* ------------- вкладка «Новини» ------------- */
function NewsTab({ state }: { state: ReturnType<typeof useAirAlertsShared>["state"] }) {
  if (state.messages.length === 0) {
    return (
      <div className="rounded-[1.75rem] border border-ink/10 bg-paper p-8 text-center">
        <Megaphone className="mx-auto h-8 w-8 text-ink-soft/50" />
        <p className="mt-3 font-display text-base font-bold text-ink-soft">Поки що без термінових новин</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-ink-soft/80">Щойно в регіональних каналах з'являться повідомлення про Одещину — вони з'являться тут автоматично.</p>
      </div>
    );
  }
  return (
    <ul className="space-y-3">
      {state.messages.map((m, i) => (
        <li key={i} className="anim-fade-up rounded-3xl border border-ink/10 bg-paper p-5" style={{ animationDelay: `${i * 50}ms` }}>
          <div className="flex items-center justify-between gap-2">
            <p className="font-display text-[10px] font-bold uppercase tracking-widest text-cobalt">{m.channel}</p>
            <p className="text-[11px] font-semibold tabular-nums text-ink-soft">
              {new Date(m.date).toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-[14px] leading-relaxed text-ink">{m.text}</p>
        </li>
      ))}
    </ul>
  );
}

/* ------------- вкладка «Історія» ------------- */
function HistoryTab({
  rows,
}: {
  rows: Array<{ at: number; kind: "start" | "end" | "threat" | "clear"; label: string }>;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-[1.75rem] border border-ink/10 bg-paper p-8 text-center">
        <CalendarClock className="mx-auto h-8 w-8 text-ink-soft/50" />
        <p className="mt-3 font-display text-base font-bold text-ink-soft">Історія накопичується</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-ink-soft/80">Щойно статус тривоги зміниться — тут з'являться записи. Історія зберігається у твоєму браузері 24 години.</p>
      </div>
    );
  }
  return (
    <div className="relative overflow-hidden rounded-[1.75rem] border border-ink/10 bg-paper p-4 sm:p-6">
      <ol className="relative space-y-4 border-l-2 border-dashed border-ink/15 pl-5">
        {rows.map((r, i) => {
          const d = new Date(r.at);
          const dotColor =
            r.kind === "start" ? "bg-red-600" : r.kind === "end" ? "bg-emerald-500" : r.kind === "threat" ? "bg-sun" : "bg-ink/30";
          return (
            <li key={i} className="relative">
              <span className={cn("absolute -left-[27px] top-1.5 h-3 w-3 rounded-full ring-4 ring-paper", dotColor)} />
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-display text-sm font-bold">
                  {r.kind === "start" && "🔴 "}
                  {r.kind === "end" && "🟢 "}
                  {r.kind === "threat" && "🟡 "}
                  {r.kind === "clear" && "⚪️ "}
                  {r.label}
                </p>
                <p className="font-display text-xs font-semibold tabular-nums text-ink-soft">
                  {d.toLocaleDateString("uk-UA", { day: "2-digit", month: "2-digit" })} ·{" "}
                  {d.toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
