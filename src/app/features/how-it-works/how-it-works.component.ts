import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  ViewEncapsulation,
  inject,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ChapterPricingComponent } from './chapters/chapter-pricing.component';
import { ChapterSignalsComponent } from './chapters/chapter-signals.component';
import { ChapterNetworkComponent } from './chapters/chapter-network.component';
import { Lang, TEXT } from './i18n';

@Component({
  selector: 'app-how-it-works',
  imports: [RouterLink, ChapterPricingComponent, ChapterSignalsComponent, ChapterNetworkComponent],
  templateUrl: './how-it-works.component.html',
  styleUrl: './how-it-works.component.scss',
  // Shared .hiw-* styles for the chapters live here, scoped by the .hiw prefix.
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HowItWorksComponent implements OnDestroy {
  private readonly document = inject(DOCUMENT);
  private readonly previousLang = this.document.documentElement.lang;

  readonly lang: Lang = inject(ActivatedRoute).snapshot.data['lang'] === 'zh' ? 'zh' : 'en';
  readonly text = TEXT[this.lang];
  readonly chapters = [
    { id: 'pricing', num: '01', title: this.text.pricing.title },
    { id: 'signals', num: '02', title: this.text.signals.title },
    { id: 'network', num: '03', title: this.text.network.title },
  ];

  constructor() {
    this.document.documentElement.lang = this.text.page.htmlLang;
  }

  ngOnDestroy(): void {
    this.document.documentElement.lang = this.previousLang;
  }
}
