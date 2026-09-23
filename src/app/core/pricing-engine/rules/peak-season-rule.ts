import { PricingContext, PriceAdjustment, PricingRule } from '../pricing-rule.model';

export class PeakSeasonRule implements PricingRule {
  name = 'Peak Season Surcharge';
  order = 3;
  enabled = true;

  constructor(
    private multiplier: number,
    private peakMonths: number[],
  ) {}

  apply(context: PricingContext): PriceAdjustment | null {
    const month = context.date.getMonth() + 1;
    if (!this.peakMonths.includes(month)) return null;
    return {
      ruleName: this.name,
      multiplier: this.multiplier,
      description: `Peak season rate (×${this.multiplier})`,
    };
  }
}
