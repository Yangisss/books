import { useSyncExternalStore } from "react";

export interface ClassInfo {
  id: string;
  label: string;
}

export const CLASSES: ClassInfo[] = [
  { id: "11a", label: "11-А" },
  { id: "11b", label: "11-Б" },
];

const KEY = "vdsh2-class";
const ADMIN_KEY = "vdsh2-admin-key";
const subs = new Set<() => void>();

function initial(): string {
  if (typeof localStorage !== "undefined") {
    const v = localStorage.getItem(KEY) || "";
    if (CLASSES.some((c) => c.id === v)) return v;
  }
  return CLASSES[0].id;
}

let current = initial();
let adminKey =
  typeof localStorage !== "undefined" ? localStorage.getItem(ADMIN_KEY) || "" : "";

const emit = () => subs.forEach((f) => f());

export const getClass = () => current;
export const classLabel = (id: string = current) =>
  CLASSES.find((c) => c.id === id)?.label ?? id;

export const getAdminKey = () => adminKey;

export function setAdminKey(k: string) {
  adminKey = k;
  try {
    if (k) localStorage.setItem(ADMIN_KEY, k);
    else localStorage.removeItem(ADMIN_KEY);
  } catch {
    /* private mode */
  }
  emit();
}

export function setClass(id: string) {
  current = id;
  try {
    localStorage.setItem(KEY, id);
  } catch {
    /* private mode */
  }
  emit();
}

export function useClassInfo(): { id: string; label: string } {
  const id = useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => {
        subs.delete(cb);
      };
    },
    getClass,
    getClass
  );
  return { id, label: classLabel(id) };
}
