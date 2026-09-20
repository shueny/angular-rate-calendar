import { PricingContext, PriceAdjustment, PricingRule } from '../pricing-rule.model';

export class WeekendRule implements PricingRule {
  name = 'Weekend Surcharge';
  order = 1;
  enabled = true;

  constructor(private multiplier: number) {}

  apply(context: PricingContext): PriceAdjustment | null {
    if (!context.isWeekend) return null;
    return {
      ruleName: this.name,
      multiplier: this.multiplier,
      description: `Weekend rate (×${this.multiplier})`,
    };
  }
}
