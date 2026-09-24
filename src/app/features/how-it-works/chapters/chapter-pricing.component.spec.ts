import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChapterPricingComponent, PRICING_PRESETS } from './chapter-pricing.component';

describe('ChapterPricingComponent', () => {
  let fixture: ComponentFixture<ChapterPricingComponent>;
  let c: ChapterPricingComponent;

  beforeEach(() => {
    fixture = TestBed.createComponent(ChapterPricingComponent);
    fixture.componentRef.setInput('lang', 'en');
    c = fixture.componentInstance;
    fixture.detectChanges();
  });

  const texts = () => c.frame().texts.map((t) => t.text);
  const at = (ms: number) => {
    c.timeline.seek(ms);
    fixture.detectChanges();
    return c.frame();
  };

  it.each(PRICING_PRESETS.map((p) => [p.id, p] as const))(
    '%s: the pipeline ends at the engine’s own answer',
    (_, p) => {
      c.pickPreset(p);
      const expected = c.engine.calculate(p.date, p.holiday !== undefined, p.holiday);
      const m = c.model();
      expect(m.final).toBe(expected.finalRate);
      expect(m.prices[3]).toBeCloseTo(expected.finalRate, 2);
      expect(m.rules.filter((r) => r.applies)).toHaveLength(expected.adjustments.length);
    },
  );

  it('narrates Christmas: weekend skipped, holiday and peak applied, $180 stamped', () => {
    expect(c.captions().map((b) => b[0])).toEqual([
      'Start from the base rate: $100',
      'Weekend? No → skipped',
      'Holiday? Yes → ×1.50',
      'Peak season? Yes → ×1.20',
      'Stamp $180 onto Fri, Dec 25',
    ]);
    const end = at(c.timeline.total());
    expect(end.gates.map((g) => g.state)).toEqual(['skip', 'open', 'open']);
    expect(texts()).toContain('$180');
    expect(end.cell.stroke).toBe('#1d1d1f');
  });

  it('shows the gate checking the day midway through its step', () => {
    const f = at(700 + 0.4 * 1600);
    expect(f.gates[0].state).toBe('check');
    expect(f.gates[1].state).toBe('idle');
    expect(texts()).toContain('$100');
  });

  it('counts the price up as a rule applies', () => {
    at(700 + 1600 + 0.75 * 1600);
    const price = c
      .frame()
      .texts.find((t) => t.size === 15 && t.text.startsWith('$') && t.fill === '#1d1d1f');
    const value = Number(price!.text.slice(1));
    expect(value).toBeGreaterThan(100);
    expect(value).toBeLessThan(150);
  });

  it('recomputes and replays when a slider changes the real config', () => {
    at(3000);
    const input: HTMLInputElement = fixture.nativeElement.querySelector('#f1-baseRate');
    input.value = '200';
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(c.engine.config().baseRate).toBe(200);
    expect(c.model().final).toBe(360);
    expect(c.timeline.t()).toBe(0);
  });

  it('replays when another day is picked', () => {
    at(5000);
    (fixture.nativeElement.querySelector('.hiw-chip') as HTMLElement).click();
    fixture.detectChanges();
    expect(c.preset().id).toBe('mar10');
    expect(c.timeline.t()).toBe(0);
    expect(c.captions()[4][0]).toBe('Stamp $100 onto Tue, Mar 10');
  });

  it('shows the real guard clauses in the details', () => {
    fixture.nativeElement.querySelector('.hiw-details-toggle').click();
    fixture.detectChanges();
    const pre = fixture.nativeElement.querySelector('.hiw-pre').textContent;
    expect(pre).toContain('if (!context.isWeekend) return null;');
    expect(pre).toContain('if (!this.peakMonths.includes(month)) return null;');
  });

  it('speaks Chinese', () => {
    fixture.componentRef.setInput('lang', 'zh');
    fixture.detectChanges();
    expect(c.caption()).toBe('從基本房價開始：$100');
    expect(fixture.nativeElement.textContent).toContain('一天的房價是怎麼算出來的？');
  });
});
