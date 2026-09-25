import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowUpRight, BookMarked, ListFilter, MousePointerClick, Quote } from "lucide-react";
import { categories, categoryLabel, subjects, type CategoryId, type Subject } from "../data/subjects";
import { getCounts, plural, probeShared } from "../lib/storage";
import { useClass } from "../lib/cls";
import { useInView } from "../hooks/useInView";
import SubjectModal from "./SubjectModal";

type Filter = CategoryId | "all";

function Stars() {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
      {[
        [22, 30, 1.6], [68, 14, 1.1], [120, 42, 1.9], [170, 18, 1.2], [215, 52, 1.5],
        [258, 22, 1.0], [46, 66, 1.2], [196, 84, 1.6], [90, 90, 1.0], [140, 70, 1.3],
      ].map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="white" opacity={0.55} />
      ))}
    </svg>
  );
}

function SubjectCard({
  subject,
  index,
  order,
  count,
  onOpen,
}: {
  subject: Subject;
  index: number;
  order: number;
  count: number;
  onOpen: () => void;
}) {
  const Icon = subject.icon;
  const v = subject.variant;
  const isDark = v === "cobalt" || v === "night";
  const isSun = v === "sun";

  const base =
    "group relative flex min-h-[15rem] cursor-pointer flex-col justify-between overflow-hidden rounded-[1.75rem] p-6 text-left transition-all duration-500 hover:-translate-y-1.5 sm:min-h-[16rem]";
  const skin = isDark
    ? v === "cobalt"
      ? "bg-gradient-to-br from-cobalt via-[#2336b8] to-[#1a2a8f] text-cream shadow-[0_30px_60px_-25px_rgba(39,67,217,0.55)]"
      : "bg-gradient-to-br from-night via-[#1d1a4d] to-[#100e2e] text-cream shadow-[0_30px_60px_-25px_rgba(23,20,58,0.7)]"
    : isSun
      ? "bg-gradient-to-br from-sun to-[#e3a203] text-ink shadow-[0_30px_60px_-25px_rgba(242,183,5,0.6)]"
      : "border border-ink/8 bg-paper text-ink shadow-[0_18px_45px_-28px_rgba(23,20,12,0.35)] hover:shadow-[0_34px_70px_-30px_rgba(23,20,12,0.45)]";

  return (
    <article
      onClick={onOpen}
      className={`${base} ${skin} ${subject.span} anim-fade-up`}
      style={{ animationDelay: `${order * 60}ms` }}
    >
      {/* shine sweep */}
      <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />
      {v === "night" && <Stars />}

      {/* ghost number */}
      <span
        className={`pointer-events-none absolute -bottom-4 -right-2 font-display text-7xl font-extrabold leading-none ${
          isDark ? "text-white/10" : isSun ? "text-ink/10" : ""
        }`}
        style={!isDark && !isSun ? { color: `${subject.accent}1f` } : undefined}
      >
        {String(index + 1).padStart(2, "0")}
      </span>

      <div className="relative flex items-start justify-between gap-3">
        <span
          className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110 ${
            isDark ? "bg-white/15 text-white backdrop-blur-sm" : isSun ? "bg-ink text-sun" : "text-white"
          }`}
          style={!isDark && !isSun ? { backgroundColor: subject.accent } : undefined}
        >
          <Icon className="h-6 w-6" />
        </span>
        <ArrowUpRight
          className={`h-5 w-5 -translate-x-1 translate-y-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100 ${
            isDark ? "text-white/80" : "text-ink/60"
          }`}
        />
      </div>

      <div className="relative mt-6">
        <p
          className={`font-display text-[10px] font-semibold uppercase tracking-[0.2em] ${
            isDark ? "text-white/60" : isSun ? "text-ink/60" : "text-ink-soft"
          }`}
        >
          {categoryLabel(subject.category)}
        </p>
        <h3 className="mt-2 font-display text-lg font-bold leading-snug sm:text-xl">{subject.name}</h3>
        <p className={`mt-2 text-sm leading-relaxed ${isDark ? "text-white/70" : isSun ? "text-ink/70" : "text-ink-soft"}`}>
          {subject.desc}
        </p>

        {count > 0 && (
          <span
            className={`mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider ${
              isDark ? "bg-white/15 text-white" : isSun ? "bg-ink/10 text-ink" : "border text-ink"
            }`}
            style={
              !isDark && !isSun
                ? { borderColor: `${subject.accent}55`, color: subject.accent, backgroundColor: `${subject.accent}12` }
                : undefined
            }
          >
            <BookMarked className="h-3.5 w-3.5" />
            {count} {plural(count, "підручник", "підручники", "підручників")}
          </span>
        )}
      </div>
    </article>
  );
}

export default function SubjectsSection() {
  const cls = useClass();
  const [filter, setFilter] = useState<Filter>("all");
  const [openSubject, setOpenSubject] = useState<Subject | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const { ref: headRef, inView: headIn } = useInView<HTMLDivElement>();

  const refreshCounts = useCallback(async () => {
    try {
      setCounts(await getCounts(cls));
    } catch {
      setCounts({});
    }
  }, [cls]);

  useEffect(() => {
    probeShared(cls);
    refreshCounts();
  }, [cls, refreshCounts]);

  const visible = useMemo(
    () => subjects.filter((s) => filter === "all" || s.category === filter),
    [filter]
  );

  const chip = (id: Filter, label: string, count: number) => (
    <button
      key={id}
      onClick={() => setFilter(id)}
      className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
        filter === id
          ? "bg-ink text-cream shadow-[0_14px_30px_-12px_rgba(23,20,12,0.5)]"
          : "border border-ink/10 bg-white/70 text-ink-soft backdrop-blur hover:-translate-y-0.5 hover:border-ink/25 hover:text-ink"
      }`}
    >
      {label}
      <span
        className={`rounded-full px-1.5 py-0.5 text-[10px] leading-none ${
          filter === id ? "bg-sun text-ink" : "bg-ink/8 text-ink-soft"
        }`}
      >
        {count}
      </span>
    </button>
  );

  return (
    <section id="predmety" className="relative mx-auto max-w-7xl px-6 pb-28 pt-20">
      <div
        ref={headRef}
        className={`reveal ${headIn ? "is-visible" : ""} flex flex-wrap items-end justify-between gap-6`}
      >
        <div>
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.25em] text-cobalt">
            <ListFilter className="h-4 w-4" />
            Моя програма
          </p>
          <h2 className="mt-3 font-display text-4xl font-extrabold uppercase tracking-tight sm:text-5xl">
            Усі <span className="font-accent normal-case italic tracking-normal text-ink/70">предмети</span>
          </h2>
        </div>
        <p className="flex max-w-xs items-start gap-2.5 text-sm leading-relaxed text-ink-soft">
          <MousePointerClick className="mt-0.5 h-5 w-5 shrink-0 text-cobalt" />
          Натисни на предмет, щоб завантажити свої підручники й відкривати їх у вкладках.
        </p>
      </div>

      <div className={`reveal ${headIn ? "is-visible" : ""} mt-8 flex flex-wrap gap-2.5`} style={{ transitionDelay: "120ms" }}>
        {chip("all", "Усі", subjects.length)}
        {categories.map((c) => chip(c.id, c.label, subjects.filter((s) => s.category === c.id).length))}
      </div>

      <div key={filter} className="mt-10 grid grid-flow-dense grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6 lg:gap-5">
        {visible.map((s, i) => (
          <SubjectCard
            key={`${filter}-${s.id}`}
            subject={s}
            index={subjects.indexOf(s)}
            order={i}
            count={counts[s.id] ?? 0}
            onOpen={() => setOpenSubject(s)}
          />
        ))}

        {/* quote tile */}
        <aside className="anim-fade-up relative flex min-h-[15rem] flex-col justify-between overflow-hidden rounded-[1.75rem] bg-ink p-6 text-cream shadow-[0_30px_60px_-25px_rgba(23,20,12,0.6)] sm:min-h-[16rem] lg:col-span-2">
          <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-sun/20 blur-2xl" />
          <Quote className="h-7 w-7 text-sun" fill="currentColor" />
          <div>
            <p className="font-accent text-lg italic leading-snug text-cream/95">
              «Освіта — найпотужніша зброя, якою можна змінити світ»
            </p>
            <p className="mt-3 font-display text-[10px] font-semibold uppercase tracking-[0.25em] text-cream/50">
              Нельсон Мандела
            </p>
          </div>
        </aside>
      </div>

      {openSubject && (
        <SubjectModal
          subject={openSubject}
          onClose={() => setOpenSubject(null)}
          onChanged={refreshCounts}
        />
      )}
    </section>
  );
}
