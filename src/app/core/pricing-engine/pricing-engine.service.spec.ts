import { TestBed } from '@angular/core/testing';
import { PricingEngineService } from './pricing-engine.service';

describe('PricingEngineService', () => {
  let service: PricingEngineService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PricingEngineService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should use default config', () => {
    const config = service.config();
    expect(config.baseRate).toBe(100);
    expect(config.weekendMultiplier).toBe(1.25);
    expect(config.holidayMultiplier).toBe(1.5);
    expect(config.peakSeasonMultiplier).toBe(1.2);
  });

  describe('calculate', () => {
    it('should return base rate for a normal weekday', () => {
      const result = service.calculate(new Date(2025, 0, 6), false); // Monday, Jan
      expect(result.finalRate).toBe(100);
      expect(result.adjustments).toHaveLength(0);
    });

    it('should apply weekend surcharge on Saturday', () => {
      const result = service.calculate(new Date(2025, 0, 4), false); // Saturday, Jan
      expect(result.finalRate).toBe(125);
      expect(result.adjustments).toHaveLength(1);
      expect(result.adjustments[0].ruleName).toBe('Weekend Surcharge');
    });

    it('should apply holiday surcharge', () => {
      const result = service.calculate(new Date(2025, 0, 1), true, "New Year's Day"); // Wednesday
      expect(result.finalRate).toBe(150);
      expect(result.adjustments).toHaveLength(1);
    });

    it('should stack weekend + holiday when both apply', () => {
      // A holiday that falls on Saturday: 100 * 1.25 * 1.5 = 187.5
      const result = service.calculate(new Date(2025, 0, 4), true, 'Test Holiday'); // Saturday
      expect(result.finalRate).toBe(187.5);
      expect(result.adjustments).toHaveLength(2);
    });

    it('should stack peak season with other rules', () => {
      // Saturday in July (peak): 100 * 1.25 * 1.2 = 150
      const result = service.calculate(new Date(2025, 6, 5), false); // Saturday, July
      expect(result.finalRate).toBe(150);
      expect(result.adjustments).toHaveLength(2);
    });

    it('should stack all three rules: weekend + holiday + peak season', () => {
      // Weekend + Holiday + Peak Season (July): 100 * 1.25 * 1.5 * 1.2 = 225
      const result = service.calculate(new Date(2025, 6, 5), true, 'Summer Holiday');
      expect(result.finalRate).toBe(225);
      expect(result.adjustments).toHaveLength(3);
    });

    it('should apply peak season for December', () => {
      const result = service.calculate(new Date(2025, 11, 25), true, 'Christmas'); // Thursday
      // Holiday + Peak: 100 * 1.5 * 1.2 = 180
      expect(result.finalRate).toBe(180);
      expect(result.adjustments).toHaveLength(2);
    });

    it('should not apply peak season for March', () => {
      const result = service.calculate(new Date(2025, 2, 15), false); // Saturday, March
      // Weekend only: 100 * 1.25 = 125
      expect(result.finalRate).toBe(125);
      expect(result.adjustments).toHaveLength(1);
    });
  });

  describe('updateConfig', () => {
    it('should update base rate', () => {
      service.updateConfig({ baseRate: 200 });
      const result = service.calculate(new Date(2025, 0, 6), false); // Weekday
      expect(result.baseRate).toBe(200);
      expect(result.finalRate).toBe(200);
    });

    it('should update weekend multiplier', () => {
      service.updateConfig({ weekendMultiplier: 1.5 });
      const result = service.calculate(new Date(2025, 0, 4), false); // Saturday
      expect(result.finalRate).toBe(150);
    });

    it('should update peak season months', () => {
      service.updateConfig({ peakSeasonMonths: [1, 2, 3] });
      const result = service.calculate(new Date(2025, 0, 6), false); // Monday, January
      expect(result.finalRate).toBe(120); // Peak only
    });

    it('should preserve other config when partially updating', () => {
      service.updateConfig({ baseRate: 200 });
      expect(service.config().weekendMultiplier).toBe(1.25);
    });
  });
});
