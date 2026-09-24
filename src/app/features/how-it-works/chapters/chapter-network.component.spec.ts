import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChapterNetworkComponent } from './chapter-network.component';
import { HiwLayout } from '../motion/layout.service';

describe('ChapterNetworkComponent', () => {
  let fixture: ComponentFixture<ChapterNetworkComponent>;
  let c: ChapterNetworkComponent;

  const end = () => {
    c.timeline.seek(c.timeline.total());
    fixture.detectChanges();
    return c.frame();
  };
  const card = () => Object.fromEntries(c.frame().card.map((x) => [x.cls, x.value]));
  const texts = () => c.frame().texts.map((t) => t.text);

  beforeEach(async () => {
    vi.useFakeTimers();
    fixture = TestBed.createComponent(ChapterNetworkComponent);
    fixture.componentRef.setInput('lang', 'en');
    c = fixture.componentInstance;
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(10_500);
    fixture.detectChanges();
  });
  afterEach(() => {
    fixture.destroy();
    vi.useRealTimers();
  });

  it('records all six scenarios from the real service', () => {
    expect(Object.keys(c.facts()).sort()).toEqual([
      'cached',
      'error',
      'normal',
      'offline',
      'race',
      'timeout',
    ]);
  });

  it('normal: ends with the recorded holidays on screen and US cached', () => {
    end();
    expect(card()).toEqual({ country: 'US', shown: 'US 2026 · 6', loading: 'false', error: '—' });
    expect(texts()).toContain('US 2026');
    expect(c.caption()).toBe('Calendar fills in');
  });

  it('race: the stale shield blocks the late US answer and TW stays', () => {
    (fixture.nativeElement.querySelector('[data-scenario="race"]') as HTMLElement).click();
    fixture.detectChanges();
    expect(c.timeline.t()).toBe(0);
    c.timeline.seek(2400 * 2.2 + 100);
    fixture.detectChanges();
    expect(c.frame().shield?.color).toBe('#c62828');
    expect(texts()).toContain('STALE');
    end();
    expect(card()).toMatchObject({ country: 'TW', shown: 'TW 2026 · 8' });
    expect(texts()).toContain('stored US + TW');
  });

  it('timeout: the ring counts down the real 10 s, then the error from the service shows', () => {
    c.pickScenario('timeout');
    c.timeline.seek(1150 * 2.2 + 5000);
    fixture.detectChanges();
    const api = c.frame().stations[3];
    expect(api.ring?.offset).toBeCloseTo(50, 0);
    expect(texts()).toContain('5.0 s');
    end();
    expect(card()['error']).toBe('Request timed out. Please try again.');
  });

  it('offline: the packet fizzles with status 0', () => {
    c.pickScenario('offline');
    c.timeline.seek(1100 * 2.2 + 200);
    fixture.detectChanges();
    expect(c.frame().frags).toHaveLength(4);
    expect(texts()).toContain('status 0');
  });

  it('cached: the API is never called', () => {
    c.pickScenario('cached');
    c.timeline.seek(1000);
    fixture.detectChanges();
    expect(c.frame().stations[3].fill).toBe('#f2f1ec');
    expect(texts()).toContain('not called');
  });

  it('shows the sequence log with the real request URL and error', () => {
    c.pickScenario('error');
    end();
    fixture.nativeElement.querySelector('.hiw-details-toggle').click();
    fixture.detectChanges();
    const log = fixture.nativeElement.querySelector('.hiw-log').textContent;
    expect(log).toContain('GET date.nager.at/api/v3/PublicHolidays/2026/US');
    expect(log).toContain("error.set('Failed to load holidays (HTTP 500).')");
  });

  it('switches to the narrow layout', () => {
    TestBed.inject(HiwLayout).narrow.set(true);
    fixture.detectChanges();
    expect(c.frame().vb).toBe('0 0 350 596');
  });

  it('leaves no timers behind when destroyed while recording', async () => {
    const early = TestBed.createComponent(ChapterNetworkComponent);
    early.componentRef.setInput('lang', 'zh');
    early.detectChanges();
    await vi.advanceTimersByTimeAsync(100);
    early.destroy();
    fixture.destroy();
    expect(vi.getTimerCount()).toBe(0);
  });
});
