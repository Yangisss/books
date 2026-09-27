import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertsSnapshot,
  HistoryEntry,
  LiveState,
  MessagesSnapshot,
  NEPTUN_BASE,
  THREAT_META,
  Threat,
  ThreatsSnapshot,
  UBILLING_URL,
  WATCH,
  fmtTime,
  isOdesaThreat,
  matchAlert,
} from "../lib/alerts";

const HISTORY_KEY = "vdsh2-alert-history-v1";
const HISTORY_MAX = 40;
const POLL_REST_MS = 15000;
const WS_URL = `${NEPTUN_BASE}/api/v1/stream`;
const REST_ALERTS = `${NEPTUN_BASE}/api/v1/alerts`;
const REST_THREATS = `${NEPTUN_BASE}/api/v1/threats`;
const REST_MESSAGES = `${NEPTUN_BASE}/api/v1/messages`;

const empty: LiveState = {
  connected: "offline",
  lastOkAt: null,
  serverTime: null,
  raion: null,
  oblast: null,
  threats: [],
  messages: [],
  history: [],
};

function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as HistoryEntry[];
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return arr.filter((e) => typeof e.at === "number" && e.at > cutoff).slice(-HISTORY_MAX);
  } catch {
    return [];
  }
}

function saveHistory(h: HistoryEntry[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(-HISTORY_MAX)));
  } catch {
    /* private */
  }
}

async function fetchJson<T>(url: string, timeoutMs = 8000): Promise<T> {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: c.signal, cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(t);
  }
}

type AlertsPayload = { raions: AlertsSnapshot["raions"]; oblasts: AlertsSnapshot["oblasts"] };

/** Ubilling фолбек — тільки обласні тривоги (без районів). */
async function fetchUbillFallbacks(): Promise<AlertsPayload | null> {
  try {
    const j = await fetchJson<{
      states: Record<string, { alertnow: boolean; changed?: string }>;
    }>(UBILLING_URL, 7000);
    const ob = j.states?.["Одеська область"];
    return {
      raions: [],
      oblasts: ob?.alertnow
        ? [{ key: WATCH.oblastKey, name: WATCH.oblastName, oblast: "", since: ob.changed }]
        : [],
    };
  } catch {
    return null;
  }
}

export function useAirAlerts() {
  const [state, setState] = useState<LiveState>(() => ({ ...empty, history: loadHistory() }));
  const wsRef = useRef<WebSocket | null>(null);
  const pollTimer = useRef<number | null>(null);
  const tickTimer = useRef<number | null>(null);
  const lastSnapshotRef = useRef<{
    raions: AlertsSnapshot["raions"];
    oblasts: AlertsSnapshot["oblasts"];
    threats: Threat[];
    serverTime: string | null;
  }>({ raions: [], oblasts: [], threats: [], serverTime: null });

  const applyAlertsThreats = useCallback(
    (
      data: {
        raions: AlertsSnapshot["raions"];
        oblasts: AlertsSnapshot["oblasts"];
        threats: Threat[];
        messages?: MessagesSnapshot["messages"];
        serverTime?: string | null;
      },
      source: LiveState["connected"]
    ) => {
      lastSnapshotRef.current = {
        raions: data.raions,
        oblasts: data.oblasts,
        threats: data.threats,
        serverTime: data.serverTime ?? null,
      };
      setState((prev) => {
        const raion = matchAlert(data.raions, WATCH.raionKey);
        const oblast = matchAlert(data.oblasts, WATCH.oblastKey);
        const threats = data.threats.filter(isOdesaThreat).slice(0, 8);
        const relevantThreatCount = threats.filter((t) => !t.advisory).length;
        const wasAlertRaion = !!prev.raion;
        const wasAlertOblast = !!prev.oblast;
        const historyNow: HistoryEntry = {
          at: Date.now(),
          alertRaion: !!raion,
          alertOblast: !!oblast,
          threatCount: relevantThreatCount,
        };
        let history = prev.history;
        // додаємо в історію тільки якщо щойно змінився статус тривоги
        const prevKey = `${wasAlertRaion}|${wasAlertOblast}|${prev.threats.length > 0 ? "t" : ""}`;
        const nextKey = `${!!raion}|${!!oblast}|${relevantThreatCount > 0 ? "t" : ""}`;
        if (prevKey !== nextKey) {
          history = [...history.filter((e) => e.at < Date.now() - 60_000 || true), historyNow].slice(-HISTORY_MAX);
          saveHistory(history);
        }
        // періодично пишемо хроніку раз на 15 хв для статистики
        return {
          connected: source,
          lastOkAt: Date.now(),
          serverTime: data.serverTime ?? null,
          raion,
          oblast,
          threats,
          messages: data.messages ?? prev.messages,
          history,
        };
      });
    },
    []
  );

  const pollOnce = useCallback(async () => {
    try {
      const [a, t, m] = await Promise.allSettled([
        fetchJson<AlertsSnapshot>(REST_ALERTS),
        fetchJson<ThreatsSnapshot>(REST_THREATS),
        fetchJson<MessagesSnapshot>(REST_MESSAGES),
      ]);

      let alerts: AlertsPayload;
      let serverTime: string | null = null;

      if (a.status === "fulfilled") {
        alerts = { raions: a.value.raions ?? [], oblasts: a.value.oblasts ?? [] };
        serverTime = (a.value as Partial<AlertsSnapshot>).serverTime ?? null;
      } else {
        const fb = await fetchUbillFallbacks();
        if (!fb) throw new Error("alerts unreachable");
        alerts = fb;
      }

      const threats = t.status === "fulfilled" ? t.value.threats ?? [] : [];
      if (!serverTime && t.status === "fulfilled") serverTime = (t.value as ThreatsSnapshot).serverTime ?? null;
      const messages =
        m.status === "fulfilled"
          ? (m.value.messages ?? []).filter((msg) => /одес|чорномор|южне|білгород|микола|херсон/i.test(msg.text)).slice(0, 6)
          : [];

      applyAlertsThreats(
        { raions: alerts.raions, oblasts: alerts.oblasts, threats, messages, serverTime },
        wsRef.current?.readyState === WebSocket.OPEN ? "live" : "polling"
      );
    } catch {
      setState((prev) => {
        // вважаємо офлайн лише після 90 с без успіху
        const stale = prev.lastOkAt !== null && Date.now() - prev.lastOkAt > 90_000;
        return { ...prev, connected: stale ? "offline" : prev.connected };
      });
    }
  }, [applyAlertsThreats]);

  useEffect(() => {
    let closed = false;

    const startWs = () => {
      if (closed) return;
      try {
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          // після open підуть snapshot'и — до того все ок
        };

        ws.onmessage = (e) => {
          try {
            const env = JSON.parse(e.data);
            const cur = lastSnapshotRef.current;
            switch (env.type) {
              case "snapshot": {
                const d = env.data as { threats?: Threat[]; alerts?: AlertsPayload; serverTime?: string };
                const raions = d.alerts?.raions ?? [];
                const oblasts = d.alerts?.oblasts ?? [];
                const threats = d.threats ?? cur.threats;
                applyAlertsThreats(
                  { raions, oblasts, threats, serverTime: d.serverTime ?? cur.serverTime },
                  "live"
                );
                break;
              }
              case "alerts": {
                const d = env.data as AlertsPayload;
                applyAlertsThreats(
                  {
                    raions: d.raions ?? [],
                    oblasts: d.oblasts ?? [],
                    threats: cur.threats,
                    serverTime: cur.serverTime,
                  },
                  "live"
                );
                break;
              }
              case "upsert": {
                const t = env.data as Threat;
                const existing = cur.threats.filter((x) => x.id !== t.id);
                if (t.status !== "resolved") existing.push(t);
                applyAlertsThreats(
                  {
                    raions: cur.raions,
                    oblasts: cur.oblasts,
                    threats: existing,
                    serverTime: cur.serverTime,
                  },
                  "live"
                );
                break;
              }
              case "remove": {
                const { id } = env.data as { id: string };
                applyAlertsThreats(
                  {
                    raions: cur.raions,
                    oblasts: cur.oblasts,
                    threats: cur.threats.filter((x) => x.id !== id),
                    serverTime: cur.serverTime,
                  },
                  "live"
                );
                break;
              }
              case "heartbeat":
                // ok
                break;
            }
          } catch {
            /* ignore malformed */
          }
        };

        ws.onerror = () => {
          // намагаємось перевідкрити нижче через onclose
        };
        ws.onclose = () => {
          wsRef.current = null;
          if (!closed) setTimeout(startWs, 3500);
        };
      } catch {
        // WS не підтримується — лишаємо polling
      }
    };

    startWs();

    // REST-опитування як страховка (щонайменше раз на POLL_REST_MS)
    pollOnce();
    pollTimer.current = window.setInterval(pollOnce, POLL_REST_MS);

    // раз на секунду форсуємо ре-рендер, щоб оновлювався таймер «триває хх хв»
    tickTimer.current = window.setInterval(() => setState((s) => ({ ...s })), 1000);

    return () => {
      closed = true;
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
      if (pollTimer.current) window.clearInterval(pollTimer.current);
      if (tickTimer.current) window.clearInterval(tickTimer.current);
    };
  }, [applyAlertsThreats, pollOnce]);

  // також тягнемо messages частіше за все — вони і є «новинами»
  useEffect(() => {
    const id = window.setInterval(async () => {
      try {
        const m = await fetchJson<MessagesSnapshot>(REST_MESSAGES, 6000);
        const relevant = (m.messages ?? []).filter((msg) => /одес|чорномор|южне|білгород|микола|херсон/i.test(msg.text)).slice(0, 6);
        setState((prev) => ({ ...prev, messages: relevant.length ? relevant : prev.messages }));
      } catch {
        /* ignore */
      }
    }, 20000);
    return () => window.clearInterval(id);
  }, []);

  return { state, fmtTime, THREAT_META };
}
