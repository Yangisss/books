import {
  Atom,
  Binary,
  BookMarked,
  BookOpen,
  Dna,
  Dumbbell,
  FlaskConical,
  Globe2,
  Landmark,
  Languages,
  Palette,
  PenLine,
  Sigma,
  Telescope,
  type LucideIcon,
} from "lucide-react";

export type CategoryId = "exact" | "natural" | "humanities" | "other";

export interface Category {
  id: CategoryId;
  label: string;
}

export const categories: Category[] = [
  { id: "exact", label: "Точні науки" },
  { id: "natural", label: "Природничі науки" },
  { id: "humanities", label: "Гуманітарні" },
  { id: "other", label: "Мистецтво і спорт" },
];

export interface Subject {
  id: string;
  name: string;
  desc: string;
  category: CategoryId;
  icon: LucideIcon;
  accent: string;
  /** tailwind column span on large screens (grid of 6) */
  span: string;
  variant?: "cobalt" | "night" | "sun";
}

export const subjects: Subject[] = [
  {
    id: "math",
    name: "Математика",
    desc: "Алгебра і геометрія — один підручник на два предмети",
    category: "exact",
    icon: Sigma,
    accent: "#2743d9",
    span: "lg:col-span-3",
    variant: "cobalt",
  },
  {
    id: "physics",
    name: "Фізика",
    desc: "Закони руху, електрики та світла",
    category: "exact",
    icon: Atom,
    accent: "#0ea5e9",
    span: "lg:col-span-3",
  },
  {
    id: "chemistry",
    name: "Хімія",
    desc: "Реакції, елементи й формули",
    category: "natural",
    icon: FlaskConical,
    accent: "#0d9488",
    span: "lg:col-span-2",
  },
  {
    id: "biology",
    name: "Біологія",
    desc: "Життя — від клітини до екосистеми",
    category: "natural",
    icon: Dna,
    accent: "#16a34a",
    span: "lg:col-span-2",
  },
  {
    id: "astronomy",
    name: "Астрономія",
    desc: "Зорі, планети та подорожі всесвітом",
    category: "exact",
    icon: Telescope,
    accent: "#8b7cf6",
    span: "lg:col-span-2",
    variant: "night",
  },
  {
    id: "ukr-lang",
    name: "Українська мова",
    desc: "Граматика, синтаксис і краса слова",
    category: "humanities",
    icon: PenLine,
    accent: "#d99f0e",
    span: "lg:col-span-2",
    variant: "sun",
  },
  {
    id: "ukr-lit",
    name: "Українська література",
    desc: "Від Шевченка до сучасних голосів",
    category: "humanities",
    icon: BookOpen,
    accent: "#ea580c",
    span: "lg:col-span-2",
  },
  {
    id: "english",
    name: "Англійська мова",
    desc: "Speaking, grammar & culture",
    category: "humanities",
    icon: Languages,
    accent: "#8b5cf6",
    span: "lg:col-span-2",
  },
  {
    id: "history-ua",
    name: "Історія України",
    desc: "Тисячоліття української державності",
    category: "humanities",
    icon: Landmark,
    accent: "#b45309",
    span: "lg:col-span-3",
  },
  {
    id: "world-history",
    name: "Всесвітня історія",
    desc: "Цивілізації, відкриття та великі епохи",
    category: "humanities",
    icon: Globe2,
    accent: "#0891b2",
    span: "lg:col-span-3",
  },
  {
    id: "informatics",
    name: "Інформатика",
    desc: "Код, алгоритми та цифрові технології",
    category: "exact",
    icon: Binary,
    accent: "#4f46e5",
    span: "lg:col-span-2",
  },
  {
    id: "world-lit",
    name: "Зарубіжна література",
    desc: "Класика та шедеври країн світу",
    category: "humanities",
    icon: BookMarked,
    accent: "#be123c",
    span: "lg:col-span-2",
  },
  {
    id: "art",
    name: "Мистецтво",
    desc: "Музика, образи та творчість",
    category: "other",
    icon: Palette,
    accent: "#db2777",
    span: "lg:col-span-2",
  },
  {
    id: "pe",
    name: "Фізична культура",
    desc: "Рух, спорт і здорова енергія",
    category: "other",
    icon: Dumbbell,
    accent: "#dc2626",
    span: "lg:col-span-4",
  },
];

export const categoryLabel = (id: CategoryId) =>
  categories.find((c) => c.id === id)?.label ?? "";
