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

  it('renders the English page with three chapters', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/how-it-works', HowItWorksComponent);
    const el = harness.routeNativeElement!;

    expect(el.querySelector('h2')?.textContent).toContain('Taking a rate calendar apart');
    expect(el.querySelectorAll('.hiw-chapter')).toHaveLength(3);
    expect(TestBed.inject(DOCUMENT).documentElement.lang).toBe('en');
    expect(el.querySelector('.hiw-langs [aria-current="page"]')?.textContent).toContain('English');
  });

  it('renders Chinese on /how-it-works/zh and restores the html lang on leave', async () => {
    const doc = TestBed.inject(DOCUMENT);
    doc.documentElement.lang = 'en';
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/how-it-works/zh', HowItWorksComponent);
    const el = harness.routeNativeElement!;

    expect(el.querySelector('h2')?.textContent).toContain('拆開一個房價日曆');
    expect(el.querySelector('#pricing h3')?.textContent).toContain('一天的房價');
    expect(doc.documentElement.lang).toBe('zh-Hant');

    harness.fixture.destroy();
    expect(doc.documentElement.lang).toBe('en');
  });

  it('links the table of contents to each chapter on the same page', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/how-it-works', HowItWorksComponent);
    const hrefs = [...harness.routeNativeElement!.querySelectorAll('.hiw-toc a')].map((a) =>
      a.getAttribute('href'),
    );

    expect(hrefs).toEqual([
      '/how-it-works#pricing',
      '/how-it-works#signals',
      '/how-it-works#network',
    ]);
  });
});
