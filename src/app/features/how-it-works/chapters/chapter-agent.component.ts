import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { AnimationClock } from '../motion/animation-clock.service';
import { AutoplayDirective } from '../motion/autoplay.directive';
import { HiwLayout } from '../motion/layout.service';
import { Fragment, SvgText, TONE, fragments, inOut, pick, seg } from '../motion/motion';
import { PlayerComponent } from '../motion/player.component';
import { Lang, TEXT } from '../i18n';
import {
  AGENT_CODE,
  AGENT_FLASHES,
  AGENT_LOG,
  AGENT_NARROW,
  AGENT_NODES,
  AGENT_PACKETS,
  AGENT_STEPS,
  AGENT_WIDE,
} from './agent-script';

type Pt = [number, number];

const bezier = (c: [Pt, Pt, Pt, Pt], p: number): Pt => {
  const q = 1 - p;
  const at = (i: 0 | 1) =>
    q * q * q * c[0][i] + 3 * q * q * p * c[1][i] + 3 * q * p * p * c[2][i] + p * p * p * c[3][i];
  return [at(0), at(1)];
};

/** Chapter 04: a concept for a revenue co-pilot. Not built; the animation is a scripted walkthrough. */
@Component({
  selector: 'app-chapter-agent',
  imports: [PlayerComponent, AutoplayDirective],
  templateUrl: './chapter-agent.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChapterAgentComponent {
  readonly lang = input.required<Lang>();
  readonly t = computed(() => TEXT[this.lang()]);

  private readonly layout = inject(HiwLayout);
  readonly timeline = inject(AnimationClock).timeline();
  readonly open = signal(false);
  readonly code = AGENT_CODE;

  readonly caption = computed(() => pick(AGENT_STEPS[this.timeline.index()].caption, this.lang()));
  readonly frame = computed(() => this.draw(this.timeline.frame()));

  constructor() {
    this.timeline.setDurations(AGENT_STEPS.map((s) => s.dur));
  }

  private draw(te: number) {
    const narrow = this.layout.narrow();
    const g = narrow ? AGENT_NARROW : AGENT_WIDE;
    const lang = this.lang();
    const zi = lang === 'zh' ? 1 : 0;
    const lit = new Set<string>();
    const texts: SvgText[] = [];
    const packets: { x: number; y: number; w: number; op: number; fill: string; stroke: string }[] =
      [];
    const frags: Fragment[] = [];

    const frames = g.frames.map((f) => {
      texts.push({
        x: f.lx,
        y: f.ly,
        anchor: f.anchor ?? 'start',
        text: this.t().f4[f.key],
        size: 9,
        weight: 600,
        ls: 1.3,
        fill: '#6b6b70',
      });
      return {
        ...f,
        fill: f.warm ? '#e3effb' : '#ffffff',
        stroke: f.warm ? '#1976d2' : '#e2e0da',
        dash: f.warm ? '4 4' : null,
      };
    });

    for (const pk of AGENT_PACKETS) {
      const t0 = pk.legs[0][2];
      if (te < t0) continue;
      let at: Pt | null = null;
      for (const [edge, dir, a, b, reach] of pk.legs) {
        if (te < a) break;
        const p = inOut(seg(te, a, b)) * (reach ?? 1);
        at = bezier(g.edges[edge], dir > 0 ? p : 1 - p);
        if (te <= b) lit.add(edge);
      }
      if (!at) continue;
      const [x, y] = at;
      const T = TONE[pk.tone];
      if (pk.fizzle && te >= pk.fizzle.t) {
        const age = te - pk.fizzle.t;
        frags.push(...fragments(x, y, age, T.stroke));
        if (age < 1400) {
          texts.push({
            x,
            y: y - 18 - Math.min(age, 700) * 0.02,
            text: pick(pk.fizzle.text, lang),
            size: 11,
            weight: 700,
            fill: '#c62828',
            op: age < 1000 ? 1 : 1 - (age - 1000) / 400,
          });
        }
        continue;
      }
      if (te > pk.end) continue;
      const op = Math.min(seg(te, t0, t0 + 120), 1 - seg(te, pk.end - 120, pk.end));
      const label = pick(pk.label, lang);
      const w = Math.max(44, label.length * (zi && pk.label[1] !== pk.label[0] ? 10 : 6.2) + 18);
      packets.push({ x: x - w / 2, y: y - 11, w, op, fill: T.fill, stroke: T.stroke });
      texts.push({ x, y: y + 4, text: label, size: 10, weight: 600, fill: T.text, op });
    }

    const edges = Object.entries(g.edges).map(([id, c]) => {
      const on = lit.has(id);
      const ghost = id === 'a-g';
      return {
        d: `M${c[0][0]} ${c[0][1]} C${c[1][0]} ${c[1][1]} ${c[2][0]} ${c[2][1]} ${c[3][0]} ${c[3][1]}`,
        stroke: on ? (ghost ? '#c62828' : '#1976d2') : '#c9c6bd',
        width: on ? 2 : 1.5,
        dash: ghost ? '4 4' : null,
      };
    });

    const nodes = AGENT_NODES.map((node) => {
      const [x, y, w, h] = g.box[node.id];
      const cx = x + w / 2;
      const cy = y + h / 2;
      let flash: (typeof AGENT_FLASHES)[number] | null = null;
      for (const f of AGENT_FLASHES)
        if (f[0] === node.id && te >= f[1] && te < f[1] + f[2]) flash = f;
      const T = flash ? TONE[flash[4]] : null;
      const ghost = node.id === 'ghost';
      let sub = node.sub[zi];
      if (node.id === 'config' && te >= 13200) sub = 'v14';
      if (node.id === 'proposal' && te >= 12000) sub = zi ? '已核准' : 'approved';
      if (flash) sub = flash[3][zi];
      const human = node.id === 'manager' || node.id === 'approve';
      texts.push({
        x: cx,
        y: cy - 3,
        text: (narrow ? node.short : node.name)[zi],
        size: g.fs,
        weight: 700,
        fill: ghost ? '#6b6b70' : '#1d1d1f',
        deco: ghost ? 'line-through' : undefined,
      });
      texts.push({
        x: cx,
        y: cy + 12,
        text: sub,
        size: g.sfs,
        weight: flash ? 700 : 400,
        ls: 0.4,
        fill: T ? T.text : '#6b6b70',
      });
      return {
        id: node.id,
        x,
        y,
        w,
        h,
        r: human ? h / 2 : 10,
        fill: T ? T.fill : ghost ? '#f7f6f2' : '#ffffff',
        stroke: T ? T.stroke : ghost ? '#b9b6ad' : human ? '#1976d2' : '#1d1d1f',
        dash: ghost ? '4 4' : null,
      };
    });

    return {
      vb: g.vb,
      frames,
      edges,
      nodes,
      packets,
      frags,
      texts,
      log: AGENT_LOG.map(([at, text]) => ({
        t: (at / 1000).toFixed(2) + 's',
        text,
        done: te >= at,
      })),
    };
  }
}
