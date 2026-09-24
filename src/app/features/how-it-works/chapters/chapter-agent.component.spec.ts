import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChapterAgentComponent } from './chapter-agent.component';
import { HiwLayout } from '../motion/layout.service';

describe('ChapterAgentComponent', () => {
  let fixture: ComponentFixture<ChapterAgentComponent>;
  let c: ChapterAgentComponent;

  beforeEach(() => {
    fixture = TestBed.createComponent(ChapterAgentComponent);
    fixture.componentRef.setInput('lang', 'en');
    c = fixture.componentInstance;
    fixture.detectChanges();
  });

  const at = (ms: number) => {
    c.timeline.seek(ms);
    fixture.detectChanges();
    return c.frame();
  };
  const texts = () => c.frame().texts.map((t) => t.text);

  it('is labelled as a concept that is not built yet', () => {
    expect(fixture.nativeElement.querySelector('.hiw-concept').textContent).toContain(
      'Concept · not built yet',
    );
  });

  it('walks through eight steps', () => {
    expect(c.timeline.marks().ends).toHaveLength(8);
    expect(c.caption()).toBe('The manager asks a what-if question');
  });

  it('the write attempt is rejected because no such tool exists', () => {
    at(8400);
    expect(texts()).toContain('rejected');
    expect(texts()).toContain('no such tool');
    expect(c.frame().frags.length).toBeGreaterThan(0);
  });

  it('ends with config v14 and the calendar re-priced', () => {
    at(c.timeline.total());
    expect(texts()).toContain('v14');
    expect(texts()).toContain('weekends $168');
    expect(c.caption()).toBe('Logged and versioned; the calendar re-prices');
  });

  it('shows the tool list and the log in the details', () => {
    fixture.nativeElement.querySelector('.hiw-details-toggle').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.hiw-pre').textContent).toContain('no setConfig');
    expect(fixture.nativeElement.querySelectorAll('.hiw-log .row')).toHaveLength(12);
  });

  it('uses short names in the narrow layout and speaks Chinese', () => {
    TestBed.inject(HiwLayout).narrow.set(true);
    fixture.componentRef.setInput('lang', 'zh');
    fixture.detectChanges();
    expect(c.frame().vb).toBe('0 0 350 432');
    expect(texts()).toContain('經理');
  });
});
