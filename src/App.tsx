import Hero from "./components/Hero";
import ScheduleSection from "./components/ScheduleSection";
import SubjectsSection from "./components/SubjectsSection";
import AirAlertSection, { AirAlertStickyBar } from "./components/AirAlertSection";
import Footer from "./components/Footer";
import { AirAlertsProvider } from "./lib/alertsContext";

export default function App() {
  return (
    <AirAlertsProvider>
      <div className="grain min-h-screen bg-cream font-body text-ink">
        <Hero />
        <AirAlertStickyBar />
        <main>
          <AirAlertSection />
          <ScheduleSection />
          <SubjectsSection />
        </main>
        <Footer />
      </div>
    </AirAlertsProvider>
  );
}
