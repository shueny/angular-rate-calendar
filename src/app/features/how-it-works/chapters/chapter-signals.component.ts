import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { PricingEngineService } from '../../../core/pricing-engine/pricing-engine.service';
import { PricingResult } from '../../../core/pricing-engine/pricing-rule.model';
import { HolidayService } from '../../../core/holiday/holiday.service';
import { DemoHttpHandler } from '../demo-http-handler';
import { AnimationClock } from '../motion/animation-clock.service';
import { AutoplayDirective } from '../motion/autoplay.directive';
import { HiwLayout } from '../motion/layout.service';
import { Bi, SvgText, inOut, money, outE, pick, seg } from '../motion/motion';
import { PlayerComponent } from '../motion/player.component';
import { Lang, TEXT } from '../i18n';

export type NodeId =
  'config' | 'holidays' | 'selectedDate' | 'rules' | 'holidayMap' | 'days' | 'detail';
export type Mode = 'base' | 'country' | 'day';

export const NODES: readonly (readonly [NodeId, 'signal' | 'computed'])[] = [
  ['config', 'signal'],
  ['holidays', 'signal'],
  ['selectedDate', 'signal'],
  ['rules', 'computed'],
  ['holidayMap', 'computed'],
  ['days', 'computed'],
  ['detail', 'computed'],
];
const NODE_IDS = NODES.map(([id]) => id);
const COMPUTED_IDS: NodeId[] = ['rules', 'holidayMap', 'days', 'detail'];

const EDGES: readonly (readonly [NodeId, NodeId])[] = [
  ['config', 'rules'],
  ['holidays', 'holidayMap'],
  ['rules', 'days'],
  ['holidayMap', 'days'],
  ['rules', 'detail'],
  ['holidayMap', 'detail'],
  ['selectedDate', 'detail'],
];

const GEOMETRY = {
  wide: {
    vb: '0 0 600 300',
    w: 150,
    h: 48,
    fs: 13,
    sfs: 9,
    pos: {
      config: [10, 20],
      holidays: [10, 126],
      selectedDate: [10, 232],
      rules: [225, 20],
      holidayMap: [225, 126],
      days: [440, 60],
      detail: [440, 190],
    },
  },
  narrow: {
    vb: '0 0 340 330',
    w: 100,
    h: 44,
    fs: 11,
    sfs: 8,
    pos: {
      config: [8, 10],
      holidays: [120, 10],
      selectedDate: [232, 10],
      rules: [8, 140],
      holidayMap: [120, 140],
      days: [50, 270],
      detail: [190, 270],
    },
  },
} as const;

/** When each node lights up and each pulse travels, per kind of change. */
export const RUNS: Record<
  Mode,
  {
    hits: Partial<Record<NodeId, number>>;
    edges: Record<string, [number, number]>;
    durations: number[];
  }
> = {
  base: {
    hits: { config: 300, rules: 1300, days: 2100, detail: 2100 },
    edges: {
      'config>rules': [600, 1300],
      'rules>days': [1300, 2100],
      'rules>detail': [1300, 2100],
    },
    durations: [600, 700, 800, 1400, 700],
  },
  country: {
    hits: { holidays: 1900, holidayMap: 2600, days: 3400, detail: 3400 },
    edges: {
      'holidays>holidayMap': [1900, 2600],
      'holidayMap>days': [2600, 3400],
      'holidayMap>detail': [2600, 3400],
    },
    durations: [500, 900, 500, 700, 800, 1000],
  },
  day: {
    hits: { selectedDate: 250, detail: 1200 },
    edges: { 'selectedDate>detail': [500, 1200] },
    durations: [500, 700, 700],
  },
};

const YEAR = 2026;
const MONTH = 11;
const DAYS_IN_MONTH = 31;
const CELL_REVEAL_BASE = 2100;
const CELL_REVEAL_COUNTRY = 3400;
const WEEKDAY: readonly Bi[] = [
  ['Sun', '日'],
  ['Mon', '一'],
  ['Tue', '二'],
  ['Wed', '三'],
  ['Thu', '四'],
  ['Fri', '五'],
  ['Sat', '六'],
];
const ADJ_NAME: Record<string, Bi> = {
  'Weekend Surcharge': ['weekend', '週末'],
  'Holiday Surcharge': ['holiday', '假日'],
  'Peak Season Surcharge': ['peak', '旺季'],
};

export interface DayCell {
  day: number;
  price: number;
  holiday: string | null;
  weekend: boolean;
}

interface Snapshot {
  days: DayCell[];
  detail: PricingResult;
  sel: number;
  country: string;
}

const dayLabel = (day: number, lang: Lang): string => {
  const w = WEEKDAY[new Date(YEAR, MONTH, day).getDay()];
  return lang === 'zh' ? `12/${day}（${w[1]}）` : `${w[0]}, Dec ${day}`;
};

const zeroCounts = (): Record<NodeId, number> =>
  Object.fromEntries(NODE_IDS.map((id) => [id, 0])) as Record<NodeId, number>;

@Component({
  selector: 'app-chapter-signals',
  imports: [PlayerComponent, AutoplayDirective],
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
  readonly t = computed(() => TEXT[this.lang()]);

  readonly engine = inject(PricingEngineService);
  readonly holidays = inject(HolidayService);
  private readonly handler = inject(DemoHttpHandler);
  private readonly layout = inject(HiwLayout);
  readonly timeline = inject(AnimationClock).timeline();

  readonly countries = ['US', 'TW'];
  readonly open = signal(false);
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

  /** How many times each node has produced a new value (counted by effects, so it is the real number). */
  readonly counts = signal(zeroCounts());
  readonly mode = signal<Mode>('base');
  /** Counts and values just before the last change. */
  private readonly baseline = signal<Record<NodeId, number> | null>(null);
  private readonly before = signal<Snapshot | null>(null);
  readonly draft = signal<number | null>(null);
  private draftTimer?: ReturnType<typeof setTimeout>;
  private introTimer?: ReturnType<typeof setTimeout>;

  /** Nodes that really re-ran since the last change. */
  readonly reran = computed<ReadonlySet<NodeId>>(() => {
    const base = this.baseline();
    const counts = this.counts();
    return new Set(base ? NODE_IDS.filter((id) => counts[id] > base[id]) : []);
  });

  readonly changedDays = computed(() => {
    const prev = this.before()?.days;
    if (!prev) return [];
    return this.days().filter((c, i) => c.price !== prev[i].price || c.holiday !== prev[i].holiday);
  });

  readonly captions = computed<Bi[]>(() => {
    const mode = this.mode();
    const base = this.engine.config().baseRate;
    const country = this.holidays.countryCode();
    const changed = this.changedDays();
    const sel = this.selectedDate().getDate();
    if (mode === 'base') {
      return [
        [`Base rate → $${base}: config is written`, `基本房價改成 $${base}：寫入 config`],
        ['config → rules recomputes', 'config → rules 重新計算'],
        ['rules → days and detail recompute', 'rules → days 與 detail 重新計算'],
        [
          `${changed.length} of ${DAYS_IN_MONTH} cells get new prices, in order`,
          `${DAYS_IN_MONTH} 格中 ${changed.length} 格依序換新價格`,
        ],
        ['holidayMap never ran: nothing it reads changed', 'holidayMap 沒有重跑：它讀的值沒變'],
      ];
    }
    if (mode === 'country') {
      const prev = this.before()?.days;
      const only =
        changed.length === 1 && prev
          ? ([
              `Only Dec ${changed[0].day} changes: ${money(prev[changed[0].day - 1].price)} → ${money(changed[0].price)}`,
              `只有 12/${changed[0].day} 改變：${money(prev[changed[0].day - 1].price)} → ${money(changed[0].price)}`,
            ] as Bi)
          : ([`${changed.length} days change`, `${changed.length} 天改變`] as Bi);
      return [
        [
          `Country → ${country}: request ${country} ${YEAR}`,
          `國家切到 ${country}：請求 ${country} ${YEAR}`,
        ],
        ['Waiting for the API…', '等待 API 回應…'],
        ['holidays is written', '寫入 holidays'],
        ['holidays → holidayMap recomputes', 'holidays → holidayMap 重新計算'],
        ['holidayMap → days and detail recompute', 'holidayMap → days 與 detail 重新計算'],
        only,
      ];
    }
    return [
      [`selectedDate = ${dayLabel(sel, 'en')}`, `selectedDate = ${dayLabel(sel, 'zh')}`],
      ['selectedDate → detail recomputes', 'selectedDate → detail 重新計算'],
      ['days untouched: no cell re-renders', 'days 不動：沒有日期格重畫'],
    ];
  });

  readonly caption = computed(() =>
    pick(this.captions()[this.timeline.index()] ?? ['', ''], this.lang()),
  );

  readonly result = computed(() => {
    const t = this.t().f2;
    const reran = this.reran();
    const rr = COMPUTED_IDS.filter((id) => reran.has(id));
    const ut = COMPUTED_IDS.filter((id) => !reran.has(id));
    return {
      reran: rr.join(', ') || t.none,
      untouched: ut.join(', ') || t.none,
      changed: t.changed(this.changedDays().length, DAYS_IN_MONTH),
    };
  });

  readonly baseValue = computed(() => this.draft() ?? this.engine.config().baseRate);

  readonly code = [
    '// pricing-engine.service.ts',
    'private readonly _config = signal<PricingConfig>(DEFAULT_PRICING_CONFIG);',
    'readonly rules = computed(() => [new WeekendRule(c.weekendMultiplier), …]);',
    '',
    '// holiday.service.ts',
    'private readonly _holidays = signal<Holiday[]>([]);',
    'readonly holidayMap = computed(() => /* Map keyed by yyyy-mm-dd */);',
    '',
    '// this figure',
    'readonly selectedDate = signal(new Date(2026, 11, 25));',
    'readonly days = computed(() => dates.map((d) => engine.calculate(d, holidays.isHoliday(d), …)));',
    'readonly detail = computed(() => engine.calculate(selectedDate(), …));',
  ].join('\n');

  readonly frame = computed(() => this.draw(this.timeline.frame()));

  constructor() {
    this.handler.plan = () => ({ latencyMs: 400, outcome: 'ok' });
    // Start one step behind so the first replay shows a real base-rate change (90 → 100).
    this.engine.updateConfig({ baseRate: 90 });
    this.holidays.loadHolidays(YEAR);

    this.watch('config', () => this.engine.config());
    this.watch('holidays', () => this.holidays.holidays());
    this.watch('selectedDate', () => this.selectedDate());
    this.watch('rules', () => this.engine.rules());
    this.watch('holidayMap', () => this.holidays.holidayMap());
    this.watch('days', () => this.days());
    this.watch('detail', () => this.detail());

    // Once US holidays arrive and every counter has settled, record the intro change.
    const intro = effect(() => {
      if (!this.holidays.holidays().length) return;
      intro.destroy();
      this.introTimer = setTimeout(() =>
        this.change('base', () => this.engine.updateConfig({ baseRate: 100 }), false),
      );
    });

    inject(DestroyRef).onDestroy(() => {
      clearTimeout(this.draftTimer);
      clearTimeout(this.introTimer);
    });
    this.timeline.setDurations(RUNS.base.durations);
  }

  /** Base-rate slider: waits for the user to stop dragging before committing. */
  onBaseInput(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.draft.set(value);
    clearTimeout(this.draftTimer);
    this.draftTimer = setTimeout(() => {
      this.draft.set(null);
      if (value !== this.engine.config().baseRate)
        this.change('base', () => this.engine.updateConfig({ baseRate: value }));
    }, 250);
  }

  setCountry(code: string): void {
    if (code === this.holidays.countryCode()) return;
    this.change('country', () => {
      this.holidays.setCountryCode(code);
      this.holidays.loadHolidays(YEAR);
    });
  }

  select(day: number): void {
    this.change('day', () => this.selectedDate.set(new Date(YEAR, MONTH, day)));
  }

  /** Snapshots the "before" state, applies a real change, and replays the matching animation. */
  private change(mode: Mode, apply: () => void, autoplay = true): void {
    this.baseline.set(this.counts());
    this.before.set({
      days: this.days(),
      detail: this.detail(),
      sel: this.selectedDate().getDate(),
      country: this.holidays.countryCode(),
    });
    this.mode.set(mode);
    this.timeline.setDurations(RUNS[mode].durations);
    apply();
    this.timeline.restart(autoplay && !this.timeline.reduced());
  }

  private watch(id: NodeId, read: () => unknown): void {
    effect(() => {
      read();
      untracked(() => this.counts.update((c) => ({ ...c, [id]: c[id] + 1 })));
    });
  }

  private draw(te: number) {
    const narrow = this.layout.narrow();
    const g = narrow ? GEOMETRY.narrow : GEOMETRY.wide;
    const lang = this.lang();
    const zi = lang === 'zh' ? 1 : 0;
    const mode = this.mode();
    const run = RUNS[mode];
    const reran = this.reran();
    const before = this.before();
    const base = this.baseline();
    const counts = this.counts();
    const box = (id: NodeId) => {
      const [x, y] = g.pos[id];
      return { x, y, w: g.w, h: g.h };
    };
    const hitAt = (id: NodeId) => run.hits[id];
    const isLit = (id: NodeId) => {
      const at = hitAt(id);
      return at !== undefined && reran.has(id) && te >= at;
    };

    const edges = EDGES.map(([a, b]) => {
      const A = box(a);
      const B = box(b);
      let d: string;
      if (narrow) {
        const [x1, y1, x2, y2] = [A.x + A.w / 2, A.y + A.h, B.x + B.w / 2, B.y];
        const m = (y1 + y2) / 2;
        d = `M${x1} ${y1} C${x1} ${m} ${x2} ${m} ${x2} ${y2}`;
      } else {
        const [x1, y1, x2, y2] = [A.x + A.w, A.y + A.h / 2, B.x, B.y + B.h / 2];
        const m = (x1 + x2) / 2;
        d = `M${x1} ${y1} C${m} ${y1} ${m} ${y2} ${x2} ${y2}`;
      }
      const win = reran.has(b) ? run.edges[`${a}>${b}`] : undefined;
      let pop = 0;
      let offset = 14;
      let done = false;
      if (win) {
        if (te >= win[0] && te <= win[1]) {
          pop = 1;
          offset = 14 - inOut(seg(te, win[0], win[1])) * 114;
        }
        done = te > win[1];
      }
      return {
        d,
        op: win ? 1 : 0.35,
        stroke: done ? '#1976d2' : '#c9c6bd',
        baseOp: done ? 0.7 : 1,
        pop,
        glow: pop * 0.22,
        offset: offset.toFixed(2),
      };
    });

    const texts: SvgText[] = [];
    const nodes = NODES.map(([id, kind]) => {
      const B = box(id);
      const involved = hitAt(id) !== undefined;
      const lit = isLit(id);
      const age = lit ? te - hitAt(id)! : -1;
      const ring = age >= 0 && age < 600 ? age / 600 : -1;
      const grow = ring >= 0 ? 10 * outE(ring) : 0;
      const waiting = mode === 'country' && id === 'holidays' && te >= 500 && te < 1900;
      const shown = base ? base[id] + (lit ? counts[id] - base[id] : 0) : counts[id];
      const ccx = narrow ? B.x + B.w - 4 : B.x + B.w - 18;
      const ccy = narrow ? B.y + 4 : B.y + B.h / 2;
      const nx = B.x + (narrow ? 8 : 14);
      const op = involved ? 1 : 0.35;
      texts.push({
        x: nx,
        y: B.y + (narrow ? 19 : 21),
        anchor: 'start',
        text: id,
        size: g.fs,
        weight: 700,
        fill: lit ? '#1976d2' : '#1d1d1f',
        op,
      });
      texts.push({
        x: nx,
        y: B.y + (narrow ? 33 : 36),
        anchor: 'start',
        text: waiting ? this.t().f2.waiting : kind.toUpperCase(),
        size: g.sfs,
        ls: 1,
        fill: waiting ? '#1976d2' : '#6b6b70',
        op,
      });
      texts.push({
        x: ccx,
        y: ccy + 4,
        text: String(shown),
        size: narrow ? 9 : 11,
        weight: 700,
        fill: lit ? '#ffffff' : '#6b6b70',
        op,
      });
      return {
        id,
        ...B,
        op,
        lit,
        fill: lit ? '#e3effb' : '#ffffff',
        stroke: lit ? '#1976d2' : '#1d1d1f',
        dash: kind === 'computed' ? '5 4' : null,
        ring: {
          x: B.x - grow,
          y: B.y - grow,
          w: B.w + 2 * grow,
          h: B.h + 2 * grow,
          op: ring >= 0 ? (0.9 * (1 - ring)).toFixed(3) : 0,
        },
        shimmer: waiting ? (0.12 + 0.1 * Math.sin(te / 110)).toFixed(3) : 0,
        counter: {
          cx: ccx,
          cy: ccy,
          r: narrow ? 9 : 11,
          fill: lit ? '#1976d2' : '#ffffff',
          stroke: lit ? '#1976d2' : '#c9c6bd',
        },
      };
    });

    // Calendar: each cell shows its old value until its moment in the replay.
    const current = this.days();
    const changed = new Set(this.changedDays().map((c) => c.day));
    const reveal = (day: number): number | null => {
      if (!before) return null;
      if (mode === 'base') return CELL_REVEAL_BASE + (day - 1) * 40;
      if (mode === 'country') return changed.has(day) ? CELL_REVEAL_COUNTRY : null;
      return null;
    };
    const selHit = run.hits.selectedDate;
    const selected =
      mode === 'day' && before && selHit !== undefined && te < selHit
        ? before.sel
        : this.selectedDate().getDate();
    const lead = new Date(YEAR, MONTH, 1).getDay();
    const cells = current.map((cell) => {
      const at = reveal(cell.day);
      const useNew = at === null || te >= at || !before;
      const shown = useNew ? cell : before!.days[cell.day - 1];
      const age = at !== null && changed.has(cell.day) ? te - at : -1;
      const flash = age >= 0 && age < 600 ? 1 - age / 600 : 0;
      return {
        day: cell.day,
        price: '$' + Math.round(shown.price),
        holiday: shown.holiday,
        weekend: cell.weekend,
        selected: cell.day === selected,
        flash: flash > 0 ? `rgba(25, 118, 210, ${(0.3 * flash).toFixed(3)})` : null,
        label: `${dayLabel(cell.day, lang)} ${shown.holiday ?? ''} ${money(shown.price)}`,
      };
    });

    const detailHit = run.hits.detail;
    const useNewDetail =
      !before || detailHit === undefined || (reran.has('detail') && te >= detailHit);
    const d = useNewDetail ? this.detail() : before!.detail;
    const parts = d.adjustments.map(
      (a) => ` × ${a.multiplier} ${pick(ADJ_NAME[a.ruleName] ?? [a.ruleName, a.ruleName], lang)}`,
    );
    const detail = `${dayLabel(d.date.getDate(), lang)} · ${money(d.finalRate)} = ${money(d.baseRate)}${parts.join('')}`;

    return {
      vb: g.vb,
      edges,
      nodes,
      texts,
      cells,
      lead: Array.from({ length: lead }, (_, i) => i),
      detail,
      country: `${useNewDetail || mode !== 'country' ? this.holidays.countryCode() : before!.country} ${this.t().f2.holidays}`,
      zi,
    };
  }
}
