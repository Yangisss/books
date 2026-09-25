import { useSyncExternalStore } from "react";

const KEY = "vdsh2-class";
const subs = new Set<() => void>();

let current = 11;
if (typeof localStorage !== "undefined") {
  const v = Number(localStorage.getItem(KEY));
  if (v >= 1 && v <= 11) current = v;
}

export const getClass = () => current;

export function setClass(n: number) {
  current = n;
  try {
    localStorage.setItem(KEY, String(n));
  } catch {
    /* private mode */
  }
  subs.forEach((f) => f());
}

/** Реагує на зміну класу в будь-якому місці сайду */
export function useClass(): number {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => {
        subs.delete(cb);
      };
    },
    getClass,
    getClass
  );
}
