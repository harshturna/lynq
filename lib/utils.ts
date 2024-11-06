import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function containsInvalidCharacters(s: string) {
  const regex = /[^a-zA-Z0-9.]/;
  return regex.test(s);
}

export function copyContent(content: string) {
  if (!content) return false;
  navigator.clipboard.writeText(content);
  return true;
}
