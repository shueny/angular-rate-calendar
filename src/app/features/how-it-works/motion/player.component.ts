import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Lang, TEXT } from '../i18n';
import { Timeline } from './timeline';

const SPEEDS = [0.5, 1, 2];

/** Caption, step counter and transport controls shared by every figure. */
@Component({
  selector: 'app-player',
  templateUrl: './player.component.html',
  styleUrl: './player.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerComponent {
  readonly timeline = input.required<Timeline>();
  readonly caption = input.required<string>();
  readonly lang = input.required<Lang>();

  readonly t = computed(() => TEXT[this.lang()].player);
  readonly speeds = SPEEDS;

  readonly view = computed(() => {
    const tl = this.timeline();
    const { ends, total } = tl.marks();
    const frame = tl.frame();
    const speed = tl.speed();
    const pct = (ms: number) => (total ? (ms / total) * 100 : 0);
    return {
      step: `${this.t().step} ${tl.index() + 1}/${ends.length}`,
      time: `${(frame / 1000).toFixed(2)} / ${(total / 1000).toFixed(1)}s${speed !== 1 ? ` · ${speed}×` : ''}`,
      pct: pct(frame),
      ticks: ends.slice(0, -1).map((end) => ({ left: pct(end), passed: frame >= end })),
      frame: Math.round(frame),
      total,
      state: tl.playing() ? 'pause' : tl.ended() ? 'replay' : 'play',
    };
  });

  toggle(): void {
    this.timeline().toggle();
  }

  scrubStart(event: PointerEvent): void {
    const el = event.currentTarget as HTMLElement;
    el.setPointerCapture?.(event.pointerId);
    this.scrubTo(event);
  }

  scrubMove(event: PointerEvent): void {
    const el = event.currentTarget as HTMLElement;
    if (el.hasPointerCapture?.(event.pointerId)) this.scrubTo(event);
  }

  onKey(event: KeyboardEvent): void {
    const tl = this.timeline();
    if (event.key === 'ArrowRight') tl.forward();
    else if (event.key === 'ArrowLeft') tl.back();
    else if (event.key === 'Home') tl.seek(0);
    else if (event.key === 'End') tl.seek(tl.total());
    else if (event.key === ' ') tl.toggle();
    else return;
    event.preventDefault();
  }

  private scrubTo(event: PointerEvent): void {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const tl = this.timeline();
    tl.seek(((event.clientX - rect.left) / (rect.width || 1)) * tl.total());
  }
}
