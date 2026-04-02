import { useState, useEffect } from "react";

export function usePersistent<T>(key: string, fallback: T): [T, (value: T) => void] {
  const [val, setVal] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : fallback;
    } catch {
      return fallback;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch {
      // Silently fail if localStorage is not available
    }
  }, [key, val]);

  return [val, setVal];
}