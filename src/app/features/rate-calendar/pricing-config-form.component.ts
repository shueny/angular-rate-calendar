import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PricingEngineService } from '../../core/pricing-engine/pricing-engine.service';
import { HolidayService } from '../../core/holiday/holiday.service';

@Component({
  selector: 'app-pricing-config-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="config-form">
      <h3>Pricing Configuration</h3>
      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        <div class="form-row">
          <label for="baseRate">Base Rate ($)</label>
          <input id="baseRate" type="number" formControlName="baseRate" min="1" />
        </div>
        <div class="form-row">
          <label for="weekendMultiplier">Weekend Multiplier</label>
          <input
            id="weekendMultiplier"
            type="number"
            formControlName="weekendMultiplier"
            min="1"
            step="0.05"
          />
        </div>
        <div class="form-row">
          <label for="holidayMultiplier">Holiday Multiplier</label>
          <input
            id="holidayMultiplier"
            type="number"
            formControlName="holidayMultiplier"
            min="1"
            step="0.05"
          />
        </div>
        <div class="form-row">
          <label for="peakSeasonMultiplier">Peak Season Multiplier</label>
          <input
            id="peakSeasonMultiplier"
            type="number"
            formControlName="peakSeasonMultiplier"
            min="1"
            step="0.05"
          />
        </div>
        <div class="form-row">
          <label for="countryCode">Holiday Country</label>
          <select id="countryCode" formControlName="countryCode">
            <option value="US">United States</option>
            <option value="TW">Taiwan</option>
            <option value="JP">Japan</option>
            <option value="DE">Germany</option>
            <option value="FR">France</option>
            <option value="GB">United Kingdom</option>
          </select>
        </div>
        <button type="submit" [disabled]="form.invalid" class="submit-btn">Apply</button>
      </form>
    </div>
  `,
  styles: [
    `
      .config-form {
        margin-top: 24px;
        padding: 16px;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        background: #fafafa;
      }
      h3 {
        margin: 0 0 16px;
        font-size: 1.1rem;
      }
      form {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        align-items: flex-end;
      }
      .form-row {
        display: flex;
        flex-direction: column;
        gap: 4px;
        flex: 1;
        min-width: 140px;
      }
      label {
        font-size: 0.8rem;
        font-weight: 600;
        color: #555;
      }
      input,
      select {
        padding: 8px;
        border: 1px solid #ccc;
        border-radius: 4px;
        font-size: 0.9rem;
      }
      .submit-btn {
        padding: 8px 24px;
        background: #1976d2;
        color: #fff;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.9rem;
        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        &:hover:not(:disabled) {
          background: #1565c0;
        }
      }
    `,
  ],
})
export class PricingConfigFormComponent implements OnInit {
  private readonly pricingEngine = inject(PricingEngineService);
  private readonly holidayService = inject(HolidayService);
  private readonly fb = inject(FormBuilder);

  form!: FormGroup;

  ngOnInit(): void {
    const config = this.pricingEngine.config();
    this.form = this.fb.group({
      baseRate: [config.baseRate, [Validators.required, Validators.min(1)]],
      weekendMultiplier: [config.weekendMultiplier, [Validators.required, Validators.min(1)]],
      holidayMultiplier: [config.holidayMultiplier, [Validators.required, Validators.min(1)]],
      peakSeasonMultiplier: [config.peakSeasonMultiplier, [Validators.required, Validators.min(1)]],
      countryCode: [this.holidayService.countryCode()],
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    const { countryCode, ...pricingConfig } = this.form.value;
    this.pricingEngine.updateConfig(pricingConfig);
    if (countryCode !== this.holidayService.countryCode()) {
      this.holidayService.setCountryCode(countryCode);
      this.holidayService.loadHolidays(new Date().getFullYear());
    }
  }
}
