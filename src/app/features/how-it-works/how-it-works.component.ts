import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewEncapsulation,
  inject,
  viewChild,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ChapterPricingComponent } from './chapters/chapter-pricing.component';
import { ChapterSignalsComponent } from './chapters/chapter-signals.component';
import { ChapterNetworkComponent } from './chapters/chapter-network.component';
import { ChapterAgentComponent } from './chapters/chapter-agent.component';
import { HeroMapComponent } from './hero-map.component';
import { AnimationClock } from './motion/animation-clock.service';
import { HiwLayout } from './motion/layout.service';
import { Lang, TEXT } from './i18n';

export const CHAPTER_IDS = ['pricing', 'signals', 'network', 'agent'] as const;

@Component({
  selector: 'app-how-it-works',
  imports: [
    RouterLink,
    HeroMapComponent,
    ChapterPricingComponent,
    ChapterSignalsComponent,
    ChapterNetworkComponent,
    ChapterAgentComponent,
  ],
  templateUrl: './how-it-works.component.html',
  styleUrls: ['./how-it-works.component.scss', './hiw-figure.scss'],
  // Shared .hiw-* styles for every figure live here, scoped by the .hiw prefix.
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HowItWorksComponent implements AfterViewInit, OnDestroy {
  private readonly document = inject(DOCUMENT);
  private readonly previousLang = this.document.documentElement.lang;
  private readonly layout = inject(HiwLayout);
  private readonly clock = inject(AnimationClock);
  private readonly root = viewChild.required<ElementRef<HTMLElement>>('root');
  private resize?: ResizeObserver;

  readonly lang: Lang = inject(ActivatedRoute).snapshot.data['lang'] === 'zh' ? 'zh' : 'en';
  readonly text = TEXT[this.lang];
  readonly index = [
    { id: CHAPTER_IDS[0], n: '01', q: this.text.ch1.title, concept: false },
    { id: CHAPTER_IDS[1], n: '02', q: this.text.ch2.title, concept: false },
    { id: CHAPTER_IDS[2], n: '03', q: this.text.ch3.title, concept: false },
    { id: CHAPTER_IDS[3], n: '04', q: this.text.ch4.title, concept: true },
  ];

  constructor() {
    this.document.documentElement.lang = this.text.htmlLang;
  }

  ngAfterViewInit(): void {
    const el = this.root().nativeElement;
    const update = (width: number) => this.layout.narrow.set(width > 0 && width < 640);
    update(el.clientWidth);
    if (typeof ResizeObserver === 'function') {
      this.resize = new ResizeObserver((entries) => update(entries[0].contentRect.width));
      this.resize.observe(el);
    }
  }

  ngOnDestroy(): void {
    this.resize?.disconnect();
    this.layout.narrow.set(false);
    this.document.documentElement.lang = this.previousLang;
  }

  /** Scrolls to a chapter when a box on the system map is clicked. */
  goTo(chapter: number): void {
    const el = this.document.getElementById(CHAPTER_IDS[chapter - 1]);
    el?.scrollIntoView?.({ behavior: this.clock.reduced() ? 'auto' : 'smooth', block: 'start' });
  }
}
