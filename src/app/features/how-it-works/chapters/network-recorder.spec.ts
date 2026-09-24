import { EnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SCENARIO_IDS, ScenarioFacts, ScenarioId, recordScenario } from './network-recorder';
import { buildScript } from './network-script';

/** Runs every scenario against the real HolidayService on fake timers. */
async function recordAll(): Promise<Record<ScenarioId, ScenarioFacts>> {
  const parent = TestBed.inject(EnvironmentInjector);
  const recordings = SCENARIO_IDS.map((id) => recordScenario(parent, id));
  await vi.advanceTimersByTimeAsync(10_500);
  const facts = await Promise.all(recordings.map((r) => r.facts));
  recordings.forEach((r) => r.dispose());
  return Object.fromEntries(SCENARIO_IDS.map((id, i) => [id, facts[i]])) as Record<
    ScenarioId,
    ScenarioFacts
  >;
}

describe('recordScenario (real HolidayService)', () => {
  let facts: Record<ScenarioId, ScenarioFacts>;

  beforeEach(async () => {
    vi.useFakeTimers();
    facts = await recordAll();
  });
  afterEach(() => vi.useRealTimers());

  it('normal: one request, cached, shown', () => {
    expect(facts.normal).toMatchObject({
      requests: ['https://date.nager.at/api/v3/PublicHolidays/2026/US'],
      counts: { US: 6 },
      stored: ['US-2026'],
      ignored: [],
      shown: { country: 'US', count: 6 },
      loading: false,
      error: null,
    });
  });

  it('cached: the second load is a cache hit with no request', () => {
    expect(facts.cached.requests).toHaveLength(1);
    expect(facts.cached.cacheHits).toBe(1);
  });

  it('race: the late US answer is cached but never shown', () => {
    expect(facts.race).toMatchObject({
      stored: ['TW-2026', 'US-2026'],
      ignored: ['US-2026'],
      country: 'TW',
      shown: { country: 'TW', count: 8 },
    });
  });

  it('server error and offline: the service’s own messages, nothing cached', () => {
    expect(facts.error).toMatchObject({
      error: 'Failed to load holidays (HTTP 500).',
      stored: [],
      shown: null,
      loading: false,
    });
    expect(facts.offline).toMatchObject({
      error: 'Network error. Please check your connection.',
      stored: [],
    });
  });

  it('timeout: the request is cancelled after 10 s', () => {
    expect(facts.timeout).toMatchObject({
      cancelled: true,
      error: 'Request timed out. Please try again.',
      loading: false,
    });
  });

  it.each(SCENARIO_IDS)(
    '%s: the animation’s cache matches what the service really stored',
    (id) => {
      const script = buildScript(id, facts[id]);
      const drawn = new Set([...script.cache0, ...script.cache.map(([, key]) => key)]);
      expect(drawn).toEqual(new Set(facts[id].stored.map((k) => k.replace('-', ' '))));
    },
  );

  it.each(SCENARIO_IDS)('%s: the animation’s final state card uses the recorded state', (id) => {
    const script = buildScript(id, facts[id]);
    const last = Object.assign({}, ...script.ui.map(([, v]) => v));
    const f = facts[id];
    expect(last.l).toBe(String(f.loading));
    if (f.error) expect(last.e).toBe(f.error);
    if (f.shown && id !== 'error')
      expect(last.s).toBe(`${f.shown.country} 2026 · ${f.shown.count}`);
  });

  it('before the recording finishes, values show as pending instead of guesses', () => {
    const script = buildScript('error');
    expect(Object.assign({}, ...script.ui.map(([, v]) => v)).e).toBe('…');
  });

  it('keeps the timeout window real-length while stretching the rest', () => {
    const script = buildScript('timeout', facts.timeout);
    expect(script.ring![1] - script.ring![0]).toBe(10_000);
    expect(script.steps[0].dur).toBe(Math.round(800 * 2.2));
  });
});
