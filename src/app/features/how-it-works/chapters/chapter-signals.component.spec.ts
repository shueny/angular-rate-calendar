import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChapterSignalsComponent, NodeId } from './chapter-signals.component';

describe('ChapterSignalsComponent', () => {
  let fixture: ComponentFixture<ChapterSignalsComponent>;
  let component: ChapterSignalsComponent;

  const lit = () => [...component.lit()].sort();
  const sorted = (ids: NodeId[]) => [...ids].sort();
  const rangeEvent = (value: number) => ({ target: { value: String(value) } }) as unknown as Event;

  beforeEach(async () => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({ imports: [ChapterSignalsComponent] });
    fixture = TestBed.createComponent(ChapterSignalsComponent);
    fixture.componentRef.setInput('lang', 'en');
    component = fixture.componentInstance;
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(500);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    vi.useRealTimers();
  });

  it('loads US holidays through the real HolidayService', () => {
    expect(component.holidays.countryCode()).toBe('US');
    expect(component.days()[24]).toMatchObject({ day: 25, holiday: 'Christmas Day', price: 180 });
    expect(component.report()).toBeNull();
  });

  it('base rate change re-runs config, rules, days and detail but not holidayMap', () => {
    component.setBase(rangeEvent(150));
    fixture.detectChanges();

    expect(lit()).toEqual(sorted(['config', 'rules', 'days', 'detail']));
    expect(component.changedDays().size).toBe(31);
    expect(component.days()[0].price).toBe(180); // Tue Dec 1: 150 × 1.2 peak
  });

  it('country change re-runs holidays, holidayMap, days and detail but not rules', async () => {
    component.setCountry('TW');
    fixture.detectChanges();
    expect(lit()).toEqual([]);
    expect(component.holidays.loading()).toBe(true);

    await vi.advanceTimersByTimeAsync(500);
    fixture.detectChanges();

    expect(lit()).toEqual(sorted(['holidays', 'holidayMap', 'days', 'detail']));
    expect([...component.changedDays()]).toEqual([25]);
    expect(component.days()[24].holiday).toBeNull();
  });

  it('picking a day re-runs only selectedDate and detail', () => {
    component.select(26);
    fixture.detectChanges();

    expect(lit()).toEqual(sorted(['selectedDate', 'detail']));
    expect(component.changedDays().size).toBe(0);
    expect(component.detail().finalRate).toBe(150); // Sat Dec 26: 100 × 1.25 × 1.2
  });

  it('ignores a click on the country that is already selected', () => {
    component.setCountry('US');
    fixture.detectChanges();

    expect(component.report()).toBeNull();
  });

  it('renders the graph, the calendar and the report', () => {
    component.select(4);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelectorAll('.node')).toHaveLength(7);
    expect(el.querySelectorAll('.node.lit')).toHaveLength(2);
    expect(el.querySelector('[data-node="detail"]')?.classList).toContain('lit');
    expect(el.querySelectorAll('.cell')).toHaveLength(31);
    expect(el.querySelector('.report')?.textContent).toContain('0 of 31 days changed');
  });
});
