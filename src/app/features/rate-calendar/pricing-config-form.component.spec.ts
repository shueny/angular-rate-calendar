import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PricingConfigFormComponent } from './pricing-config-form.component';
import { PricingEngineService } from '../../core/pricing-engine/pricing-engine.service';

describe('PricingConfigFormComponent', () => {
  function setup() {
    TestBed.configureTestingModule({
      imports: [PricingConfigFormComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(PricingConfigFormComponent);
    fixture.detectChanges();
    return {
      fixture,
      form: fixture.componentInstance,
      engine: TestBed.inject(PricingEngineService),
    };
  }

  it.each([
    ['zero', 0],
    ['negative', -50],
    ['empty', null],
  ])('should not apply a %s base rate', (_label, value) => {
    const { fixture, form, engine } = setup();
    form.form.patchValue({ baseRate: value });
    fixture.detectChanges();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.submit-btn');
    expect(button.disabled).toBe(true);

    form.onSubmit();
    expect(engine.config().baseRate).toBe(100);
  });

  it('should reject a multiplier below 1', () => {
    const { form, engine } = setup();
    form.form.patchValue({ weekendMultiplier: 0.5 });

    form.onSubmit();
    expect(engine.config().weekendMultiplier).toBe(1.25);
  });

  it('should apply a valid config', () => {
    const { form, engine } = setup();
    form.form.patchValue({ baseRate: 180, holidayMultiplier: 1.8 });

    form.onSubmit();
    expect(engine.config().baseRate).toBe(180);
    expect(engine.config().holidayMultiplier).toBe(1.8);
  });
});
