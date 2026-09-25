import { useCallback, useEffect, useRef, useState } from "react";
import { Download, ExternalLink, FileQuestion, X } from "lucide-react";
import type { Subject } from "../data/subjects";
import { fileURL, formatSize, isViewable, type StoredFile } from "../lib/storage";

const PDFJS = "https://unpkg.com/pdfjs-dist@3.11.174/legacy/build/";
const PDF_POS = "vdsh2-read:";
const PDF_HINT = "vdsh2-read-hint";

let pdfjsPromise: Promise<any> | null = null;
function ensurePdfjs(): Promise<any> {
  const w = window as any;
  if (w.pdfjsLib) return Promise.resolve(w.pdfjsLib);
  return (pdfjsPromise ||= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = PDFJS + "pdf.min.js";
    s.onload = () => resolve((window as any).pdfjsLib);
    s.onerror = () => {
      pdfjsPromise = null;
      reject(new Error("pdf.js not loaded"));
    };
    document.head.appendChild(s);
  }));
}

/** Прогрів: тягнемо pdf.js заздалегідь, щоб читалка відкривалась без паузи. */
export function warmPdfjs() {
  ensurePdfjs().catch(() => {});
}

/* документ тримаємо в кеші: повторне відкриття книги — миттєве */
const docCache = new Map<string, Promise<any>>();
function openPdfDoc(url: string): Promise<any> {
  if (!docCache.has(url)) {
    docCache.set(
      url,
      ensurePdfjs()
        .then((lib: any) => {
          lib.GlobalWorkerOptions.workerSrc = PDFJS + "pdf.worker.min.js";
          return lib.getDocument({ url }).promise;
        })
        .catch((e) => {
          docCache.delete(url);
          throw e;
        })
    );
  }
  return docCache.get(url)!;
}

/** Читалка всередині сайту: PDF — своя поворотна сторінка (свайп, повзунок, зум),
 *  картинки й текст — у фреймі, решта — з кнопками. */
export default function Reader({
  file,
  subject,
  cls,
  onClose,
}: {
  file: StoredFile;
  subject?: Subject;
  cls: string;
  onClose: () => void;
}) {
  const url = fileURL(file);
  const isPdf = file.type === "application/pdf";
  const viewable = isViewable(file);

  const docRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef(1);
  const zoomRef = useRef(1);
  const busyRef = useRef(false);
  const queueRef = useRef<[number, number | undefined] | null>(null);
  const touchRef = useRef({ x: 0, y: 0, t: 0, tap: 0 });
  const bitsRef = useRef<Map<string, { bmp: HTMLCanvasElement; cssW: number; cssH: number }>>(new Map());
  const viewWRef = useRef(0);
  const noteT = useRef<number | undefined>(undefined);
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<"loading" | "ready" | "fallback">("loading");
  const [note, setNote] = useState("");

  const toast = (msg: string) => {
    setNote(msg);
    window.clearTimeout(noteT.current);
    noteT.current = window.setTimeout(() => setNote(""), 2500);
  };

  /* бітмапи сторінок: рендер один раз, далі — бліт без мерехтіння */
  const bitmapFor = useCallback(async (n: number) => {
    const doc = docRef.current!;
    const zoom = zoomRef.current;
    const key = `${n}@${zoom.toFixed(2)}@${viewWRef.current}`;
    const hit = bitsRef.current.get(key);
    if (hit) return hit;
    const pg = await doc.getPage(n);
    const vp1 = pg.getViewport({ scale: 1 });
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssScale = Math.max(0.2, (viewWRef.current - 16) / vp1.width);
    const vp = pg.getViewport({ scale: cssScale * zoom * dpr });
    const bmp = document.createElement("canvas");
    bmp.width = Math.floor(vp.width);
    bmp.height = Math.floor(vp.height);
    const bctx = bmp.getContext("2d", { alpha: false });
    if (!bctx) throw new Error("canvas unavailable");
    bctx.fillStyle = "#ffffff";
    bctx.fillRect(0, 0, bmp.width, bmp.height);
    await pg.render({ canvasContext: bctx, viewport: vp }).promise;
    const entry = { bmp, cssW: Math.floor(vp.width / dpr), cssH: Math.floor(vp.height / dpr) };
    bitsRef.current.set(key, entry);
    if (bitsRef.current.size > 4) {
      for (const k of Array.from(bitsRef.current.keys())) {
        if (Math.abs(Number(k.split("@")[0]) - n) > 1) bitsRef.current.delete(k);
        if (bitsRef.current.size <= 4) break;
      }
    }
    return entry;
  }, []);

  const renderPage = useCallback(
    async (n: number, dir?: number) => {
      const doc = docRef.current;
      if (!doc) return;
      const total = doc.numPages || 1;
      const clamped = Math.min(Math.max(1, Math.round(n) || 1), total);
      if (busyRef.current) {
        queueRef.current = [clamped, dir];
        return;
      }
      busyRef.current = true;
      const from = pageRef.current;
      pageRef.current = clamped;
      setPage(clamped);
      try {
        const canvas = canvasRef.current;
        const scroll = scrollRef.current;
        if (!canvas || !scroll) return;
        viewWRef.current = scroll.clientWidth || window.innerWidth;
        const entry = await bitmapFor(clamped);
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("canvas unavailable");
        canvas.width = entry.bmp.width;
        canvas.height = entry.bmp.height;
        canvas.style.width = entry.cssW + "px";
        canvas.style.height = entry.cssH + "px";
        ctx.drawImage(entry.bmp, 0, 0);
        if (from !== clamped) {
          canvas.style.setProperty("--turn-dir", `${dir === -1 ? "-" : ""}20px`);
          canvas.classList.remove("slide");
          void canvas.offsetWidth;
          canvas.classList.add("slide");
          scroll.scrollTop = 0;
        }
        try {
          localStorage.setItem(PDF_POS + file.id, String(clamped));
        } catch {
          /* сховище недоступне — просто не запам'ятовуємо */
        }
        Promise.resolve().then(async () => {
          for (const p of [clamped + 1, clamped - 1]) {
            if (pageRef.current !== clamped || p < 1 || p > total) continue;
            try {
              await bitmapFor(p);
            } catch {
              /* не вийшло — нестрашно, домалюємо при повороті */
            }
          }
        });
      } catch {
        setStatus("fallback");
        return;
      } finally {
        busyRef.current = false;
        if (queueRef.current) {
          const q = queueRef.current;
          queueRef.current = null;
          renderPage(q[0], q[1]);
        }
      }
    },
    [bitmapFor, file.id]
  );

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    if (!isPdf) return;
    let cancelled = false;
    bitsRef.current = new Map();
    (async () => {
      try {
        const doc = await openPdfDoc(url);
        if (cancelled) return;
        docRef.current = doc;
        setNumPages(doc.numPages);
        setStatus("ready");
        let start = 1;
        try {
          const saved = Number(localStorage.getItem(PDF_POS + file.id) || 0);
          if (saved > 1 && saved <= doc.numPages) {
            start = saved;
            toast(`Продовжуємо зі сторінки ${saved}`);
          } else if (!localStorage.getItem(PDF_HINT)) {
            localStorage.setItem(PDF_HINT, "1");
            toast("Свайп — гортати · подвійний тап — зум");
          }
        } catch {
          /* без сховища — стартуємо з першої */
        }
        renderPage(start);
      } catch {
        if (!cancelled) setStatus("fallback");
      }
    })();
    return () => {
      cancelled = true;
      docRef.current = null;
      setStatus("loading");
      zoomRef.current = 1;
      pageRef.current = 1;
    };
  }, [isPdf, url, renderPage, file.id]);

  useEffect(() => {
    if (!isPdf || status !== "ready") return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "PageDown") renderPage(pageRef.current + 1, 1);
      else if (e.key === "ArrowLeft" || e.key === "PageUp") renderPage(pageRef.current - 1, -1);
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [isPdf, status, renderPage]);

  const swipe = (dx: number, dy: number) => {
    const t = touchRef.current;
    const dt = Math.max(Date.now() - t.t, 1);
    const fast = Math.abs(dx) / dt;
    if (Math.abs(dx) > 46 && Math.abs(dx) > Math.abs(dy) * 1.2 && ((dt < 420 && fast > 0.15) || Math.abs(dx) > 110)) {
      const d = dx < 0 ? 1 : -1;
      renderPage(pageRef.current + d, d);
    } else if (Math.abs(dx) < 14 && Math.abs(dy) < 14) {
      const now = Date.now();
      if (now - t.tap < 330) {
        zoomRef.current = zoomRef.current > 1.1 ? 1 : 1.8;
        bitsRef.current.clear();
        renderPage(pageRef.current);
        touchRef.current = { ...t, tap: 0 };
      } else {
        touchRef.current = { ...t, tap: now };
      }
    }
  };

  const zoom = (f: number) => {
    zoomRef.current = Math.min(4, Math.max(0.6, zoomRef.current * f));
    bitsRef.current.clear();
    renderPage(pageRef.current);
  };

  return (
    <div className="fixed inset-0 z-[95] flex flex-col bg-ink/75 backdrop-blur-none sm:backdrop-blur sm:p-6" role="dialog" aria-modal="true">
      <div className="absolute inset-0" onClick={onClose} aria-hidden />
      <div
        className="anim-fade-up relative mx-auto flex h-full w-full max-w-5xl flex-col overflow-hidden bg-paper shadow-2xl sm:h-[calc(100%-3rem)] sm:rounded-[2rem]"
        style={{ animationDuration: "0.3s" }}
      >
        <div className="flex items-center gap-3 border-b border-ink/8 p-3 sm:gap-4 sm:p-4">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white sm:h-10 sm:w-10"
            style={{ backgroundColor: subject?.accent ?? "#17140c" }}
          >
            {(() => {
              const Icon = subject?.icon ?? FileQuestion;
              return <Icon className="h-4 w-4 sm:h-5 sm:w-5" />;
            })()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{file.name}</p>
            <p className="truncate text-[11px] text-ink-soft">
              {cls} клас{subject ? ` · ${subject.name}` : ""} · {formatSize(file.size)}
              {file.shared ? " · спільна бібліотека" : ""}
              {isPdf && numPages ? ` · ${numPages} стор.` : ""}
            </p>
          </div>
          <a
            href={url}
            target="_blank"
            rel="noopener"
            title="У новій вкладці"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink/10 text-ink-soft transition-all hover:border-cobalt hover:bg-cobalt hover:text-white"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
          <a
            href={url}
            download={file.name}
            title="Завантажити"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink/10 text-ink-soft transition-all hover:border-ink/30 hover:text-ink"
          >
            <Download className="h-4 w-4" />
          </a>
          <button
            onClick={onClose}
            aria-label="Закрити читалку"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink/10 text-ink-soft transition-all hover:rotate-90 hover:border-ink/30 hover:text-ink"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>

        {isPdf ? (
          <div className="relative min-h-0 flex-1 overflow-hidden bg-ink">
            {status !== "fallback" && (
              <div
                ref={scrollRef}
                className="absolute inset-0 overflow-auto overscroll-contain px-2 py-2"
                onTouchStart={(e) => {
                  const t = e.touches[0];
                  touchRef.current = { x: t.clientX, y: t.clientY, t: Date.now(), tap: touchRef.current.tap };
                }}
                onTouchEnd={(e) => {
                  const t = e.changedTouches[0];
                  swipe(t.clientX - touchRef.current.x, t.clientY - touchRef.current.y);
                }}
              >
                <canvas ref={canvasRef} className="pdf-page-canvas mx-auto block rounded-lg bg-white shadow-2xl" />
              </div>
            )}
            {status === "loading" && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 text-cream/70">
                <div className="h-7 w-7 animate-spin rounded-full border-2 border-sun/30 border-t-sun" />
                <p className="font-display text-[10px] font-bold uppercase tracking-[0.25em]">Готую книгу…</p>
              </div>
            )}
            {status === "fallback" && <iframe src={url} title={file.name} className="h-full w-full bg-white" />}
            {status === "ready" && (
              <>
                <div className="absolute right-2.5 top-2.5 z-10 flex flex-col gap-1.5">
                  <button onClick={() => zoom(1.35)} aria-label="Наблизити" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-ink/70 text-lg font-bold text-cream backdrop-blur-sm transition hover:bg-white/15 active:scale-95">
                    +
                  </button>
                  <button onClick={() => zoom(1 / 1.35)} aria-label="Віддалити" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-ink/70 text-lg font-bold text-cream backdrop-blur-sm transition hover:bg-white/15 active:scale-95">
                    −
                  </button>
                  <button
                    onClick={() => {
                      zoomRef.current = 1;
                      bitsRef.current.clear();
                      renderPage(pageRef.current);
                    }}
                    aria-label="По ширині"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-ink/70 text-[10px] font-bold text-cream backdrop-blur-sm transition hover:bg-white/15 active:scale-95"
                  >
                    1:1
                  </button>
                </div>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center p-3 sm:p-4">
                  <div className="pointer-events-auto flex w-full max-w-md items-center gap-2.5 rounded-full border border-white/10 bg-ink/85 px-3 py-2 text-cream shadow-2xl backdrop-blur-sm">
                    <button
                      onClick={() => renderPage(pageRef.current - 1, -1)}
                      aria-label="Попередня сторінка"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm transition hover:bg-white/20 active:scale-95"
                    >
                      ◀
                    </button>
                    <input
                      type="range"
                      min={1}
                      max={numPages || 1}
                      value={page}
                      onChange={(e) => renderPage(Number(e.target.value))}
                      aria-label="Прогрес читання"
                      className="h-1.5 min-w-0 flex-1 accent-sun"
                    />
                    <span className="flex shrink-0 items-center gap-1 font-display text-[11px] font-bold tabular-nums">
                      <input
                        type="number"
                        min={1}
                        max={numPages || 1}
                        defaultValue={page}
                        key={`jump-${page}`}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") renderPage(Number((e.target as HTMLInputElement).value) || 1);
                        }}
                        onBlur={(e) => renderPage(Number(e.target.value) || 1)}
                        aria-label="Сторінка"
                        className="w-12 rounded-full bg-white/10 px-2 py-1.5 text-center outline-none transition focus:bg-white/20"
                      />
                      <span className="text-cream/60">/ {numPages}</span>
                    </span>
                    <button
                      onClick={() => renderPage(pageRef.current + 1, 1)}
                      aria-label="Наступна сторінка"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm transition hover:bg-white/20 active:scale-95"
                    >
                      ▶
                    </button>
                  </div>
                </div>
                {note && (
                  <p className="pdf-toast pointer-events-none absolute left-1/2 top-3 z-20 rounded-full bg-ink/85 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-cream">
                    {note}
                  </p>
                )}
              </>
            )}
          </div>
        ) : file.type.startsWith("image/") ? (
          <div className="min-h-0 flex-1 overflow-auto bg-ink p-2">
            <img src={url} alt={file.name} className="mx-auto block max-w-full rounded-lg" />
          </div>
        ) : viewable ? (
          <iframe src={url} title={file.name} className="min-h-0 w-full flex-1 bg-white" />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-ink/5 text-ink-soft">
              <FileQuestion className="h-8 w-8" />
            </span>
            <p className="max-w-sm text-sm leading-relaxed text-ink-soft">
              Формат «{file.type || "unknown"}» браузер не показує всередині сторінки (так вміють PDF та
              зображення). Відкрий файл у новій вкладці або завантаж — і перечитай у зручному рідері.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <a
                href={url}
                target="_blank"
                rel="noopener"
                className="rounded-full bg-ink px-5 py-2.5 font-display text-[11px] font-bold uppercase tracking-widest text-cream transition-all hover:bg-cobalt"
              >
                Відкрити
              </a>
              <a
                href={url}
                download={file.name}
                className="rounded-full border border-ink/15 px-5 py-2.5 font-display text-[11px] font-bold uppercase tracking-widest transition-all hover:border-ink/40"
              >
                Завантажити
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
