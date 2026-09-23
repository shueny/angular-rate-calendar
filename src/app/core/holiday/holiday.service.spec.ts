import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { HolidayService } from './holiday.service';
import { NagerHoliday } from './holiday.model';

describe('HolidayService', () => {
  let service: HolidayService;
  let httpMock: HttpTestingController;

  const mockHolidays: NagerHoliday[] = [
    {
      date: '2025-01-01',
      localName: "New Year's Day",
      name: "New Year's Day",
      countryCode: 'US',
      fixed: true,
      global: true,
      counties: null,
      launchYear: null,
      types: ['Public'],
    },
    {
      date: '2025-07-04',
      localName: 'Independence Day',
      name: 'Independence Day',
      countryCode: 'US',
      fixed: true,
      global: true,
      counties: null,
      launchYear: null,
      types: ['Public'],
    },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(HolidayService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should load holidays from API', () => {
    service.loadHolidays(2025);

    const req = httpMock.expectOne('https://date.nager.at/api/v3/PublicHolidays/2025/US');
    expect(req.request.method).toBe('GET');
    req.flush(mockHolidays);

    expect(service.holidays()).toHaveLength(2);
    expect(service.loading()).toBe(false);
    expect(service.error()).toBeNull();
  });

  it('should set loading state during request', () => {
    service.loadHolidays(2025);
    expect(service.loading()).toBe(true);

    const req = httpMock.expectOne('https://date.nager.at/api/v3/PublicHolidays/2025/US');
    req.flush(mockHolidays);

    expect(service.loading()).toBe(false);
  });

  it('should cache results and not re-fetch', () => {
    service.loadHolidays(2025);
    httpMock.expectOne('https://date.nager.at/api/v3/PublicHolidays/2025/US').flush(mockHolidays);

    service.loadHolidays(2025);
    httpMock.expectNone('https://date.nager.at/api/v3/PublicHolidays/2025/US');
    expect(service.holidays()).toHaveLength(2);
  });

  it('should handle network error', () => {
    service.loadHolidays(2025);
    const req = httpMock.expectOne('https://date.nager.at/api/v3/PublicHolidays/2025/US');
    req.error(new ProgressEvent('error'), { status: 0 });

    expect(service.error()).toBe('Network error. Please check your connection.');
    expect(service.holidays()).toHaveLength(0);
    expect(service.loading()).toBe(false);
  });

  it('should handle HTTP error', () => {
    service.loadHolidays(2025);
    const req = httpMock.expectOne('https://date.nager.at/api/v3/PublicHolidays/2025/US');
    req.flush('Not Found', { status: 404, statusText: 'Not Found' });

    expect(service.error()).toBe('Failed to load holidays (HTTP 404).');
    expect(service.holidays()).toHaveLength(0);
  });

  it('should check if a date is a holiday', () => {
    service.loadHolidays(2025);
    httpMock.expectOne('https://date.nager.at/api/v3/PublicHolidays/2025/US').flush(mockHolidays);

    expect(service.isHoliday(new Date(2025, 0, 1))).toBe(true);
    expect(service.isHoliday(new Date(2025, 0, 2))).toBe(false);
  });

  it('should get holiday name', () => {
    service.loadHolidays(2025);
    httpMock.expectOne('https://date.nager.at/api/v3/PublicHolidays/2025/US').flush(mockHolidays);

    expect(service.getHolidayName(new Date(2025, 0, 1))).toBe("New Year's Day");
    expect(service.getHolidayName(new Date(2025, 0, 2))).toBeUndefined();
  });

  it('should use different country code', () => {
    service.setCountryCode('TW');
    service.loadHolidays(2025);

    const req = httpMock.expectOne('https://date.nager.at/api/v3/PublicHolidays/2025/TW');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should handle a country with no public holidays', () => {
    service.setCountryCode('TW');
    service.loadHolidays(2025);
    httpMock.expectOne('https://date.nager.at/api/v3/PublicHolidays/2025/TW').flush([]);

    expect(service.holidays()).toEqual([]);
    expect(service.error()).toBeNull();
    expect(service.loading()).toBe(false);
  });

  it('should ignore a stale response that arrives after a newer request', () => {
    service.loadHolidays(2025);
    const staleUs = httpMock.expectOne('https://date.nager.at/api/v3/PublicHolidays/2025/US');

    service.setCountryCode('TW');
    service.loadHolidays(2025);
    httpMock.expectOne('https://date.nager.at/api/v3/PublicHolidays/2025/TW').flush([]);
    staleUs.flush(mockHolidays);

    expect(service.holidays()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('should keep loading when a stale request finishes before the latest one', () => {
    service.loadHolidays(2025);
    const staleUs = httpMock.expectOne('https://date.nager.at/api/v3/PublicHolidays/2025/US');

    service.setCountryCode('TW');
    service.loadHolidays(2025);
    const latestTw = httpMock.expectOne('https://date.nager.at/api/v3/PublicHolidays/2025/TW');

    staleUs.flush(mockHolidays);
    expect(service.loading()).toBe(true);
    expect(service.holidays()).toEqual([]);

    latestTw.flush([]);
    expect(service.loading()).toBe(false);
  });

  it('should still cache a stale response for later use', () => {
    service.loadHolidays(2025);
    const staleUs = httpMock.expectOne('https://date.nager.at/api/v3/PublicHolidays/2025/US');
    service.setCountryCode('TW');
    service.loadHolidays(2025);
    httpMock.expectOne('https://date.nager.at/api/v3/PublicHolidays/2025/TW').flush([]);
    staleUs.flush(mockHolidays);

    service.setCountryCode('US');
    service.loadHolidays(2025);
    httpMock.expectNone('https://date.nager.at/api/v3/PublicHolidays/2025/US');
    expect(service.holidays()).toHaveLength(2);
  });

  it('should time out a request that never responds', () => {
    vi.useFakeTimers();
    try {
      service.loadHolidays(2025);
      const req = httpMock.expectOne('https://date.nager.at/api/v3/PublicHolidays/2025/US');

      vi.advanceTimersByTime(10_000);

      expect(req.cancelled).toBe(true);
      expect(service.error()).toBe('Request timed out. Please try again.');
      expect(service.loading()).toBe(false);
      expect(service.holidays()).toEqual([]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('should fetch separately for different years', () => {
    service.loadHolidays(2025);
    httpMock.expectOne('https://date.nager.at/api/v3/PublicHolidays/2025/US').flush(mockHolidays);

    service.loadHolidays(2026);
    httpMock.expectOne('https://date.nager.at/api/v3/PublicHolidays/2026/US').flush([]);

    expect(service.holidays()).toHaveLength(0);
  });
});
