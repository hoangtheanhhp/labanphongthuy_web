import { XSMBResult, parseMinhNgocJs, computeLoto } from '../types/lottery';

const MINH_NGOC_URL = 'https://www.minhngoc.net.vn/getkqxs/mien-bac.js';
const GITHUB_BACKUP_URL =
  'https://raw.githubusercontent.com/khiemdoan/vietnam-lottery-xsmb-analysis/refs/heads/main/data/xsmb.json';

// Fetch via CORS proxy
async function fetchMinhNgocDirect(): Promise<XSMBResult | null> {
  const proxies = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(MINH_NGOC_URL)}&_t=${Date.now()}`,
    `https://corsproxy.io/?${encodeURIComponent(MINH_NGOC_URL)}`,
  ];

  for (const proxyUrl of proxies) {
    try {
      const res = await fetch(proxyUrl, {
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      if (!res.ok) continue;
      const text = await res.text();
      const parsed = parseMinhNgocJs(text);
      if (parsed && parsed.special.length > 0) {
        return parsed;
      }
    } catch {
      // try next proxy
    }
  }
  return null;
}

// Fallback to GitHub dataset if live scraping is temporarily unreachable
async function fetchGithubBackup(): Promise<XSMBResult | null> {
  try {
    const res = await fetch(`${GITHUB_BACKUP_URL}?_t=${Date.now()}`);
    if (!res.ok) return null;
    const jsonList = await res.json();
    if (!Array.isArray(jsonList) || jsonList.length === 0) return null;

    // Latest element
    const latest = jsonList[jsonList.length - 1];
    const pad = (n: number | string | undefined, length: number) => {
      if (n === undefined || n === null) return '';
      return String(n).padStart(length, '0');
    };

    const d = new Date(latest.date);
    const dateStr = !isNaN(d.getTime())
      ? `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
      : latest.date;

    const baseResult = {
      date: dateStr,
      special: [pad(latest.special, 5)],
      prize1: [pad(latest.prize1, 5)],
      prize2: [pad(latest.prize2_1, 5), pad(latest.prize2_2, 5)].filter(Boolean),
      prize3: [
        pad(latest.prize3_1, 5),
        pad(latest.prize3_2, 5),
        pad(latest.prize3_3, 5),
        pad(latest.prize3_4, 5),
        pad(latest.prize3_5, 5),
        pad(latest.prize3_6, 5),
      ].filter(Boolean),
      prize4: [
        pad(latest.prize4_1, 4),
        pad(latest.prize4_2, 4),
        pad(latest.prize4_3, 4),
        pad(latest.prize4_4, 4),
      ].filter(Boolean),
      prize5: [
        pad(latest.prize5_1, 4),
        pad(latest.prize5_2, 4),
        pad(latest.prize5_3, 4),
        pad(latest.prize5_4, 4),
        pad(latest.prize5_5, 4),
        pad(latest.prize5_6, 4),
      ].filter(Boolean),
      prize6: [pad(latest.prize6_1, 3), pad(latest.prize6_2, 3), pad(latest.prize6_3, 3)].filter(Boolean),
      prize7: [
        pad(latest.prize7_1, 2),
        pad(latest.prize7_2, 2),
        pad(latest.prize7_3, 2),
        pad(latest.prize7_4, 2),
      ].filter(Boolean),
      isLive: false,
    };

    const { headsLoto, tailsLoto } = computeLoto(baseResult);
    return {
      ...baseResult,
      headsLoto,
      tailsLoto,
    };
  } catch (err) {
    console.error('Error fetching github backup xsmb:', err);
    return null;
  }
}

export async function fetchXSMBRealtime(): Promise<{ data: XSMBResult | null; source: string }> {
  // 1. Try real-time provider (Minh Ngọc via CORS proxy)
  const realTimeData = await fetchMinhNgocDirect();
  if (realTimeData) {
    return { data: realTimeData, source: 'Minh Ngọc Realtime' };
  }

  // 2. Try Github daily database backup
  const backupData = await fetchGithubBackup();
  if (backupData) {
    return { data: backupData, source: 'Hệ Thống Dữ Liệu Lưu Trữ' };
  }

  return { data: null, source: 'Không thể kết nối' };
}
