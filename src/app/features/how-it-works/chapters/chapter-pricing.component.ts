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
import { PricingEngineService } from '../../../core/pricing-engine/pricing-engine.service';
import { PricingConfig } from '../../../core/pricing-engine/pricing-rule.model';
import { AnimationClock } from '../motion/animation-clock.service';
import { AutoplayDirective } from '../motion/autoplay.directive';
import { HiwLayout } from '../motion/layout.service';
import { Bi, SvgText, inOut, money, outE, pick, seg } from '../motion/motion';
import { PlayerComponent } from '../motion/player.component';
import { Lang, TEXT } from '../i18n';

export interface PricingPreset {
  id: string;
  date: Date;
  chip: Bi;
  short: Bi;
  weekday: Bi;
  month: Bi;
  holiday?: string;
}

export const PRICING_PRESETS: PricingPreset[] = [
  {
    id: 'mar10',
    date: new Date(2026, 2, 10),
    chip: ['Tue Mar 10', '3/10（二）'],
    short: ['Tue, Mar 10', '3/10（二）'],
    weekday: ['TUE', '週二'],
    month: ['MAR', '3 月'],
  },
  {
    id: 'mar14',
    date: new Date(2026, 2, 14),
    chip: ['Sat Mar 14', '3/14（六）'],
    short: ['Sat, Mar 14', '3/14（六）'],
    weekday: ['SAT', '週六'],
    month: ['MAR', '3 月'],
  },
  {
    id: 'dec25',
    date: new Date(2026, 11, 25),
    chip: ['Fri Dec 25 · Christmas', '12/25（五）聖誕節'],
    short: ['Fri, Dec 25', '12/25（五）'],
    weekday: ['FRI', '週五'],
    month: ['DEC', '12 月'],
    holiday: 'Christmas Day',
  },
  {
    id: 'jul4',
    date: new Date(2026, 6, 4),
    chip: ['Sat Jul 4 · Independence Day', '7/4（六）獨立紀念日'],
    short: ['Sat, Jul 4', '7/4（六）'],
    weekday: ['SAT', '週六'],
    month: ['JUL', '7 月'],
    holiday: 'Independence Day',
  },
];

type MultiplierKey = 'weekendMultiplier' | 'holidayMultiplier' | 'peakSeasonMultiplier';

/** How each real rule (by its `name`) is drawn. */
const RULE_VIEW: Record<string, { name: Bi; cond: Bi; key: MultiplierKey; code: string }> = {
  'Weekend Surcharge': {
    name: ['Weekend', '週末'],
    cond: ['SAT · SUN', '週六 · 週日'],
    key: 'weekendMultiplier',
    code: '// weekend-rule.ts\nif (!context.isWeekend) return null;',
  },
  'Holiday Surcharge': {
    name: ['Holiday', '國定假日'],
    cond: ['PUBLIC HOLIDAY', '國定假日'],
    key: 'holidayMultiplier',
    code: '// holiday-rule.ts\nif (!context.isHoliday) return null;',
  },
  'Peak Season Surcharge': {
    name: ['Peak season', '旺季'],
    cond: ['JUN JUL AUG DEC', '6、7、8、12 月'],
    key: 'peakSeasonMultiplier',
    code: '// peak-season-rule.ts\nconst month = context.date.getMonth() + 1;\nif (!this.peakMonths.includes(month)) return null;',
  },
};

const GEOMETRY = {
  wide: {
    vb: '0 0 880 270',
    horizontal: true,
    belt: 150,
    s0: 70,
    gates: [260, 450, 640],
    cell: 800,
    by: 86,
    cs: 96,
  },
  narrow: {
    vb: '0 0 380 620',
    horizontal: false,
    belt: 200,
    s0: 44,
    gates: [160, 290, 420],
    cell: 555,
    by: 92,
    cs: 90,
  },
};

export const PRICING_DURATIONS = [700, 1600, 1600, 1600, 900];
const GATE_START = 700;
const GATE_MS = 1600;
const STAMP_START = GATE_START + 3 * GATE_MS;

const STATE_STROKE = { idle: '#1d1d1f', check: '#1976d2', open: '#1b7f4b', skip: '#b9b6ad' };
const STATE_DOOR = { idle: '#f0efea', check: '#e3effb', open: '#e6f2eb', skip: '#eeede8' };
const STATE_LABEL = { idle: '#1d1d1f', check: '#1976d2', open: '#1b7f4b', skip: '#9a9a9f' };

@Component({
  selector: 'app-chapter-pricing',
  imports: [PlayerComponent, AutoplayDirective],
  templateUrl: './chapter-pricing.component.html',
  providers: [PricingEngineService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChapterPricingComponent {
  readonly lang = input.required<Lang>();
  readonly t = computed(() => TEXT[this.lang()]);

  readonly engine = inject(PricingEngineService);
  private readonly layout = inject(HiwLayout);
  readonly timeline = inject(AnimationClock).timeline();

  readonly presets = PRICING_PRESETS;
  readonly preset = signal(PRICING_PRESETS[2]);
  readonly open = signal(false);

  readonly sliders = computed(() => {
    const t = this.t().f1;
    const c = this.engine.config();
    const mult = (key: MultiplierKey, label: string) => ({
      key,
      label,
      min: 1,
      max: 2,
      step: 0.05,
      value: c[key],
      text: c[key].toFixed(2),
    });
    return [
      {
        key: 'baseRate' as const,
        label: t.base,
        min: 50,
        max: 300,
        step: 10,
        value: c.baseRate,
        text: '$' + c.baseRate,
      },
      mult('weekendMultiplier', t.weekend),
      mult('holidayMultiplier', t.holiday),
      mult('peakSeasonMultiplier', t.peak),
    ];
  });

  /** The engine's real answer for the chosen day, as prices after each rule. */
  readonly model = computed(() => {
    const p = this.preset();
    const config = this.engine.config();
    const result = this.engine.calculate(p.date, p.holiday !== undefined, p.holiday);
    const prices = [result.baseRate];
    const rules = this.engine.rules().map((rule, j) => {
      const adjustment = result.adjustments.find((a) => a.ruleName === rule.name);
      prices.push(adjustment ? prices[j] * adjustment.multiplier : prices[j]);
      const view = RULE_VIEW[rule.name];
      return {
        view,
        applies: !!adjustment,
        multiplier: adjustment?.multiplier ?? config[view.key],
      };
    });
    return { prices, rules, final: result.finalRate };
  });

  readonly captions = computed<Bi[]>(() => {
    const m = this.model();
    const short = this.preset().short;
    return [
      [`Start from the base rate: ${money(m.prices[0])}`, `從基本房價開始：${money(m.prices[0])}`],
      ...m.rules.map(({ view, applies, multiplier }): Bi => {
        const x = '×' + multiplier.toFixed(2);
        return applies
          ? [`${view.name[0]}? Yes → ${x}`, `${view.name[1]}？是 → ${x}`]
          : [`${view.name[0]}? No → skipped`, `${view.name[1]}？否 → 略過`];
      }),
      [`Stamp ${money(m.final)} onto ${short[0]}`, `把 ${money(m.final)} 蓋到 ${short[1]}`],
    ];
  });

  readonly caption = computed(() =>
    pick(this.captions()[this.timeline.index()] ?? ['', ''], this.lang()),
  );

  readonly code = computed(() => {
    const m = this.model();
    const rules = m.rules.map(
      (r) =>
        `${r.view.code}\nreturn { ruleName: this.name, multiplier: ${r.multiplier.toFixed(2)}, … };`,
    );
    return [
      ...rules,
      '// pricing-engine.service.ts\nconst adjustments = this.rules()\n  .filter((rule) => rule.enabled)\n  .map((rule) => rule.apply(context))\n  .filter((adj) => adj !== null);\nconst finalRate = adjustments.reduce((rate, adj) => rate * adj.multiplier, baseRate);',
    ].join('\n\n');
  });

  readonly frame = computed(() => this.draw(this.timeline.frame()));

  constructor() {
    this.timeline.setDurations(PRICING_DURATIONS);
    // Every change of day or config replays the pipeline from the start.
    effect(() => {
      this.preset();
      this.engine.config();
      untracked(() => {
        if (this.timeline.t() > 0 || this.timeline.playing())
          this.timeline.restart(!this.timeline.reduced());
      });
    });
  }

  pickPreset(p: PricingPreset): void {
    this.preset.set(p);
  }

  setConfig(key: keyof PricingConfig, event: Event): void {
    this.engine.updateConfig({ [key]: Number((event.target as HTMLInputElement).value) });
  }

  private draw(te: number) {
    const narrow = this.layout.narrow();
    const g = narrow ? GEOMETRY.narrow : GEOMETRY.wide;
    const lang = this.lang();
    const zi = lang === 'zh' ? 1 : 0;
    const m = this.model();
    const p = this.preset();
    const P = (s: number, l: number): [number, number] =>
      g.horizontal ? [s, g.belt + l] : [g.belt + l, s];

    let s = g.s0;
    let lat = 0;
    let op = 1;
    let sc = 1;
    let price = m.prices[0];
    let counting = false;
    let badge: { op: number; sc: number; text: string } | null = null;
    let stamp = 0;

    if (te < GATE_START) {
      const a = outE(seg(te, 0, 400));
      op = a;
      sc = 0.8 + 0.2 * a;
    }
    const gi = te < GATE_START ? -1 : Math.min(Math.floor((te - GATE_START) / GATE_MS), 3);
    if (gi >= 0 && gi < 3) {
      const q0 = (te - GATE_START - gi * GATE_MS) / GATE_MS;
      const gate = g.gates[gi];
      const prevS = gi === 0 ? g.s0 : g.gates[gi - 1] + 60;
      const applies = m.rules[gi].applies;
      price = m.prices[gi];
      if (q0 < 0.35) s = prevS + (gate - 70 - prevS) * inOut(q0 / 0.35);
      else if (q0 < 0.5) s = gate - 70;
      else {
        const q = inOut(seg(q0, 0.5, 1));
        s = gate - 70 + 130 * q;
        if (!applies) lat = g.by * Math.sin(Math.PI * q);
      }
      if (applies && q0 >= 0.55) {
        const c = outE(seg(q0, 0.55, 0.95));
        price = m.prices[gi] + (m.prices[gi + 1] - m.prices[gi]) * c;
        counting = c < 1;
      }
      if (applies && q0 >= 0.62) {
        const a = outE(seg(q0, 0.62, 0.8));
        badge = {
          op: a * (1 - seg(q0, 0.92, 1)),
          sc: 0.7 + 0.3 * a,
          text: '×' + m.rules[gi].multiplier.toFixed(2),
        };
      }
    } else if (gi === 3) {
      const q = seg(te, STAMP_START, STAMP_START + 900);
      const from = g.gates[2] + 60;
      s = from + (g.cell - from) * inOut(seg(q, 0, 0.55));
      price = m.prices[3];
      op = 1 - seg(q, 0.55, 0.75);
      stamp = outE(seg(q, 0.55, 0.85));
    }

    const [tagX, tagY] = P(s, lat);
    const [badgeX, badgeY] = badge ? (g.horizontal ? P(s, -52) : P(s - 34, 0)) : [0, 0];

    const gates = m.rules.map((rule, j) => {
      const q = (te - GATE_START - j * GATE_MS) / GATE_MS;
      const [cx, cy] = P(g.gates[j], 0);
      let state: keyof typeof STATE_STROKE = 'idle';
      if (q >= 0.35 && q < 0.5) state = 'check';
      if (q >= 0.5) state = rule.applies ? 'open' : 'skip';
      const opened = state === 'open' ? seg(q, 0.5, 0.62) : 0;
      const greyed = state === 'skip' ? seg(q, 0.5, 0.6) : 0;
      return { j, cx, cy, state, opened, op: 1 - 0.5 * greyed, rule };
    });

    const bypass = gates.map((gate) => {
      const pts: string[] = [];
      for (let k = 0; k <= 16; k++) {
        const u = k / 16;
        const [x, y] = P(g.gates[gate.j] - 70 + 130 * u, g.by * Math.sin(Math.PI * u));
        pts.push(`${x.toFixed(1)} ${y.toFixed(1)}`);
      }
      return { d: 'M' + pts.join(' L'), stroke: gate.state === 'skip' ? '#6b6b70' : '#d6d3cb' };
    });

    const [ccx, ccy] = P(g.cell, 0);
    const top = ccy - g.cs / 2;
    const left = ccx - g.cs / 2;
    const [l1x, l1y] = P(g.s0 - 40, 0);
    const [l2x, l2y] = P(g.cell - g.cs / 2 - 6, 0);

    const texts: SvgText[] = [];
    for (const gate of gates) {
      const lab = narrow
        ? { x: gate.cx - 52, y1: gate.cy - 4, y2: gate.cy + 10, a: 'end' as const }
        : { x: gate.cx, y1: gate.cy - 88, y2: gate.cy - 74, a: 'middle' as const };
      const name = zi ? gate.rule.view.name[1] : gate.rule.view.name[0].toUpperCase();
      texts.push({
        x: lab.x,
        y: lab.y1,
        anchor: lab.a,
        text: name,
        size: 11,
        weight: 700,
        ls: 1.2,
        fill: STATE_LABEL[gate.state],
      });
      texts.push({
        x: lab.x,
        y: lab.y2,
        anchor: lab.a,
        text: gate.rule.view.cond[zi],
        size: 9.5,
        ls: 0.8,
        fill: '#6b6b70',
      });
      texts.push({
        x: gate.cx,
        y: gate.cy + 5,
        text: gate.state === 'skip' ? 'null' : '×' + gate.rule.multiplier.toFixed(2),
        size: 14,
        weight: 700,
        fill: STATE_LABEL[gate.state],
        op: 1 - gate.opened,
      });
    }
    const baseLabel = narrow
      ? { x: g.belt - 52, y: g.s0 + 4, anchor: 'end' as const }
      : { x: g.s0, y: g.belt - 30, anchor: 'middle' as const };
    texts.push({ ...baseLabel, text: this.t().f1.baseLabel, size: 9.5, ls: 1.2, fill: '#6b6b70' });
    texts.push({
      x: ccx,
      y: top + 17,
      text: `${p.weekday[zi]} · ${p.month[zi]}`,
      size: 9.5,
      ls: 1.2,
      fill: '#6b6b70',
    });
    texts.push({
      x: ccx,
      y: top + g.cs * 0.58,
      text: String(p.date.getDate()),
      size: 24,
      weight: 700,
      fill: '#1d1d1f',
      sans: true,
    });
    texts.push(
      stamp > 0
        ? {
            x: 0,
            y: 0,
            transform: `translate(${ccx} ${top + g.cs - 13}) scale(${(1.4 - 0.4 * stamp).toFixed(3)})`,
            text: money(m.final),
            size: 15,
            weight: 700,
            fill: '#1b7f4b',
            op: stamp,
          }
        : { x: ccx, y: top + g.cs - 13, text: '—', size: 15, weight: 700, fill: '#c9c6bd' },
    );
    texts.push({
      x: tagX + 6,
      y: tagY + 5,
      text: counting ? '$' + Math.round(price) : money(price),
      size: 15,
      weight: 700,
      fill: '#1d1d1f',
      op,
    });
    if (badge)
      texts.push({
        x: badgeX,
        y: badgeY + 4,
        text: badge.text,
        size: 12,
        weight: 700,
        fill: '#ffffff',
        op: badge.op,
      });

    return {
      vb: g.vb,
      belt: g.horizontal
        ? { x: g.s0 - 50, y: g.belt - 18, w: g.cell - (g.s0 - 50), h: 36 }
        : { x: g.belt - 18, y: g.s0 - 30, w: 36, h: g.cell - (g.s0 - 30) },
      beltLine: `M${l1x} ${l1y} L${l2x} ${l2y}`,
      beltOffset: (-te * 0.03).toFixed(1),
      bypass,
      gates: gates.map((gate) => ({
        op: gate.op,
        x: gate.cx - 38,
        y: gate.cy - 38,
        dx: gate.cx - 32,
        dy: gate.cy - 32,
        dh: (64 * (1 - gate.opened)).toFixed(1),
        stroke: STATE_STROKE[gate.state],
        door: STATE_DOOR[gate.state],
        state: gate.state,
      })),
      cell: {
        x: left,
        y: top,
        s: g.cs,
        stroke: stamp > 0 ? '#1d1d1f' : '#c9c6bd',
        sep: `M${left + 10} ${top + 25} L${left + g.cs - 10} ${top + 25}`,
        rcx: ccx,
        rcy: top + g.cs - 18,
        rr: (14 + 26 * stamp).toFixed(1),
        rop: stamp > 0 && stamp < 1 ? (1 - stamp).toFixed(3) : 0,
      },
      tag: `translate(${tagX.toFixed(1)} ${tagY.toFixed(1)}) scale(${sc.toFixed(3)})`,
      tagOp: op.toFixed(3),
      badge: `translate(${badgeX.toFixed(1)} ${badgeY.toFixed(1)}) scale(${(badge?.sc ?? 1).toFixed(3)})`,
      badgeOp: (badge?.op ?? 0).toFixed(3),
      texts,
    };
  }
}
