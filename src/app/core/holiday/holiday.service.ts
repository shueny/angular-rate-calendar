import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Holiday, NagerHoliday } from './holiday.model';
import { TimeoutError, catchError, finalize, of, tap, timeout } from 'rxjs';

const REQUEST_TIMEOUT_MS = 10_000;

@Injectable({ providedIn: 'root' })
export class HolidayService {
  private readonly http = inject(HttpClient);
  private readonly API_BASE = 'https://date.nager.at/api/v3';
  private readonly cache = new Map<string, Holiday[]>();
  private latestKey: string | null = null;

  private readonly _holidays = signal<Holiday[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _countryCode = signal('US');

  readonly holidays = this._holidays.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly countryCode = this._countryCode.asReadonly();

  readonly holidayMap = computed(() => {
    const map = new Map<string, Holiday>();
    for (const h of this._holidays()) {
      const key = this.dateToKey(h.date);
      map.set(key, h);
    }
    return map;
  });

  setCountryCode(code: string): void {
    this._countryCode.set(code);
  }

  loadHolidays(year: number): void {
    const cacheKey = `${this._countryCode()}-${year}`;
    this.latestKey = cacheKey;
    const isLatest = () => this.latestKey === cacheKey;

    if (this.cache.has(cacheKey)) {
      this._holidays.set(this.cache.get(cacheKey)!);
      this._error.set(null);
      this._loading.set(false);
      return;
    }

    this._loading.set(true);
    this._error.set(null);

    this.http
      .get<NagerHoliday[]>(`${this.API_BASE}/PublicHolidays/${year}/${this._countryCode()}`)
      .pipe(
        timeout(REQUEST_TIMEOUT_MS),
        tap((data) => {
          const holidays = data.map((h) => ({
            date: new Date(h.date + 'T00:00:00'),
            localName: h.localName,
            name: h.name,
            countryCode: h.countryCode,
          }));
          this.cache.set(cacheKey, holidays);
          if (isLatest()) this._holidays.set(holidays);
        }),
        catchError((err) => {
          if (!isLatest()) return of(null);
          this._error.set(this.errorMessage(err));
          this._holidays.set([]);
          return of(null);
        }),
        finalize(() => {
          if (isLatest()) this._loading.set(false);
        }),
      )
      .subscribe();
  }

  isHoliday(date: Date): boolean {
    return this.holidayMap().has(this.dateToKey(date));
  }

  getHolidayName(date: Date): string | undefined {
    return this.holidayMap().get(this.dateToKey(date))?.name;
  }

  private errorMessage(err: unknown): string {
    if (err instanceof TimeoutError) return 'Request timed out. Please try again.';
    const status = (err as { status?: number }).status;
    return status === 0
      ? 'Network error. Please check your connection.'
      : `Failed to load holidays (HTTP ${status}).`;
  }

  private dateToKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
}
