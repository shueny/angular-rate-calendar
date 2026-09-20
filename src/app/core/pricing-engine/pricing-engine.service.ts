import { Injectable, signal, computed } from '@angular/core';
import {
  PricingRule,
  PricingContext,
  PricingResult,
  PricingConfig,
  DEFAULT_PRICING_CONFIG,
} from './pricing-rule.model';
import { WeekendRule } from './rules/weekend-rule';
import { HolidayRule } from './rules/holiday-rule';
import { PeakSeasonRule } from './rules/peak-season-rule';

@Injectable({ providedIn: 'root' })
export class PricingEngineService {
  private readonly _config = signal<PricingConfig>(DEFAULT_PRICING_CONFIG);
  readonly config = this._config.asReadonly();

  readonly rules = computed<PricingRule[]>(() => {
    const c = this._config();
    return [
      new WeekendRule(c.weekendMultiplier),
      new HolidayRule(c.holidayMultiplier),
      new PeakSeasonRule(c.peakSeasonMultiplier, c.peakSeasonMonths),
    ].sort((a, b) => a.order - b.order);
  });

  updateConfig(partial: Partial<PricingConfig>): void {
    this._config.update((prev) => ({ ...prev, ...partial }));
  }

  calculate(date: Date, isHoliday: boolean, holidayName?: string): PricingResult {
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const baseRate = this._config().baseRate;

    const context: PricingContext = {
      date,
      baseRate,
      isWeekend,
      isHoliday,
      holidayName,
    };

    const adjustments = this.rules()
      .filter((rule) => rule.enabled)
      .map((rule) => rule.apply(context))
      .filter((adj): adj is NonNullable<typeof adj> => adj !== null);

    const finalRate = adjustments.reduce((rate, adj) => rate * adj.multiplier, baseRate);

    return {
      date,
      baseRate,
      finalRate: Math.round(finalRate * 100) / 100,
      adjustments,
    };
  }
}
