import {
  ChangeDetectionStrategy,
  Component,
  EnvironmentInjector,
  OnDestroy,
  OnInit,
  computed,
  createEnvironmentInjector,
  inject,
  input,
  signal,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HolidayService } from '../../../core/holiday/holiday.service';
import { DemoEvent, DemoHttpHandler, DemoPlan } from '../demo-http-handler';
import { Lang, NetworkText, ScenarioId, TEXT } from '../i18n';

/** 0 = UI, 1 = HolidayService, 2 = Cache, 3 = API */
export type Lane = 0 | 1 | 2 | 3;
export type Tone = 'plain' | 'ok' | 'bad' | 'warn' | 'muted';

export interface SequenceRow {
  id: number;
  t: number;
  from: Lane;
  to: Lane;
  code: string;
  note: (t: NetworkText) => string;
  tone: Tone;
}

interface Scenario {
  steps: { at: number; country: string }[];
  plan: (country: string) => DemoPlan;
}

interface PendingRequest {
  id: number;
  country: string;
  since: number;
}

export const YEAR = 2026;
export const TIMEOUT_MS = 10_000;

const ok = (latencyMs: number): DemoPlan => ({ latencyMs, outcome: 'ok' });

export const SCENARIOS: Record<ScenarioId, Scenario> = {
  normal: { steps: [{ at: 0, country: 'US' }], plan: () => ok(600) },
  cached: {
    steps: [
      { at: 0, country: 'US' },
      { at: 1200, country: 'US' },
    ],
    plan: () => ok(600),
  },
  race: {
    steps: [
      { at: 0, country: 'US' },
      { at: 300, country: 'TW' },
    ],
    plan: (country) => ok(country === 'US' ? 2400 : 700),
  },
  error: {
    steps: [{ at: 0, country: 'US' }],
    plan: () => ({ latencyMs: 700, outcome: 'error500' }),
  },
  offline: {
    steps: [{ at: 0, country: 'US' }],
    plan: () => ({ latencyMs: 500, outcome: 'offline' }),
  },
  timeout: { steps: [{ at: 0, country: 'US' }], plan: () => ({ latencyMs: 0, outcome: 'hang' }) },
};

export const SCENARIO_IDS = Object.keys(SCENARIOS) as ScenarioId[];

@Component({
  selector: 'app-chapter-network',
  templateUrl: './chapter-network.component.html',
  styleUrl: './chapter-network.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChapterNetworkComponent implements OnInit, OnDestroy {
  readonly lang = input.required<Lang>();
  readonly t = computed(() => TEXT[this.lang()].network);

  private readonly parentInjector = inject(EnvironmentInjector);

  readonly scenarioIds = SCENARIO_IDS;
  readonly lanes = [0, 1, 2, 3] as const;
  readonly scenario = signal<ScenarioId>('normal');
  readonly rows = signal<SequenceRow[]>([]);
  readonly pending = signal<PendingRequest[]>([]);
  readonly running = signal(false);
  readonly service = signal<HolidayService | null>(null);
  /** Milliseconds since the run started, refreshed by a ticker while running. */
  readonly now = signal(0);

  readonly view = computed(() => {
    const t = this.t();
    return this.rows().map((row) => ({
      ...row,
      lo: Math.min(row.from, row.to),
      hi: Math.max(row.from, row.to),
      text: row.note(t),
    }));
  });

  private injector: EnvironmentInjector | null = null;
  private handler: DemoHttpHandler | null = null;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private ticker: ReturnType<typeof setInterval> | undefined;
  private startedAt = 0;
  private runId = 0;
  private rowId = 0;
  private stepsLeft = 0;

  ngOnInit(): void {
    this.run('normal');
  }

  ngOnDestroy(): void {
    this.reset();
  }

  run(id: ScenarioId): void {
    this.reset();
    const scenario = SCENARIOS[id];
    const runId = this.runId;

    // A fresh HolidayService (and cache) per run, backed by the simulated API.
    this.injector = createEnvironmentInjector(
      [
        DemoHttpHandler,
        {
          provide: HttpClient,
          useFactory: (h: DemoHttpHandler) => new HttpClient(h),
          deps: [DemoHttpHandler],
        },
        HolidayService,
      ],
      this.parentInjector,
    );
    this.handler = this.injector.get(DemoHttpHandler);
    this.handler.plan = (country) => scenario.plan(country);
    this.handler.listener = (event) => this.onEvent(event, runId);
    this.service.set(this.injector.get(HolidayService));

    this.scenario.set(id);
    this.startedAt = Date.now();
    this.stepsLeft = scenario.steps.length;
    this.running.set(true);
    this.ticker = setInterval(() => this.now.set(this.elapsed()), 100);
    scenario.steps.forEach((step, i) => {
      const previous = scenario.steps[i - 1]?.country;
      this.timers.push(setTimeout(() => this.load(step.country, previous), step.at));
    });
  }

  replay(): void {
    this.run(this.scenario());
  }

  age(request: PendingRequest): number {
    return Math.max(0, this.now() - request.since);
  }

  laneCenter(lane: number): number {
    return lane * 25 + 12.5;
  }

  private load(country: string, previous: string | undefined): void {
    const svc = this.service()!;
    const handler = this.handler!;
    const key = `${country}-${YEAR}`;
    const kind = previous === undefined ? 'open' : previous === country ? 'again' : 'switch';

    this.add(0, 0, '', (t) => t.rows[kind](country), 'plain');
    this.add(0, 1, `loadHolidays(${YEAR})`, () => `countryCode = '${country}'`, 'plain');
    svc.setCountryCode(country);
    const before = handler.requests;
    svc.loadHolidays(YEAR);
    if (handler.requests === before) {
      this.add(1, 2, `has('${key}')`, (t) => t.rows.hit, 'ok');
      this.add(1, 0, 'holidays.set(cached)', (t) => t.rows.fromCache, 'ok');
    }
    this.stepsLeft--;
    this.checkDone();
  }

  private onEvent(event: DemoEvent, runId: number): void {
    if (runId !== this.runId) return;
    const key = `${event.country}-${event.year}`;
    switch (event.type) {
      case 'request':
        this.add(1, 2, `has('${key}')`, (t) => t.rows.miss, 'muted');
        this.add(1, 3, `GET /PublicHolidays/${event.year}/${event.country}`, () => '', 'plain');
        this.pending.update((list) => [
          ...list,
          { id: event.id, country: event.country, since: this.elapsed() },
        ]);
        return;
      case 'response':
        this.settle(event.id);
        this.add(3, 1, '200 OK', (t) => t.rows.ok(event.count ?? 0), 'ok');
        return;
      case 'error':
        this.settle(event.id);
        if (event.status === 0) this.add(3, 1, 'status 0', (t) => t.rows.offline, 'bad');
        else this.add(3, 1, `${event.status} Internal Server Error`, () => '', 'bad');
        return;
      case 'cancel':
        this.settle(event.id);
        this.add(1, 3, 'unsubscribe()', (t) => t.rows.cancel, 'bad');
        this.afterService(runId, () => this.reportFailure());
        return;
      case 'delivered':
        this.afterService(runId, () => this.reportDelivered(event.country, key));
        return;
      case 'failed':
        this.afterService(runId, () => this.reportFailure());
        return;
    }
  }

  /** Waits until the service's own pipe (tap / catchError / finalize) has finished. */
  private afterService(runId: number, report: () => void): void {
    void Promise.resolve().then(() => {
      if (runId !== this.runId) return;
      report();
      this.checkDone();
    });
  }

  private reportDelivered(country: string, key: string): void {
    const svc = this.service()!;
    const shown = svc.holidays();
    this.add(1, 2, `set('${key}')`, () => '', 'muted');
    if (shown[0]?.countryCode === country) {
      this.add(
        1,
        0,
        `holidays.set(${shown.length})`,
        (t) => t.rows.shown(shown.length, country),
        'ok',
      );
    } else {
      const latest = `${svc.countryCode()}-${YEAR}`;
      this.add(1, 1, `latestKey === '${latest}'`, (t) => t.rows.stale(key, latest), 'warn');
    }
  }

  private reportFailure(): void {
    const message = this.service()!.error();
    if (message) this.add(1, 0, `error.set("${message}")`, (t) => t.rows.errorSet, 'bad');
  }

  private add(
    from: Lane,
    to: Lane,
    code: string,
    note: (t: NetworkText) => string,
    tone: Tone,
  ): void {
    const row: SequenceRow = { id: ++this.rowId, t: this.elapsed(), from, to, code, note, tone };
    this.rows.update((rows) => [...rows, row]);
  }

  private settle(id: number): void {
    this.pending.update((list) => list.filter((p) => p.id !== id));
  }

  private checkDone(): void {
    if (this.stepsLeft > 0 || this.pending().length > 0) return;
    this.running.set(false);
    clearInterval(this.ticker);
    this.now.set(this.elapsed());
  }

  private elapsed(): number {
    return Date.now() - this.startedAt;
  }

  private reset(): void {
    this.runId++;
    this.timers.forEach(clearTimeout);
    this.timers = [];
    clearInterval(this.ticker);
    this.handler?.dispose();
    this.injector?.destroy();
    this.handler = null;
    this.injector = null;
    this.service.set(null);
    this.rows.set([]);
    this.pending.set([]);
    this.running.set(false);
    this.now.set(0);
  }
}
