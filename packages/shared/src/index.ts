export { z } from "zod";

const createFallbackUuid = () =>
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replaceAll(/[xy]/g, (character) => {
    const randomNibble = Math.floor(Math.random() * 16);
    const value = character === "x" ? randomNibble : (randomNibble & 0x3) | 0x8;

    return value.toString(16);
  });

export const createId = () =>
  globalThis.crypto?.randomUUID?.() ?? createFallbackUuid();
export const nowIso = () => new Date().toISOString();

export const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

export const titleize = (value: string) =>
  value
    .split(/[_-\s]+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
