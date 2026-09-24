import { TestBed } from '@angular/core/testing';
import { Injector, runInInjectionContext } from '@angular/core';
import { AnimationClock } from './animation-clock.service';

describe('AnimationClock', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('advances a playing timeline on animation frames and stops when it ends', () => {
    const clock = TestBed.inject(AnimationClock);
    const tl = runInInjectionContext(TestBed.inject(Injector), () => clock.timeline());
    tl.setDurations([200]);
    tl.play();

    vi.advanceTimersByTime(100);
    expect(tl.t()).toBeGreaterThan(50);
    expect(tl.t()).toBeLessThan(200);

    vi.advanceTimersByTime(500);
    expect(tl.t()).toBe(200);
    expect(tl.playing()).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('follows the reduced-motion media query', () => {
    const listeners: ((e: { matches: boolean }) => void)[] = [];
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      addEventListener: (_: string, cb: (e: { matches: boolean }) => void) => listeners.push(cb),
    }));
    const clock = TestBed.runInInjectionContext(() => new AnimationClock());
    expect(clock.reduced()).toBe(true);
    listeners[0]({ matches: false });
    expect(clock.reduced()).toBe(false);
    vi.unstubAllGlobals();
  });
});
