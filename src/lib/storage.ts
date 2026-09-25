/**
 * Сховище підручників: спільний сервер школи (/api/books) →
 * фолбек на IndexedDB (локальний режим, коли статичного хостингу вистачає).
 * Ключ полиці в локальному режимі: `${cls}/${subjectId}` (старі записи без префікса — 11 клас).
 */

export interface StoredFile {
  id: string;
  name: string;
  type: string;
  size: number;
  addedAt: number;
  /** лише для локальних файлів */
  blob?: Blob;
  /** лише для спільних файлів */
  url?: string;
  subject?: string;
  shared?: boolean;
}

export type SharedStatus = "unknown" | "on" | "off";

let sharedState: SharedStatus = "unknown";
export const isShared = () => sharedState === "on";

const DB_NAME = "moi-pidruchnyky";
const STORE = "textbooks";
const VERSION = 1;

interface LocalRecord {
  id: string;
  subjectId: string;
  name: string;
  type: string;
  size: number;
  addedAt: number;
  blob: Blob;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("bySubject", "subjectId", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function probeShared(cls: number): Promise<boolean> {
  if (typeof location === "undefined" || !(location.protocol === "http:" || location.protocol === "https:")) {
    sharedState = "off";
    return false;
  }
  try {
    const r = await fetch(`/api/books?cls=${cls}`, { signal: AbortSignal.timeout(2500) });
    sharedState = r.ok ? "on" : "off";
  } catch {
    sharedState = "off";
  }
  return sharedState === "on";
}

async function sharedList(cls: number): Promise<StoredFile[]> {
  const r = await fetch(`/api/books?cls=${cls}`, { cache: "no-store" });
  if (!r.ok) throw new Error("shared list failed");
  return (await r.json()) as StoredFile[];
}

/* ---------------- public API (усе — в межах класу) ---------------- */

export async function listFiles(cls: number, subjectId: string): Promise<StoredFile[]> {
  if (sharedState === "on") {
    try {
      const all = await sharedList(cls);
      return all.filter((f) => f.subject === subjectId);
    } catch {
      sharedState = "off";
    }
  }
  const db = await openDB();
  try {
    const out = await new Promise<StoredFile[]>((resolve, reject) => {
      const req = db.transaction(STORE, "readonly").objectStore(STORE).index("bySubject").getAll(`${cls}/${subjectId}`);
      req.onsuccess = () => resolve(req.result as StoredFile[]);
      req.onerror = () => reject(req.error);
    });
    return out.sort((a, b) => b.addedAt - a.addedAt);
  } finally {
    db.close();
  }
}

export async function addFiles(cls: number, subjectId: string, files: File[]): Promise<void> {
  if (sharedState === "on") {
    const fd = new FormData();
    fd.append("cls", String(cls));
    fd.append("subject", subjectId);
    files.forEach((f) => fd.append("file", f));
    const r = await fetch("/api/books", { method: "POST", body: fd });
    if (!r.ok) throw new Error(await r.text().catch(() => "upload failed"));
    return;
  }
  const db = await openDB();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      files.forEach((f) => {
        const rec: LocalRecord = {
          id: crypto.randomUUID(),
          subjectId: `${cls}/${subjectId}`,
          name: f.name,
          type: f.type || "application/octet-stream",
          size: f.size,
          addedAt: Date.now(),
          blob: f,
        };
        store.put(rec);
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function removeFile(id: string): Promise<void> {
  if (sharedState === "on") {
    const r = await fetch(`/api/books/${id}`, { method: "DELETE" });
    if (!r.ok) throw new Error("delete failed");
    return;
  }
  const db = await openDB();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function getCounts(cls: number): Promise<Record<string, number>> {
  if (sharedState === "on") {
    try {
      const all = await sharedList(cls);
      const counts: Record<string, number> = {};
      all.forEach((f) => {
        if (!f.subject) return;
        counts[f.subject] = (counts[f.subject] ?? 0) + 1;
      });
      return counts;
    } catch {
      sharedState = "off";
    }
  }
  const db = await openDB();
  try {
    return await new Promise<Record<string, number>>((resolve, reject) => {
      const req = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
      req.onsuccess = () => {
        const counts: Record<string, number> = {};
        (req.result as LocalRecord[]).forEach((f) => {
          const key = String(f.subjectId ?? "");
          const slash = key.indexOf("/");
          let c: number;
          let subj: string;
          if (slash === -1) {
            c = 11;
            subj = key;
          } else {
            c = Number(key.slice(0, slash));
            subj = key.slice(slash + 1);
          }
          if (c === cls && subj) counts[subj] = (counts[subj] ?? 0) + 1;
        });
        resolve(counts);
      };
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

export function fileURL(f: StoredFile): string {
  return f.url ?? URL.createObjectURL(f.blob as Blob);
}

export function isViewable(f: StoredFile): boolean {
  return (
    f.type === "application/pdf" ||
    f.type.startsWith("image/") ||
    f.type.startsWith("text/")
  );
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} КБ`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} ГБ`;
}

export function plural(n: number, one: string, few: string, many: string): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return many;
  const mod10 = n % 10;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}
