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
  /** показувана назва уроку (напр. «Алгебра»), якщо вона відрізняється від назви полички */
  label?: string;
  /** номер уроку за дзвінком, якщо є пропуски (8-й урок без 7-го) */
  n?: number;
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
      { subjectId: "physics" },
      { subjectId: "chemistry" },
      { subjectId: "ukr-lang" },
      { subjectId: "ukr-lit" },
      { subjectId: "history-ua" },
      { subjectId: "world-history" },
      { subjectId: "informatics", n: 8 },
    ],
  },
  {
    id: "tue",
    name: "Вівторок",
    short: "Вт",
    lessons: [
      { subjectId: "english" },
      { subjectId: "ukr-lit" },
      { subjectId: "history-ua" },
      { subjectId: "biology" },
      { subjectId: "math", label: "Алгебра" },
      { subjectId: "physics" },
      { subjectId: "informatics", n: 8 },
    ],
  },
  {
    id: "wed",
    name: "Середа",
    short: "Ср",
    lessons: [
      { subjectId: "math", label: "Геометрія" },
      { subjectId: "informatics" },
      { subjectId: "pe" },
      { subjectId: "world-lit" },
      { subjectId: "math", label: "Алгебра" },
      { subjectId: "physics" },
    ],
  },
  {
    id: "thu",
    name: "Четвер",
    short: "Чт",
    lessons: [
      { subjectId: "english" },
      { subjectId: "math", label: "Геометрія" },
      { subjectId: "biology" },
      { subjectId: "ukr-lit" },
      { subjectId: "informatics" },
      { subjectId: "art" },
      { subjectId: "astronomy" },
    ],
  },
  {
    id: "fri",
    name: "П'ятниця",
    short: "Пт",
    lessons: [
      { subjectId: "ukr-lang" },
      { subjectId: "math", label: "Алгебра" },
      { subjectId: "pe" },
      { subjectId: "physics" },
      { subjectId: "ukr-lit" },
    ],
  },
];

const weekB: DaySchedule[] = [
  {
    id: "mon",
    name: "Понеділок",
    short: "Пн",
    lessons: [
      { subjectId: "ukr-lang" },
      { subjectId: "history-ua" },
      { subjectId: "world-history" },
      { subjectId: "pe" },
      { subjectId: "physics" },
      { subjectId: "math", label: "Алгебра" },
      { subjectId: "math", label: "Геометрія" },
    ],
  },
  {
    id: "tue",
    name: "Вівторок",
    short: "Вт",
    lessons: [
      { subjectId: "math", label: "Алгебра" },
      { subjectId: "english" },
      { subjectId: "ukr-lit" },
      { subjectId: "chemistry" },
      { subjectId: "math", label: "Геометрія" },
      { subjectId: "biology" },
      { subjectId: "informatics", label: "Інформатика (профіль)", n: 7 },
    ],
  },
  {
    id: "wed",
    name: "Середа",
    short: "Ср",
    lessons: [
      { subjectId: "math", label: "Алгебра" },
      { subjectId: "math", label: "Геометрія" },
      { subjectId: "world-lit" },
      { subjectId: "english" },
      { subjectId: "pe" },
      { subjectId: "physics" },
    ],
  },
  {
    id: "thu",
    name: "Четвер",
    short: "Чт",
    lessons: [
      { subjectId: "math", label: "Алгебра" },
      { subjectId: "english" },
      { subjectId: "ukr-lang" },
      { subjectId: "chemistry" },
      { subjectId: "math", label: "Геометрія" },
      { subjectId: "biology" },
      { subjectId: "informatics", label: "Інформатика (стандарт)" },
    ],
  },
  {
    id: "fri",
    name: "П'ятниця",
    short: "Пт",
    lessons: [
      { subjectId: "math", label: "Алгебра" },
      { subjectId: "chemistry" },
      { subjectId: "physics" },
      { subjectId: "ukr-lit" },
      { subjectId: "art" },
      { subjectId: "pe" },
    ],
  },
];

/** Розклад по класах — ключі збігаються з id класу (src/lib/cls.ts) */
export const scheduleByClass: Record<string, { bells: Bell[]; week: DaySchedule[] }> = {
  "11a": { bells, week: weekA },
  "11b": { bells, week: weekB },
};

export const toMin = (t: string): number => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

/** 0 = Понеділок … 4 = П'ятниця; null — вихідні (субота/неділя) */
export const dayIndexOf = (d: Date): number | null => {
  const g = d.getDay();
  return g >= 1 && g <= 5 ? g - 1 : null;
};
