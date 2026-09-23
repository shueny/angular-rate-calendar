import { PricingContext, PriceAdjustment, PricingRule } from '../pricing-rule.model';

export class HolidayRule implements PricingRule {
  name = 'Holiday Surcharge';
  order = 2;
  enabled = true;

  constructor(private multiplier: number) {}

  apply(context: PricingContext): PriceAdjustment | null {
    if (!context.isHoliday) return null;
    return {
      ruleName: this.name,
      multiplier: this.multiplier,
      description: `Holiday rate${context.holidayName ? ` (${context.holidayName})` : ''} (×${this.multiplier})`,
    };
  }
}
