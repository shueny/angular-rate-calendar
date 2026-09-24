import { signal } from '@angular/core';
import { REDUCED_HOLD_MS, Timeline } from './timeline';

describe('Timeline', () => {
  const make = (reduced = false) => {
    const wake = vi.fn();
    const tl = new Timeline(signal(reduced), wake);
    tl.setDurations([100, 200, 300]);
    return { tl, wake };
  };

  it('derives step boundaries and the current step', () => {
    const { tl } = make();
    expect(tl.marks()).toEqual({ starts: [0, 100, 300], ends: [100, 300, 600], total: 600 });
    const indexAt = (t: number) => {
      tl.seek(t);
      return tl.index();
    };
    expect([0, 100, 101, 300, 301, 600].map(indexAt)).toEqual([0, 0, 1, 1, 2, 2]);
  });

  it('steps forward to the end of the current step, then to the next', () => {
    const { tl } = make();
    tl.seek(40);
    tl.forward();
    expect(tl.t()).toBe(100);
    tl.forward();
    expect(tl.t()).toBe(300);
    tl.forward();
    tl.forward();
    expect(tl.t()).toBe(600);
  });

  it('steps back to the start of the current step', () => {
    const { tl } = make();
    tl.seek(450);
    tl.back();
    expect(tl.t()).toBe(300);
    tl.back();
    expect(tl.t()).toBe(100);
    tl.back();
    expect(tl.t()).toBe(0);
  });

  it('plays at the chosen speed and stops at the end', () => {
    const { tl, wake } = make();
    tl.play();
    expect(wake).toHaveBeenCalled();
    tl.tick(50);
    expect(tl.t()).toBe(50);
    tl.speed.set(2);
    tl.tick(50);
    expect(tl.t()).toBe(150);
    tl.tick(10_000);
    expect(tl.t()).toBe(600);
    expect(tl.playing()).toBe(false);
    expect(tl.ended()).toBe(true);
  });

  it('replays from the start when played after the end', () => {
    const { tl } = make();
    tl.seek(600);
    tl.play();
    expect(tl.t()).toBe(0);
    expect(tl.playing()).toBe(true);
  });

  it('does not advance while paused', () => {
    const { tl } = make();
    tl.tick(100);
    expect(tl.t()).toBe(0);
  });

  it('seek clamps to the timeline and pauses', () => {
    const { tl } = make();
    tl.play();
    tl.seek(-5);
    expect(tl.t()).toBe(0);
    tl.seek(9999);
    expect(tl.t()).toBe(600);
    expect(tl.playing()).toBe(false);
  });

  it('under reduced motion shows only end frames and holds each one', () => {
    const { tl } = make(true);
    expect(tl.frame()).toBe(100);
    tl.play();
    tl.tick(REDUCED_HOLD_MS - 1);
    expect(tl.frame()).toBe(100);
    tl.tick(1);
    expect(tl.frame()).toBe(300);
    tl.tick(REDUCED_HOLD_MS);
    expect(tl.frame()).toBe(600);
    expect(tl.playing()).toBe(false);
  });

  it('under reduced motion steps forward one end frame at a time', () => {
    const { tl } = make(true);
    tl.forward();
    expect(tl.frame()).toBe(300);
  });

  it('clamps the playhead when the steps get shorter', () => {
    const { tl } = make();
    tl.seek(500);
    tl.setDurations([100]);
    expect(tl.t()).toBe(100);
  });

  it('restart rewinds and optionally plays', () => {
    const { tl } = make();
    tl.seek(300);
    tl.restart(false);
    expect([tl.t(), tl.playing()]).toEqual([0, false]);
    tl.restart();
    expect(tl.playing()).toBe(true);
  });
});
