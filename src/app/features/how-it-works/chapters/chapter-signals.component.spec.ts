import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChapterSignalsComponent, NodeId, RUNS } from './chapter-signals.component';

describe('ChapterSignalsComponent', () => {
  let fixture: ComponentFixture<ChapterSignalsComponent>;
  let c: ChapterSignalsComponent;

  const settle = async (ms = 0) => {
    await vi.advanceTimersByTimeAsync(ms);
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(0);
    fixture.detectChanges();
  };
  const reran = () => [...c.reran()].sort();
  const sorted = (ids: NodeId[]) => [...ids].sort();
  const seek = (ms: number) => {
    c.timeline.seek(ms);
    fixture.detectChanges();
    return c.frame();
  };
  const cell = (day: number) => c.frame().cells[day - 1];

  beforeEach(async () => {
    vi.useFakeTimers();
    fixture = TestBed.createComponent(ChapterSignalsComponent);
    fixture.componentRef.setInput('lang', 'en');
    c = fixture.componentInstance;
    fixture.detectChanges();
    await settle(500); // US holidays arrive, then the intro change 90 → 100 runs
  });
  afterEach(() => {
    fixture.destroy();
    vi.useRealTimers();
  });

  it('opens on a real base-rate change: config, rules, days and detail re-ran, holidayMap did not', () => {
    expect(c.engine.config().baseRate).toBe(100);
    expect(reran()).toEqual(sorted(['config', 'rules', 'days', 'detail']));
    expect(c.changedDays()).toHaveLength(31);
    expect(c.result().untouched).toBe('holidayMap');
    expect(Object.keys(RUNS.base.hits).sort()).toEqual(reran());
  });

  it('reveals new prices cell by cell, in date order', () => {
    const at10 = 2100 + 9 * 40;
    seek(at10 - 1);
    expect([cell(9).price, cell(10).price]).toEqual(['$120', '$108']);
    seek(at10);
    expect(cell(10).price).toBe('$120');
    seek(c.timeline.total());
    expect(cell(31).price).toBe('$120');
    expect(cell(25)).toMatchObject({ price: '$180', holiday: 'Christmas Day' });
  });

  it('lights a node only when the replay reaches it, with its real run count', () => {
    let f = seek(1000);
    const node = (id: NodeId) => f.nodes.find((n) => n.id === id)!;
    expect([node('config').lit, node('rules').lit, node('days').lit]).toEqual([true, false, false]);
    f = seek(c.timeline.total());
    expect(node('days').lit).toBe(true);
    expect(node('holidayMap').lit).toBe(false);
    expect(fixture.nativeElement.querySelectorAll('.node.lit')).toHaveLength(4);
    const shown = c.frame().texts.find((t) => t.x === node('days').counter.cx)!.text;
    expect(Number(shown)).toBe(c.counts().days);
  });

  it('switching country re-runs only the holiday side; only Dec 25 changes', async () => {
    fixture.nativeElement.querySelectorAll('.seg button')[1].click();
    fixture.detectChanges();
    expect(c.holidays.loading()).toBe(true);
    await settle(450);
    expect(reran()).toEqual(sorted(['holidays', 'holidayMap', 'days', 'detail']));
    expect(c.changedDays().map((d) => d.day)).toEqual([25]);
    expect(c.captions().at(-1)![0]).toBe('Only Dec 25 changes: $180 → $120');
    seek(3399);
    expect(cell(25).price).toBe('$180');
    seek(3400);
    expect(cell(25)).toMatchObject({ price: '$120', holiday: null });
    expect(c.frame().country).toBe('TW holidays');
  });

  it('clicking a day re-runs only selectedDate and detail', async () => {
    (fixture.nativeElement.querySelectorAll('.cell')[25] as HTMLElement).click(); // Dec 26
    await settle();
    expect(reran()).toEqual(sorted(['selectedDate', 'detail']));
    expect(c.changedDays()).toHaveLength(0);
    seek(1000);
    expect(c.frame().detail).toContain('Dec 25');
    seek(c.timeline.total());
    expect(c.frame().detail).toBe('Sat, Dec 26 · $150 = $100 × 1.25 weekend × 1.2 peak');
  });

  it('waits until the slider stops before committing a base-rate change', async () => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector('#f2-base');
    input.value = '150';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(c.baseValue()).toBe(150);
    expect(c.engine.config().baseRate).toBe(100);
    await settle(260);
    expect(c.engine.config().baseRate).toBe(150);
    expect(c.captions()[0][0]).toBe('Base rate → $150: config is written');
  });

  it('ignores a click on the country already selected', () => {
    const mode = c.mode();
    c.setCountry('US');
    expect(c.mode()).toBe(mode);
  });

  it('speaks Chinese', () => {
    fixture.componentRef.setInput('lang', 'zh');
    fixture.detectChanges();
    expect(c.result().changed).toBe('31 天中 31 天改變');
    expect(fixture.nativeElement.textContent).toContain('改了基本房價，哪些東西會重算？');
  });
});
