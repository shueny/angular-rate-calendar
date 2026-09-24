import { EnvironmentInjector, createEnvironmentInjector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HolidayService } from '../../../core/holiday/holiday.service';
import { DemoHttpHandler, DemoPlan } from '../demo-http-handler';

export type ScenarioId = 'normal' | 'cached' | 'race' | 'error' | 'offline' | 'timeout';

export const SCENARIO_IDS: ScenarioId[] = [
  'normal',
  'cached',
  'race',
  'error',
  'offline',
  'timeout',
];

export const YEAR = 2026;

/** What really happened when the scenario ran against the real HolidayService. */
export interface ScenarioFacts {
  /** URLs that reached the (simulated) network. */
  requests: string[];
  /** Holiday counts of successful responses, by country. */
  counts: Record<string, number>;
  /** Cache keys written by successful responses, e.g. "US-2026". */
  stored: string[];
  /** Successful responses that did not reach the screen because a newer request had started. */
  ignored: string[];
  /** Loads answered from the cache without a request. */
  cacheHits: number;
  /** Whether a request was unsubscribed before it answered. */
  cancelled: boolean;
  /** Final service state. */
  country: string;
  shown: { country: string; count: number } | null;
  loading: boolean;
  error: string | null;
}

interface RealRun {
  steps: { at: number; country: string }[];
  plan: (country: string) => DemoPlan;
}

const ok = (latencyMs: number): DemoPlan => ({ latencyMs, outcome: 'ok' });

/** The same scenarios as the figure, on a compressed clock (only the 10 s timeout is real-length). */
const REAL_RUNS: Record<ScenarioId, RealRun> = {
  normal: { steps: [{ at: 0, country: 'US' }], plan: () => ok(60) },
  cached: {
    steps: [
      { at: 0, country: 'US' },
      { at: 150, country: 'US' },
    ],
    plan: () => ok(60),
  },
  race: {
    steps: [
      { at: 0, country: 'US' },
      { at: 30, country: 'TW' },
    ],
    plan: (country) => ok(country === 'US' ? 240 : 70),
  },
  error: {
    steps: [{ at: 0, country: 'US' }],
    plan: () => ({ latencyMs: 70, outcome: 'error500' }),
  },
  offline: {
    steps: [{ at: 0, country: 'US' }],
    plan: () => ({ latencyMs: 50, outcome: 'offline' }),
  },
  timeout: { steps: [{ at: 0, country: 'US' }], plan: () => ({ latencyMs: 0, outcome: 'hang' }) },
};

export interface Recording {
  facts: Promise<ScenarioFacts>;
  dispose(): void;
}

/** Runs one scenario on a fresh HolidayService wired to the simulated API and reports what happened. */
export function recordScenario(parent: EnvironmentInjector, id: ScenarioId): Recording {
  const injector = createEnvironmentInjector(
    [
      DemoHttpHandler,
      {
        provide: HttpClient,
        useFactory: (h: DemoHttpHandler) => new HttpClient(h),
        deps: [DemoHttpHandler],
      },
      HolidayService,
    ],
    parent,
  );
  const handler = injector.get(DemoHttpHandler);
  const service = injector.get(HolidayService);
  const run = REAL_RUNS[id];
  const timers: ReturnType<typeof setTimeout>[] = [];
  const facts: ScenarioFacts = {
    requests: [],
    counts: {},
    stored: [],
    ignored: [],
    cacheHits: 0,
    cancelled: false,
    country: '',
    shown: null,
    loading: false,
    error: null,
  };

  const promise = new Promise<ScenarioFacts>((resolve) => {
    let stepsLeft = run.steps.length;
    let open = 0;
    const settle = () => {
      if (stepsLeft > 0 || open > 0) return;
      // The service's catchError/finalize run right after the handler reports; read the state after them.
      void Promise.resolve().then(() => {
        const holidays = service.holidays();
        facts.country = service.countryCode();
        facts.shown = holidays.length
          ? { country: holidays[0].countryCode, count: holidays.length }
          : null;
        facts.loading = service.loading();
        facts.error = service.error();
        resolve(facts);
      });
    };

    handler.plan = (country) => run.plan(country);
    handler.listener = (event) => {
      const key = `${event.country}-${event.year}`;
      switch (event.type) {
        case 'request':
          open++;
          facts.requests.push(event.url);
          break;
        case 'response':
          facts.counts[event.country] = event.count ?? 0;
          break;
        case 'delivered':
          open--;
          facts.stored.push(key);
          if (service.holidays()[0]?.countryCode !== event.country) facts.ignored.push(key);
          settle();
          break;
        case 'failed':
          open--;
          settle();
          break;
        case 'cancel':
          open--;
          facts.cancelled = true;
          settle();
          break;
      }
    };

    for (const step of run.steps) {
      timers.push(
        setTimeout(() => {
          const before = handler.requests;
          service.setCountryCode(step.country);
          service.loadHolidays(YEAR);
          if (handler.requests === before) facts.cacheHits++;
          stepsLeft--;
          settle();
        }, step.at),
      );
    }
  });

  return {
    facts: promise,
    dispose: () => {
      timers.forEach(clearTimeout);
      handler.dispose();
      injector.destroy();
    },
  };
}
