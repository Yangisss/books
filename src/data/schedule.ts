/**
 * Розклад уроків на тиждень.
 * subjectId має збігатися з id предмета у src/data/subjects.ts,
 * щоб до уроків автоматично підтягувалися твої підручники.
 */

export interface Bell {
  start: string; // "08:30"
  end: string; // "09:15"
}

/** Дзвінки — час кожного уроку (індекс = номер уроку) */
export const bells: Bell[] = [
  { start: "08:30", end: "09:15" },
  { start: "09:25", end: "10:10" },
  { start: "10:20", end: "11:05" },
  { start: "11:25", end: "12:10" },
  { start: "12:20", end: "13:05" },
  { start: "13:15", end: "14:00" },
  { start: "14:10", end: "14:55" },
];

export interface Lesson {
  subjectId: string;
  room?: string;
}

export interface DaySchedule {
  id: "mon" | "tue" | "wed" | "thu" | "fri";
  name: string; // Понеділок
  short: string; // Пн
  lessons: Lesson[];
}

/** 5 навчальних днів: індекс 0 = Понеділок … 4 = П'ятниця */
export const week: DaySchedule[] = [
  {
    id: "mon",
    name: "Понеділок",
    short: "Пн",
    lessons: [
      { subjectId: "math", room: "каб. 305" },
      { subjectId: "ukr-lang", room: "каб. 210" },
      { subjectId: "english", room: "каб. 414" },
      { subjectId: "physics", room: "каб. 301" },
      { subjectId: "history-ua", room: "каб. 218" },
      { subjectId: "informatics", room: "каб. 112" },
      { subjectId: "pe", room: "спортзал" },
    ],
  },
  {
    id: "tue",
    name: "Вівторок",
    short: "Вт",
    lessons: [
      { subjectId: "ukr-lit", room: "каб. 210" },
      { subjectId: "math", room: "каб. 305" },
      { subjectId: "chemistry", room: "каб. 303" },
      { subjectId: "biology", room: "каб. 307" },
      { subjectId: "world-history", room: "каб. 218" },
      { subjectId: "art", room: "каб. 116" },
      { subjectId: "english", room: "каб. 414" },
    ],
  },
  {
    id: "wed",
    name: "Середа",
    short: "Ср",
    lessons: [
      { subjectId: "physics", room: "каб. 301" },
      { subjectId: "math", room: "каб. 305" },
      { subjectId: "informatics", room: "каб. 112" },
      { subjectId: "ukr-lang", room: "каб. 210" },
      { subjectId: "astronomy", room: "каб. 401" },
      { subjectId: "world-lit", room: "каб. 214" },
      { subjectId: "pe", room: "спортзал" },
    ],
  },
  {
    id: "thu",
    name: "Четвер",
    short: "Чт",
    lessons: [
      { subjectId: "math", room: "каб. 305" },
      { subjectId: "chemistry", room: "каб. 303" },
      { subjectId: "biology", room: "каб. 307" },
      { subjectId: "history-ua", room: "каб. 218" },
      { subjectId: "english", room: "каб. 414" },
      { subjectId: "physics", room: "каб. 301" },
      { subjectId: "world-lit", room: "каб. 214" },
    ],
  },
  {
    id: "fri",
    name: "П'ятниця",
    short: "Пт",
    lessons: [
      { subjectId: "ukr-lit", room: "каб. 210" },
      { subjectId: "math", room: "каб. 305" },
      { subjectId: "informatics", room: "каб. 112" },
      { subjectId: "world-history", room: "каб. 218" },
      { subjectId: "art", room: "каб. 116" },
      { subjectId: "astronomy", room: "каб. 401" },
      { subjectId: "pe", room: "спортзал" },
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
