import { WeekendRule } from './weekend-rule';
import { PricingContext } from '../pricing-rule.model';

describe('WeekendRule', () => {
  const rule = new WeekendRule(1.25);

  function makeContext(overrides: Partial<PricingContext> = {}): PricingContext {
    return {
      date: new Date(2025, 0, 4), // Saturday
      baseRate: 100,
      isWeekend: true,
      isHoliday: false,
      ...overrides,
    };
  }

  it('should apply multiplier on Saturday', () => {
    const result = rule.apply(makeContext({ isWeekend: true }));
    expect(result).not.toBeNull();
    expect(result!.multiplier).toBe(1.25);
    expect(result!.ruleName).toBe('Weekend Surcharge');
  });

  it('should apply multiplier on Sunday', () => {
    const result = rule.apply(makeContext({ date: new Date(2025, 0, 5), isWeekend: true }));
    expect(result).not.toBeNull();
    expect(result!.multiplier).toBe(1.25);
  });

  it('should return null on weekday', () => {
    const result = rule.apply(makeContext({ date: new Date(2025, 0, 6), isWeekend: false }));
    expect(result).toBeNull();
  });

  it('should use the configured multiplier', () => {
    const customRule = new WeekendRule(1.5);
    const result = customRule.apply(makeContext());
    expect(result!.multiplier).toBe(1.5);
  });
});
