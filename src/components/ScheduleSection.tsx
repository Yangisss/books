import { useCallback, useEffect, useState } from "react";
import {
  ArrowUpRight,
  BookMarked,
  CalendarDays,
  Clock,
  Dumbbell,
  MousePointerClick,
  Sigma,
} from "lucide-react";
import { categoryLabel, subjects, type Subject } from "../data/subjects";
import { dayIndexOf, scheduleByClass, toMin, type Bell } from "../data/schedule";
import { getCounts, plural, probeShared } from "../lib/storage";
import { useClassInfo } from "../lib/cls";
import { useInView } from "../hooks/useInView";
import SubjectModal from "./SubjectModal";
import { cn } from "../utils/cn";

const subjectById = new Map(subjects.map((s) => [s.id, s]));

type LessonStatus = "done" | "now" | "next" | "later";

const weekendName = (d: Date) => (d.getDay() === 6 ? "Субота" : "Неділя");

export default function ScheduleSection() {
  const { id: cls, label: clsLabel } = useClassInfo();
  const sc = scheduleByClass[cls];
  const fallback = scheduleByClass["11a"];
  const bells = sc?.bells ?? fallback.bells;
  const week = sc?.week ?? fallback.week;

  const [now, setNow] = useState(() => new Date());
  const [selected, setSelected] = useState<number>(() => dayIndexOf(new Date()) ?? 0);
  const [tab, setTab] = useState<"week" | "bell">("week");
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [openSubject, setOpenSubject] = useState<Subject | null>(null);
  const { ref: headRef, inView: headIn } = useInView<HTMLDivElement>();

  const todayIdx = dayIndexOf(now);
  const isToday = selected === todayIdx;
  const day = week[selected];
  const nowMin = now.getHours() * 60 + now.getMinutes();

  // тикаем каждые 20 секунд, чтобы статусы уроков обновлялись сами
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 20000);
    return () => clearInterval(t);
  }, []);

  const refreshCounts = useCallback(async () => {
    await probeShared(cls);
    try {
      setCounts(await getCounts(cls));
    } catch {
      setCounts({});
    }
  }, [cls]);

  useEffect(() => {
    refreshCounts();
  }, [refreshCounts]);

  const slotOf = (i: number) => day.lessons[i].n ?? i + 1;
  const bellOf = (i: number) => bells[slotOf(i) - 1];

  const ongoingIdx = isToday
    ? day.lessons.findIndex((_, i) => nowMin >= toMin(bellOf(i).start) && nowMin < toMin(bellOf(i).end))
    : -1;
  const nextIdx = isToday ? day.lessons.findIndex((_, i) => nowMin < toMin(bellOf(i).start)) : -1;

  const statusOf = (i: number): LessonStatus => {
    if (!isToday) return "later";
    if (i === ongoingIdx) return "now";
    if (i === nextIdx) return "next";
    return nowMin >= toMin(bellOf(i).end) ? "done" : "later";
  };

  // сколько учебников загружено к урокам выбранного дня
  const daySubjectIds = [...new Set(day.lessons.map((l) => l.subjectId))];
  const booksInDay = daySubjectIds.reduce((acc, id) => acc + (counts[id] ?? 0), 0);

  /* ------- заголовок-сводка (тот же визуальный язык, что и плитка-цитата) ------- */
  let summaryTitle: string;
  let summarySub: string;
  let summaryAction: { label: string; kind: "open"; subjectId: string } | { label: string; kind: "day"; day: number } | null = null;

  if (todayIdx === null) {
    summaryTitle = `Сьогодні ${weekendName(now).toLowerCase()} — вихідний`;
    summarySub = `Наступні уроки — ${week[0].name.toLowerCase()} (${week[0].lessons.length} уроків)`;
    summaryAction = { label: `Розклад на ${week[0].short}`, kind: "day", day: 0 };
  } else if (isToday && ongoingIdx >= 0) {
    const l = day.lessons[ongoingIdx];
    const sub = subjectById.get(l.subjectId);
    summaryTitle = `Триває ${slotOf(ongoingIdx)}-й урок — ${l.label ?? sub?.name ?? ""}`;
    summarySub = `до ${bellOf(ongoingIdx).end} · залишилось ${toMin(bellOf(ongoingIdx).end) - nowMin} хв`;
    if (!sub?.noBooks) summaryAction = { label: "Книги до уроку", kind: "open", subjectId: l.subjectId };
  } else if (isToday && nextIdx >= 0) {
    const first = nextIdx === 0;
    const l = day.lessons[nextIdx];
    const sub = subjectById.get(l.subjectId);
    summaryTitle = first
      ? `Перший урок о ${bells[0].start} — ${l.label ?? sub?.name ?? ""}`
      : `Наступний урок — ${l.label ?? sub?.name ?? ""}`;
    summarySub = first
      ? `До дзвінка ${toMin(bells[0].start) - nowMin} хв · у розкладі ${day.lessons.length} уроків`
      : `${slotOf(nextIdx)}-й урок · ${bellOf(nextIdx).start} · через ${toMin(bellOf(nextIdx).start) - nowMin} хв`;
    if (!sub?.noBooks)
      summaryAction = { label: first ? "Книги до першого уроку" : "Готуємо підручник", kind: "open", subjectId: l.subjectId };
  } else if (isToday) {
    summaryTitle = "Уроки на сьогодні завершено";
    summarySub =
      booksInDay > 0
        ? `Твій день тримали ${booksInDay} ${plural(booksInDay, "підручник", "підручники", "підручників")} — гарного вечора!`
        : "Додай підручники — і вони завжди будуть під рукою.";
  } else {
    summaryTitle = `Перегляд: ${day.name}`;
    summarySub = `Сьогодні — ${week[todayIdx].name.toLowerCase()}. Повернись до актуального дня.`;
    summaryAction = { label: "Показати сьогодні", kind: "day", day: todayIdx };
  }

  const handleAction = () => {
    if (!summaryAction) return;
    if (summaryAction.kind === "open") {
      const s = subjectById.get(summaryAction.subjectId);
      if (s) setOpenSubject(s);
    } else {
      setSelected(summaryAction.day);
    }
  };

  const dayChip = (i: number) => {
    const d = week[i];
    const on = selected === i;
    return (
      <button
        key={d.id}
        onClick={() => setSelected(i)}
        className={cn(
          "flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-300",
          on
            ? "bg-ink text-cream shadow-[0_14px_30px_-12px_rgba(23,20,12,0.5)]"
            : "border border-ink/10 bg-white/70 text-ink-soft backdrop-blur hover:-translate-y-0.5 hover:border-ink/25 hover:text-ink"
        )}
      >
        {i === todayIdx && <span className="h-1.5 w-1.5 rounded-full bg-sun" aria-label="сьогодні" />}
        {d.name}
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[10px] leading-none",
            on ? "bg-sun text-ink" : "bg-ink/10 text-ink-soft"
          )}
        >
          {d.lessons.length}
        </span>
      </button>
    );
  };

  const head = (accent: string) => (
    <div
      ref={headRef}
      className={cn("reveal", headIn && "is-visible", "flex flex-wrap items-end justify-between gap-6")}
    >
      <div>
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.25em] text-cobalt">
          <CalendarDays className="h-4 w-4" />
          {clsLabel} клас · автоматично за днем тижня
        </p>
        <h2 className="mt-3 font-display text-4xl font-extrabold uppercase tracking-tight sm:text-5xl">
          Розклад <span className="font-accent normal-case italic tracking-normal text-ink/70">{accent}</span>
        </h2>
      </div>
      <p className="flex max-w-xs items-start gap-2.5 text-sm leading-relaxed text-ink-soft">
        <MousePointerClick className="mt-0.5 h-5 w-5 shrink-0 text-cobalt" />
        Сайт сам визначає день і показує уроки {clsLabel} класу. Дзвінки 08:30–15:25 · 8 уроків · перерви 15 хв (після 7-го — 5 хв).
      </p>
    </div>
  );

  /* ------- порожній стан: для цього класу розкладу ще немає ------- */
  if (!sc) {
    return (
      <section id="rozklad" className="relative mx-auto max-w-7xl px-6 pb-10 pt-20">
        {head(`· ${clsLabel} клас`)}
        <div className="anim-fade-up relative mt-8 flex flex-col justify-between gap-5 overflow-hidden rounded-[1.75rem] bg-ink p-6 text-cream shadow-[0_30px_60px_-25px_rgba(23,20,12,0.6)]">
          <div className="pointer-events-none absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-sun/20 blur-2xl" />
          <div className="relative flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-sun backdrop-blur-sm">
              <CalendarDays className="h-6 w-6" />
            </span>
            <div>
              <p className="font-display text-[10px] font-semibold uppercase tracking-[0.22em] text-cream/50">
                Розклад · {clsLabel} клас
              </p>
              <p className="mt-1.5 font-display text-lg font-bold leading-snug">Для {clsLabel} класу розклад ще не додано</p>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-cream/60">
                Щойно розклад з'явиться у файлі{" "}
                <span className="font-bold text-cream/80">src/data/schedule.ts</span> (об'єкт scheduleByClass["{clsLabel}"]) —
                сайт сам почне показувати уроки та підручники за днем тижня. Полиці предметів нижче працюють уже зараз.
              </p>
            </div>
          </div>
        </div>
        {openSubject && <SubjectModal subject={openSubject} onClose={() => setOpenSubject(null)} onChanged={refreshCounts} />}
      </section>
    );
  }

  return (
    <section id="rozklad" className="relative mx-auto max-w-7xl px-6 pb-10 pt-20">
      {head(tab === "bell" ? "дзвінки та перерви" : isToday ? "на сьогодні" : day.name.toLowerCase())}

      <div
        className={cn(
          "reveal",
          headIn && "is-visible",
          "mt-8 inline-flex rounded-full border border-ink/10 bg-white/70 p-1 backdrop-blur"
        )}
      >
        {tabBtn("week", "Уроки дня", CalendarDays)}
        {tabBtn("bell", "Дзвінок", Clock)}
      </div>

      {tab === "bell" ? (
        <BellBoard now={now} clsLabel={clsLabel} bells={bells} />
      ) : (
        <>
      <div
        className={cn(
          "reveal",
          headIn && "is-visible",
          "no-scrollbar mt-5 flex gap-2.5 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible"
        )}
        style={{ transitionDelay: "120ms" }}
      >
        {week.map((_, i) => dayChip(i))}
      </div>

      {/* смужка: що зараз / що далі + книжки */}
      <div
        className="anim-fade-up relative mt-8 flex flex-col justify-between gap-5 overflow-hidden rounded-[1.75rem] bg-ink p-6 text-cream shadow-[0_30px_60px_-25px_rgba(23,20,12,0.6)] sm:flex-row sm:items-center"
        style={{ animationDelay: "160ms" }}
      >
        <div className="pointer-events-none absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-sun/20 blur-2xl" />
        <div className="relative flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-sun backdrop-blur-sm">
            <CalendarDays className="h-6 w-6" />
          </span>
          <div>
            <p className="font-display text-[10px] font-semibold uppercase tracking-[0.22em] text-cream/50">
              {isToday ? "Сьогодні" : day.name} · {nowMin < 12 * 60 ? "ранок" : nowMin < 17 * 60 ? "день" : "вечір"}
            </p>
            <p className="mt-1.5 font-display text-lg font-bold leading-snug">{summaryTitle}</p>
            <p className="mt-1 text-sm leading-relaxed text-cream/60">{summarySub}</p>
          </div>
        </div>
        <div className="relative flex shrink-0 items-center gap-3">
          <span className="hidden items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-cream/80 backdrop-blur-sm md:inline-flex">
            <BookMarked className="h-3.5 w-3.5 text-sun" />
            {booksInDay > 0
              ? `${booksInDay} ${plural(booksInDay, "підручник", "підручники", "підручників")} на день`
              : "книг ще немає"}
          </span>
          {summaryAction && (
            <button
              onClick={handleAction}
              className="rounded-full bg-sun px-5 py-2.5 font-display text-[11px] font-bold uppercase tracking-widest text-ink transition-all duration-300 hover:-translate-y-0.5 hover:bg-cream"
            >
              {summaryAction.label}
            </button>
          )}
        </div>
      </div>

      {/* уроки дня */}
      <div key={`${selected}-${cls}`} className="mt-6 space-y-3">
        {day.lessons.map((l, i) => {
          const sub = subjectById.get(l.subjectId);
          if (!sub) return null;
          const status = statusOf(i);
          const bell = bellOf(i);
          const Icon = sub.icon;
          const count = counts[sub.id] ?? 0;
          const clickable = !sub.noBooks;

          return (
            <article
              key={i}
              onClick={() => {
                if (clickable) setOpenSubject(sub);
              }}
              className={cn(
                "anim-fade-up group relative flex flex-col gap-3 overflow-hidden rounded-3xl border p-4 pl-5 transition-all duration-300 sm:flex-row sm:items-center sm:gap-4",
                clickable && "cursor-pointer",
                status === "now"
                  ? "border-sun/70 bg-sun/10 shadow-[0_18px_45px_-22px_rgba(242,183,5,0.75)]"
                  : status === "done"
                    ? "border-ink/8 bg-paper opacity-55"
                    : "border-ink/10 bg-paper hover:-translate-y-0.5 hover:border-ink/25 hover:shadow-[0_18px_40px_-24px_rgba(23,20,12,0.4)]"
              )}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <span
                className="absolute inset-y-0 left-0 w-1.5"
                style={{ backgroundColor: status === "now" ? "#f2b705" : sub.accent }}
              />

              {/* час */}
              <div className="flex items-center gap-3 sm:w-[8.5rem] sm:shrink-0 sm:flex-col sm:items-start sm:gap-0.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink/5 font-display text-[11px] font-bold tabular-nums text-ink-soft">
                  {slotOf(i)}
                </span>
                <span className="font-display text-sm font-bold tabular-nums">{bell.start}</span>
                <span className="hidden text-[11px] font-semibold tabular-nums text-ink-soft sm:inline">до {bell.end}</span>
              </div>

              <span className="hidden h-10 w-px bg-ink/10 sm:block" />

              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-md transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-105"
                style={{ backgroundColor: sub.accent }}
              >
                <Icon className="h-5 w-5" />
              </span>

              <div className="min-w-0 flex-1">
                <p className="font-display text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-soft">
                  {categoryLabel(sub.category)}
                  {l.label ? ` · поличка «${sub.name}»` : ""}
                  <span className="sm:hidden">
                    {" "}
                    · {bell.start}–{bell.end}
                  </span>
                </p>
                <h3 className="mt-1 font-display text-base font-bold leading-snug sm:text-lg">{l.label ?? sub.name}</h3>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {status === "now" && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-sun px-2.5 py-1 font-display text-[9px] font-bold uppercase tracking-widest text-ink">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ink/60" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-ink" />
                    </span>
                    зараз · {toMin(bell.end) - nowMin} хв
                  </span>
                )}
                {status === "next" && (
                  <span className="rounded-full border border-cobalt/40 bg-cobalt/10 px-2.5 py-1 font-display text-[9px] font-bold uppercase tracking-widest text-cobalt">
                    наступний · через {toMin(bell.start) - nowMin} хв
                  </span>
                )}
                {status === "done" && (
                  <span className="font-display text-[9px] font-bold uppercase tracking-widest text-ink-soft/60">завершено</span>
                )}
                {sub.noBooks ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 bg-ink/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-soft/70">
                    <Dumbbell className="h-3.5 w-3.5" />
                    без підручника
                  </span>
                ) : count > 0 ? (
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider"
                    style={{ borderColor: `${sub.accent}55`, color: sub.accent, backgroundColor: `${sub.accent}12` }}
                  >
                    <BookMarked className="h-3.5 w-3.5" />
                    {count} {plural(count, "підручник", "підручники", "підручників")}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-ink/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-soft/70">
                    <BookMarked className="h-3.5 w-3.5" />
                    {`поличка ${clsLabel}`}
                  </span>
                )}
                {clickable && <ArrowUpRight className="hidden h-[18px] w-[18px] text-ink/40 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 sm:block" />}
              </div>
            </article>
          );
        })}
      </div>

        </>
      )}

      {openSubject && <SubjectModal subject={openSubject} onClose={() => setOpenSubject(null)} onChanged={refreshCounts} />}
    </section>
  );

  function tabBtn(id: "week" | "bell", label: string, Icon: typeof CalendarDays) {
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

/* -------- вкладка «Дзвінок»: 8 уроків і перерви, з підвіткою поточного моменту -------- */
function BellBoard({ now, clsLabel, bells }: { now: Date; clsLabel: string; bells: Bell[] }) {
  const weekday = dayIndexOf(now) !== null;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const liveIdx = weekday ? bells.findIndex((b) => nowMin >= toMin(b.start) && nowMin < toMin(b.end)) : -1;
  const brkIdx = weekday
    ? bells.findIndex((b, i) => i < bells.length - 1 && nowMin >= toMin(b.end) && nowMin < toMin(bells[i + 1].start))
    : -1;

  let t: string, subTxt: string;
  if (!weekday) {
    t = `Сьогодні ${now.getDay() === 6 ? "субота" : "неділя"} — вихідний`;
    subTxt = "Дзвінків немає, гарного відпочинку";
  } else if (liveIdx >= 0) {
    t = `Триває ${liveIdx + 1}-й урок`;
    subTxt = `до ${bells[liveIdx].end} · залишилось ${toMin(bells[liveIdx].end) - nowMin} хв`;
  } else if (brkIdx >= 0) {
    const gap = toMin(bells[brkIdx + 1].start) - toMin(bells[brkIdx].end);
    t = `Перерва ${gap} хв`;
    subTxt = `${brkIdx + 1}-й урок завершився · ${brkIdx + 2}-й о ${bells[brkIdx + 1].start} — через ${toMin(bells[brkIdx + 1].start) - nowMin} хв`;
  } else if (nowMin < toMin(bells[0].start)) {
    t = "Ще до першого дзвінка";
    subTxt = `перший урок о ${bells[0].start} · через ${toMin(bells[0].start) - nowMin} хв`;
  } else {
    t = "Уроки на сьогодні завершено";
    subTxt = `останній дзвінок — ${bells[bells.length - 1].end}`;
  }

  return (
    <div className="anim-fade-up space-y-6">
      <div
        className="relative flex flex-col justify-between gap-5 overflow-hidden rounded-[1.75rem] bg-ink p-6 text-cream shadow-[0_30px_60px_-25px_rgba(23,20,12,0.6)] sm:flex-row sm:items-center"
        style={{ animationDelay: "60ms" }}
      >
        <div className="pointer-events-none absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-sun/20 blur-2xl" />
        <div className="relative flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-sun backdrop-blur-sm">
            <Clock className="h-6 w-6" />
          </span>
          <div>
            <p className="font-display text-[10px] font-semibold uppercase tracking-[0.22em] text-cream/50">
              Дзвінки · {clsLabel} клас · 2026 / 27
            </p>
            <p className="mt-1.5 font-display text-lg font-bold leading-snug">{t}</p>
            <p className="mt-1 text-sm leading-relaxed text-cream/60">{subTxt}</p>
          </div>
        </div>
        <span className="relative hidden items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-cream/80 backdrop-blur-sm md:inline-flex">
          <Sigma className="h-3.5 w-3.5 text-sun" />8 уроків · перерви 15 хв · після 7-го — 5 хв
        </span>
      </div>

      <div className="relative overflow-hidden rounded-[1.75rem] border border-ink/10 bg-cream/60 p-4 backdrop-blur sm:p-6">
        <div className="space-y-1.5">
          {bells.map((b, i) => {
            const st = toMin(b.start), en = toMin(b.end);
            const status = !weekday ? "later" : nowMin >= st && nowMin < en ? "now" : nowMin >= en ? "done" : "later";
            const onBreak = i === brkIdx;
            const gap = i < bells.length - 1 ? toMin(bells[i + 1].start) - en : 0;
            return (
              <div key={b.start}>
                <div
                  className={cn(
                    "flex items-center gap-3 rounded-3xl border p-3.5 transition-all duration-300 sm:gap-4 sm:p-4",
                    status === "now"
                      ? "border-sun/70 bg-sun/10 shadow-[0_18px_45px_-22px_rgba(242,183,5,0.75)]"
                      : status === "done"
                        ? "border-ink/10 bg-paper opacity-55"
                        : "border-ink/10 bg-paper"
                  )}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink/5 font-display text-xs font-bold tabular-nums text-ink-soft">
                    {i + 1}
                  </span>
                  <p className="flex flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5 font-display text-base font-bold tabular-nums sm:text-lg">
                    <span>{b.start}</span>
                    <span className="text-ink-soft/50">—</span>
                    <span>{b.end}</span>
                    <span className="ml-1 rounded-full border border-ink/10 bg-ink/5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-ink-soft">
                      40 хв
                    </span>
                  </p>
                  {status === "now" ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-sun px-2.5 py-1 font-display text-[9px] font-bold uppercase tracking-widest text-ink">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ink/60" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-ink" />
                      </span>
                      триває · {en - nowMin} хв
                    </span>
                  ) : status === "done" ? (
                    <span className="font-display text-[9px] font-bold uppercase tracking-widest text-ink-soft/60">дзвінок був</span>
                  ) : null}
                </div>
                {i < bells.length - 1 && (
                  <div className="flex items-center gap-3 py-0.5 sm:pl-[3.4rem]">
                    <span className="h-px flex-1 border-t border-dashed border-ink/20" />
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-display text-[9px] font-bold uppercase tracking-widest",
                        onBreak ? "border border-cobalt/40 bg-cobalt/10 text-cobalt" : "text-ink-soft/70"
                      )}
                    >
                      перерва · {gap} хв{onBreak ? ` · ${toMin(bells[i + 1].start) - nowMin} хв` : ""}
                    </span>
                    <span className="h-px flex-1 border-t border-dashed border-ink/20" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-ink-soft/60">
          {clsLabel} клас · Великодолинська школа №2 · після 8-го урока — до побачення завтра
        </p>
      </div>
    </div>
  );
}
