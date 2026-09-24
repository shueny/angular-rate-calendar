import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChapterNetworkComponent } from './chapter-network.component';

describe('ChapterNetworkComponent', () => {
  let fixture: ComponentFixture<ChapterNetworkComponent>;
  let component: ChapterNetworkComponent;

  const codes = () => component.view().map((r) => r.code);
  const notes = () => component.view().map((r) => r.text);

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({ imports: [ChapterNetworkComponent] });
    fixture = TestBed.createComponent(ChapterNetworkComponent);
    fixture.componentRef.setInput('lang', 'en');
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    vi.useRealTimers();
  });

  it('runs the normal scenario on load and ends with US holidays on screen', async () => {
    await vi.advanceTimersByTimeAsync(700);

    const svc = component.service()!;
    expect(svc.holidays().map((h) => h.countryCode)).toEqual(Array(6).fill('US'));
    expect(codes()).toEqual([
      '',
      'loadHolidays(2026)',
      "has('US-2026')",
      'GET /PublicHolidays/2026/US',
      '200 OK',
      "set('US-2026')",
      'holidays.set(6)',
    ]);
    expect(component.running()).toBe(false);
  });

  it('race: keeps TW on screen and marks the late US response as stale', async () => {
    component.run('race');
    await vi.advanceTimersByTimeAsync(1100);
    expect(component.service()!.holidays()[0].countryCode).toBe('TW');
    expect(component.pending().map((p) => p.country)).toEqual(['US']);

    await vi.advanceTimersByTimeAsync(1500);
    const svc = component.service()!;
    expect(svc.countryCode()).toBe('TW');
    expect(svc.holidays()[0].countryCode).toBe('TW');
    const stale = component.view().filter((r) => r.tone === 'warn');
    expect(stale.map((r) => r.text)).toEqual([
      'US-2026 is stale (latest is TW-2026): cached, not shown',
    ]);
    expect(component.running()).toBe(false);
  });

  it('cached: the second load of the same year sends no request', async () => {
    component.run('cached');
    await vi.advanceTimersByTimeAsync(2000);

    expect(codes().filter((c) => c.startsWith('GET'))).toHaveLength(1);
    expect(notes()).toContain('hit, no request needed');
    expect(component.service()!.holidays()).toHaveLength(6);
  });

  it('timeout: waits 10 s, cancels the request and shows the error', async () => {
    component.run('timeout');
    await vi.advanceTimersByTimeAsync(9_900);
    expect(component.pending()).toHaveLength(1);
    expect(component.service()!.error()).toBeNull();
    expect(component.running()).toBe(true);

    await vi.advanceTimersByTimeAsync(200);
    expect(component.pending()).toHaveLength(0);
    expect(codes()).toContain('unsubscribe()');
    expect(component.service()!.error()).toBe('Request timed out. Please try again.');
    expect(component.running()).toBe(false);
  });

  it.each([
    ['error', '500 Internal Server Error', 'Failed to load holidays (HTTP 500).'],
    ['offline', 'status 0', 'Network error. Please check your connection.'],
  ] as const)('%s: reports the failure the service shows', async (id, code, message) => {
    component.run(id);
    await vi.advanceTimersByTimeAsync(1000);

    expect(codes()).toContain(code);
    expect(codes()).toContain(`error.set("${message}")`);
    expect(component.service()!.holidays()).toEqual([]);
  });

  it('starting a new run discards the old one', async () => {
    component.run('timeout');
    await vi.advanceTimersByTimeAsync(100);
    component.run('normal');
    await vi.advanceTimersByTimeAsync(11_000);

    expect(codes()).not.toContain('unsubscribe()');
    expect(component.scenario()).toBe('normal');
  });

  it('leaves no timers behind when destroyed mid-request', async () => {
    component.run('race');
    await vi.advanceTimersByTimeAsync(500);
    fixture.destroy();

    expect(vi.getTimerCount()).toBe(0);
  });

  it('renders the rows and the service state', async () => {
    component.run('race');
    await vi.advanceTimersByTimeAsync(3000);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelectorAll('.row').length).toBe(component.rows().length);
    expect(el.querySelector('.tone-warn')?.textContent).toContain('stale');
    expect(el.querySelector('.picked')?.textContent).toContain('TW');
    expect(el.querySelector('.showing')?.textContent).toContain('8 × TW');
  });

  it('switches the notes to Chinese', async () => {
    fixture.componentRef.setInput('lang', 'zh');
    await vi.advanceTimersByTimeAsync(700);

    expect(notes()).toContain('畫面顯示 6 個 US 假日');
  });
});
