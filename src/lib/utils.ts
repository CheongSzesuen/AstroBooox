import type { ClassValue } from "clsx"
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

type Updater<T> = T | ((value: T) => T)

const isUpdaterFn = <T>(value: Updater<T>): value is (prev: T) => T => {
  return typeof value === "function"
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function valueUpdater<T>(updaterOrValue: Updater<T>, ref: { value: T }) {
  ref.value
    = isUpdaterFn(updaterOrValue)
      ? updaterOrValue(ref.value)
      : updaterOrValue
}
