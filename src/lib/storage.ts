const DB_NAME = "moi-pidruchnyky";
const STORE = "textbooks";
const VERSION = 1;

export interface StoredFile {
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

export async function addFiles(subjectId: string, files: File[]): Promise<void> {
  const db = await openDB();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      files.forEach((f) => {
        store.put({
          id: crypto.randomUUID(),
          subjectId,
          name: f.name,
          type: f.type || "application/octet-stream",
          size: f.size,
          addedAt: Date.now(),
          blob: f,
        } satisfies StoredFile);
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function getFiles(subjectId: string): Promise<StoredFile[]> {
  const db = await openDB();
  try {
    const out = await new Promise<StoredFile[]>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const idx = tx.objectStore(STORE).index("bySubject");
      const req = idx.getAll(subjectId);
      req.onsuccess = () => resolve(req.result as StoredFile[]);
      req.onerror = () => reject(req.error);
    });
    return out.sort((a, b) => b.addedAt - a.addedAt);
  } finally {
    db.close();
  }
}

export async function getCounts(): Promise<Record<string, number>> {
  const db = await openDB();
  try {
    return await new Promise<Record<string, number>>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => {
        const counts: Record<string, number> = {};
        (req.result as StoredFile[]).forEach((f) => {
          counts[f.subjectId] = (counts[f.subjectId] ?? 0) + 1;
        });
        resolve(counts);
      };
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

export async function removeFile(id: string): Promise<void> {
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
