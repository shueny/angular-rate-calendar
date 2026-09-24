export type Lang = 'en' | 'zh';

export interface ChapterText {
  kicker: string;
  title: string;
  lede: string;
  fig: string;
}

export interface HiwText {
  htmlLang: string;
  locale: string;
  kicker: string;
  subtitle: string;
  title: string;
  lede: string;
  fig0: string;
  figLabel0: string;
  mapHint: string;
  mapLabel: string;
  langLabel: string;
  chapters: string;
  concept: string;
  conceptShort: string;
  back: string;
  notes: string;
  notesHref: string;
  source: string;
  ch1: ChapterText;
  ch2: ChapterText;
  ch3: ChapterText;
  ch4: ChapterText & { flow: string };
  player: {
    step: string;
    stepBack: string;
    stepForward: string;
    speed: string;
    play: string;
    pause: string;
    replay: string;
    timeline: string;
  };
  details: string;
  hideDetails: string;
  log: string;
  f1: {
    day: string;
    base: string;
    weekend: string;
    holiday: string;
    peak: string;
    baseLabel: string;
  };
  f2: {
    base: string;
    country: string;
    hint: string;
    calTitle: string;
    holidays: string;
    legendSignal: string;
    legendComputed: string;
    reran: string;
    untouched: string;
    none: string;
    changed: (n: number, total: number) => string;
    waiting: string;
    weekdays: readonly string[];
  };
  f3: {
    scenario: string;
    stateTitle: string;
    country: string;
    onScreen: string;
    loading: string;
    error: string;
    empty: string;
    request: string;
    response: string;
    app: string;
    external: string;
    network: string;
  };
  f4: {
    tools: string;
    human: string;
  };
}

export const TEXT: Record<Lang, HiwText> = {
  en: {
    htmlLang: 'en',
    locale: 'en-US',
    kicker: 'How it works',
    subtitle: 'Rate Calendar · Angular 19',
    title: 'Taking a rate calendar apart',
    lede: 'A hotel rate calendar, built with Angular 19 while learning Angular.',
    fig0: 'FIG. 0 — System map',
    figLabel0: 'FIG. 0',
    mapHint: 'Hover a box to trace its path. Click it to jump to its chapter.',
    mapLabel: 'System map',
    langLabel: 'Language',
    chapters: 'Chapters',
    concept: 'Concept · not built yet',
    conceptShort: 'Concept',
    back: 'Back to the calendar',
    notes: 'Learning notes: From React to Angular',
    notesHref: 'learning/en/',
    source: 'Source code on GitHub',
    ch1: {
      kicker: 'Chapter 01',
      title: "How is one day's price calculated?",
      lede: 'Each rule either multiplies the price or steps aside.',
      fig: 'FIG. 1 — Pricing pipeline',
    },
    ch2: {
      kicker: 'Chapter 02',
      title: 'What recomputes when the base rate changes?',
      lede: 'Only what depends on the change runs again.',
      fig: 'FIG. 2 — Signal graph',
    },
    ch3: {
      kicker: 'Chapter 03',
      title: 'Where do holidays come from, and what if the network misbehaves?',
      lede: 'The service caches, times out, and ignores answers nobody is waiting for.',
      fig: 'FIG. 3 — Holiday requests',
    },
    ch4: {
      kicker: 'Chapter 04',
      title: 'What if an AI co-pilot helped the revenue manager set prices?',
      lede: 'The LLM only understands the question and puts the result into words; deterministic code and a person decide how prices are computed and whether anything is written.',
      fig: 'FIG. 4 — Revenue co-pilot agent',
      flow: 'Ask → tool calls → simulate → propose → approve',
    },
    player: {
      step: 'Step',
      stepBack: 'Step back',
      stepForward: 'Step forward',
      speed: 'Speed',
      play: 'Play',
      pause: 'Pause',
      replay: 'Replay',
      timeline: 'Timeline',
    },
    details: 'Show details',
    hideDetails: 'Hide details',
    log: 'Sequence log',
    f1: {
      day: 'Day',
      base: 'Base rate',
      weekend: 'Weekend ×',
      holiday: 'Holiday ×',
      peak: 'Peak season ×',
      baseLabel: 'BASE RATE',
    },
    f2: {
      base: 'Base rate',
      country: 'Country',
      hint: 'Drag the base rate, switch country, or click a day.',
      calTitle: 'DEC 2026 · days()',
      holidays: 'holidays',
      legendSignal: 'signal · writable',
      legendComputed: 'computed · derived',
      reran: 'Re-ran',
      untouched: 'Untouched',
      none: 'none',
      changed: (n, total) => `${n} of ${total} days changed`,
      waiting: 'waiting for API…',
      weekdays: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
    },
    f3: {
      scenario: 'Scenario',
      stateTitle: 'Live state · RateCalendarComponent',
      country: 'Country picked',
      onScreen: 'Holidays on screen',
      loading: 'Loading',
      error: 'Error',
      empty: 'empty',
      request: 'REQUEST · UI to API',
      response: 'RESPONSE · API back to UI',
      app: 'ANGULAR APP · IN THE BROWSER',
      external: 'EXTERNAL · INTERNET',
      network: 'NETWORK · HTTP',
    },
    f4: {
      tools: 'TOOLS · THE ONLY THINGS THE AGENT CAN CALL',
      human: 'HUMAN IN THE LOOP',
    },
  },
  zh: {
    htmlLang: 'zh-Hant',
    locale: 'zh-TW',
    kicker: '它是怎麼運作的',
    subtitle: 'Rate Calendar · Angular 19',
    title: '拆開一個房價日曆',
    lede: '一個飯店房價日曆，一邊學 Angular 19 一邊做出來。',
    fig0: '圖 0 — 系統地圖',
    figLabel0: '圖 0',
    mapHint: '滑過方塊看它的路徑，點擊跳到對應章節。',
    mapLabel: '系統地圖',
    langLabel: '語言',
    chapters: '章節',
    concept: '構想 · 尚未實作',
    conceptShort: '構想',
    back: '回到日曆',
    notes: '學習筆記：從 React 到 Angular',
    notesHref: 'learning/',
    source: 'GitHub 原始碼',
    ch1: {
      kicker: '第 01 章',
      title: '一天的房價是怎麼算出來的？',
      lede: '每條規則不是乘上倍率，就是讓開。',
      fig: '圖 1 — 計價流水線',
    },
    ch2: {
      kicker: '第 02 章',
      title: '改了基本房價，哪些東西會重算？',
      lede: '只有依賴變動的部分會重跑。',
      fig: '圖 2 — Signal 依賴圖',
    },
    ch3: {
      kicker: '第 03 章',
      title: '假日資料從哪來？網路出狀況時會怎樣？',
      lede: '服務會快取、會逾時，也會忽略沒人在等的回應。',
      fig: '圖 3 — 假日請求',
    },
    ch4: {
      kicker: '第 04 章',
      title: '如果讓 AI 副駕駛幫營收經理調價，要怎麼設計？',
      lede: 'LLM 只負責「聽懂問題、把結果說成人話」；價格怎麼算、能不能寫入，全部交給確定性的程式和人來決定。',
      fig: '圖 4 — 營收經理的房價副駕駛',
      flow: '提問 → 工具呼叫 → 模擬 → 提案 → 核准',
    },
    player: {
      step: '步驟',
      stepBack: '上一步',
      stepForward: '下一步',
      speed: '速度',
      play: '播放',
      pause: '暫停',
      replay: '重播',
      timeline: '時間軸',
    },
    details: '顯示細節',
    hideDetails: '隱藏細節',
    log: '時序紀錄',
    f1: {
      day: '日期',
      base: '基本房價',
      weekend: '週末 ×',
      holiday: '假日 ×',
      peak: '旺季 ×',
      baseLabel: '基本房價',
    },
    f2: {
      base: '基本房價',
      country: '國家',
      hint: '拖動基本房價、切換國家，或點一天。',
      calTitle: '2026 年 12 月 · days()',
      holidays: '假日',
      legendSignal: 'signal · 可寫入',
      legendComputed: 'computed · 衍生',
      reran: '重算',
      untouched: '未動',
      none: '無',
      changed: (n, total) => `${total} 天中 ${n} 天改變`,
      waiting: '等待 API…',
      weekdays: ['日', '一', '二', '三', '四', '五', '六'],
    },
    f3: {
      scenario: '情境',
      stateTitle: '即時狀態 · RateCalendarComponent',
      country: '選擇的國家',
      onScreen: '畫面上的假日',
      loading: '載入中',
      error: '錯誤',
      empty: '空',
      request: '請求 · UI 往 API',
      response: '回應 · API 回到 UI',
      app: 'Angular 應用 · 在瀏覽器內',
      external: '外部服務 · 網際網路',
      network: '網路 · HTTP',
    },
    f4: {
      tools: '工具 · Agent 唯一能呼叫的東西',
      human: '人在迴路',
    },
  },
};
