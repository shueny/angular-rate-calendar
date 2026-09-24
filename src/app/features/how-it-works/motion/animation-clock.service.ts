import { DestroyRef, Injectable, NgZone, inject, signal } from '@angular/core';
import { Timeline } from './timeline';

type FrameFn = (cb: (now: number) => void) => unknown;

/** One requestAnimationFrame loop shared by every timeline on the page; idle when nothing plays. */
@Injectable({ providedIn: 'root' })
export class AnimationClock {
  private readonly zone = inject(NgZone);
  private readonly timelines = new Set<Timeline>();
  private running = false;
  private last = 0;

  /** Mirrors the user's prefers-reduced-motion setting. */
  readonly reduced = signal(false);

  private readonly nextFrame: FrameFn =
    typeof requestAnimationFrame === 'function'
      ? (cb) => requestAnimationFrame(cb)
      : (cb) => setTimeout(() => cb(Date.now()), 16);

  constructor() {
    const mq =
      typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
    if (mq) {
      this.reduced.set(mq.matches);
      mq.addEventListener?.('change', (e) => this.reduced.set(e.matches));
    }
  }

  /** Creates a timeline tied to the caller's lifetime. Call in an injection context. */
  timeline(): Timeline {
    const timeline = new Timeline(this.reduced, () => this.start());
    this.timelines.add(timeline);
    inject(DestroyRef).onDestroy(() => {
      timeline.pause();
      this.timelines.delete(timeline);
    });
    return timeline;
  }

  private start(): void {
    if (this.running) return;
    this.running = true;
    this.last = -1;
    this.zone.runOutsideAngular(() => this.nextFrame(this.frame));
  }

  private readonly frame = (now: number): void => {
    const dt = this.last < 0 ? 16 : Math.min(50, now - this.last);
    this.last = now;
    let busy = false;
    for (const timeline of this.timelines) {
      timeline.tick(dt);
      busy ||= timeline.playing();
    }
    this.running = busy;
    if (busy) this.nextFrame(this.frame);
  };
}
