import { Heart } from "lucide-react";
import { useInView } from "../hooks/useInView";

export default function Footer() {
  const { ref, inView } = useInView<HTMLElement>();

  return (
    <footer ref={ref} className="relative overflow-hidden bg-ink text-cream">
      <div className="pointer-events-none absolute -left-24 top-0 h-64 w-64 rounded-full bg-cobalt/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-64 w-64 rounded-full bg-sun/25 blur-3xl" />

      <div
        className={`reveal ${inView ? "is-visible" : ""} relative mx-auto flex max-w-7xl flex-col items-center px-6 py-20 text-center`}
      >
        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl">
          <span className="flex h-full w-full flex-col">
            <span className="flex-1 bg-cobalt" />
            <span className="flex-1 bg-sun" />
          </span>
        </div>

        <h2 className="mt-6 font-display text-3xl font-extrabold uppercase tracking-tight sm:text-5xl">
          Вчись. <span className="font-accent normal-case italic tracking-normal text-sun">Питай.</span> Твори.
        </h2>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-cream/60">
          Чотирнадцять предметів — це не навантаження, а чотирнадцять вікон у світ.
          Гарного навчального року!
        </p>

        <div className="mt-10 flex items-center gap-2 border-t border-cream/10 pt-6 text-xs font-semibold uppercase tracking-widest text-cream/40">
          Зроблено з
          <Heart className="h-3.5 w-3.5 text-sun" fill="currentColor" />
          для української школи
        </div>
      </div>
    </footer>
  );
}
