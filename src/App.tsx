import { useEffect, useState } from "react";
import Hero from "./components/Hero";
import ScheduleSection from "./components/ScheduleSection";
import SubjectsSection from "./components/SubjectsSection";
import AirAlertSection, { AirAlertStickyBar } from "./components/AirAlertSection";
import Footer from "./components/Footer";
import TopNav, { type SiteTab } from "./components/TopNav";
import { AirAlertsProvider } from "./lib/alertsContext";

const TAB_KEY = "vdsh2-site-tab";

function usePersistedTab(): [SiteTab, (t: SiteTab) => void] {
  const [tab, setTab] = useState<SiteTab>(() => {
    try {
      const v = localStorage.getItem(TAB_KEY) as SiteTab | null;
      if (v && ["home", "alerts", "schedule", "subjects"].includes(v)) return v;
    } catch {}
    return "home";
  });
  useEffect(() => {
    try {
      localStorage.setItem(TAB_KEY, tab);
    } catch {}
    // оновлюємо hash для прямих посилань, але без скролу
    if (tab !== "home") {
      history.replaceState(null, "", `#${tab}`);
    } else {
      history.replaceState(null, "", location.pathname);
    }
  }, [tab]);
  useEffect(() => {
    // підтримка старих якорів #trygoga #rozklad #predmety
    const h = location.hash.replace("#", "");
    if (h === "trygoga" || h === "alerts") setTab("alerts");
    else if (h === "rozklad" || h === "schedule") setTab("schedule");
    else if (h === "predmety" || h === "subjects") setTab("subjects");
  }, []);
  return [tab, setTab];
}

function TabContent({ active }: { active: SiteTab }) {
  // ключ змінюється при перемиканні вкладки — анімація fade-up
  return (
    <div key={active} className="anim-fade-up">
      {active === "home" && <HomeTab />}
      {active === "alerts" && <AirAlertSection />}
      {active === "schedule" && <ScheduleSection />}
      {active === "subjects" && <SubjectsSection />}
    </div>
  );
}

function HomeTab() {
  const go = (t: SiteTab) => {
    window.dispatchEvent(new CustomEvent("vdsh2-nav", { detail: t }));
  };
  return (
    <>
      <Hero hideTopBar onNavigate={(t) => go(t as SiteTab)} />
      {/* швидкий доступ до вкладок — ті самі картки в стилі сайту */}
      <section className="mx-auto max-w-7xl px-6 pb-8 pt-2">
        <div className="grid gap-4 sm:grid-cols-3">
          <button
            onClick={() => go("alerts")}
            className="group flex items-center gap-4 rounded-[1.5rem] border border-ink/10 bg-paper p-5 text-left shadow-[0_18px_45px_-28px_rgba(23,20,12,0.35)] transition-all hover:-translate-y-1 hover:shadow-[0_28px_60px_-28px_rgba(23,20,12,0.45)]"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-600 text-white shadow">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
            </span>
            <span>
              <span className="font-display text-sm font-bold">Тривога</span>
              <span className="mt-1 block text-xs leading-relaxed text-ink-soft">Чи можна йти на урок — статус в реальному часі</span>
            </span>
          </button>
          <button
            onClick={() => go("schedule")}
            className="group flex items-center gap-4 rounded-[1.5rem] border border-ink/10 bg-paper p-5 text-left shadow-[0_18px_45px_-28px_rgba(23,20,12,0.35)] transition-all hover:-translate-y-1 hover:shadow-[0_28px_60px_-28px_rgba(23,20,12,0.45)]"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cobalt text-white shadow">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
            </span>
            <span>
              <span className="font-display text-sm font-bold">Розклад</span>
              <span className="mt-1 block text-xs leading-relaxed text-ink-soft">Уроки дня, дзвінки та перерви — з підручниками</span>
            </span>
          </button>
          <button
            onClick={() => go("subjects")}
            className="group flex items-center gap-4 rounded-[1.5rem] border border-ink/10 bg-paper p-5 text-left shadow-[0_18px_45px_-28px_rgba(23,20,12,0.35)] transition-all hover:-translate-y-1 hover:shadow-[0_28px_60px_-28px_rgba(23,20,12,0.45)]"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sun text-ink shadow">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/></svg>
            </span>
            <span>
              <span className="font-display text-sm font-bold">Предмети</span>
              <span className="mt-1 block text-xs leading-relaxed text-ink-soft">14 дисциплін — поличка підручників в один клік</span>
            </span>
          </button>
        </div>
      </section>
    </>
  );
}

export default function App() {
  const [tab, setTab] = usePersistedTab();

  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<SiteTab>;
      if (custom.detail && ["home", "alerts", "schedule", "subjects"].includes(custom.detail)) {
        setTab(custom.detail);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    };
    window.addEventListener("vdsh2-nav" as any, handler);
    return () => window.removeEventListener("vdsh2-nav" as any, handler);
  }, [setTab]);

  return (
    <AirAlertsProvider>
      <div className="grain min-h-screen bg-cream font-body text-ink">
        <TopNav active={tab} onChange={(t) => { setTab(t); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
        <AirAlertStickyBar />
        <main className="min-h-[60vh]">
          <TabContent active={tab} />
        </main>
        <Footer />
      </div>
    </AirAlertsProvider>
  );
}
