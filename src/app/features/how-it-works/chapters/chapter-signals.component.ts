import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { PricingEngineService } from '../../../core/pricing-engine/pricing-engine.service';
import { HolidayService } from '../../../core/holiday/holiday.service';
import { DemoHttpHandler } from '../demo-http-handler';
import { Lang, TEXT } from '../i18n';

export type NodeId =
  'config' | 'holidays' | 'selectedDate' | 'rules' | 'holidayMap' | 'days' | 'detail';

interface GraphNode {
  id: NodeId;
  kind: 'signal' | 'computed';
  x: number;
  y: number;
}

export interface DayCell {
  day: number;
  price: number;
  holiday: string | null;
  weekend: boolean;
}

const YEAR = 2026;
const MONTH = 11; // December
const DAYS_IN_MONTH = 31;
const NODE_W = 170;
const NODE_H = 50;

const NODES: GraphNode[] = [
  { id: 'config', kind: 'signal', x: 10, y: 15 },
  { id: 'holidays', kind: 'signal', x: 10, y: 100 },
  { id: 'selectedDate', kind: 'signal', x: 10, y: 185 },
  { id: 'rules', kind: 'computed', x: 235, y: 15 },
  { id: 'holidayMap', kind: 'computed', x: 235, y: 100 },
  { id: 'days', kind: 'computed', x: 460, y: 45 },
  { id: 'detail', kind: 'computed', x: 460, y: 155 },
];

const EDGES: [NodeId, NodeId][] = [
  ['config', 'rules'],
  ['holidays', 'holidayMap'],
  ['rules', 'days'],
  ['holidayMap', 'days'],
  ['rules', 'detail'],
  ['holidayMap', 'detail'],
  ['selectedDate', 'detail'],
];

export const NODE_IDS = NODES.map((n) => n.id);

function edgePath(from: NodeId, to: NodeId): string {
  const a = NODES.find((n) => n.id === from)!;
  const b = NODES.find((n) => n.id === to)!;
  const x1 = a.x + NODE_W;
  const y1 = a.y + NODE_H / 2;
  const x2 = b.x;
  const y2 = b.y + NODE_H / 2;
  const mx = (x1 + x2) / 2;
  return `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`;
}

function zeroCounts(): Record<NodeId, number> {
  return Object.fromEntries(NODE_IDS.map((id) => [id, 0])) as Record<NodeId, number>;
}

@Component({
  selector: 'app-chapter-signals',
  imports: [CurrencyPipe],
  templateUrl: './chapter-signals.component.html',
  styleUrl: './chapter-signals.component.scss',
  providers: [
    DemoHttpHandler,
    {
      provide: HttpClient,
      useFactory: (h: DemoHttpHandler) => new HttpClient(h),
      deps: [DemoHttpHandler],
    },
    HolidayService,
    PricingEngineService,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChapterSignalsComponent {
  readonly lang = input.required<Lang>();
  readonly t = computed(() => TEXT[this.lang()].signals);

  readonly engine = inject(PricingEngineService);
  readonly holidays = inject(HolidayService);
  private readonly handler = inject(DemoHttpHandler);

  readonly nodes = NODES;
  readonly edges = EDGES.map(([from, to]) => ({ from, to, d: edgePath(from, to) }));
  readonly nodeW = NODE_W;
  readonly nodeH = NODE_H;
  readonly countries = ['US', 'TW'];
  readonly leadingBlanks = Array.from({ length: new Date(YEAR, MONTH, 1).getDay() }, (_, i) => i);

  readonly selectedDate = signal(new Date(YEAR, MONTH, 25));

  readonly days = computed<DayCell[]>(() =>
    Array.from({ length: DAYS_IN_MONTH }, (_, i) => {
      const date = new Date(YEAR, MONTH, i + 1);
      const holiday = this.holidays.getHolidayName(date) ?? null;
      const result = this.engine.calculate(
        date,
        this.holidays.isHoliday(date),
        holiday ?? undefined,
      );
      return {
        day: i + 1,
        price: result.finalRate,
        holiday,
        weekend: date.getDay() === 0 || date.getDay() === 6,
      };
    }),
  );

  readonly detail = computed(() => {
    const date = this.selectedDate();
    return this.engine.calculate(
      date,
      this.holidays.isHoliday(date),
      this.holidays.getHolidayName(date),
    );
  });

  /** How many times each node has produced a new value. */
  readonly counts = signal(zeroCounts());
  /** Counts at the moment of the last user action; nodes above it are lit. */
  private readonly baseline = signal<Record<NodeId, number> | null>(null);
  readonly changedDays = signal<ReadonlySet<number>>(new Set());
  /** Bumped whenever the calendar re-renders so the flash animation restarts. */
  readonly flashKey = signal(0);
  private previousDays: DayCell[] | null = null;

  readonly lit = computed<ReadonlySet<NodeId>>(() => {
    const base = this.baseline();
    const counts = this.counts();
    return new Set(base ? NODE_IDS.filter((id) => counts[id] > base[id]) : []);
  });

  readonly report = computed(() => {
    if (!this.baseline()) return null;
    const lit = this.lit();
    return {
      reran: NODE_IDS.filter((id) => lit.has(id)),
      untouched: NODE_IDS.filter((id) => !lit.has(id)),
      changed: this.changedDays().size,
    };
  });

  constructor() {
    this.handler.plan = () => ({ latencyMs: 400, outcome: 'ok' });
    this.holidays.loadHolidays(YEAR);

    this.watch('config', () => this.engine.config());
    this.watch('holidays', () => this.holidays.holidays());
    this.watch('selectedDate', () => this.selectedDate());
    this.watch('rules', () => this.engine.rules());
    this.watch('holidayMap', () => this.holidays.holidayMap());
    this.watch('detail', () => this.detail());
    this.watch(
      'days',
      () => this.days(),
      (days) => this.trackChangedDays(days),
    );
  }

  setBase(event: Event): void {
    this.act();
    this.engine.updateConfig({ baseRate: Number((event.target as HTMLInputElement).value) });
  }

  setCountry(code: string): void {
    if (code === this.holidays.countryCode()) return;
    this.act();
    this.holidays.setCountryCode(code);
    this.holidays.loadHolidays(YEAR);
  }

  select(day: number): void {
    this.act();
    this.selectedDate.set(new Date(YEAR, MONTH, day));
  }

  isSelected(day: number): boolean {
    return this.selectedDate().getDate() === day;
  }

  formatDay(day: number): string {
    return new Date(YEAR, MONTH, day).toLocaleDateString(TEXT[this.lang()].page.locale, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }

  private act(): void {
    this.baseline.set(this.counts());
    this.changedDays.set(new Set());
  }

  private watch<T>(id: NodeId, read: () => T, after?: (value: T) => void): void {
    effect(() => {
      const value = read();
      untracked(() => {
        this.counts.update((c) => ({ ...c, [id]: c[id] + 1 }));
        after?.(value);
      });
    });
  }

  private trackChangedDays(days: DayCell[]): void {
    const previous = this.previousDays;
    this.previousDays = days;
    if (!previous || !this.baseline()) return;
    const changed = days.filter(
      (cell, i) => cell.price !== previous[i].price || cell.holiday !== previous[i].holiday,
    );
    this.changedDays.set(new Set(changed.map((cell) => cell.day)));
    this.flashKey.update((k) => k + 1);
  }
}
