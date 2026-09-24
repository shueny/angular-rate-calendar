import { Lang } from '../i18n';

/** An English / Traditional Chinese pair. */
export type Bi = readonly [en: string, zh: string];

export const pick = (text: Bi, lang: Lang): string => (lang === 'zh' ? text[1] : text[0]);

export const clamp = (v: number, lo = 0, hi = 1): number => Math.max(lo, Math.min(hi, v));

/** Progress of `t` through the window [a, b], clamped to 0..1. */
export const seg = (t: number, a: number, b: number): number => clamp((t - a) / (b - a));

/** Cubic ease-in-out. */
export const inOut = (p: number): number =>
  p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;

/** Cubic ease-out. */
export const outE = (p: number): number => 1 - Math.pow(1 - p, 3);

export const money = (v: number): string => {
  const r = Math.round(v * 100) / 100;
  return '$' + (Number.isInteger(r) ? r : r.toFixed(2));
};

export interface Tone {
  stroke: string;
  fill: string;
  text: string;
}

export type ToneKey = 'ink' | 'ok' | 'bad' | 'warn' | 'accent' | 'muted';

export const TONE: Record<ToneKey, Tone> = {
  ink: { stroke: '#1d1d1f', fill: '#ffffff', text: '#1d1d1f' },
  ok: { stroke: '#1b7f4b', fill: '#e6f2eb', text: '#1b7f4b' },
  bad: { stroke: '#c62828', fill: '#fbeaea', text: '#c62828' },
  warn: { stroke: '#a15c00', fill: '#f7eedf', text: '#a15c00' },
  accent: { stroke: '#1976d2', fill: '#e3effb', text: '#1976d2' },
  muted: { stroke: '#b9b6ad', fill: '#f2f1ec', text: '#6b6b70' },
};

/** One text label inside a figure's SVG; rendered by a shared @for loop in each figure. */
export interface SvgText {
  x: number;
  y: number;
  text: string;
  size: number;
  fill: string;
  weight?: number;
  anchor?: 'start' | 'middle' | 'end';
  op?: number;
  ls?: number;
  deco?: string;
  transform?: string;
  /** Body font instead of the monospace figure font. */
  sans?: boolean;
  /** Paper-coloured outline so the label stays readable over lines. */
  halo?: boolean;
}

/** Four fragments flying apart, used when a packet is rejected or cancelled. */
export interface Fragment {
  x: number;
  y: number;
  cx: number;
  cy: number;
  rot: number;
  op: number;
  color: string;
}

export function fragments(x: number, y: number, age: number, color: string): Fragment[] {
  if (age >= 700) return [];
  const op = 1 - age / 700;
  return [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ].map(([dx, dy]) => {
    const fx = x + dx * (8 + age * 0.05);
    const fy = y + dy * (4 + age * 0.03);
    return { x: fx - 6, y: fy - 4, cx: fx, cy: fy, rot: dx * dy * (age * 0.12 + 10), op, color };
  });
}
