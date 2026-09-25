import { useEffect, useState, type CSSProperties } from "react";
import { ArrowDown, Atom, BookOpen, CalendarDays, Clock3, MapPin, Palette, Sigma, Sparkles, Telescope } from "lucide-react";
import { subjects } from "../data/subjects";
import { setClass, useClass } from "../lib/cls";

function ClassSelect({ dark = false }: { dark?: boolean }) {
  const cls = useClass();
  return (
    <label
      className={`flex items-center gap-2 rounded-full border border-ink/10 px-4 py-2 shadow-sm backdrop-blur transition-colors ${
        dark ? "bg-white/10 text-cream" : "bg-white/70"
      }`}
      title="Обери свій клас"
    >
      <span className={`font-display text-[11px] font-bold uppercase tracking-widest ${dark ? "text-cream/60" : "text-ink-soft"}`}>
        Клас
      </span>
      <select
        value={cls}
        onChange={(e) => setClass(Number(e.target.value))}
        aria-label="Обрати клас"
        className={`cursor-pointer appearance-none bg-transparent pr-1 font-display text-[13px] font-extrabold tabular-nums tracking-wide outline-none ${dark ? "text-cream" : "text-ink"}`}
      >
        {Array.from({ length: 11 }, (_, i) => i + 1).map((n) => (
          <option key={n} value={n} className="text-ink">
            {n}
          </option>
        ))}
      </select>
    </label>
  );
}

const todayShort = () =>
  ["Неділя", "Понеділок", "Вівторок", "Середа", "Четвер", "П'ятниця", "Субота"][new Date().getDay()];

const getGreeting = (h: number) => {
  if (h >= 5 && h < 11) return "Доброго ранку";
  if (h >= 11 && h < 18) return "Добрий день";
  if (h >= 18 && h < 23) return "Добрий вечір";
  return "Доброї ночі";
};

function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const time = now.toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const date = now.toLocaleDateString("uk-UA", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="flex items-center gap-2.5 rounded-full border border-ink/10 bg-white/70 px-4 py-2 shadow-sm backdrop-blur">
      <Clock3 className="h-4 w-4 text-cobalt" />
      <span className="font-display text-[11px] font-semibold tracking-widest tabular-nums">{time}</span>
      <span className="h-3 w-px bg-ink/15" />
      <span className="hidden text-xs font-semibold capitalize text-ink-soft sm:inline">{date}</span>
    </div>
  );
}

function FloatCard({
  icon: Icon,
  label,
  color,
  className,
  tilt,
  delay,
}: {
  icon: typeof Sigma;
  label: string;
  color: string;
  className: string;
  tilt: string;
  delay: string;
}) {
  return (
    <div
      className={`absolute flex items-center gap-3 rounded-2xl border border-ink/8 bg-paper px-4 py-3 shadow-[0_18px_40px_-18px_rgba(23,20,12,0.45)] ${className}`}
      style={{ animation: `floaty 7s ease-in-out ${delay} infinite`, "--tilt": tilt } as CSSProperties}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl text-white" style={{ backgroundColor: color }}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="font-display text-[11px] font-semibold uppercase tracking-wider">{label}</span>
    </div>
  );
}

function Marquee() {
  const row = [...subjects, ...subjects];
  return (
    <div className="relative -mx-6 rotate-[-1.4deg] overflow-hidden bg-ink py-3.5 shadow-[0_20px_50px_-20px_rgba(23,20,12,0.5)] sm:scale-[1.01]">
      <div className="flex w-max animate-marquee items-center gap-8 whitespace-nowrap">
        {row.map((s, i) => (
          <span key={`${s.id}-${i}`} className="flex items-center gap-8">
            <span className="font-display text-xs font-semibold uppercase tracking-[0.22em] text-cream">
              {s.name}
            </span>
            <svg width="10" height="10" viewBox="0 0 10 10" className="shrink-0 text-sun" fill="currentColor">
              <path d="M5 0L9.5 5L5 10L0.5 5L5 0Z" />
            </svg>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function Hero() {
  const cls = useClass();
  const greeting = getGreeting(new Date().getHours());

  return (
    <header className="relative overflow-hidden">
      {/* soft background blobs */}
      <div className="pointer-events-none absolute -top-40 right-[-10%] h-[34rem] w-[34rem] rounded-full bg-sun/25 blur-3xl" />
      <div className="pointer-events-none absolute -left-40 top-1/3 h-[28rem] w-[28rem] rounded-full bg-cobalt/15 blur-3xl" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: "radial-gradient(color-mix(in srgb, var(--color-ink) 14%, transparent) 1px, transparent 1px)",
          backgroundSize: "26px 26px",
          maskImage: "radial-gradient(ellipse 90% 70% at 30% 20%, black, transparent)",
        }}
      />

      <div className="relative mx-auto flex min-h-svh max-w-7xl flex-col px-6 pb-16 pt-6">
        {/* top bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-ink shadow-lg">
              <span className="absolute left-0 top-0 h-1/2 w-full bg-cobalt/90" />
              <span className="absolute bottom-0 left-0 h-1/2 w-full bg-sun/90" />
              <span className="relative font-display text-sm font-bold text-white mix-blend-difference">{cls}</span>
            </div>
            <div className="leading-tight">
              <p className="font-display text-xs font-bold uppercase tracking-widest">Мої предмети</p>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-soft">
                Великодолинська школа №2 · 2026/27
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ClassSelect />
            <LiveClock />
          </div>
        </div>

        {/* main */}
        <div className="grid flex-1 items-center gap-14 py-14 lg:grid-cols-[1.15fr_0.85fr] lg:py-8">
          <div>
            <div className="anim-fade-up flex flex-wrap items-center gap-2.5" style={{ animationDelay: "0.05s" }}>
              <span className="flex items-center gap-1.5 rounded-full border border-ink/10 bg-white/70 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-widest text-ink-soft backdrop-blur">
                <MapPin className="h-3.5 w-3.5 text-cobalt" />
                Великодолинська школа №2
              </span>
              <span className="rounded-full border border-ink/10 bg-white/70 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-widest text-ink-soft backdrop-blur">
                2026 / 27
              </span>
            </div>

            <h1 className="mt-7">
              <span
                className="anim-fade-up block font-accent text-4xl italic text-ink/80 sm:text-5xl"
                style={{ animationDelay: "0.12s" }}
              >
                {greeting} —<br className="sm:hidden" /> ось мої
              </span>
              <span
                className="anim-fade-up relative mt-1 inline-block font-display text-[17vw] font-extrabold uppercase leading-[0.95] tracking-tight sm:text-7xl lg:text-[5.6rem]"
                style={{ animationDelay: "0.2s" }}
              >
                предмети
                <svg
                  className="absolute -bottom-3 left-0 h-5 w-full text-sun sm:-bottom-4"
                  viewBox="0 0 300 22"
                  fill="none"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M4 15C60 7 120 5 168 9C216 13 262 15 296 8"
                    stroke="currentColor"
                    strokeWidth="7"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h1>

            <p className="anim-fade-up mt-9 max-w-xl text-base leading-relaxed text-ink-soft sm:text-lg" style={{ animationDelay: "0.3s" }}>
              Усі дисципліни {cls} класу в одному затишному місці — від математики,
              де <span className="font-bold text-ink underline decoration-sun decoration-4 underline-offset-4">алгебра й геометрія живуть в одному підручнику</span>,
              до астрономії та мистецтва.
            </p>

            <div className="anim-fade-up mt-9 flex flex-wrap items-center gap-4" style={{ animationDelay: "0.4s" }}>
              <a
                href="#predmety"
                className="group flex items-center gap-3 rounded-full bg-ink px-7 py-4 font-display text-xs font-bold uppercase tracking-widest text-cream shadow-[0_20px_40px_-15px_rgba(23,20,12,0.6)] transition-all duration-300 hover:-translate-y-1 hover:bg-cobalt hover:shadow-[0_24px_45px_-15px_rgba(39,67,217,0.6)]"
              >
                Дивитися всі {subjects.length}
                <ArrowDown className="h-4 w-4 transition-transform duration-300 group-hover:translate-y-0.5" />
              </a>
              <a
                href="#rozklad"
                className="group flex items-center gap-2.5 rounded-full border border-ink/15 bg-white/70 px-6 py-4 font-display text-xs font-bold uppercase tracking-widest text-ink backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-cobalt/40 hover:text-cobalt"
              >
                <CalendarDays className="h-4 w-4 text-cobalt" />
                Розклад на {todayShort()}
              </a>
              <div className="flex items-center gap-2 text-sm font-semibold text-ink-soft">
                <Sparkles className="h-4 w-4 text-sun" />
                {cls} клас · 14 предметів · завантаж свої підручники
              </div>
            </div>
          </div>

          {/* floating composition */}
          <div className="relative mx-auto hidden aspect-square w-full max-w-md sm:block lg:max-w-none">
            <div className="absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-sun to-amber-400 shadow-[0_40px_80px_-30px_rgba(242,183,5,0.7)]" />
            <div className="orbit-ring absolute left-1/2 top-1/2 h-[24rem] w-[24rem] -translate-x-1/2 -translate-y-1/2 animate-spin-slower" style={{ animationDuration: "40s" }} />
            <div className="orbit-ring absolute left-1/2 top-1/2 h-[30rem] w-[30rem] -translate-x-1/2 -translate-y-1/2 opacity-50" />

            <FloatCard icon={Sigma} label="Математика" color="#2743d9" tilt="-6deg" delay="0s" className="left-0 top-6" />
            <FloatCard icon={Atom} label="Фізика" color="#0ea5e9" tilt="5deg" delay="1.2s" className="right-0 top-24" />
            <FloatCard icon={Telescope} label="Астрономія" color="#17143a" tilt="-4deg" delay="2.1s" className="bottom-20 left-2" />
            <FloatCard icon={Palette} label="Мистецтво" color="#db2777" tilt="7deg" delay="0.6s" className="bottom-4 right-6" />
            <FloatCard icon={BookOpen} label="Література" color="#ea580c" tilt="-8deg" delay="1.7s" className="left-1/2 top-0 -translate-x-1/2" />
          </div>
        </div>

        <Marquee />
      </div>
    </header>
  );
}
