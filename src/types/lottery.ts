export interface XSMBResult {
  date: string;
  special: string[];
  prize1: string[];
  prize2: string[];
  prize3: string[];
  prize4: string[];
  prize5: string[];
  prize6: string[];
  prize7: string[];
  headsLoto?: Record<number, string[]>;
  tailsLoto?: Record<number, string[]>;
  isLive?: boolean;
}

export interface LotteryState {
  loading: boolean;
  error: string | null;
  data: XSMBResult | null;
  lastUpdated: string | null;
  source: string;
}

// Helper to compute đầu / đuôi loto from 2 last digits of all prizes
export function computeLoto(data: Omit<XSMBResult, 'headsLoto' | 'tailsLoto'>): {
  headsLoto: Record<number, string[]>;
  tailsLoto: Record<number, string[]>;
} {
  const allNums: string[] = [
    ...data.special,
    ...data.prize1,
    ...data.prize2,
    ...data.prize3,
    ...data.prize4,
    ...data.prize5,
    ...data.prize6,
    ...data.prize7,
  ];

  const headsLoto: Record<number, string[]> = {};
  const tailsLoto: Record<number, string[]> = {};

  for (let i = 0; i <= 9; i++) {
    headsLoto[i] = [];
    tailsLoto[i] = [];
  }

  allNums.forEach((numStr) => {
    const clean = numStr.trim();
    if (clean.length >= 2) {
      const twoDigits = clean.slice(-2);
      const head = parseInt(twoDigits[0], 10);
      const tail = parseInt(twoDigits[1], 10);
      if (!isNaN(head)) headsLoto[head].push(twoDigits);
      if (!isNaN(tail)) tailsLoto[tail].push(twoDigits);
    }
  });

  // Sort unique
  for (let i = 0; i <= 9; i++) {
    headsLoto[i].sort();
    tailsLoto[i].sort();
  }

  return { headsLoto, tailsLoto };
}

// Parse JS payload from Minh Ngoc
export function parseMinhNgocJs(content: string): XSMBResult | null {
  try {
    const dateMatch = content.match(/Ng&agrave;y:\s*([0-9/]+)/i);
    const date = dateMatch ? dateMatch[1] : '';

    const getPrize = (className: string): string[] => {
      const regex = new RegExp(`class="${className}"[^>]*>\\s*([^<]+)\\s*</td>`, 'i');
      const match = content.match(regex);
      if (match && match[1]) {
        return match[1]
          .split('-')
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
      }
      return [];
    };

    const special = getPrize('giaidb');
    const prize1 = getPrize('giai1');
    const prize2 = getPrize('giai2');
    const prize3 = getPrize('giai3');
    const prize4 = getPrize('giai4');
    const prize5 = getPrize('giai5');
    const prize6 = getPrize('giai6');
    const prize7 = getPrize('giai7');

    if (special.length === 0 && prize1.length === 0) {
      return null;
    }

    const baseResult = {
      date: date || new Date().toLocaleDateString('vi-VN'),
      special,
      prize1,
      prize2,
      prize3,
      prize4,
      prize5,
      prize6,
      prize7,
      isLive: false,
    };

    const { headsLoto, tailsLoto } = computeLoto(baseResult);

    return {
      ...baseResult,
      headsLoto,
      tailsLoto,
    };
  } catch (err) {
    console.error('Error parsing Minh Ngoc data:', err);
    return null;
  }
}
