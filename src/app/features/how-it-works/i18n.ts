export type Lang = 'en' | 'zh';

export type ScenarioId = 'normal' | 'cached' | 'race' | 'error' | 'offline' | 'timeout';

export type PresetTag = 'weekday' | 'weekend' | 'holidayPeak' | 'all';

export type ConfigKey =
  'baseRate' | 'weekendMultiplier' | 'holidayMultiplier' | 'peakSeasonMultiplier';

interface ChapterText {
  title: string;
  intro: string;
  caption: string;
  takeaway: string;
}

export interface PageText {
  htmlLang: string;
  locale: string;
  kicker: string;
  title: string;
  lede: string;
  note: string;
  contents: string;
  langLabel: string;
  back: string;
  notes: string;
  notesHref: string;
  source: string;
}

export interface PricingText extends ChapterText {
  pickDay: string;
  tags: Record<PresetTag, string>;
  tune: string;
  controls: Record<ConfigKey, string>;
  contextTitle: string;
  base: string;
  final: string;
  skipped: string;
  replay: string;
}

export interface SignalsText extends ChapterText {
  base: string;
  country: string;
  pickDay: string;
  loading: string;
  signal: string;
  computed: string;
  graphLabel: string;
  idle: string;
  reran: string;
  untouched: string;
  changed: (n: number, total: number) => string;
  runs: (n: number) => string;
  footnote: string;
  selected: string;
  weekdays: string[];
}

export interface NetworkText extends ChapterText {
  scenarioLabel: string;
  scenarios: Record<ScenarioId, { label: string; desc: string }>;
  lanes: [string, string, string, string];
  replay: string;
  inFlight: string;
  stateTitle: string;
  picked: string;
  showing: string;
  none: string;
  rows: {
    open: (country: string) => string;
    switch: (country: string) => string;
    again: (country: string) => string;
    miss: string;
    hit: string;
    ok: (n: number) => string;
    offline: string;
    shown: (n: number, country: string) => string;
    fromCache: string;
    stale: (key: string, latest: string) => string;
    cancel: string;
    errorSet: string;
  };
}

export interface HowItWorksText {
  page: PageText;
  pricing: PricingText;
  signals: SignalsText;
  network: NetworkText;
}

export const TEXT: Record<Lang, HowItWorksText> = {
  en: {
    page: {
      htmlLang: 'en',
      locale: 'en-US',
      kicker: 'How it works',
      title: 'Taking a rate calendar apart',
      lede: "This side project answers one question: what should a hotel room cost on a given day? Below it is split into three smaller questions. Every diagram runs the app's real services in your browser, so you can poke at them.",
      note: 'Holiday data in the diagrams comes from a simulated API with sample data, so the network can be made slow or broken on purpose.',
      contents: 'Contents',
      langLabel: 'Language',
      back: '← Back to the calendar',
      notes: 'Learning notes: From React to Angular',
      notesHref: 'learning/en/',
      source: 'Source code on GitHub',
    },
    pricing: {
      title: "How is one day's price calculated?",
      intro:
        'The pricing engine starts from the base rate and hands the day to each rule in a fixed order. A rule either returns a multiplier or null, which means "this day isn\'t my case". The final price is the base rate times every multiplier that came back.',
      pickDay: 'Pick a day',
      tags: {
        weekday: 'weekday',
        weekend: 'weekend',
        holidayPeak: 'holiday · peak season',
        all: 'weekend · holiday · peak season',
      },
      tune: 'Tune the config',
      controls: {
        baseRate: 'Base rate',
        weekendMultiplier: 'Weekend ×',
        holidayMultiplier: 'Holiday ×',
        peakSeasonMultiplier: 'Peak season ×',
      },
      contextTitle: 'What every rule receives',
      base: 'Base rate',
      final: 'Final rate',
      skipped: 'returned null · skipped',
      replay: 'Replay',
      caption:
        'Fig. 1 — PricingEngineService.calculate(), one rule at a time. The code under each rule is its real guard clause.',
      takeaway:
        "Each rule is one class behind the same interface (the Strategy pattern). Adding a rule, like a loyalty discount, means writing one more class; the engine and the calendar don't change.",
    },
    signals: {
      title: 'What recomputes when the base rate changes?',
      intro:
        'State lives in signals. A computed() remembers which signals it read the last time it ran, so when one of them changes, Angular re-runs only the computations downstream of it. Change something below and watch which nodes light up.',
      base: 'Base rate',
      country: 'Country',
      pickDay: 'Click a day to select it.',
      loading: 'Waiting for the API…',
      signal: 'signal',
      computed: 'computed',
      graphLabel: 'Dependency graph of signals and computed values',
      idle: 'Change something above to see what re-runs.',
      reran: 'Re-ran',
      untouched: 'Untouched',
      changed: (n, total) => `${n} of ${total} days changed`,
      runs: (n) => `${n} runs`,
      footnote:
        'The number on each node counts how many times it has produced a new value. days and detail also read the base rate directly.',
      selected: 'Selected',
      weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      caption:
        "Fig. 2 — The app's real PricingEngineService and HolidayService, wired to a December 2026 calendar.",
      takeaway:
        'Change the base rate and holidayMap stays put. Switch the country and rules stays put. No code says what to update; the dependencies are tracked while the code runs.',
    },
    network: {
      title: 'Where do holidays come from, and what if the network misbehaves?',
      intro:
        'Holidays come from the public Nager.Date API. HolidayService wraps each request with a cache, a 10-second timeout, and a check that throws away answers nobody is waiting for anymore. Pick a scenario to replay it.',
      scenarioLabel: 'Scenario',
      scenarios: {
        normal: { label: 'Normal', desc: 'First load of the year: request, response, cache.' },
        cached: {
          label: 'Cached',
          desc: 'The same year is asked for twice. The second answer never leaves the service.',
        },
        race: {
          label: 'Race',
          desc: 'The user picks US, then switches to TW before US answers. The US answer arrives last and must not overwrite TW.',
        },
        error: { label: 'Server error', desc: 'The API answers with HTTP 500.' },
        offline: { label: 'Offline', desc: 'The request never reaches a server (status 0).' },
        timeout: {
          label: 'Timeout',
          desc: 'The API never answers. After 10 seconds the service gives up.',
        },
      },
      lanes: ['UI', 'HolidayService', 'Cache', 'API (simulated)'],
      replay: 'Replay',
      inFlight: 'Requests in flight (10 s budget)',
      stateTitle: 'Service state',
      picked: 'Country picked',
      showing: 'Holidays on screen',
      none: 'none',
      rows: {
        open: (c) => `User opens the calendar (${c})`,
        switch: (c) => `User switches to ${c}`,
        again: (c) => `User comes back to ${c}`,
        miss: 'miss',
        hit: 'hit, no request needed',
        ok: (n) => `${n} holidays`,
        offline: 'no response',
        shown: (n, c) => `${n} ${c} holidays on screen`,
        fromCache: 'straight from the cache',
        stale: (key, latest) => `${key} is stale (latest is ${latest}): cached, not shown`,
        cancel: 'no answer after 10 s: request cancelled',
        errorSet: 'shown to the user',
      },
      caption:
        'Fig. 3 — A fresh HolidayService for every run, talking to a simulated API. The times are real.',
      takeaway:
        'The latest-request check is why the race ends with TW on screen even though US answered last. Without it, whichever response arrived last would win.',
    },
  },
  zh: {
    page: {
      htmlLang: 'zh-Hant',
      locale: 'zh-TW',
      kicker: '它是怎麼運作的',
      title: '拆開一個房價日曆',
      lede: '這個 side project 回答一個問題：某一天的房間該賣多少錢？下面把它拆成三個小問題。每張圖都在你的瀏覽器裡跑專案真正的 service，可以直接動手玩。',
      note: '圖中的假日資料來自模擬的 API 和範例資料，這樣才能故意讓網路變慢或壞掉。',
      contents: '目錄',
      langLabel: '語言',
      back: '← 回到日曆',
      notes: '學習筆記：從 React 到 Angular',
      notesHref: 'learning/',
      source: 'GitHub 原始碼',
    },
    pricing: {
      title: '一天的房價是怎麼算出來的？',
      intro:
        '定價引擎從基本房價出發，把這一天依固定順序交給每條規則。規則要嘛回傳一個倍率，要嘛回傳 null，意思是「這天不歸我管」。最後的價格就是基本房價乘上所有回傳的倍率。',
      pickDay: '選一天',
      tags: {
        weekday: '平日',
        weekend: '週末',
        holidayPeak: '假日 · 旺季',
        all: '週末 · 假日 · 旺季',
      },
      tune: '調整設定',
      controls: {
        baseRate: '基本房價',
        weekendMultiplier: '週末 ×',
        holidayMultiplier: '假日 ×',
        peakSeasonMultiplier: '旺季 ×',
      },
      contextTitle: '每條規則拿到的資料',
      base: '基本房價',
      final: '最終房價',
      skipped: '回傳 null · 略過',
      replay: '重播',
      caption:
        '圖 1 — PricingEngineService.calculate()，一次一條規則。每條規則下面的程式碼是它真正的防衛條件（guard clause）。',
      takeaway:
        '每條規則都是一個實作相同介面的 class（策略模式）。要加新規則，例如會員折扣，只要多寫一個 class，引擎和日曆都不用改。',
    },
    signals: {
      title: '改了基本房價，哪些東西會重算？',
      intro:
        '狀態存在 signal 裡。computed() 會記得上次執行時讀過哪些 signal，所以其中一個變了，Angular 只會重跑它下游的計算。動一下下面的控制項，看看哪些節點會亮起來。',
      base: '基本房價',
      country: '國家',
      pickDay: '點一天來選取它。',
      loading: '等待 API 回應…',
      signal: 'signal',
      computed: 'computed',
      graphLabel: 'signal 與 computed 的相依關係圖',
      idle: '改動上面的設定，看看哪些會重跑。',
      reran: '重跑',
      untouched: '沒動',
      changed: (n, total) => `${total} 天裡有 ${n} 天變了`,
      runs: (n) => `執行 ${n} 次`,
      footnote: '節點上的數字是它產生新值的次數。days 和 detail 也會直接讀基本房價。',
      selected: '選取',
      weekdays: ['日', '一', '二', '三', '四', '五', '六'],
      caption:
        '圖 2 — 專案真正的 PricingEngineService 與 HolidayService，接在 2026 年 12 月的日曆上。',
      takeaway:
        '改基本房價時 holidayMap 不動；換國家時 rules 不動。程式裡沒有寫「要更新什麼」，相依關係是在程式執行時自動追蹤的。',
    },
    network: {
      title: '假日資料從哪來？網路出狀況時會怎樣？',
      intro:
        '假日來自公開的 Nager.Date API。HolidayService 幫每個請求包上快取、10 秒逾時，以及一個檢查：已經沒人在等的回應就丟掉。選一個情境來重播。',
      scenarioLabel: '情境',
      scenarios: {
        normal: { label: '正常', desc: '這一年第一次載入：送出請求、收到回應、寫進快取。' },
        cached: { label: '快取', desc: '同一年被要了兩次。第二次的答案不用離開 service。' },
        race: {
          label: '競態',
          desc: '使用者先選 US，在 US 回來之前又換成 TW。US 的回應最後才到，不能蓋掉 TW。',
        },
        error: { label: '伺服器錯誤', desc: 'API 回傳 HTTP 500。' },
        offline: { label: '離線', desc: '請求根本沒送到伺服器（status 0）。' },
        timeout: { label: '逾時', desc: 'API 一直沒回應。10 秒後 service 放棄。' },
      },
      lanes: ['畫面', 'HolidayService', '快取', 'API（模擬）'],
      replay: '重播',
      inFlight: '進行中的請求（上限 10 秒）',
      stateTitle: 'Service 狀態',
      picked: '選的國家',
      showing: '畫面上的假日',
      none: '無',
      rows: {
        open: (c) => `使用者打開日曆（${c}）`,
        switch: (c) => `使用者換成 ${c}`,
        again: (c) => `使用者又回到 ${c}`,
        miss: '沒有',
        hit: '有，不用送請求',
        ok: (n) => `${n} 個假日`,
        offline: '沒有回應',
        shown: (n, c) => `畫面顯示 ${n} 個 ${c} 假日`,
        fromCache: '直接從快取拿',
        stale: (key, latest) => `${key} 已過時（最新是 ${latest}）：只存進快取，不顯示`,
        cancel: '10 秒沒回應：取消請求',
        errorSet: '顯示給使用者',
      },
      caption: '圖 3 — 每次重播都用一個全新的 HolidayService，連到模擬的 API。時間是真的。',
      takeaway:
        '有「只收最新請求」的檢查，競態情境最後畫面上才會是 TW，即使 US 最晚回來。少了它，最後到的回應就會蓋掉畫面。',
    },
  },
};
