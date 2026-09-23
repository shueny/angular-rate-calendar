import { Component, Input } from '@angular/core';

interface CalendarDay {
  date: Date;
  inMonth: boolean;
  pricing: {
    baseRate: number;
    finalRate: number;
    adjustments: { ruleName: string; multiplier: number; description: string }[];
  };
  isHoliday: boolean;
  holidayName?: string;
  isToday: boolean;
}

@Component({
  selector: 'app-price-detail',
  standalone: true,
  template: `
    <div class="price-detail">
      <h3>
        {{
          day.date.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })
        }}
      </h3>
      @if (day.isHoliday && day.holidayName) {
        <p class="holiday-label">{{ day.holidayName }}</p>
      }
      <div class="breakdown">
        <div class="breakdown-row">
          <span>Base Rate</span>
          <span>\${{ day.pricing.baseRate }}</span>
        </div>
        @for (adj of day.pricing.adjustments; track adj.ruleName) {
          <div class="breakdown-row adjustment">
            <span>{{ adj.description }}</span>
            <span>&times;{{ adj.multiplier }}</span>
          </div>
        }
        <div class="breakdown-row total">
          <span>Final Rate</span>
          <span>\${{ day.pricing.finalRate }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .price-detail {
        margin-top: 16px;
        padding: 16px;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        background: #f5f5f5;
      }
      h3 {
        margin: 0 0 8px;
        font-size: 1rem;
      }
      .holiday-label {
        margin: 0 0 12px;
        color: #d32f2f;
        font-size: 0.85rem;
        font-weight: 500;
      }
      .breakdown {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .breakdown-row {
        display: flex;
        justify-content: space-between;
        font-size: 0.9rem;
      }
      .adjustment {
        color: #e65100;
        padding-left: 8px;
      }
      .total {
        margin-top: 6px;
        padding-top: 8px;
        border-top: 1px solid #ccc;
        font-weight: 700;
        font-size: 1rem;
      }
    `,
  ],
})
export class PriceDetailComponent {
  @Input({ required: true }) day!: CalendarDay;
}
