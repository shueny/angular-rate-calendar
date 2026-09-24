import { Bi, ToneKey } from '../motion/motion';

type Pt = [number, number];
type Curve = [Pt, Pt, Pt, Pt];

export type AgentNodeId =
  | 'manager'
  | 'chat'
  | 'agent'
  | 'ghost'
  | 'read'
  | 'sim'
  | 'propose'
  | 'calendar'
  | 'engine'
  | 'sandbox'
  | 'proposal'
  | 'audit'
  | 'config'
  | 'approve';

export interface AgentNode {
  id: AgentNodeId;
  name: Bi;
  short: Bi;
  sub: Bi;
}

const n = (id: AgentNodeId, name: Bi, short: Bi, sub: Bi): AgentNode => ({ id, name, short, sub });

export const AGENT_NODES: AgentNode[] = [
  n('manager', ['Revenue manager', '營收經理'], ['Manager', '經理'], ['PERSON', '人']),
  n('chat', ['Chat UI', '對話 UI'], ['Chat UI', '對話 UI'], ['ANGULAR', 'ANGULAR']),
  n('agent', ['Agent', 'Agent'], ['Agent', 'Agent'], ['LLM + ORCHESTRATION', 'LLM ＋ 流程控制']),
  n('ghost', ['Write tool', '寫入工具'], ['Write', '寫入'], ['DOES NOT EXIST', '不存在']),
  n(
    'read',
    ['Read-only tools', '唯讀工具'],
    ['Read-only', '唯讀'],
    ['PRICES · HOLIDAYS · CONFIG', '價格 · 假日 · 設定'],
  ),
  n('sim', ['Simulate tools', '模擬工具'], ['Simulate', '模擬'], ['SANDBOX ONLY', '只在沙盒']),
  n('propose', ['Propose tools', '提案工具'], ['Propose', '提案'], ['PENDING ONLY', '只建待核准']),
  n('calendar', ['Calendar', '日曆'], ['Calendar', '日曆'], ['SAME ENGINE', '同一個 engine']),
  n(
    'engine',
    ['PricingEngine', 'PricingEngine'],
    ['Engine', 'Engine'],
    ['calculate()', 'calculate()'],
  ),
  n(
    'sandbox',
    ['Sandbox engine', '沙盒 engine'],
    ['Sandbox', '沙盒'],
    ['ISOLATED COPY', '獨立副本'],
  ),
  n(
    'proposal',
    ['Proposal', '提案'],
    ['Proposal', '提案單'],
    ['diff · dates · reason', 'diff · 日期 · 理由'],
  ),
  n(
    'audit',
    ['Audit log', '稽核紀錄'],
    ['Audit', '稽核'],
    ['who · when · why', '誰 · 何時 · 為何'],
  ),
  n('config', ['Config', '設定'], ['Config', '設定'], ['v13', 'v13']),
  n(
    'approve',
    ['Approve', '核准'],
    ['Approve', '核准'],
    ['MANAGER · BACKEND CHECK', '經理 · 後端檢查'],
  ),
];

const line = (a: Pt, b: Pt): Curve => [a, a, b, b];

export interface AgentGeometry {
  vb: string;
  fs: number;
  sfs: number;
  box: Record<AgentNodeId, [number, number, number, number]>;
  edges: Record<string, Curve>;
  frames: {
    x: number;
    y: number;
    w: number;
    h: number;
    key: 'tools' | 'human';
    lx: number;
    ly: number;
    anchor?: 'end';
    warm?: boolean;
  }[];
}

export const AGENT_WIDE: AgentGeometry = {
  vb: '0 0 880 480',
  fs: 12,
  sfs: 9,
  box: {
    manager: [20, 20, 150, 56],
    chat: [250, 20, 160, 56],
    agent: [480, 20, 260, 56],
    ghost: [30, 150, 170, 56],
    read: [240, 150, 170, 56],
    sim: [440, 150, 170, 56],
    propose: [650, 150, 190, 56],
    calendar: [30, 280, 170, 56],
    engine: [240, 280, 170, 56],
    sandbox: [440, 280, 170, 56],
    proposal: [650, 280, 190, 56],
    audit: [240, 400, 170, 56],
    config: [440, 400, 170, 56],
    approve: [650, 400, 190, 56],
  },
  edges: {
    'm-c': line([170, 48], [250, 48]),
    'c-a': line([410, 48], [480, 48]),
    'a-g': [
      [520, 76],
      [520, 113],
      [115, 113],
      [115, 150],
    ],
    'a-r': [
      [580, 76],
      [580, 113],
      [325, 113],
      [325, 150],
    ],
    'a-s': [
      [610, 76],
      [610, 113],
      [525, 113],
      [525, 150],
    ],
    'a-p': [
      [650, 76],
      [650, 113],
      [745, 113],
      [745, 150],
    ],
    'r-e': line([325, 206], [325, 280]),
    's-x': line([525, 206], [525, 280]),
    'p-q': line([745, 206], [745, 280]),
    'q-ap': line([745, 336], [745, 400]),
    'ap-cf': line([650, 428], [610, 428]),
    'cf-au': line([440, 428], [410, 428]),
    'cf-e': [
      [525, 400],
      [525, 368],
      [325, 368],
      [325, 336],
    ],
    'e-cal': line([240, 308], [200, 308]),
  },
  frames: [
    { x: 16, y: 132, w: 848, h: 92, key: 'tools', lx: 24, ly: 218 },
    { x: 636, y: 388, w: 218, h: 80, key: 'human', lx: 854, ly: 478, anchor: 'end', warm: true },
  ],
};

export const AGENT_NARROW: AgentGeometry = {
  vb: '0 0 350 432',
  fs: 10,
  sfs: 8,
  box: {
    manager: [8, 8, 150, 44],
    chat: [192, 8, 150, 44],
    agent: [60, 84, 230, 48],
    ghost: [4, 176, 80, 44],
    read: [90, 176, 80, 44],
    sim: [180, 176, 80, 44],
    propose: [266, 176, 80, 44],
    calendar: [4, 270, 80, 44],
    engine: [90, 270, 80, 44],
    sandbox: [180, 270, 80, 44],
    proposal: [266, 270, 80, 44],
    audit: [90, 364, 80, 44],
    config: [180, 364, 80, 44],
    approve: [266, 364, 80, 44],
  },
  edges: {
    'm-c': line([158, 30], [192, 30]),
    'c-a': [
      [267, 52],
      [267, 68],
      [230, 68],
      [230, 84],
    ],
    'a-g': [
      [100, 132],
      [100, 154],
      [44, 154],
      [44, 176],
    ],
    'a-r': [
      [145, 132],
      [145, 154],
      [130, 154],
      [130, 176],
    ],
    'a-s': [
      [205, 132],
      [205, 154],
      [220, 154],
      [220, 176],
    ],
    'a-p': [
      [250, 132],
      [250, 154],
      [306, 154],
      [306, 176],
    ],
    'r-e': line([130, 220], [130, 270]),
    's-x': line([220, 220], [220, 270]),
    'p-q': line([306, 220], [306, 270]),
    'q-ap': line([306, 314], [306, 364]),
    'ap-cf': line([266, 386], [260, 386]),
    'cf-au': line([180, 386], [170, 386]),
    'cf-e': [
      [220, 364],
      [220, 342],
      [130, 342],
      [130, 314],
    ],
    'e-cal': line([90, 292], [84, 292]),
  },
  frames: [
    { x: 2, y: 166, w: 346, h: 62, key: 'tools', lx: 4, ly: 162 },
    { x: 260, y: 356, w: 90, h: 60, key: 'human', lx: 348, ly: 428, anchor: 'end', warm: true },
  ],
};

export const AGENT_STEPS: { dur: number; caption: Bi }[] = [
  { dur: 1600, caption: ['The manager asks a what-if question', '營收經理問一個假設問題'] },
  {
    dur: 2000,
    caption: ['Read current settings through a read-only tool', '用唯讀工具查目前設定'],
  },
  {
    dur: 2400,
    caption: [
      'Simulate on a sandbox copy; real settings untouched',
      '在沙盒副本試算，正式設定不動',
    ],
  },
  {
    dur: 1600,
    caption: ['The LLM only quotes numbers the engine produced', 'LLM 只轉述 engine 算出的數字'],
  },
  { dur: 1600, caption: ['There is no write tool to call', '沒有可以直接寫入的工具'] },
  {
    dur: 2200,
    caption: [
      'It files a proposal: diff, dates, revenue, reason',
      '建立提案：diff、日期、營收、理由',
    ],
  },
  {
    dur: 2000,
    caption: ['The manager approves; the backend checks permission', '經理按核准，後端檢查權限'],
  },
  {
    dur: 1600,
    caption: ['Logged and versioned; the calendar re-prices', '寫入稽核與版本，日曆同步更新'],
  },
];

export interface AgentPacket {
  label: Bi;
  tone: ToneKey;
  /** [edge, direction, start, end, how far along (default all the way)] */
  legs: [string, 1 | -1, number, number, number?][];
  end: number;
  fizzle?: { t: number; text: Bi };
}

const same = (s: string): Bi => [s, s];

export const AGENT_PACKETS: AgentPacket[] = [
  {
    label: ['Weekend ×1.4?', '週末改 ×1.4？'],
    tone: 'ink',
    legs: [
      ['m-c', 1, 0, 700],
      ['c-a', 1, 700, 1400],
    ],
    end: 1500,
  },
  {
    label: same('get_config()'),
    tone: 'accent',
    legs: [
      ['a-r', 1, 1600, 2100],
      ['r-e', 1, 2100, 2600],
    ],
    end: 2700,
  },
  {
    label: same('weekend 1.25'),
    tone: 'ok',
    legs: [
      ['r-e', -1, 2800, 3150],
      ['a-r', -1, 3150, 3550],
    ],
    end: 3600,
  },
  {
    label: same('simulate(1.4)'),
    tone: 'accent',
    legs: [
      ['a-s', 1, 3600, 4100],
      ['s-x', 1, 4100, 4600],
    ],
    end: 4700,
  },
  {
    label: ['diff: 8 days', 'diff：8 天'],
    tone: 'ok',
    legs: [
      ['s-x', -1, 5200, 5550],
      ['a-s', -1, 5550, 5950],
    ],
    end: 6000,
  },
  {
    label: ['8 days · +$18', '8 天 · 各 +$18'],
    tone: 'ok',
    legs: [
      ['c-a', -1, 6000, 6700],
      ['m-c', -1, 6700, 7400],
    ],
    end: 7500,
  },
  {
    label: same('set_config()'),
    tone: 'bad',
    legs: [['a-g', 1, 7600, 8300, 0.6]],
    end: 8300,
    fizzle: { t: 8300, text: ['rejected', '被拒'] },
  },
  {
    label: same('propose(1.4)'),
    tone: 'accent',
    legs: [
      ['a-p', 1, 9200, 9700],
      ['p-q', 1, 10300, 10900],
    ],
    end: 11000,
  },
  {
    label: ['proposal #27', '提案 #27'],
    tone: 'warn',
    legs: [['q-ap', 1, 11400, 12000]],
    end: 12050,
  },
  { label: ['approve', '核准'], tone: 'ok', legs: [['ap-cf', 1, 12600, 13200]], end: 13250 },
  {
    label: ['audit entry', '稽核紀錄'],
    tone: 'ink',
    legs: [['cf-au', 1, 13400, 14100]],
    end: 14150,
  },
  {
    label: ['weekend 1.4', '週末 1.4'],
    tone: 'accent',
    legs: [['cf-e', 1, 13400, 14100]],
    end: 14150,
  },
  { label: same('$168'), tone: 'ok', legs: [['e-cal', 1, 14100, 14700]], end: 14800 },
];

/** [node, start, duration, label, tone] */
export const AGENT_FLASHES: [AgentNodeId, number, number, Bi, ToneKey][] = [
  ['agent', 1400, 600, ['understands', '理解問題'], 'accent'],
  ['engine', 2600, 600, same('calculate()'), 'accent'],
  ['sandbox', 4600, 900, ['copy · 1.4', '副本 · 1.4'], 'accent'],
  ['engine', 4600, 1400, ['untouched', '未變動'], 'muted'],
  ['agent', 6000, 500, ['explains', '轉述結果'], 'accent'],
  ['manager', 7400, 1500, ['reads reply', '看到回覆'], 'ok'],
  ['ghost', 8300, 1200, ['no such tool', '沒有此工具'], 'bad'],
  ['propose', 9700, 600, ['schema OK', 'schema 通過'], 'ok'],
  ['proposal', 10900, 1100, ['pending', '待核准'], 'warn'],
  ['approve', 12000, 800, ['approved', '已核准'], 'ok'],
  ['audit', 14100, 2000, ['logged · v13 kept', '已記錄 · 可回滾'], 'ok'],
  ['engine', 14100, 700, ['weekend 1.4', '週末 1.4'], 'accent'],
  ['calendar', 14700, 2000, ['weekends $168', '週末 $168'], 'ok'],
];

export const AGENT_LOG: [number, string][] = [
  [0, 'manager: "What if weekend goes to 1.4?"'],
  [1600, 'tool get_pricing_config() → { weekend: 1.25, holiday: 1.5, peak: 1.2 }'],
  [3600, "tool simulate_config({ weekend: 1.4 }, '2026-12') → sandbox engine"],
  [5200, '← diff: 8 days · +$18 each · +$144 total'],
  [6000, 'reply quotes engine output, no LLM math'],
  [7600, 'set_config() → not in tool list · rejected'],
  [9700, 'schema: weekend 1.4 within [0.8, 2.0] → ok'],
  [10300, 'proposal #27 · status: pending'],
  [12000, 'approved by manager · permission checked server-side'],
  [12600, 'config v13 → v14'],
  [13400, 'audit: who · when · why · rollback to v13 available'],
  [14100, 'calendar re-prices from the same engine'],
];

export const AGENT_CODE = [
  'tools = [',
  '  getPricingConfig,   // read-only',
  '  simulateConfig,     // sandbox engine, returns a diff',
  "  createProposal,     // status: 'pending'",
  ']                     // no setConfig: writes need approval',
  '',
  'ProposalSchema.weekend: number, min 0.8, max 2.0',
].join('\n');
