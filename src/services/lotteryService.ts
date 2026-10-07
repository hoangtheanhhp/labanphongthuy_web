import {
  XSMBResult,
  parseMinhNgocJs,
  extractAvailableDates,
  HistoricalStats,
  NumberStatItem,
  SpecialStatItem,
} from '../types/lottery';

const MINH_NGOC_URL = 'https://www.minhngoc.net.vn/getkqxs/mien-bac.js';

// Cache in-memory
let cachedHistoricalStats: HistoricalStats | null = null;
let lastStatsFetchTime = 0;

// Fetch via Cloudflare Pages Function or fallback proxies
async function fetchMinhNgocDirect(dateStr?: string): Promise<{ result: XSMBResult | null; rawText: string }> {
  const targetUrl = dateStr
    ? `https://www.minhngoc.net.vn/getkqxs/mien-bac/${dateStr}.js`
    : MINH_NGOC_URL;

  // 1. Try our own Cloudflare Pages Function first (/api/xsmb)
  // This has NO CORS restriction and NO 403 / 405 error
  const internalEndpoint = dateStr ? `/api/xsmb?date=${dateStr}` : `/api/xsmb`;
  try {
    const res = await fetch(internalEndpoint);
    if (res.ok) {
      const text = await res.text();
      const parsed = parseMinhNgocJs(text);
      if (parsed && parsed.special.length > 0) {
        return { result: parsed, rawText: text };
      }
    }
  } catch {
    // If running in local file/offline mode or outside Pages, fallback to public proxies
  }

  // 2. Fallback to public CORS proxies (DO NOT send custom headers like 'Cache-Control' to avoid triggering CORS preflight OPTIONS which gives 405/403)
  const proxies = [
    `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
  ];

  for (const proxyUrl of proxies) {
    try {
      const res = await fetch(proxyUrl);
      if (!res.ok) continue;
      const text = await res.text();
      const parsed = parseMinhNgocJs(text);
      if (parsed && parsed.special.length > 0) {
        return { result: parsed, rawText: text };
      }
    } catch {
      // try next
    }
  }
  return { result: null, rawText: '' };
}

export async function fetchXSMBRealtime(): Promise<{
  data: XSMBResult | null;
  source: string;
  availableDates: string[];
}> {
  const { result, rawText } = await fetchMinhNgocDirect();
  const availableDates = extractAvailableDates(rawText);

  if (result) {
    return { data: result, source: 'Minh Ngọc Realtime', availableDates };
  }

  return { data: null, source: 'Không thể kết nối', availableDates: [] };
}

export async function fetchXSMBByDate(dateStr: string): Promise<XSMBResult | null> {
  const { result } = await fetchMinhNgocDirect(dateStr);
  return result;
}

// Fetch historical days and compute statistics (Tần suất số về nhiều, Lô Gan, Giải Đặc Biệt)
export async function fetchHistoricalStats(
  datesToAnalyze: string[] = [],
  maxDays = 15
): Promise<HistoricalStats | null> {
  const now = Date.now();
  // Cache for 5 minutes
  if (cachedHistoricalStats && now - lastStatsFetchTime < 300000) {
    return cachedHistoricalStats;
  }

  let dates = datesToAnalyze;
  if (dates.length === 0) {
    const { rawText } = await fetchMinhNgocDirect();
    dates = extractAvailableDates(rawText);
  }

  if (dates.length === 0) return null;

  const selectedDates = dates.slice(0, maxDays);

  // Fetch concurrently (batches of 4 to avoid rate limits)
  const results: XSMBResult[] = [];
  const batchSize = 4;
  for (let i = 0; i < selectedDates.length; i += batchSize) {
    const batch = selectedDates.slice(i, i + batchSize);
    const batchPromises = batch.map((d) => fetchXSMBByDate(d));
    const batchResults = await Promise.all(batchPromises);
    batchResults.forEach((r) => {
      if (r) results.push(r);
    });
  }

  if (results.length === 0) return null;

  // Process statistics
  // Count frequency of 2-digit numbers (00 -> 99)
  const counts: Record<string, number> = {};
  const lastAppearance: Record<string, { date: string; daysAgo: number }> = {};
  const headDist: Record<number, number> = {};
  const tailDist: Record<number, number> = {};
  const specialList: SpecialStatItem[] = [];

  for (let i = 0; i <= 9; i++) {
    headDist[i] = 0;
    tailDist[i] = 0;
  }
  for (let i = 0; i <= 99; i++) {
    const num = String(i).padStart(2, '0');
    counts[num] = 0;
    lastAppearance[num] = { date: '', daysAgo: 999 };
  }

  // Iterate chronologically from newest (index 0) to oldest
  results.forEach((dayRes, dayIndex) => {
    const allNums: string[] = [
      ...dayRes.special,
      ...dayRes.prize1,
      ...dayRes.prize2,
      ...dayRes.prize3,
      ...dayRes.prize4,
      ...dayRes.prize5,
      ...dayRes.prize6,
      ...dayRes.prize7,
    ];

    // Special prize analysis
    if (dayRes.special.length > 0) {
      const sp = dayRes.special[0];
      const tail2 = sp.slice(-2);
      const digitSum = sp
        .split('')
        .reduce((acc, char) => acc + (parseInt(char, 10) || 0), 0);
      const isEven = parseInt(tail2, 10) % 2 === 0;

      specialList.push({
        date: dayRes.date,
        fullSpecial: sp,
        twoDigits: tail2,
        sum: digitSum,
        isEven,
      });
    }

    allNums.forEach((n) => {
      const clean = n.trim();
      if (clean.length >= 2) {
        const twoDigits = clean.slice(-2);
        counts[twoDigits] = (counts[twoDigits] || 0) + 1;

        const h = parseInt(twoDigits[0], 10);
        const t = parseInt(twoDigits[1], 10);
        if (!isNaN(h)) headDist[h] = (headDist[h] || 0) + 1;
        if (!isNaN(t)) tailDist[t] = (tailDist[t] || 0) + 1;

        if (lastAppearance[twoDigits] && lastAppearance[twoDigits].daysAgo === 999) {
          lastAppearance[twoDigits] = {
            date: dayRes.date,
            daysAgo: dayIndex,
          };
        }
      }
    });
  });

  // Top Frequent numbers
  const freqList: NumberStatItem[] = Object.keys(counts)
    .map((num) => ({
      number: num,
      count: counts[num],
      lastAppearanceDate: lastAppearance[num]?.date || '',
      daysAgo: lastAppearance[num]?.daysAgo,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Lô Gan (Numbers that haven't appeared for the longest time, or 0 count)
  const ganList: NumberStatItem[] = Object.keys(counts)
    .map((num) => ({
      number: num,
      count: counts[num],
      lastAppearanceDate: lastAppearance[num]?.date || '',
      daysAgo: lastAppearance[num]?.daysAgo,
    }))
    .sort((a, b) => {
      if (a.count !== b.count) return a.count - b.count; // 0 first
      return (b.daysAgo || 0) - (a.daysAgo || 0); // longest ago first
    })
    .slice(0, 10);

  const stats: HistoricalStats = {
    totalDays: results.length,
    topFrequent: freqList,
    loGan: ganList,
    specialHistory: specialList,
    headDistribution: headDist,
    tailDistribution: tailDist,
  };

  cachedHistoricalStats = stats;
  lastStatsFetchTime = Date.now();
  return stats;
}
