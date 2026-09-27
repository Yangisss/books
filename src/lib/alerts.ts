/**
 * Клієнт NEPTUN (neptun.in.ua) — відкритий CORS API повітряних тривог
 * та повітряних загроз (БпЛА, ракети, КАБ, МіГ-31К).
 *
 * Джерело: офіційні тривоги ДСНС + моніторинг відкритих каналів.
 * Достатньо атрибуції на neptun.in.ua — ключі API не потрібні.
 *
 * Ми читаємо:
 *   - /api/v1/alerts     — активні тривоги по областях і районах
 *   - /api/v1/threats    — активні повітряні цілі
 *   - /api/v1/messages   — останні повідомлення з каналів
 *   - WebSocket wss://…/api/v1/stream  — пуш в реальному часі
 *
 * Фолбек: якщо WS не під'єднався — опитуємо REST раз на 15 секунд.
 */

export const NEPTUN_BASE = "https://neptun.in.ua";
/** Резервне джерело (області), якщо NEPTUN недоступний. */
export const UBILLING_URL = "https://ubilling.net.ua/aerialalerts/";

/** Ключі реґіонів, за якими стежимо: Одеса-центр = Одеський р-н у складі Одеської обл. */
export const WATCH = {
  oblastKey: "odeska",
  raionKey: "odeska:odeskyi",
  oblastName: "Одеська область",
  raionName: "Одеський район",
  label: "Одеса · центр міста",
  /** Школа у смт Великодолинське — це Чорноморська міська громада, Одеський район.
   *  Тривога в Одеському районі = тривога і в школі, і в центрі Одеси. */
  note: "Центр Одеси та школа у Великодолинському належать до Одеського району — тривога лунає одночасно.",
} as const;

export type Threat = {
  id: string;
  type: "uav" | "recon" | "missile" | "ballistic" | "kab" | "mig31k" | "unknown";
  title: string;
  region?: string;
  district?: string;
  locality?: string;
  lat?: number;
  lon?: number;
  heading?: number | null;
  confidenceLevel?: "low" | "medium" | "high";
  sourceCount?: number;
  count?: number;
  updatedAt?: string;
  status?: "active" | "stale" | "resolved";
  explanationShort?: string;
  velocity?: { bearingDeg: number; speedKmh: number };
  confirmedAt?: string;
  uncertaintyKm?: number;
  positionQuality?: "confirmed" | "approx" | string;
  advisory?: boolean;
  areaOnly?: boolean;
};

export type AlertRegion = {
  key: string;
  name: string;
  oblast: string;
  since?: string;
  /** NEPTUN може повертати рівень загрози / причини тривоги */
  level?: string;
  reasons?: string[];
};

export type AlertsSnapshot = {
  serverTime?: string;
  raions: AlertRegion[];
  oblasts: AlertRegion[];
};

export type MessagesSnapshot = {
  messages: Array<{ channel: string; text: string; date: string }>;
};

export type ThreatsSnapshot = {
  serverTime?: string;
  threats: Threat[];
};

export type HistoryEntry = {
  at: number;
  alertRaion: boolean;
  alertOblast: boolean;
  threatCount: number;
};

export type LiveState = {
  connected: "live" | "polling" | "offline";
  lastOkAt: number | null;
  serverTime: string | null;
  raion: AlertRegion | null; // Одеський район (центр + школа)
  oblast: AlertRegion | null; // Одеська область загалом
  threats: Threat[]; // загрози в межах Одеської обл. / поруч
  messages: Array<{ channel: string; text: string; date: string }>;
  history: HistoryEntry[];
};

/* ------------ типи погроз для відображення ------------ */
export const THREAT_META: Record<
  string,
  { label: string; tone: "danger" | "warn" | "info"; icon: string }
> = {
  uav: { label: "БпЛА / Шахед", tone: "warn", icon: "uav" },
  recon: { label: "Розвідка БпЛА", tone: "info", icon: "uav" },
  missile: { label: "Крилата ракета", tone: "danger", icon: "missile" },
  ballistic: { label: "Балістика", tone: "danger", icon: "missile" },
  kab: { label: "КАБ", tone: "danger", icon: "kab" },
  mig31k: { label: "МіГ-31К (зліт)", tone: "warn", icon: "plane" },
  unknown: { label: "Невідома загроза", tone: "warn", icon: "?" },
};

export function threatLevelTitle(t: Threat): string {
  return THREAT_META[t.type]?.label ?? "Невідома загроза";
}

/** Час у Києві з ISO-рядка. */
export function fmtTime(iso?: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString("uk-UA", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export function fmtDuration(fromIso?: string, nowMs: number = Date.now()): string {
  if (!fromIso) return "";
  const d = Math.max(0, nowMs - new Date(fromIso).getTime());
  const m = Math.floor(d / 60000);
  if (m < 1) return "щойно";
  if (m < 60) return `${m} ${plural(m, "хвилину", "хвилини", "хвилин")}`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h} ${plural(h, "годину", "години", "годин")}${mm ? ` ${mm} ${plural(mm, "хв", "хв", "хв")}` : ""}`;
}

function plural(n: number, one: string, two: string, five: string) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return two;
  return five;
}

/** Чи належить загроза до Одеської області / Одеси / Одеського району. */
export function isOdesaThreat(t: Threat): boolean {
  if (t.advisory) return false; // спостереження, а не сигнал
  const inR = (t.region || "").toLowerCase();
  const inD = (t.district || "").toLowerCase();
  const inL = (t.locality || "").toLowerCase();
  if (inR.includes("одес")) return true;
  if (inD.includes("одес")) return true;
  if (inL.includes("одес") || inL.includes("чорномор") || inL.includes("южне") || inL.includes("білгор"))
    return true;
  // якщо areaOnly — лишаємо тільки коли це точно напрямок на Одещину
  if (t.areaOnly && (inR.includes("микола") || inR.includes("херсон"))) return true;
  return false;
}

export function matchAlert(list: AlertRegion[] | undefined, key: string): AlertRegion | null {
  if (!list) return null;
  return list.find((r) => r.key === key) ?? null;
}

/** Обчислюємо зведений рівень загрози, щоб показати школярам: іти / не йти. */
export function verdict(state: {
  raion: AlertRegion | null;
  oblast: AlertRegion | null;
  threats: Threat[];
}): {
  code: "clear" | "watching" | "oblast" | "raion" | "active";
  title: string;
  sub: string;
  tone: "ok" | "watch" | "warn" | "danger";
  gotoClass: "yes" | "no" | "wait";
} {
  const inRaion = !!state.raion;
  const inOblast = !!state.oblast;
  const hard = state.threats.filter((t) => !t.advisory && (t.type === "ballistic" || t.type === "missile" || t.type === "kab"));
  const soft = state.threats.filter((t) => !t.advisory && (t.type === "uav" || t.type === "mig31k" || t.type === "unknown"));

  if (inRaion) {
    return {
      code: "raion",
      title: "Тривога в Одеському районі",
      sub: "Повітряна тривога лунає у центрі Одеси та у Великодолинському — йти в укриття.",
      tone: "danger",
      gotoClass: "no",
    };
  }
  if (hard.length > 0) {
    return {
      code: "active",
      title: "Загроза в напрямку Одещини",
      sub: "Фіксуються ракети / балістика / КАБи у напрямку області — не йди до школи, слідкуй за тривогою.",
      tone: "danger",
      gotoClass: "no",
    };
  }
  if (inOblast) {
    return {
      code: "oblast",
      title: "Тривога в Одеській області",
      sub: "У районі оголошено тривоги — до школи зараз краще не виходити, слідкуй за відбоєм.",
      tone: "warn",
      gotoClass: "wait",
    };
  }
  if (soft.length > 0) {
    return {
      code: "watching",
      title: "Небо напружене — стежимо",
      sub: "У межах області фіксуються БпЛА або МіГ-31К — тривоги в районі ще немає, але будь напоготові.",
      tone: "watch",
      gotoClass: "wait",
    };
  }
  return {
    code: "clear",
    title: "Тривоги в Одесі немає",
    sub: "Можна збиратися до школи. Якщо щось зміниться — ця сторінка оновиться сама.",
    tone: "ok",
    gotoClass: "yes",
  };
}
