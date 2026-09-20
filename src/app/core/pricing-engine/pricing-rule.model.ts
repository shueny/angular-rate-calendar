export interface PricingContext {
  date: Date;
  baseRate: number;
  isWeekend: boolean;
  isHoliday: boolean;
  holidayName?: string;
}

export interface PriceAdjustment {
  ruleName: string;
  multiplier: number;
  description: string;
}

export interface PricingResult {
  date: Date;
  baseRate: number;
  finalRate: number;
  adjustments: PriceAdjustment[];
}

export interface PricingRule {
  name: string;
  order: number;
  enabled: boolean;
  apply(context: PricingContext): PriceAdjustment | null;
}

export interface PricingConfig {
  baseRate: number;
  weekendMultiplier: number;
  holidayMultiplier: number;
  peakSeasonMultiplier: number;
  peakSeasonMonths: number[];
}

export const DEFAULT_PRICING_CONFIG: PricingConfig = {
  baseRate: 100,
  weekendMultiplier: 1.25,
  holidayMultiplier: 1.5,
  peakSeasonMultiplier: 1.2,
  peakSeasonMonths: [6, 7, 8, 12],
};
