import { PeakSeasonRule } from './peak-season-rule';
import { PricingContext } from '../pricing-rule.model';

describe('PeakSeasonRule', () => {
  const rule = new PeakSeasonRule(1.2, [6, 7, 8, 12]);

  function makeContext(overrides: Partial<PricingContext> = {}): PricingContext {
    return {
      date: new Date(2025, 6, 15), // July (month 7)
      baseRate: 100,
      isWeekend: false,
      isHoliday: false,
      ...overrides,
    };
  }

  it('should apply multiplier in peak season month', () => {
    const result = rule.apply(makeContext({ date: new Date(2025, 5, 15) })); // June
    expect(result).not.toBeNull();
    expect(result!.multiplier).toBe(1.2);
  });

  it('should apply for July', () => {
    const result = rule.apply(makeContext({ date: new Date(2025, 6, 1) }));
    expect(result).not.toBeNull();
  });

  it('should apply for August', () => {
    const result = rule.apply(makeContext({ date: new Date(2025, 7, 1) }));
    expect(result).not.toBeNull();
  });

  it('should apply for December', () => {
    const result = rule.apply(makeContext({ date: new Date(2025, 11, 25) }));
    expect(result).not.toBeNull();
  });

  it('should return null outside peak season', () => {
    const result = rule.apply(makeContext({ date: new Date(2025, 2, 15) })); // March
    expect(result).toBeNull();
  });

  it('should return null for January (off-peak)', () => {
    const result = rule.apply(makeContext({ date: new Date(2025, 0, 15) }));
    expect(result).toBeNull();
  });

  it('should handle custom peak months', () => {
    const customRule = new PeakSeasonRule(1.3, [1, 2]);
    const result = customRule.apply(makeContext({ date: new Date(2025, 0, 15) })); // January
    expect(result).not.toBeNull();
    expect(result!.multiplier).toBe(1.3);
  });
});
