import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HeroMapComponent } from './hero-map.component';
import { HiwLayout } from './motion/layout.service';

describe('HeroMapComponent', () => {
  let fixture: ComponentFixture<HeroMapComponent>;
  let el: HTMLElement;

  beforeEach(() => {
    fixture = TestBed.createComponent(HeroMapComponent);
    fixture.componentRef.setInput('lang', 'en');
    fixture.detectChanges();
    el = fixture.nativeElement;
  });

  const node = (id: string) => el.querySelector(`[data-node="${id}"]`) as SVGGElement;
  const litEdges = () =>
    fixture.componentInstance.view().edges.filter((e) => e.stroke === '#1976d2').length;

  it('draws every box of the system with pulses on the links', () => {
    expect(el.querySelectorAll('.map-node')).toHaveLength(8);
    expect(el.querySelectorAll('.pulse')).toHaveLength(10);
    expect(el.textContent).toContain('RateCalendarComponent');
  });

  it('traces a box’s path on hover and dims the rest', () => {
    node('svc').dispatchEvent(new Event('mouseenter'));
    fixture.detectChanges();
    expect(litEdges()).toBe(3);
    expect(node('engine').getAttribute('opacity')).toBe('0.4');
    expect(node('cache').getAttribute('opacity')).toBe('1');

    node('svc').dispatchEvent(new Event('mouseleave'));
    fixture.detectChanges();
    expect(litEdges()).toBe(0);
  });

  it('also traces on keyboard focus', () => {
    node('engine').dispatchEvent(new Event('focus'));
    fixture.detectChanges();
    expect(litEdges()).toBe(4);
  });

  it('emits the chapter of a clicked box', () => {
    const go = vi.fn();
    fixture.componentInstance.go.subscribe(go);
    node('cache').dispatchEvent(new Event('click'));
    node('we').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(go.mock.calls).toEqual([[3], [1]]);
  });

  it('switches to the narrow layout', () => {
    TestBed.inject(HiwLayout).narrow.set(true);
    fixture.detectChanges();
    expect(el.querySelector('svg')!.getAttribute('viewBox')).toBe('0 0 340 380');
  });
});
