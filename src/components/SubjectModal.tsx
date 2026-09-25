import { useCallback, useEffect, useRef, useState } from "react";
import {
  CloudUpload,
  ExternalLink,
  File,
  FileText,
  Image as ImageIcon,
  Loader2,
  Lock,
  Trash2,
  X,
} from "lucide-react";
import { categoryLabel, type Subject } from "../data/subjects";
import { addFiles, formatSize, getFiles, plural, removeFile, type StoredFile } from "../lib/storage";

function fileIcon(type: string) {
  if (type.startsWith("image/")) return ImageIcon;
  if (type === "application/pdf") return FileText;
  return File;
}

export default function SubjectModal({
  subject,
  onClose,
  onChanged,
}: {
  subject: Subject;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [files, setFiles] = useState<StoredFile[] | null>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const Icon = subject.icon;

  const refresh = useCallback(async () => {
    setFiles(await getFiles(subject.id));
  }, [subject.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const upload = async (list: FileList | File[]) => {
    const arr = Array.from(list);
    if (!arr.length) return;
    setBusy(true);
    try {
      await addFiles(subject.id, arr);
      await refresh();
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  const openOne = (f: StoredFile) => {
    window.open(URL.createObjectURL(f.blob), "_blank", "noopener");
  };

  const openAll = () => files?.forEach((f, i) => setTimeout(() => openOne(f), i * 150));

  const remove = async (id: string) => {
    await removeFile(id);
    await refresh();
    onChanged();
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      {/* backdrop */}
      <div
        className="anim-fade-up absolute inset-0 bg-ink/55 backdrop-blur-sm"
        style={{ animationDuration: "0.3s" }}
        onClick={onClose}
      />

      <div className="anim-pop relative flex max-h-[92svh] w-full max-w-lg flex-col overflow-hidden rounded-t-[2rem] bg-paper shadow-2xl sm:rounded-[2rem]">
        {/* header */}
        <div className="flex items-start gap-4 border-b border-ink/8 p-6 pb-5">
          <span
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg"
            style={{ backgroundColor: subject.accent }}
          >
            <Icon className="h-7 w-7" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-soft">
              {categoryLabel(subject.category)}
            </p>
            <h3 className="mt-1 font-display text-xl font-bold leading-tight">{subject.name}</h3>
            <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{subject.desc}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Закрити"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink/10 text-ink-soft transition-all hover:rotate-90 hover:border-ink/30 hover:text-ink"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* body */}
        <div className="flex-1 overflow-y-auto p-6 pt-5">
          {/* dropzone */}
          <button
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              upload(e.dataTransfer.files);
            }}
            disabled={busy}
            className={`group flex w-full flex-col items-center gap-3 rounded-3xl border-2 border-dashed px-6 py-8 text-center transition-all duration-300 ${
              dragging
                ? "scale-[1.02] border-cobalt bg-cobalt/5"
                : "border-ink/20 bg-white/60 hover:border-cobalt/50 hover:bg-white"
            }`}
          >
            <span
              className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-300 ${
                dragging ? "bg-cobalt text-white" : "bg-ink/5 text-ink-soft group-hover:bg-cobalt group-hover:text-white"
              }`}
            >
              {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <CloudUpload className="h-6 w-6" />}
            </span>
            <span className="text-sm font-bold">
              {busy ? "Зберігаю файли…" : "Перетягни підручник сюди"}
            </span>
            <span className="text-xs text-ink-soft">
              або натисни, щоб обрати — PDF, EPUB, DJVU, фото, документи
            </span>
            <input
              ref={inputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) upload(e.target.files);
                e.target.value = "";
              }}
            />
          </button>

          {/* file list */}
          <div className="mt-6">
            <div className="flex items-center justify-between">
              <p className="font-display text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-soft">
                Мої файли {files?.length ? `· ${files.length}` : ""}
              </p>
              {files && files.length > 1 && (
                <button
                  onClick={openAll}
                  className="flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-cream transition-all hover:-translate-y-0.5 hover:bg-cobalt"
                >
                  <ExternalLink className="h-3 w-3" />
                  Відкрити всі
                </button>
              )}
            </div>

            {files === null ? (
              <div className="mt-4 flex items-center gap-2 text-sm text-ink-soft">
                <Loader2 className="h-4 w-4 animate-spin" /> Завантажую…
              </div>
            ) : files.length === 0 ? (
              <p className="mt-4 rounded-2xl bg-ink/4 px-4 py-5 text-center text-sm text-ink-soft">
                Поки що порожньо. Додай підручник — і він завжди буде під рукою.
              </p>
            ) : (
              <ul className="mt-4 space-y-2">
                {files.map((f) => {
                  const FIcon = fileIcon(f.type);
                  return (
                    <li
                      key={f.id}
                      className="anim-fade-up group/item flex items-center gap-3 rounded-2xl border border-ink/8 bg-white/70 p-3 transition-all hover:border-ink/20 hover:bg-white"
                      style={{ animationDuration: "0.35s" }}
                    >
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
                        style={{ backgroundColor: subject.accent }}
                      >
                        <FIcon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">{f.name}</p>
                        <p className="text-xs text-ink-soft">{formatSize(f.size)}</p>
                      </div>
                      <button
                        onClick={() => openOne(f)}
                        title="Відкрити в новій вкладці"
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-ink/10 text-ink-soft transition-all hover:border-cobalt hover:bg-cobalt hover:text-white"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => remove(f.id)}
                        title="Видалити"
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-ink/10 text-ink-soft transition-all hover:border-red-500 hover:bg-red-500 hover:text-white"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* footer */}
        <div className="flex items-center justify-center gap-2 border-t border-ink/8 py-3.5 text-[10px] font-bold uppercase tracking-widest text-ink-soft/70">
          <Lock className="h-3 w-3" />
          Файли зберігаються лише у твоєму браузері
        </div>
      </div>
    </div>
  );
}

export function countLabel(n: number): string {
  return `${n} ${plural(n, "підручник", "підручники", "підручників")}`;
}
