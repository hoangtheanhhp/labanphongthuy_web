import React, { useEffect, useState, useCallback } from 'react';
import { RefreshCw, Radio, Sparkles, TrendingUp, AlertCircle, Clock } from 'lucide-react';
import { XSMBResult } from '../types/lottery';
import { fetchXSMBRealtime } from '../services/lotteryService';

export const LotteryScreen: React.FC = () => {
  const [data, setData] = useState<XSMBResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<string>('');
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [activeSubTab, setActiveSubTab] = useState<'board' | 'loto'>('board');

  const loadData = useCallback(async (isManual = false) => {
    if (isManual) setLoading(true);
    setError(null);
    try {
      const res = await fetchXSMBRealtime();
      if (res.data) {
        setData(res.data);
        setSource(res.source);
        setLastUpdated(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      } else {
        if (!data) {
          setError('Chưa thể kết nối máy chủ kết quả trực tiếp. Vui lòng thử lại sau.');
        }
      }
    } catch {
      if (!data) {
        setError('Có lỗi xảy ra khi tải dữ liệu xổ số.');
      }
    } finally {
      setLoading(false);
    }
  }, [data]);

  // Initial fetch
  useEffect(() => {
    loadData(true);
  }, []);

  // Realtime Polling
  useEffect(() => {
    if (!autoRefresh) return;

    // Check if in drawing time (18h15 - 18h35)
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const isLiveTime = (hours === 18 && minutes >= 10 && minutes <= 40);

    // If live drawing time -> refresh every 15s; otherwise every 60s
    const intervalMs = isLiveTime ? 15000 : 60000;

    const timer = setInterval(() => {
      loadData(false);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [autoRefresh, loadData]);

  return (
    <div className="space-y-4">
      {/* Header card */}
      <div className="bg-bg-card rounded-xl border border-wood-border/40 p-4 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-north-red/20 text-north-red border border-north-red/30">
              <Radio className="w-4 h-4 animate-pulse" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-wood-accent flex items-center gap-2">
                Trực Tiếp Xổ Số Miền Bắc (XSMB)
              </h2>
              <p className="text-[11px] text-stone-400">
                {data ? `Kỳ quay mở thưởng: Ngày ${data.date}` : 'Đang đồng bộ dữ liệu...'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`text-[11px] px-2.5 py-1 rounded-full border transition-all ${
                autoRefresh
                  ? 'bg-emerald-950/60 border-emerald-600/50 text-emerald-400'
                  : 'bg-stone-800 border-stone-700 text-stone-400'
              }`}
              title="Tự động cập nhật mỗi 15-60 giây"
            >
              ● {autoRefresh ? 'Tự động cập nhật: Bật' : 'Tự động: Tắt'}
            </button>
            <button
              onClick={() => loadData(true)}
              disabled={loading}
              className="p-1.5 rounded-lg bg-bg-elevated hover:bg-stone-800 text-wood-accent border border-wood-border/40 transition-all disabled:opacity-50"
              title="Làm mới ngay"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Status banner */}
        <div className="flex items-center justify-between text-[11px] text-stone-400 pt-2 border-t border-wood-border/20">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-stone-500" />
            Cập nhật lúc: <span className="text-stone-300 font-mono">{lastUpdated || '--:--:--'}</span>
          </span>
          <span className="text-[10px] text-stone-500">
            Nguồn: <span className="text-wood-accent/90">{source || 'Đang kết nối'}</span>
          </span>
        </div>
      </div>

      {/* Tabs Switcher: Bảng kết quả & Thống kê Đầu Đuôi Lô Tô */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveSubTab('board')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeSubTab === 'board'
              ? 'bg-bg-elevated border border-wood-accent text-wood-accent'
              : 'bg-bg-card border border-wood-border/20 text-stone-400 hover:text-stone-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Bảng Kết Quả Truyền Thống
        </button>
        <button
          onClick={() => setActiveSubTab('loto')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeSubTab === 'loto'
              ? 'bg-bg-elevated border border-wood-accent text-wood-accent'
              : 'bg-bg-card border border-wood-border/20 text-stone-400 hover:text-stone-200'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          Bảng Đầu - Đuôi Lô Tô
        </button>
      </div>

      {/* Error state */}
      {error && !data && (
        <div className="bg-red-950/40 border border-red-800/50 rounded-xl p-4 text-center">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p className="text-sm text-red-200 mb-3">{error}</p>
          <button
            onClick={() => loadData(true)}
            className="px-4 py-1.5 bg-red-900/60 hover:bg-red-800 text-xs font-semibold rounded-lg text-red-100 transition-colors"
          >
            Thử kết nối lại
          </button>
        </div>
      )}

      {/* Loading state skeleton */}
      {loading && !data && (
        <div className="bg-bg-card rounded-xl border border-wood-border/30 p-8 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-wood-accent animate-spin mx-auto" />
          <p className="text-sm text-stone-400">Đang đồng bộ kết quả xổ số mới nhất...</p>
        </div>
      )}

      {/* Data display */}
      {data && activeSubTab === 'board' && (
        <div className="bg-bg-card rounded-xl border border-wood-border/40 overflow-hidden shadow-md">
          <div className="bg-gradient-to-r from-[#2a1714] to-[#1c1a18] px-4 py-2.5 border-b border-wood-border/40 flex justify-between items-center">
            <span className="text-xs font-bold text-wood-accent uppercase tracking-wider">
              XỔ SỐ KIẾN THIẾT MIỀN BẮC
            </span>
            <span className="text-xs text-stone-300 font-mono">
              Ngày: {data.date}
            </span>
          </div>

          <div className="divide-y divide-wood-border/20">
            {/* Giải Đặc Biệt */}
            <div className="flex items-center px-4 py-3.5 bg-north-red/10 border-b border-north-red/20">
              <div className="w-24 text-xs font-bold text-red-400">Đặc biệt</div>
              <div className="flex-1 text-center font-mono text-2xl sm:text-3xl font-extrabold text-red-400 tracking-widest drop-shadow">
                {data.special[0] || '-----'}
              </div>
            </div>

            {/* Giải Nhất */}
            <div className="flex items-center px-4 py-3">
              <div className="w-24 text-xs font-semibold text-stone-400">Giải nhất</div>
              <div className="flex-1 text-center font-mono text-lg sm:text-xl font-bold text-ivory tracking-wider">
                {data.prize1[0] || '-----'}
              </div>
            </div>

            {/* Giải Nhì */}
            <div className="flex items-center px-4 py-3 bg-bg-elevated/20">
              <div className="w-24 text-xs font-semibold text-stone-400">Giải nhì</div>
              <div className="flex-1 grid grid-cols-2 gap-2 text-center font-mono text-base sm:text-lg font-bold text-ivory">
                {data.prize2.map((p, idx) => (
                  <span key={idx} className="tracking-wider">{p}</span>
                ))}
              </div>
            </div>

            {/* Giải Ba */}
            <div className="flex items-center px-4 py-3">
              <div className="w-24 text-xs font-semibold text-stone-400">Giải ba</div>
              <div className="flex-1 grid grid-cols-3 gap-2 text-center font-mono text-sm sm:text-base font-semibold text-stone-200">
                {data.prize3.map((p, idx) => (
                  <span key={idx} className="tracking-wider">{p}</span>
                ))}
              </div>
            </div>

            {/* Giải Tư */}
            <div className="flex items-center px-4 py-3 bg-bg-elevated/20">
              <div className="w-24 text-xs font-semibold text-stone-400">Giải tư</div>
              <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono text-sm sm:text-base font-semibold text-stone-200">
                {data.prize4.map((p, idx) => (
                  <span key={idx} className="tracking-wider">{p}</span>
                ))}
              </div>
            </div>

            {/* Giải Năm */}
            <div className="flex items-center px-4 py-3">
              <div className="w-24 text-xs font-semibold text-stone-400">Giải năm</div>
              <div className="flex-1 grid grid-cols-3 gap-2 text-center font-mono text-sm sm:text-base font-semibold text-stone-200">
                {data.prize5.map((p, idx) => (
                  <span key={idx} className="tracking-wider">{p}</span>
                ))}
              </div>
            </div>

            {/* Giải Sáu */}
            <div className="flex items-center px-4 py-3 bg-bg-elevated/20">
              <div className="w-24 text-xs font-semibold text-stone-400">Giải sáu</div>
              <div className="flex-1 grid grid-cols-3 gap-2 text-center font-mono text-sm sm:text-base font-semibold text-stone-200">
                {data.prize6.map((p, idx) => (
                  <span key={idx} className="tracking-wider">{p}</span>
                ))}
              </div>
            </div>

            {/* Giải Bảy */}
            <div className="flex items-center px-4 py-3">
              <div className="w-24 text-xs font-semibold text-stone-400">Giải bảy</div>
              <div className="flex-1 grid grid-cols-4 gap-2 text-center font-mono text-base sm:text-lg font-bold text-wood-accent">
                {data.prize7.map((p, idx) => (
                  <span key={idx} className="tracking-wider">{p}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loto board */}
      {data && activeSubTab === 'loto' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Đầu Lô Tô */}
          <div className="bg-bg-card rounded-xl border border-wood-border/40 overflow-hidden">
            <div className="bg-bg-elevated px-3 py-2 border-b border-wood-border/30 text-xs font-bold text-wood-accent">
              📊 BẢNG ĐẦU LÔ TÔ
            </div>
            <div className="divide-y divide-wood-border/20 text-xs">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((head) => {
                const list = data.headsLoto ? data.headsLoto[head] : [];
                return (
                  <div key={head} className="flex px-3 py-2 items-center">
                    <span className="w-8 font-bold text-wood-accent font-mono text-sm">{head}</span>
                    <span className="flex-1 font-mono text-stone-200">
                      {list && list.length > 0 ? list.join(', ') : <span className="text-stone-600">-</span>}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Đuôi Lô Tô */}
          <div className="bg-bg-card rounded-xl border border-wood-border/40 overflow-hidden">
            <div className="bg-bg-elevated px-3 py-2 border-b border-wood-border/30 text-xs font-bold text-wood-accent">
              📊 BẢNG ĐUÔI LÔ TÔ
            </div>
            <div className="divide-y divide-wood-border/20 text-xs">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((tail) => {
                const list = data.tailsLoto ? data.tailsLoto[tail] : [];
                return (
                  <div key={tail} className="flex px-3 py-2 items-center">
                    <span className="w-8 font-bold text-wood-accent font-mono text-sm">{tail}</span>
                    <span className="flex-1 font-mono text-stone-200">
                      {list && list.length > 0 ? list.join(', ') : <span className="text-stone-600">-</span>}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Information card */}
      <div className="bg-bg-card/70 border border-wood-border/30 rounded-xl p-3.5 text-xs text-stone-400 space-y-1.5">
        <p className="font-semibold text-stone-300 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-wood-accent" />
          Lịch quay thưởng Xổ Số Miền Bắc:
        </p>
        <p>• Quay thưởng trực tiếp từ <strong>18:15 đến 18:35</strong> các ngày trong tuần.</p>
        <p>• Ứng dụng tự động chuyển chế độ cập nhật chu kỳ 15 giây/lần trong khung giờ quay thưởng.</p>
      </div>
    </div>
  );
};
