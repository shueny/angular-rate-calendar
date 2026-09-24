import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { AnimationClock } from './motion/animation-clock.service';
import { HiwLayout } from './motion/layout.service';
import { SvgText } from './motion/motion';
import { Lang, TEXT } from './i18n';

interface MapNode {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  name: string;
  sub: string;
  chapter: number;
  rule?: boolean;
  ext?: boolean;
}

interface MapEdge {
  id: string;
  a: string;
  b: string;
  d: string;
  both?: boolean;
}

interface MapGeometry {
  vb: string;
  fs: number;
  nodes: MapNode[];
  edges: MapEdge[];
}

const node = (
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  name: string,
  sub: string,
  chapter: number,
  extra: Partial<MapNode> = {},
): MapNode => ({ id, x, y, w, h, name, sub, chapter, ...extra });

const WIDE: MapGeometry = {
  vb: '0 0 880 300',
  fs: 13,
  nodes: [
    node('ui', 16, 130, 196, 56, 'RateCalendarComponent', 'COMPONENT', 2),
    node('engine', 290, 40, 210, 56, 'PricingEngineService', 'SERVICE', 1),
    node('we', 600, 10, 190, 44, 'Weekend rule', '', 1, { rule: true }),
    node('hol', 600, 70, 190, 44, 'Holiday rule', '', 1, { rule: true }),
    node('peak', 600, 130, 190, 44, 'Peak season rule', '', 1, { rule: true }),
    node('svc', 290, 224, 210, 56, 'HolidayService', 'SERVICE', 3),
    node('cache', 560, 224, 110, 56, 'Cache', 'MAP', 3),
    node('api', 720, 224, 150, 56, 'Holiday API', 'NAGER.DATE', 3, { ext: true }),
  ],
  edges: [
    { id: 'ui-engine', a: 'ui', b: 'engine', both: true, d: 'M212 150 C251 150 251 68 290 68' },
    { id: 'svc-ui', a: 'svc', b: 'ui', d: 'M290 252 C251 252 251 168 212 168' },
    { id: 'engine-we', a: 'engine', b: 'we', d: 'M500 68 C550 68 550 32 600 32' },
    { id: 'engine-hol', a: 'engine', b: 'hol', d: 'M500 68 C550 68 550 92 600 92' },
    { id: 'engine-peak', a: 'engine', b: 'peak', d: 'M500 68 C550 68 550 152 600 152' },
    { id: 'svc-cache', a: 'svc', b: 'cache', both: true, d: 'M500 252 H560' },
    { id: 'cache-api', a: 'cache', b: 'api', both: true, d: 'M670 252 H720' },
  ],
};

const NARROW: MapGeometry = {
  vb: '0 0 340 380',
  fs: 11,
  nodes: [
    node('ui', 80, 6, 180, 48, 'RateCalendarComponent', 'COMPONENT', 2),
    node('engine', 6, 110, 162, 48, 'PricingEngineService', 'SERVICE', 1),
    node('svc', 182, 110, 152, 48, 'HolidayService', 'SERVICE', 3),
    node('we', 30, 200, 138, 38, 'Weekend rule', '', 1, { rule: true }),
    node('hol', 30, 252, 138, 38, 'Holiday rule', '', 1, { rule: true }),
    node('peak', 30, 304, 138, 38, 'Peak season rule', '', 1, { rule: true }),
    node('cache', 208, 206, 100, 44, 'Cache', 'MAP', 3),
    node('api', 188, 296, 140, 48, 'Holiday API', 'NAGER.DATE', 3, { ext: true }),
  ],
  edges: [
    { id: 'ui-engine', a: 'ui', b: 'engine', both: true, d: 'M135 54 C135 82 87 82 87 110' },
    { id: 'svc-ui', a: 'svc', b: 'ui', d: 'M258 110 C258 82 205 82 205 54' },
    { id: 'engine-we', a: 'engine', b: 'we', d: 'M18 158 V219 H30' },
    { id: 'engine-hol', a: 'engine', b: 'hol', d: 'M18 158 V271 H30' },
    { id: 'engine-peak', a: 'engine', b: 'peak', d: 'M18 158 V323 H30' },
    { id: 'svc-cache', a: 'svc', b: 'cache', both: true, d: 'M258 158 V206' },
    { id: 'cache-api', a: 'cache', b: 'api', both: true, d: 'M258 250 V296' },
  ],
};

/** Which links light up when a box is hovered. */
export const HERO_PATHS: Record<string, string[]> = {
  ui: ['ui-engine', 'svc-ui'],
  engine: ['ui-engine', 'engine-we', 'engine-hol', 'engine-peak'],
  we: ['engine-we', 'ui-engine'],
  hol: ['engine-hol', 'ui-engine'],
  peak: ['engine-peak', 'ui-engine'],
  svc: ['svc-ui', 'svc-cache', 'cache-api'],
  cache: ['svc-cache', 'cache-api', 'svc-ui'],
  api: ['cache-api', 'svc-cache', 'svc-ui'],
};

@Component({
  selector: 'app-hero-map',
  templateUrl: './hero-map.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroMapComponent {
  readonly lang = input.required<Lang>();
  /** Emits the chapter number of a clicked box. */
  readonly go = output<number>();

  private readonly layout = inject(HiwLayout);
  private readonly reduced = inject(AnimationClock).reduced;
  readonly hover = signal<string | null>(null);

  readonly view = computed(() => {
    const g = this.layout.narrow() ? NARROW : WIDE;
    const hovered = this.hover();
    const lit = hovered ? new Set(HERO_PATHS[hovered]) : null;
    const litNodes = new Set<string>();
    if (lit) for (const e of g.edges) if (lit.has(e.id)) litNodes.add(e.a).add(e.b);
    const reduced = this.reduced();

    const edges = g.edges.map((e, i) => {
      const on = !!lit?.has(e.id);
      return {
        d: e.d,
        stroke: on ? '#1976d2' : lit ? '#e2e0da' : '#c9c6bd',
        width: on ? 2 : 1.5,
        pulses: (e.both ? [0, 1] : [0]).map((k) => ({
          anim: reduced ? 'none' : 'hiw-flow',
          delay: `${-(i * 0.37 + k * 1.2).toFixed(2)}s`,
          dir: k ? 'reverse' : 'normal',
          offset: k ? -70 : -30,
          op: lit && !on ? 0.12 : 1,
        })),
      };
    });

    const texts: SvgText[] = [];
    const nodes = g.nodes.map((n) => {
      const on = litNodes.has(n.id) || hovered === n.id;
      const op = lit && !on ? 0.4 : 1;
      const cx = n.x + n.w / 2;
      if (n.sub) {
        texts.push({
          x: cx,
          y: n.y + n.h / 2 - 5,
          text: n.sub,
          size: 9,
          ls: 1.2,
          fill: '#6b6b70',
          op,
        });
      }
      texts.push({
        x: cx,
        y: n.sub ? n.y + n.h / 2 + 11 : n.y + n.h / 2 + 4,
        text: n.name,
        size: g.fs,
        weight: 600,
        fill: on ? '#1976d2' : '#1d1d1f',
        op,
      });
      return {
        ...n,
        op,
        fill: n.rule || n.ext ? '#f7f6f2' : '#ffffff',
        stroke: on ? '#1976d2' : '#1d1d1f',
        strokeWidth: hovered === n.id ? 2 : 1.25,
        dash: n.ext ? '4 3' : null,
      };
    });

    return { vb: g.vb, edges, nodes, texts };
  });

  readonly label = computed(() => TEXT[this.lang()].mapLabel);
}
