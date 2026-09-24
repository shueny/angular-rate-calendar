import { Bi, ToneKey } from '../motion/motion';
import { ScenarioFacts, ScenarioId, YEAR } from './network-recorder';

export interface UiState {
  c?: string;
  s?: string;
  l?: string;
  e?: string;
}

export interface Packet {
  label: string;
  lane: 'req' | 'res';
  tone: ToneKey;
  /** [time, station position] keyframes; positions are station indexes (0 UI … 3 API). */
  kf: [number, number][];
  notes?: Bi[];
  end: number;
  fade?: number;
  recolor?: [number, ToneKey];
  fizzle?: { t: number; text: string };
}

export interface Flash {
  station: number;
  at: number;
  dur: number;
  label: string;
  tone: ToneKey;
}

export interface Script {
  steps: { dur: number; caption: Bi }[];
  packets: Packet[];
  flashes: Flash[];
  shield?: { k: number; from: number; hit: number };
  ring?: [number, number];
  cache0: string[];
  cache: [number, string][];
  ui: [number, UiState][];
  log: [number, string][];
}

export const SCENARIO_LABELS: Record<ScenarioId, Bi> = {
  normal: ['Normal', '正常'],
  cached: ['Cached', '快取命中'],
  race: ['Race', '競態'],
  error: ['Server error', '伺服器錯誤'],
  offline: ['Offline', '離線'],
  timeout: ['Timeout', '逾時'],
};

/** Stretch factor from the design's base timings to the figure's playback speed. */
const STRETCH = 2.2;

const ASK: Bi = [`loadHolidays(${YEAR})`, `loadHolidays(${YEAR})`];
const CHECK: Bi = ['in cache?', '查快取'];
const MISS: Bi = ['miss: not there', '沒有：未命中'];
const TO_API: Bi = ['fetch from API', '改向 API 抓'];
const MISS_KF: [number, number][] = [
  [0, 0],
  [400, 1],
  [650, 2],
  [800, 1.8],
  [1150, 3],
];
const UI0: UiState = { c: 'US', s: '—', l: 'true', e: '—' };

const missCaption: Bi = ['Request US 2026 · cache miss', '請求 US 2026 · 快取未命中'];
const callCaption: Bi = ['Service calls the API', '服務呼叫 API'];
const errorCaption: Bi = ['UI shows the error', 'UI 顯示錯誤訊息'];

/**
 * The choreography for one scenario. Every number and message it shows (holiday counts,
 * URLs, error text, final state) comes from `facts`, i.e. from running the real service.
 */
export function buildScript(id: ScenarioId, facts?: ScenarioFacts): Script {
  const show = (v: string | number | boolean | null | undefined) =>
    v === undefined || v === null ? '…' : String(v);
  const count = (country: string) => show(facts?.counts[country]);
  const shown = facts
    ? facts.shown
      ? `${facts.shown.country} ${YEAR} · ${facts.shown.count}`
      : '—'
    : '…';
  const error = show(facts?.error);
  const loading = show(facts?.loading);
  const get = (i: number) => 'GET ' + (facts?.requests[i]?.replace(/^https?:\/\//, '') ?? '…');
  const load = (country: string) => `holidayService.loadHolidays(${YEAR}) · countryCode ${country}`;
  const missLog: [number, string] = [650, `cache.has('US-${YEAR}') → false`];

  const raw: Record<ScenarioId, Script> = {
    normal: {
      steps: [
        { dur: 400, caption: ['UI asks the service for US 2026', 'UI 向服務要 US 2026'] },
        { dur: 400, caption: ['Cache miss: nothing stored yet', '快取未命中：還沒存過'] },
        { dur: 950, caption: callCaption },
        {
          dur: 750,
          caption: [
            `200 · ${count('US')} holidays, filed in the cache`,
            `200 · ${count('US')} 個假日，存進快取`,
          ],
        },
        { dur: 500, caption: ['Calendar fills in', '日曆填上假日'] },
      ],
      packets: [
        {
          label: 'US 2026',
          lane: 'req',
          tone: 'ink',
          kf: MISS_KF,
          notes: [ASK, CHECK, MISS, TO_API, ['API working…', 'API 處理中…']],
          end: 1750,
        },
        {
          label: `200 · ${count('US')} holidays`,
          lane: 'res',
          tone: 'ok',
          kf: [
            [1750, 3],
            [2100, 2],
            [2500, 0],
          ],
          notes: [
            ['save a copy', '存一份進快取'],
            ['hand to UI', '交給 UI'],
          ],
          end: 2650,
        },
      ],
      flashes: [
        { station: 2, at: 650, dur: 700, label: 'MISS', tone: 'warn' },
        { station: 3, at: 1150, dur: 600, label: 'working…', tone: 'accent' },
        { station: 2, at: 2100, dur: 700, label: 'stored', tone: 'ok' },
        { station: 0, at: 2500, dur: 700, label: `${count('US')} holidays`, tone: 'ok' },
      ],
      cache0: [],
      cache: [[2100, 'US 2026']],
      ui: [
        [0, UI0],
        [2500, { s: shown, l: loading }],
      ],
      log: [
        [0, load('US')],
        missLog,
        [800, get(0)],
        [1750, `200 OK · ${count('US')} holidays`],
        [2100, `cache.set('US-${YEAR}', holidays)`],
        [2500, '_holidays.set(holidays) · loading = false'],
      ],
    },
    cached: {
      steps: [
        { dur: 400, caption: ['Same request again: US 2026', '再要一次 US 2026'] },
        {
          dur: 400,
          caption: ['Cache hit: the answer is already stored', '快取命中：答案已經存著'],
        },
        {
          dur: 450,
          caption: ['It turns around; the API is never called', '直接折返，完全沒打 API'],
        },
        { dur: 450, caption: ['Calendar fills instantly', '日曆立刻填好'] },
      ],
      packets: [
        {
          label: 'US 2026',
          lane: 'req',
          tone: 'ink',
          kf: [
            [0, 0],
            [400, 1],
            [650, 2],
          ],
          notes: [ASK, CHECK, ['hit: found it', '命中：有存']],
          end: 800,
        },
        {
          label: 'US 2026 · hit',
          lane: 'res',
          tone: 'ok',
          kf: [
            [800, 2],
            [1250, 0],
          ],
          notes: [['stored copy to UI', '直接把快取給 UI']],
          end: 1400,
        },
      ],
      flashes: [
        { station: 2, at: 650, dur: 900, label: 'HIT', tone: 'ok' },
        { station: 3, at: 0, dur: 1700, label: 'not called', tone: 'muted' },
        { station: 0, at: 1250, dur: 700, label: `${count('US')} holidays`, tone: 'ok' },
      ],
      cache0: ['US 2026'],
      cache: [],
      ui: [
        [0, UI0],
        [1250, { s: shown, l: loading }],
      ],
      log: [
        [0, `${load('US')} · again`],
        [650, `cache.has('US-${YEAR}') → true`],
        [800, `0 HTTP requests · ${show(facts?.cacheHits)} cache hit`],
        [1250, '_holidays.set(cached) · loading = false'],
      ],
    },
    race: {
      steps: [
        {
          dur: 300,
          caption: ['Request US 2026 · the server is slow', '請求 US 2026 · 伺服器很慢'],
        },
        {
          dur: 400,
          caption: ['User switches to TW · US is now stale', '使用者切到 TW · US 變成過期請求'],
        },
        { dur: 300, caption: ['TW answers first · calendar shows TW', 'TW 先回來 · 日曆顯示 TW'] },
        {
          dur: 1400,
          caption: ['The late US answer is still travelling', '晚到的 US 回應還在路上'],
        },
        {
          dur: 800,
          caption: ['Stale shield: kept in cache, never shown', '過期擋板：只存進快取，不上畫面'],
        },
      ],
      packets: [
        {
          label: 'US 2026',
          lane: 'req',
          tone: 'ink',
          kf: [
            [0, 0],
            [600, 3],
          ],
          notes: [
            ['ask API for US', '向 API 要 US'],
            ['slow server…', '伺服器很慢…'],
          ],
          end: 1600,
        },
        {
          label: 'TW 2026',
          lane: 'req',
          tone: 'accent',
          kf: [
            [300, 0],
            [650, 3],
          ],
          notes: [['user picked TW', '使用者改選 TW']],
          end: 720,
        },
        {
          label: '200 · TW 2026',
          lane: 'res',
          tone: 'ok',
          kf: [
            [720, 3],
            [1000, 0],
          ],
          notes: [['TW answer to UI', 'TW 回應交給 UI']],
          end: 1150,
        },
        {
          label: '200 · US 2026',
          lane: 'res',
          tone: 'ink',
          recolor: [2400, 'bad'],
          kf: [
            [1600, 3],
            [1850, 2],
            [2400, 0.66],
            [2700, 1.0],
          ],
          notes: [
            ['save a copy', '存一份進快取'],
            ['late: nobody waits', '晚到：沒人在等'],
            ['blocked', '被擋下'],
          ],
          end: 3050,
          fade: 350,
        },
      ],
      flashes: [
        { station: 2, at: 380, dur: 300, label: 'MISS', tone: 'warn' },
        { station: 2, at: 520, dur: 280, label: 'MISS', tone: 'warn' },
        { station: 3, at: 650, dur: 950, label: 'slow…', tone: 'warn' },
        { station: 2, at: 800, dur: 500, label: 'stored TW', tone: 'ok' },
        { station: 0, at: 1000, dur: 1400, label: 'TW 2026', tone: 'ok' },
        { station: 2, at: 1850, dur: 1400, label: 'stored US + TW', tone: 'ok' },
        { station: 0, at: 2400, dur: 800, label: 'stays TW', tone: 'accent' },
      ],
      shield: { k: 0.42, from: 300, hit: 2400 },
      cache0: [],
      cache: [
        [800, 'TW 2026'],
        [1850, 'US 2026'],
      ],
      ui: [
        [0, UI0],
        [300, { c: show(facts?.country) }],
        [1000, { s: shown, l: loading }],
      ],
      log: [
        [0, `${load('US')} · request #1`],
        [300, `${load('TW')} · request #2 · latestKey = 'TW-${YEAR}'`],
        [1000, `#2 200 OK · ${count('TW')} holidays → _holidays.set(TW)`],
        [1850, `#1 200 OK → cache.set('US-${YEAR}', holidays)`],
        [
          2400,
          `#1 isLatest() = false → not shown · ignored: ${facts ? facts.ignored.join(', ') || 'none' : '…'}`,
        ],
      ],
    },
    error: {
      steps: [
        { dur: 800, caption: missCaption },
        { dur: 600, caption: callCaption },
        {
          dur: 900,
          caption: ['Server answers 500 · errors are not cached', '伺服器回 500 · 錯誤不進快取'],
        },
        { dur: 600, caption: errorCaption },
      ],
      packets: [
        {
          label: 'US 2026',
          lane: 'req',
          tone: 'ink',
          kf: MISS_KF,
          notes: [ASK, CHECK, MISS, TO_API],
          end: 1400,
        },
        {
          label: '500',
          lane: 'res',
          tone: 'bad',
          kf: [
            [1400, 3],
            [2250, 0],
          ],
          notes: [['error: skip cache', '錯誤：不存快取']],
          end: 2400,
        },
      ],
      flashes: [
        { station: 2, at: 650, dur: 700, label: 'MISS', tone: 'warn' },
        { station: 3, at: 1150, dur: 900, label: 'HTTP 500', tone: 'bad' },
        { station: 2, at: 1700, dur: 600, label: 'not cached', tone: 'muted' },
        { station: 0, at: 2250, dur: 650, label: 'error', tone: 'bad' },
      ],
      cache0: [],
      cache: [],
      ui: [
        [0, UI0],
        [2300, { l: loading, e: error }],
      ],
      log: [
        [0, load('US')],
        missLog,
        [800, get(0)],
        [1400, '500 Internal Server Error'],
        [1700, 'catchError → nothing cached (tap only runs on success)'],
        [2300, `error.set('${error}')`],
      ],
    },
    offline: {
      steps: [
        { dur: 800, caption: missCaption },
        { dur: 300, caption: ['No network: it never reaches the API', '沒有網路：請求到不了 API'] },
        { dur: 500, caption: ['The request fizzles · status 0', '請求消散 · status 0'] },
        { dur: 500, caption: errorCaption },
      ],
      packets: [
        {
          label: 'US 2026',
          lane: 'req',
          tone: 'ink',
          kf: [...MISS_KF.slice(0, 4), [1100, 2.5]],
          notes: [ASK, CHECK, MISS, ['no network', '沒有網路']],
          end: 1100,
          fizzle: { t: 1100, text: 'status 0' },
        },
      ],
      flashes: [
        { station: 2, at: 650, dur: 700, label: 'MISS', tone: 'warn' },
        { station: 3, at: 1100, dur: 1000, label: 'unreachable', tone: 'muted' },
        { station: 0, at: 1600, dur: 500, label: 'error', tone: 'bad' },
      ],
      cache0: [],
      cache: [],
      ui: [
        [0, UI0],
        [1600, { l: loading, e: error }],
      ],
      log: [
        [0, load('US')],
        missLog,
        [800, get(0)],
        [1100, 'HttpErrorResponse · status 0'],
        [1600, `error.set('${error}')`],
      ],
    },
    timeout: {
      steps: [
        { dur: 800, caption: missCaption },
        { dur: 350, caption: callCaption },
        {
          dur: 10000,
          caption: ['No reply · timeout(10 s) counting down', '沒有回應 · timeout(10 秒) 倒數中'],
        },
        { dur: 550, caption: ["Time's up: unsubscribe", '時間到：取消訂閱'] },
        { dur: 500, caption: errorCaption },
      ],
      packets: [
        {
          label: 'US 2026',
          lane: 'req',
          tone: 'ink',
          kf: MISS_KF,
          notes: [ASK, CHECK, MISS, TO_API, ['no reply yet', '還沒回應']],
          end: 11150,
          fizzle: { t: 11150, text: 'unsubscribe' },
        },
      ],
      ring: [1150, 11150],
      flashes: [
        { station: 2, at: 650, dur: 700, label: 'MISS', tone: 'warn' },
        { station: 0, at: 11700, dur: 500, label: 'error', tone: 'bad' },
      ],
      cache0: [],
      cache: [],
      ui: [
        [0, UI0],
        [11700, { l: loading, e: error }],
      ],
      log: [
        [0, load('US')],
        missLog,
        [800, get(0)],
        [1150, 'timeout(10_000) armed'],
        [11150, `TimeoutError → unsubscribe() · cancelled: ${show(facts?.cancelled)}`],
        [11700, `error.set('${error}')`],
      ],
    },
  };

  return stretch(raw[id]);
}

/** Slows the choreography down for reading, but keeps the 10 s timeout window real-length. */
function stretch(s: Script): Script {
  const ring = s.ring;
  const f = (t: number): number => {
    if (!ring || t <= ring[0]) return Math.round(t * STRETCH);
    if (t <= ring[1]) return Math.round(ring[0] * STRETCH + (t - ring[0]));
    return Math.round(ring[0] * STRETCH + (ring[1] - ring[0]) + (t - ring[1]) * STRETCH);
  };
  let at = 0;
  let prev = 0;
  const steps = s.steps.map((step) => {
    at += step.dur;
    const end = f(at);
    const dur = end - prev;
    prev = end;
    return { ...step, dur };
  });
  return {
    ...s,
    steps,
    packets: s.packets.map((p) => ({
      ...p,
      kf: p.kf.map(([t, k]): [number, number] => [f(t), k]),
      end: f(p.end),
      fade: p.fade ? p.fade * STRETCH : undefined,
      recolor: p.recolor ? [f(p.recolor[0]), p.recolor[1]] : undefined,
      fizzle: p.fizzle ? { ...p.fizzle, t: f(p.fizzle.t) } : undefined,
    })),
    flashes: s.flashes.map((fl) => ({ ...fl, at: f(fl.at), dur: f(fl.at + fl.dur) - f(fl.at) })),
    shield: s.shield ? { ...s.shield, from: f(s.shield.from), hit: f(s.shield.hit) } : undefined,
    ring: ring ? [f(ring[0]), f(ring[1])] : undefined,
    cache: s.cache.map(([t, k]): [number, string] => [f(t), k]),
    ui: s.ui.map(([t, v]): [number, UiState] => [f(t), v]),
    log: s.log.map(([t, x]): [number, string] => [f(t), x]),
  };
}
