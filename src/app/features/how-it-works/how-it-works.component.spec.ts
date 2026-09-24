import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { DOCUMENT } from '@angular/common';
import { routes } from '../../app.routes';
import { HowItWorksComponent } from './how-it-works.component';

describe('HowItWorksComponent', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
  });

  afterEach(() => vi.useRealTimers());

  const open = async (url: string) => {
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl(url, HowItWorksComponent);
    return { harness, page, el: harness.routeNativeElement! };
  };

  it('renders the English page: hero map and four chapters', async () => {
    const { el } = await open('/how-it-works');
    expect(el.querySelector('.hiw-title')?.textContent).toContain('Taking a rate calendar apart');
    expect(el.querySelector('app-hero-map')).not.toBeNull();
    expect(el.querySelectorAll('.hiw-chapter')).toHaveLength(4);
    expect(TestBed.inject(DOCUMENT).documentElement.lang).toBe('en');
    expect(el.querySelector('.hiw-langs [aria-current="page"]')?.textContent).toContain('EN');
  });

  it('renders Chinese on /how-it-works/zh and restores the html lang on leave', async () => {
    const doc = TestBed.inject(DOCUMENT);
    doc.documentElement.lang = 'en';
    const { harness, el } = await open('/how-it-works/zh');
    expect(el.querySelector('.hiw-title')?.textContent).toContain('拆開一個房價日曆');
    expect(el.querySelector('#agent .hiw-concept')?.textContent).toContain('構想 · 尚未實作');
    expect(doc.documentElement.lang).toBe('zh-Hant');
    harness.fixture.destroy();
    expect(doc.documentElement.lang).toBe('en');
  });

  it('links each index card to its chapter', async () => {
    const { el } = await open('/how-it-works');
    const hrefs = [...el.querySelectorAll('.hiw-index a')].map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual([
      '/how-it-works#pricing',
      '/how-it-works#signals',
      '/how-it-works#network',
      '/how-it-works#agent',
    ]);
  });

  it('scrolls to a chapter when a map box is clicked', async () => {
    const { page, el } = await open('/how-it-works');
    const target = el.querySelector('#network') as HTMLElement;
    target.scrollIntoView = vi.fn();
    page.goTo(3);
    expect(target.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
  });
});
