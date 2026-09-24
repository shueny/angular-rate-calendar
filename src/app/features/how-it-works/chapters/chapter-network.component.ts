import {
  ChangeDetectionStrategy,
  Component,
  EnvironmentInjector,
  OnDestroy,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { AnimationClock } from '../motion/animation-clock.service';
import { AutoplayDirective } from '../motion/autoplay.directive';
import { HiwLayout } from '../motion/layout.service';
import { Fragment, SvgText, TONE, ToneKey, fragments, inOut, pick, seg } from '../motion/motion';
import { PlayerComponent } from '../motion/player.component';
import { Lang, TEXT } from '../i18n';
import {
  Recording,
  SCENARIO_IDS,
  ScenarioFacts,
  ScenarioId,
  recordScenario,
} from './network-recorder';
import { SCENARIO_LABELS, UiState, buildScript } from './network-script';

const STATIONS = [
  { name: 'UI', sub: 'RateCalendarComponent' },
  { name: 'HolidayService', sub: 'loadHolidays(year)' },
  { name: 'Cache', sub: null },
  { name: 'Holiday API', sub: 'Nager.Date', ext: true },
];

@Component({
  selector: 'app-chapter-network',
  imports: [PlayerComponent, AutoplayDirective],
  templateUrl: './chapter-network.component.html',
  styleUrl: './chapter-network.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChapterNetworkComponent implements OnInit, OnDestroy {
  readonly lang = input.required<Lang>();
  readonly t = computed(() => TEXT[this.lang()]);

  private readonly parent = inject(EnvironmentInjector);
  private readonly layout = inject(HiwLayout);
  readonly timeline = inject(AnimationClock).timeline();

  readonly scenarioIds = SCENARIO_IDS;
  readonly labels = SCENARIO_LABELS;
  readonly scenario = signal<ScenarioId>('normal');
  readonly open = signal(false);
  /** Results of running each scenario against the real HolidayService. */
  readonly facts = signal<Partial<Record<ScenarioId, ScenarioFacts>>>({});
  private recordings: Recording[] = [];

  readonly script = computed(() => buildScript(this.scenario(), this.facts()[this.scenario()]));
  readonly caption = computed(() =>
    pick(this.script().steps[this.timeline.index()]?.caption ?? ['', ''], this.lang()),
  );
  readonly frame = computed(() => this.draw(this.timeline.frame()));

  constructor() {
    this.timeline.setDurations(this.script().steps.map((s) => s.dur));
  }

  ngOnInit(): void {
    for (const id of SCENARIO_IDS) {
      const recording = recordScenario(this.parent, id);
      this.recordings.push(recording);
      void recording.facts.then((f) => this.facts.update((all) => ({ ...all, [id]: f })));
    }
  }

  ngOnDestroy(): void {
    this.recordings.forEach((r) => r.dispose());
  }

  pickScenario(id: ScenarioId): void {
    this.scenario.set(id);
    this.timeline.setDurations(this.script().steps.map((s) => s.dur));
    this.timeline.restart(!this.timeline.reduced());
  }

  private draw(te: number) {
    const narrow = this.layout.narrow();
    const lang = this.lang();
    const t = this.t().f3;
    const s = this.script();
    const LAT = narrow ? 115 : 62;
    const pos = (k: number) => (narrow ? 60 + k * 146 : 100 + k * 226.67);
    const P = (k: number, lat: number): [number, number] =>
      narrow ? [175 + lat, pos(k)] : [pos(k), 145 + lat];
    const texts: SvgText[] = [];

    const frames = (
      narrow
        ? [
            { x: 4, y: 4, w: 342, h: 414, label: t.app, lx: 10, ly: -6, ext: false },
            { x: 4, y: 434, w: 342, h: 122, label: t.external, lx: 10, ly: 568, ext: true },
          ]
        : [
            { x: 4, y: 36, w: 656, h: 232, label: t.app, lx: 8, ly: 28, ext: false },
            { x: 680, y: 36, w: 196, h: 232, label: t.external, lx: 684, ly: 28, ext: true },
          ]
    ).map((f) => {
      texts.push({
        x: f.lx,
        y: f.ly,
        anchor: 'start',
        text: f.label,
        size: 10,
        weight: 600,
        ls: 1.4,
        fill: '#6b6b70',
      });
      return {
        ...f,
        fill: f.ext ? '#f3f2ed' : '#ffffff',
        stroke: f.ext ? '#b9b6ad' : '#e2e0da',
        dash: f.ext ? '4 4' : null,
      };
    });

    const rails = (['req', 'res'] as const).map((lane) => {
      const lat = lane === 'req' ? -LAT : LAT;
      const a = P(-0.2, lat);
      const b = P(3.2, lat);
      const tip = lane === 'req' ? b : a;
      const dir = lane === 'req' ? 1 : -1;
      const arrow = narrow
        ? `M${tip[0] - 5} ${tip[1] - 7 * dir} L${tip[0]} ${tip[1]} L${tip[0] + 5} ${tip[1] - 7 * dir}`
        : `M${tip[0] - 7 * dir} ${tip[1] - 5} L${tip[0]} ${tip[1]} L${tip[0] - 7 * dir} ${tip[1] + 5}`;
      const label = lane === 'req' ? t.request : t.response;
      if (narrow) {
        const y = P(-0.28, lat)[1];
        texts.push(
          lane === 'req'
            ? { x: 8, y, anchor: 'start', text: label, size: 9, ls: 1.2, fill: '#9a9a9f' }
            : { x: 342, y, anchor: 'end', text: label, size: 9, ls: 1.2, fill: '#9a9a9f' },
        );
      } else {
        texts.push({
          x: 6,
          y: a[1] - 8,
          anchor: 'start',
          text: label,
          size: 9,
          ls: 1.2,
          fill: '#9a9a9f',
        });
      }
      return { d: `M${a[0]} ${a[1]} L${b[0]} ${b[1]}`, arrow };
    });

    const cache = [...s.cache0];
    for (const [at, key] of s.cache) if (te >= at && !cache.includes(key)) cache.push(key);

    const stations = STATIONS.map((st, k) => {
      const c = pos(k);
      const w = narrow ? 100 : 150;
      const h = narrow ? 64 : 70;
      const x = narrow ? 125 : c - 75;
      const y = narrow ? c - 32 : 110;
      const cx = x + w / 2;
      const cy = y + h / 2;
      let flash: (typeof s.flashes)[number] | null = null;
      for (const f of s.flashes) if (f.station === k && te >= f.at && te < f.at + f.dur) flash = f;
      const tone = flash ? TONE[flash.tone] : null;
      let status = st.sub ?? (cache.length ? cache.join(' · ') : t.empty);
      let ring: { x: number; y: number; offset: number } | null = null;
      let statusX = cx;
      if (k === 3 && s.ring && te >= s.ring[0] && te < s.ring[1]) {
        const p = (te - s.ring[0]) / (s.ring[1] - s.ring[0]);
        ring = { x: cx - (narrow ? 36 : 44), y: cy + 10, offset: 100 * p };
        status = `${(10 * (1 - p)).toFixed(1)} s`;
        statusX = cx + 8;
      }
      if (flash) status = flash.label;
      const dimApi = k === 3 && this.scenario() === 'cached';
      texts.push({
        x: cx,
        y: cy - 4,
        text: st.name,
        size: narrow ? 11 : 12,
        weight: 700,
        fill: '#1d1d1f',
      });
      texts.push({
        x: statusX,
        y: cy + 14,
        text: status,
        size: narrow ? 8 : 10,
        weight: flash ? 700 : 400,
        ls: 0.5,
        fill: tone ? tone.text : '#6b6b70',
      });
      return {
        k,
        x,
        y,
        w,
        h,
        fill: tone ? tone.fill : dimApi ? '#f2f1ec' : '#ffffff',
        stroke: tone ? tone.stroke : st.ext ? '#6b6b70' : '#1d1d1f',
        dash: st.ext ? '4 3' : null,
        ring,
      };
    });

    let shield: {
      transform: string;
      op: number;
      color: string;
      bar: { x: number; y: number; w: number; h: number };
      icon: string;
    } | null = null;
    if (s.shield && te >= s.shield.from - 100) {
      const [x, y] = P(s.shield.k, LAT);
      const hit = te >= s.shield.hit;
      const color = hit ? '#c62828' : '#a15c00';
      shield = {
        transform: `translate(${x} ${y})`,
        op: seg(te, s.shield.from - 100, s.shield.from + 100),
        color,
        bar: narrow ? { x: -56, y: -2, w: 112, h: 4 } : { x: -2, y: -24, w: 4, h: 48 },
        icon: narrow ? 'translate(-10 -26) scale(0.85)' : 'translate(-10 -50) scale(0.85)',
      };
      texts.push({
        x,
        y: y + (narrow ? 20 : 40),
        text: 'STALE',
        size: 10,
        weight: 700,
        ls: 1.5,
        fill: color,
        op: hit ? seg(te, s.shield.hit, s.shield.hit + 200) : 0.55,
      });
    }

    const packets: {
      transform: string;
      op: number;
      w: number;
      fill: string;
      stroke: string;
      flap: string;
    }[] = [];
    const frags: Fragment[] = [];
    s.packets.forEach((pk) => {
      const t0 = pk.kf[0][0];
      if (te < t0) return;
      let k = pk.kf[pk.kf.length - 1][1];
      let segment = pk.kf.length - 1;
      for (let j = 0; j < pk.kf.length - 1; j++) {
        const [ta, ka] = pk.kf[j];
        const [tb, kb] = pk.kf[j + 1];
        if (te <= tb) {
          k = ka + (kb - ka) * inOut(seg(te, ta, tb));
          segment = j;
          break;
        }
      }
      const [x, y] = P(k, pk.lane === 'req' ? -LAT : LAT);
      const toneKey: ToneKey = pk.recolor && te >= pk.recolor[0] ? pk.recolor[1] : pk.tone;
      const T = TONE[toneKey];
      if (pk.fizzle && te >= pk.fizzle.t) {
        const age = te - pk.fizzle.t;
        frags.push(...fragments(x, y, age, T.stroke));
        if (age < 1400) {
          texts.push({
            x,
            y: y - 22 - Math.min(age, 700) * 0.02,
            text: pk.fizzle.text,
            size: 11,
            weight: 700,
            fill: '#c62828',
            op: age < 1000 ? 1 : 1 - (age - 1000) / 400,
          });
        }
        return;
      }
      if (te > pk.end) return;
      const fade = pk.fade ?? 150;
      const op = Math.min(seg(te, t0, t0 + 120), 1 - seg(te, pk.end - fade, pk.end));
      const w = Math.max(72, pk.label.length * 6.2 + 20);
      packets.push({
        transform: `translate(${x.toFixed(1)} ${y.toFixed(1)})`,
        op,
        w,
        fill: T.fill,
        stroke: T.stroke,
        flap: `M${-w / 2} -14 L0 -4 L${w / 2} -14`,
      });
      texts.push({ x, y: y + 9, text: pk.label, size: 10, weight: 600, fill: T.text, op });
      const note = pk.notes?.[segment];
      if (note) {
        const ny = pk.lane === 'req' ? (narrow ? y + 30 : y - 22) : y + 30;
        texts.push({
          x,
          y: ny,
          text: pick(note, lang),
          size: narrow ? 10 : 11,
          weight: 600,
          fill: T.text === '#1d1d1f' ? '#1976d2' : T.text,
          op,
          sans: true,
          halo: true,
        });
      }
    });

    texts.push(
      narrow
        ? { x: 346, y: 422, anchor: 'end', text: t.network, size: 9, ls: 1.2, fill: '#6b6b70' }
        : { x: 670, y: 294, text: t.network, size: 9, ls: 1.2, fill: '#6b6b70' },
    );

    let ui: UiState = {};
    for (const [at, v] of s.ui) if (te >= at) ui = { ...ui, ...v };
    const card = [
      { label: t.country, value: ui.c, color: '#1d1d1f', cls: 'country' },
      { label: t.onScreen, value: ui.s, color: ui.s === '—' ? '#6b6b70' : '#1b7f4b', cls: 'shown' },
      {
        label: t.loading,
        value: ui.l,
        color: ui.l === 'true' ? '#1976d2' : '#1d1d1f',
        cls: 'loading',
      },
      { label: t.error, value: ui.e, color: ui.e === '—' ? '#6b6b70' : '#c62828', cls: 'error' },
    ];

    return {
      vb: narrow ? '0 0 350 596' : '0 0 880 302',
      offset: `translate(0 ${narrow ? 20 : 4})`,
      boundary: narrow ? 'M0 426 L350 426' : 'M670 24 L670 280',
      frames,
      rails,
      stations,
      shield,
      packets,
      frags,
      texts,
      card,
      log: s.log.map(([at, text]) => ({ t: (at / 1000).toFixed(2) + 's', text, done: te >= at })),
    };
  }
}
