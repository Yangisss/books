/**
 * Розклад уроків.
 * subjectId має збігатися з id предмета у src/data/subjects.ts,
 * щоб до уроків автоматично підтягувалися твої підручники.
 */

export interface Bell {
  start: string; // "08:30"
  end: string; // "09:10"
}

/** Дзвінки за розкладом школи (дистанційне навчання): перерви 15 хв, після 7-го уроку — 5 хв */
export const bells: Bell[] = [
  { start: "08:30", end: "09:10" },
  { start: "09:25", end: "10:05" },
  { start: "10:20", end: "11:00" },
  { start: "11:15", end: "11:55" },
  { start: "12:10", end: "12:50" },
  { start: "13:05", end: "13:45" },
  { start: "14:00", end: "14:40" },
  { start: "14:45", end: "15:25" },
];

export interface Lesson {
  subjectId: string;
}

export interface DaySchedule {
  id: "mon" | "tue" | "wed" | "thu" | "fri";
  name: string; // Понеділок
  short: string; // Пн
  lessons: Lesson[];
}

export const SCHOOL = {
  place: "смт Великодолинське",
  name: "Великодолинська школа №2",
  year: "2026 / 27",
};

/** 5 навчальних днів: індекс 0 = Понеділок … 4 = П'ятниця */
const weekA: DaySchedule[] = [
  {
    id: "mon",
    name: "Понеділок",
    short: "Пн",
    lessons: [
      { subjectId: "math" },
      { subjectId: "ukr-lang" },
      { subjectId: "english" },
      { subjectId: "physics" },
      { subjectId: "history-ua" },
      { subjectId: "informatics" },
      { subjectId: "astronomy" },
      { subjectId: "pe" },
    ],
  },
  {
    id: "tue",
    name: "Вівторок",
    short: "Вт",
    lessons: [
      { subjectId: "ukr-lit" },
      { subjectId: "math" },
      { subjectId: "chemistry" },
      { subjectId: "biology" },
      { subjectId: "world-history" },
      { subjectId: "english" },
    ],
  },
  {
    id: "wed",
    name: "Середа",
    short: "Ср",
    lessons: [
      { subjectId: "math" },
      { subjectId: "physics" },
      { subjectId: "informatics" },
      { subjectId: "ukr-lang" },
      { subjectId: "world-lit" },
      { subjectId: "art" },
      { subjectId: "pe" },
    ],
  },
  {
    id: "thu",
    name: "Четвер",
    short: "Чт",
    lessons: [
      { subjectId: "math" },
      { subjectId: "chemistry" },
      { subjectId: "biology" },
      { subjectId: "history-ua" },
      { subjectId: "english" },
      { subjectId: "physics" },
    ],
  },
  {
    id: "fri",
    name: "П'ятниця",
    short: "Пт",
    lessons: [
      { subjectId: "ukr-lit" },
      { subjectId: "math" },
      { subjectId: "world-history" },
      { subjectId: "world-lit" },
      { subjectId: "pe" },
    ],
  },
];

const weekB: DaySchedule[] = [
  {
    id: "mon",
    name: "Понеділок",
    short: "Пн",
    lessons: [
      { subjectId: "math" },
      { subjectId: "ukr-lang" },
      { subjectId: "english" },
      { subjectId: "history-ua" },
      { subjectId: "biology" },
      { subjectId: "pe" },
    ],
  },
  {
    id: "tue",
    name: "Вівторок",
    short: "Вт",
    lessons: [
      { subjectId: "physics" },
      { subjectId: "math" },
      { subjectId: "ukr-lit" },
      { subjectId: "chemistry" },
      { subjectId: "informatics" },
      { subjectId: "world-lit" },
      { subjectId: "art" },
      { subjectId: "world-history" },
    ],
  },
  {
    id: "wed",
    name: "Середа",
    short: "Ср",
    lessons: [
      { subjectId: "math" },
      { subjectId: "ukr-lang" },
      { subjectId: "physics" },
      { subjectId: "biology" },
      { subjectId: "english" },
      { subjectId: "astronomy" },
    ],
  },
  {
    id: "thu",
    name: "Четвер",
    short: "Чт",
    lessons: [
      { subjectId: "math" },
      { subjectId: "chemistry" },
      { subjectId: "history-ua" },
      { subjectId: "ukr-lit" },
      { subjectId: "informatics" },
      { subjectId: "physics" },
      { subjectId: "pe" },
    ],
  },
  {
    id: "fri",
    name: "П'ятниця",
    short: "Пт",
    lessons: [
      { subjectId: "math" },
      { subjectId: "world-lit" },
      { subjectId: "world-history" },
      { subjectId: "informatics" },
      { subjectId: "art" },
      { subjectId: "ukr-lang" },
      { subjectId: "pe" },
    ],
  },
];

export const toMin = (t: string): number => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

/** 0 = Понеділок … 4 = П'ятниця; null — вихідні (субота/неділя) */
export const dayIndexOf = (d: Date): number | null => {
  const g = d.getDay();
  return g >= 1 && g <= 5 ? g - 1 : null;
};

export const fmtMin = (total: number): string => {
  const m = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

/** Розклад по класах — ключі збігаються з id класу (src/lib/cls.ts) */
export const scheduleByClass: Record<string, { bells: Bell[]; week: DaySchedule[] }> = {
  "11a": { bells, week: weekA },
  "11b": { bells, week: weekB },
};
