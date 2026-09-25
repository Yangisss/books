import { useEffect } from "react";
import { Download, ExternalLink, FileQuestion, X } from "lucide-react";
import type { Subject } from "../data/subjects";
import { fileURL, formatSize, isViewable, type StoredFile } from "../lib/storage";

/** Читалка всередині сайту: PDF та картинки — прямо у фреймі, решта — з кнопками. */
export default function Reader({
  file,
  subject,
  cls,
  onClose,
}: {
  file: StoredFile;
  subject?: Subject;
  cls: number;
  onClose: () => void;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const url = fileURL(file);
  const viewable = isViewable(file);

  return (
    <div className="fixed inset-0 z-[95] flex flex-col bg-ink/75 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true">
      <div className="absolute inset-0" onClick={onClose} aria-hidden />
      <div className="anim-fade-up relative mx-auto flex h-full w-full max-w-5xl flex-col overflow-hidden bg-paper shadow-2xl sm:h-[calc(100%-3rem)] sm:rounded-[2rem]" style={{ animationDuration: "0.3s" }}>
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

        {viewable ? (
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
