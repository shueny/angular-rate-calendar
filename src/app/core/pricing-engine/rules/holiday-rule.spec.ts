import { HolidayRule } from './holiday-rule';
import { PricingContext } from '../pricing-rule.model';

describe('HolidayRule', () => {
  const rule = new HolidayRule(1.5);

  function makeContext(overrides: Partial<PricingContext> = {}): PricingContext {
    return {
      date: new Date(2025, 0, 1),
      baseRate: 100,
      isWeekend: false,
      isHoliday: false,
      ...overrides,
    };
  }

  it('should apply multiplier on a holiday', () => {
    const result = rule.apply(makeContext({ isHoliday: true, holidayName: "New Year's Day" }));
    expect(result).not.toBeNull();
    expect(result!.multiplier).toBe(1.5);
    expect(result!.description).toContain("New Year's Day");
  });

  it('should return null on a non-holiday', () => {
    const result = rule.apply(makeContext({ isHoliday: false }));
    expect(result).toBeNull();
  });

  it('should handle holiday without name', () => {
    const result = rule.apply(makeContext({ isHoliday: true }));
    expect(result).not.toBeNull();
    expect(result!.description).not.toContain('undefined');
  });

  it('should use the configured multiplier', () => {
    const customRule = new HolidayRule(2.0);
    const result = customRule.apply(makeContext({ isHoliday: true }));
    expect(result!.multiplier).toBe(2.0);
  });
});
