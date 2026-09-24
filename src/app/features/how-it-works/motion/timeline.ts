import { Signal, computed, signal } from '@angular/core';

/** How long each step's end frame is held when the user prefers reduced motion. */
export const REDUCED_HOLD_MS = 1800;

/**
 * Playback state for one figure: a list of step durations and a playhead.
 * Figures derive every frame from `frame()`, so seeking, stepping and speed all come for free.
 */
export class Timeline {
  readonly durations = signal<readonly number[]>([]);
  readonly t = signal(0);
  readonly playing = signal(false);
  readonly speed = signal(1);

  readonly marks = computed(() => {
    const starts: number[] = [];
    const ends: number[] = [];
    let at = 0;
    for (const d of this.durations()) {
      starts.push(at);
      at += d;
      ends.push(at);
    }
    return { starts, ends, total: at };
  });

  readonly total = computed(() => this.marks().total);

  readonly index = computed(() => {
    const { ends } = this.marks();
    const t = this.t();
    const i = ends.findIndex((end) => t <= end);
    return i === -1 ? Math.max(0, ends.length - 1) : i;
  });

  /** The time to draw: the playhead, or the current step's end frame under reduced motion. */
  readonly frame = computed(() =>
    this.reduced() ? (this.marks().ends[this.index()] ?? 0) : this.t(),
  );

  readonly ended = computed(() => this.total() > 0 && this.t() >= this.total());

  private hold = 0;

  constructor(
    readonly reduced: Signal<boolean>,
    private readonly wake: () => void = () => undefined,
  ) {}

  setDurations(durations: readonly number[]): void {
    this.durations.set(durations);
    if (this.t() > this.total()) this.t.set(this.total());
  }

  /** Advances the playhead; called by the animation clock on every frame. */
  tick(dt: number): void {
    if (!this.playing()) return;
    if (this.reduced()) {
      this.hold += dt * this.speed();
      if (this.hold < REDUCED_HOLD_MS) return;
      this.hold = 0;
      this.t.set(this.forwardTarget(true));
    } else {
      this.t.set(Math.min(this.total(), this.t() + dt * this.speed()));
    }
    if (this.t() >= this.total()) this.playing.set(false);
  }

  play(): void {
    if (this.ended()) this.t.set(0);
    this.hold = 0;
    this.playing.set(true);
    this.wake();
  }

  pause(): void {
    this.playing.set(false);
  }

  toggle(): void {
    if (this.playing()) this.pause();
    else this.play();
  }

  restart(autoplay = true): void {
    this.t.set(0);
    this.hold = 0;
    this.playing.set(false);
    if (autoplay) this.play();
  }

  seek(t: number): void {
    this.t.set(Math.max(0, Math.min(this.total(), t)));
    this.playing.set(false);
  }

  forward(): void {
    this.seek(this.forwardTarget(this.reduced()));
  }

  back(): void {
    const i = this.index();
    this.seek(i === 0 ? 0 : this.marks().starts[i]);
  }

  /** The end of the current step, or the end of the next one if already there. */
  private forwardTarget(reduced: boolean): number {
    const { ends } = this.marks();
    const i = this.index();
    const last = ends.length - 1;
    return !reduced && this.t() < ends[i] ? ends[i] : ends[Math.min(i + 1, last)];
  }
}
