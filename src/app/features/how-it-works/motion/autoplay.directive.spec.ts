import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AutoplayDirective } from './autoplay.directive';
import { Timeline } from './timeline';

@Component({
  imports: [AutoplayDirective],
  template: `<figure [appAutoplay]="timeline"></figure>`,
})
class HostComponent {
  readonly reduced = signal(false);
  readonly timeline = new Timeline(this.reduced);
}

describe('AutoplayDirective', () => {
  let trigger: (visible: boolean) => void;
  const disconnect = vi.fn();

  beforeEach(() => {
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(cb: (entries: { isIntersecting: boolean }[]) => void) {
          trigger = (visible) => cb([{ isIntersecting: visible }]);
        }
        observe = vi.fn();
        disconnect = disconnect;
      },
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it('plays the timeline once the figure scrolls into view, then stops watching', () => {
    const fixture = TestBed.createComponent(HostComponent);
    const tl = fixture.componentInstance.timeline;
    tl.setDurations([100]);
    fixture.detectChanges();

    trigger(false);
    expect(tl.playing()).toBe(false);
    trigger(true);
    expect(tl.playing()).toBe(true);
    expect(disconnect).toHaveBeenCalled();
  });

  it('does not autoplay under reduced motion', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.reduced.set(true);
    fixture.componentInstance.timeline.setDurations([100]);
    fixture.detectChanges();

    trigger(true);
    expect(fixture.componentInstance.timeline.playing()).toBe(false);
  });
});
