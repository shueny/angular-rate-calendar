import { AfterViewInit, Directive, ElementRef, OnDestroy, inject, input } from '@angular/core';
import { Timeline } from './timeline';

/** Plays a figure's timeline from the start the first time a third of it scrolls into view. */
@Directive({ selector: '[appAutoplay]' })
export class AutoplayDirective implements AfterViewInit, OnDestroy {
  readonly appAutoplay = input.required<Timeline>();
  private readonly host = inject(ElementRef<HTMLElement>);
  private observer?: IntersectionObserver;

  ngAfterViewInit(): void {
    if (typeof IntersectionObserver !== 'function') return;
    this.observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        this.observer?.disconnect();
        const timeline = this.appAutoplay();
        if (!timeline.reduced() && timeline.t() === 0 && !timeline.playing()) timeline.play();
      },
      { threshold: 0.35 },
    );
    this.observer.observe(this.host.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
