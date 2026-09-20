import { Component, computed, inject, signal, effect } from '@angular/core';
import { PricingEngineService } from '../../core/pricing-engine/pricing-engine.service';
import { HolidayService } from '../../core/holiday/holiday.service';
import { PricingResult } from '../../core/pricing-engine/pricing-rule.model';
import { PricingConfigFormComponent } from './pricing-config-form.component';
import { PriceDetailComponent } from './price-detail.component';

interface CalendarDay {
  date: Date;
  inMonth: boolean;
  pricing: PricingResult;
  isHoliday: boolean;
  holidayName?: string;
  isToday: boolean;
}

@Component({
  selector: 'app-rate-calendar',
  standalone: true,
  imports: [PricingConfigFormComponent, PriceDetailComponent],
  templateUrl: './rate-calendar.component.html',
  styleUrl: './rate-calendar.component.scss',
})
export class RateCalendarComponent {
  private readonly pricingEngine = inject(PricingEngineService);
  private readonly holidayService = inject(HolidayService);

  readonly currentDate = signal(new Date());
  readonly selectedDay = signal<CalendarDay | null>(null);
  readonly holidays = this.holidayService.holidays;
  readonly holidayLoading = this.holidayService.loading;
  readonly holidayError = this.holidayService.error;

  readonly currentYear = computed(() => this.currentDate().getFullYear());
  readonly currentMonth = computed(() => this.currentDate().getMonth());

  readonly monthLabel = computed(() => {
    const date = this.currentDate();
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  });

  readonly weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  readonly calendarDays = computed<CalendarDay[]>(() => {
    const year = this.currentYear();
    const month = this.currentMonth();
    const today = new Date();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = firstDay.getDay();

    const days: CalendarDay[] = [];

    for (let i = startOffset - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push(this.buildDay(date, false, today));
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      days.push(this.buildDay(date, true, today));
    }

    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const date = new Date(year, month + 1, d);
      days.push(this.buildDay(date, false, today));
    }

    return days;
  });

  private readonly loadHolidaysEffect = effect(() => {
    const year = this.currentYear();
    this.holidayService.loadHolidays(year);
  });

  prevMonth(): void {
    this.currentDate.update((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
    this.selectedDay.set(null);
  }

  nextMonth(): void {
    this.currentDate.update((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
    this.selectedDay.set(null);
  }

  selectDay(day: CalendarDay): void {
    if (this.selectedDay()?.date.getTime() === day.date.getTime()) {
      this.selectedDay.set(null);
    } else {
      this.selectedDay.set(day);
    }
  }

  private buildDay(date: Date, inMonth: boolean, today: Date): CalendarDay {
    const isHoliday = this.holidayService.isHoliday(date);
    const holidayName = this.holidayService.getHolidayName(date);
    const pricing = this.pricingEngine.calculate(date, isHoliday, holidayName);
    const isToday =
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate();

    return { date, inMonth, pricing, isHoliday, holidayName, isToday };
  }
}
