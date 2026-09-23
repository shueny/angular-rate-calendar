import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { RateCalendarComponent } from './rate-calendar.component';
import { PricingConfigFormComponent } from './pricing-config-form.component';

const API = 'https://date.nager.at/api/v3/PublicHolidays';

describe('RateCalendarComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RateCalendarComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function createAt(date: Date) {
    const fixture = TestBed.createComponent(RateCalendarComponent);
    fixture.componentInstance.currentDate.set(date);
    fixture.detectChanges();
    return fixture;
  }

  it('should load holidays for the next year when navigating from December to January', () => {
    const fixture = createAt(new Date(2026, 11, 1));
    httpMock.expectOne(`${API}/2026/US`).flush([]);

    fixture.componentInstance.nextMonth();
    fixture.detectChanges();

    httpMock.expectOne(`${API}/2027/US`).flush([]);
    expect(fixture.componentInstance.monthLabel()).toBe('January 2027');
  });

  it('should load holidays for the displayed year when the country changes', () => {
    const viewedYear = new Date().getFullYear() + 1;
    const fixture = createAt(new Date(viewedYear, 5, 1));
    httpMock.expectOne(`${API}/${viewedYear}/US`).flush([]);

    const form = fixture.debugElement.query(By.directive(PricingConfigFormComponent))
      .componentInstance as PricingConfigFormComponent;
    form.form.patchValue({ countryCode: 'TW' });
    form.onSubmit();
    fixture.detectChanges();

    const twRequests = httpMock.match((req) => req.url.endsWith('/TW'));
    expect(twRequests.map((r) => r.request.url)).toEqual([`${API}/${viewedYear}/TW`]);
    twRequests.forEach((r) => r.flush([]));
  });
});
