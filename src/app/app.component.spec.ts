import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should link to both learning notes pages relative to the base href', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    const zh: HTMLAnchorElement = fixture.nativeElement.querySelector('.learning-link');
    expect(zh.getAttribute('href')).toBe('learning/');
    expect(zh.textContent).toContain('從 React 到 Angular');

    const en: HTMLAnchorElement = fixture.nativeElement.querySelector('.learning-link-en');
    expect(en.getAttribute('href')).toBe('learning/en/');
    expect(en.textContent).toContain('From React to Angular');
  });

  it('should link to the calendar and the How it works page', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    const links = [...fixture.nativeElement.querySelectorAll('.app-nav a')].map(
      (a: HTMLAnchorElement) => [a.textContent?.trim(), a.getAttribute('href')],
    );
    expect(links).toEqual([
      ['Calendar', '/'],
      ['How it works', '/how-it-works'],
    ]);
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should have the correct title', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('Rate Calendar');
  });
});
