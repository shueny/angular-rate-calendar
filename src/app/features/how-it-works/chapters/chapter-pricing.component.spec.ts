import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChapterPricingComponent, PRICING_PRESETS } from './chapter-pricing.component';

describe('ChapterPricingComponent', () => {
  let fixture: ComponentFixture<ChapterPricingComponent>;
  let component: ChapterPricingComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ChapterPricingComponent] });
    fixture = TestBed.createComponent(ChapterPricingComponent);
    fixture.componentRef.setInput('lang', 'en');
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it.each(PRICING_PRESETS.map((p) => [p.id, p] as const))(
    '%s: the running total ends at the engine result',
    (_, preset) => {
      component.pick(preset);
      const steps = component.steps();
      const expected = component.engine.calculate(
        preset.date,
        preset.holiday !== undefined,
        preset.holiday,
      );

      expect(steps.map((s) => s.name)).toEqual(component.engine.rules().map((r) => r.name));
      expect(steps.at(-1)!.total).toBeCloseTo(expected.finalRate, 2);
      expect(steps.filter((s) => s.adjustment)).toHaveLength(expected.adjustments.length);
    },
  );

  it('shows which rules apply for Christmas', () => {
    component.pick(PRICING_PRESETS.find((p) => p.id === 'xmas')!);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const rules = [...el.querySelectorAll('.step.rule')];
    expect(rules.map((r) => r.classList.contains('applied'))).toEqual([false, true, true]);
    expect(rules[0].textContent).toContain('returned null');
    expect(el.querySelector('.step.final')?.textContent).toContain('$180.00');
  });

  it('recomputes when a slider changes the config', () => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector('#pr-baseRate');
    input.value = '200';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(component.result().finalRate).toBe(450);
    expect(fixture.nativeElement.querySelector('.step.final').textContent).toContain('$450.00');
  });

  it('shows the context every rule receives', () => {
    expect(component.context()).toEqual([
      'isWeekend: true',
      'isHoliday: true',
      "holidayName: 'Independence Day'",
      'month: 7',
    ]);
  });

  it('restarts the step animations on replay and when a day is picked', () => {
    const animation = { cancel: vi.fn(), play: vi.fn() };
    const ol: HTMLElement = fixture.nativeElement.querySelector('.pipeline');
    const getAnimations = vi.fn(() => [animation]);
    Object.assign(ol, { getAnimations });

    component.replay();
    component.pick(PRICING_PRESETS[0]);

    expect(getAnimations).toHaveBeenCalledWith({ subtree: true });
    expect(animation.cancel).toHaveBeenCalledTimes(2);
    expect(animation.play).toHaveBeenCalledTimes(2);
  });
});
