import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlayerComponent } from './player.component';
import { Timeline } from './timeline';

describe('PlayerComponent', () => {
  let fixture: ComponentFixture<PlayerComponent>;
  let tl: Timeline;
  let el: HTMLElement;

  beforeEach(() => {
    tl = new Timeline(signal(false));
    tl.setDurations([1000, 2000, 3000]);
    fixture = TestBed.createComponent(PlayerComponent);
    fixture.componentRef.setInput('timeline', tl);
    fixture.componentRef.setInput('caption', 'Cache miss');
    fixture.componentRef.setInput('lang', 'en');
    fixture.detectChanges();
    el = fixture.nativeElement;
  });

  const text = (sel: string) => el.querySelector(sel)!.textContent!.trim();
  const click = (sel: string) => {
    (el.querySelector(sel) as HTMLElement).click();
    fixture.detectChanges();
  };

  it('shows the caption, the step counter and the time', () => {
    expect(text('.text')).toBe('Cache miss');
    expect(text('.step')).toBe('Step 1/3');
    expect(text('.time')).toBe('0.00 / 6.0s');
    expect(el.querySelectorAll('.tick')).toHaveLength(2);
  });

  it('steps forward and back', () => {
    click('.fwd');
    expect(tl.t()).toBe(1000);
    click('.fwd');
    expect(text('.step')).toBe('Step 2/3');
    click('.back');
    expect(tl.t()).toBe(1000);
  });

  it('toggles play, pause and replay', () => {
    const play = el.querySelector('.play')!;
    expect(play.getAttribute('aria-label')).toBe('Play');
    click('.play');
    expect(tl.playing()).toBe(true);
    expect(play.getAttribute('aria-label')).toBe('Pause');
    click('.play');
    expect(tl.playing()).toBe(false);
    tl.seek(6000);
    fixture.detectChanges();
    expect(play.getAttribute('aria-label')).toBe('Replay');
  });

  it('supports the keyboard on the timeline slider', () => {
    const scrub = el.querySelector('.scrub')!;
    const key = (k: string) => {
      scrub.dispatchEvent(new KeyboardEvent('keydown', { key: k, cancelable: true }));
      fixture.detectChanges();
    };
    key('ArrowRight');
    expect(tl.t()).toBe(1000);
    key('End');
    expect(tl.t()).toBe(6000);
    expect(scrub.getAttribute('aria-valuenow')).toBe('6000');
    key('Home');
    expect(tl.t()).toBe(0);
    key(' ');
    expect(tl.playing()).toBe(true);
    key('ArrowLeft');
    expect(tl.playing()).toBe(false);
  });

  it('scrubs to the pointer position', () => {
    const scrub = el.querySelector('.scrub') as HTMLElement;
    scrub.getBoundingClientRect = () => ({ left: 0, width: 200 }) as DOMRect;
    const ev = new MouseEvent('pointerdown', { clientX: 50 });
    Object.defineProperty(ev, 'pointerId', { value: 1 });
    scrub.dispatchEvent(ev);
    expect(tl.t()).toBe(1500);
  });

  it('switches speed and shows it next to the time', () => {
    const buttons = el.querySelectorAll('.speeds button');
    (buttons[2] as HTMLElement).click();
    fixture.detectChanges();
    expect(tl.speed()).toBe(2);
    expect(buttons[2].getAttribute('aria-pressed')).toBe('true');
    expect(text('.time')).toContain('2×');
  });

  it('translates its labels', () => {
    fixture.componentRef.setInput('lang', 'zh');
    fixture.detectChanges();
    expect(text('.step')).toBe('步驟 1/3');
    expect(el.querySelector('.fwd')!.getAttribute('aria-label')).toBe('下一步');
  });
});
