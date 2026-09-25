import Hero from "./components/Hero";
import ScheduleSection from "./components/ScheduleSection";
import SubjectsSection from "./components/SubjectsSection";
import Footer from "./components/Footer";

export default function App() {
  return (
    <div className="grain min-h-screen bg-cream font-body text-ink">
      <Hero />
      <main>
        <ScheduleSection />
        <SubjectsSection />
      </main>
      <Footer />
    </div>
  );
}
