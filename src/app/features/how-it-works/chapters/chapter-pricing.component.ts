import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { PricingEngineService } from '../../../core/pricing-engine/pricing-engine.service';
import { PriceAdjustment } from '../../../core/pricing-engine/pricing-rule.model';
import { ConfigKey, Lang, PresetTag, TEXT } from '../i18n';

export interface PricingPreset {
  id: string;
  date: Date;
  tag: PresetTag;
  holiday?: string;
}

export interface PricingStep {
  name: string;
  file: string;
  guard: string;
  adjustment: PriceAdjustment | null;
  total: number;
}

export const PRICING_PRESETS: PricingPreset[] = [
  { id: 'tue', date: new Date(2026, 2, 10), tag: 'weekday' },
  { id: 'sat', date: new Date(2026, 2, 14), tag: 'weekend' },
  { id: 'xmas', date: new Date(2026, 11, 25), tag: 'holidayPeak', holiday: 'Christmas Day' },
  { id: 'july4', date: new Date(2026, 6, 4), tag: 'all', holiday: 'Independence Day' },
];

/** The guard clause at the top of each rule's apply(), copied from the rule files. */
const RULE_SOURCE: Record<string, { file: string; guard: string }> = {
  'Weekend Surcharge': {
    file: 'weekend-rule.ts',
    guard: 'if (!context.isWeekend) return null;',
  },
  'Holiday Surcharge': {
    file: 'holiday-rule.ts',
    guard: 'if (!context.isHoliday) return null;',
  },
  'Peak Season Surcharge': {
    file: 'peak-season-rule.ts',
    guard: 'if (!this.peakMonths.includes(month)) return null;',
  },
};

const CONTROLS: { key: ConfigKey; min: number; max: number; step: number }[] = [
  { key: 'baseRate', min: 50, max: 300, step: 10 },
  { key: 'weekendMultiplier', min: 1, max: 2, step: 0.05 },
  { key: 'holidayMultiplier', min: 1, max: 2, step: 0.05 },
  { key: 'peakSeasonMultiplier', min: 1, max: 2, step: 0.05 },
];

@Component({
  selector: 'app-chapter-pricing',
  imports: [CurrencyPipe],
  templateUrl: './chapter-pricing.component.html',
  styleUrl: './chapter-pricing.component.scss',
  providers: [PricingEngineService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChapterPricingComponent {
  readonly lang = input.required<Lang>();
  readonly t = computed(() => TEXT[this.lang()].pricing);
  readonly engine = inject(PricingEngineService);

  readonly presets = PRICING_PRESETS;
  readonly controls = CONTROLS;
  readonly preset = signal(PRICING_PRESETS[3]);
  private readonly pipeline = viewChild<ElementRef<HTMLElement>>('pipeline');

  readonly result = computed(() => {
    const p = this.preset();
    return this.engine.calculate(p.date, p.holiday !== undefined, p.holiday);
  });

  readonly steps = computed<PricingStep[]>(() => {
    const result = this.result();
    let total = result.baseRate;
    return this.engine.rules().map((rule) => {
      const adjustment = result.adjustments.find((a) => a.ruleName === rule.name) ?? null;
      if (adjustment) total *= adjustment.multiplier;
      return {
        name: rule.name,
        ...RULE_SOURCE[rule.name],
        adjustment,
        total,
      };
    });
  });

  readonly context = computed(() => {
    const p = this.preset();
    const day = p.date.getDay();
    return [
      `isWeekend: ${day === 0 || day === 6}`,
      `isHoliday: ${p.holiday !== undefined}`,
      `holidayName: ${p.holiday ? `'${p.holiday}'` : 'undefined'}`,
      `month: ${p.date.getMonth() + 1}`,
    ];
  });

  pick(preset: PricingPreset): void {
    this.preset.set(preset);
    this.replay();
  }

  /** Restarts the staggered entrance animation of every step. */
  replay(): void {
    const animations = this.pipeline()?.nativeElement.getAnimations?.({ subtree: true }) ?? [];
    for (const animation of animations) {
      animation.cancel();
      animation.play();
    }
  }

  setConfig(key: ConfigKey, event: Event): void {
    this.engine.updateConfig({ [key]: Number((event.target as HTMLInputElement).value) });
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString(TEXT[this.lang()].page.locale, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
}
