import React, { useEffect, useState, useCallback } from 'react';
import {
  RefreshCw,
  Radio,
  Sparkles,
  TrendingUp,
  AlertCircle,
  Clock,
  BarChart3,
  Flame,
  Snowflake,
  Calendar,
} from 'lucide-react';
import { XSMBResult, HistoricalStats } from '../types/lottery';
import {
  fetchXSMBRealtime,
  fetchXSMBByDate,
  fetchHistoricalStats,
} from '../services/lotteryService';

export const LotteryScreen: React.FC = () => {
  const [data, setData] = useState<XSMBResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<string>('');
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');

  // Subtabs: board | loto | stats
  const [activeSubTab, setActiveSubTab] = useState<'board' | 'loto' | 'stats'>('board');

  // Stats state
  const [stats, setStats] = useState<HistoricalStats | null>(null);
  const [loadingStats, setLoadingStats] = useState<boolean>(false);

  const loadData = useCallback(async (isManual = false) => {
    if (isManual) setLoading(true);
    setError(null);
    try {
      const res = await fetchXSMBRealtime();
      if (res.data) {
        setData(res.data);
        setSource(res.source);
        if (res.availableDates.length > 0) {
          setAvailableDates(res.availableDates);
        }
        setLastUpdated(
          new Date().toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        );
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

  const handleDateChange = async (dateStr: string) => {
    setSelectedDate(dateStr);
    if (!dateStr) {
      loadData(true);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetchXSMBByDate(dateStr);
      if (res) {
        setData(res);
      } else {
        setError(`Không tìm thấy kết quả ngày ${dateStr}`);
      }
    } catch {
      setError(`Lỗi khi tải kết quả ngày ${dateStr}`);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = useCallback(async () => {
    if (stats) return; // already loaded
    setLoadingStats(true);
    try {
      const res = await fetchHistoricalStats(availableDates, 15);
      if (res) {
        setStats(res);
      }
    } catch (err) {
      console.error('Error loading stats:', err);
    } finally {
      setLoadingStats(false);
    }
  }, [availableDates, stats]);

  // Initial fetch
  useEffect(() => {
    loadData(true);
  }, []);

  // When switching to stats tab, load statistical data
  useEffect(() => {
    if (activeSubTab === 'stats') {
      loadStats();
    }
  }, [activeSubTab, loadStats]);

  // Realtime Polling
  useEffect(() => {
    if (!autoRefresh || selectedDate !== '') return;

    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const isLiveTime = hours === 18 && minutes >= 10 && minutes <= 40;
    const intervalMs = isLiveTime ? 15000 : 60000;

    const timer = setInterval(() => {
      loadData(false);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [autoRefresh, selectedDate, loadData]);

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
              ● {autoRefresh ? 'Tự động: Bật' : 'Tự động: Tắt'}
            </button>
            <button
              onClick={() => (selectedDate ? handleDateChange(selectedDate) : loadData(true))}
              disabled={loading}
              className="p-1.5 rounded-lg bg-bg-elevated hover:bg-stone-800 text-wood-accent border border-wood-border/40 transition-all disabled:opacity-50"
              title="Làm mới ngay"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Date Selector Row */}
        {availableDates.length > 0 && (
          <div className="flex items-center gap-2 pt-2 border-t border-wood-border/20 text-xs">
            <Calendar className="w-3.5 h-3.5 text-wood-accent flex-shrink-0" />
            <span className="text-stone-400 whitespace-nowrap">Chọn ngày:</span>
            <select
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="bg-bg-elevated border border-wood-border/50 text-ivory rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-wood-accent"
            >
              <option value="">Hôm nay (Mới nhất)</option>
              {availableDates.map((d) => (
                <option key={d} value={d}>
                  {d.replace(/-/g, '/')}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Status banner */}
        <div className="flex items-center justify-between text-[11px] text-stone-400 pt-2 border-t border-wood-border/20 mt-2">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-stone-500" />
            Cập nhật: <span className="text-stone-300 font-mono">{lastUpdated || '--:--:--'}</span>
          </span>
          <span className="text-[10px] text-stone-500">
            Nguồn: <span className="text-wood-accent/90">{source || 'Đang kết nối'}</span>
          </span>
        </div>
      </div>

      {/* Tabs Switcher: Bảng kết quả | Đầu Đuôi Lô Tô | Thống Kê Các Con Số */}
      <div className="grid grid-cols-3 gap-1.5">
        <button
          onClick={() => setActiveSubTab('board')}
          className={`py-2 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
            activeSubTab === 'board'
              ? 'bg-bg-elevated border border-wood-accent text-wood-accent'
              : 'bg-bg-card border border-wood-border/20 text-stone-400 hover:text-stone-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Bảng Kết Quả
        </button>
        <button
          onClick={() => setActiveSubTab('loto')}
          className={`py-2 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
            activeSubTab === 'loto'
              ? 'bg-bg-elevated border border-wood-accent text-wood-accent'
              : 'bg-bg-card border border-wood-border/20 text-stone-400 hover:text-stone-200'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          Đầu - Đuôi Lô
        </button>
        <button
          onClick={() => setActiveSubTab('stats')}
          className={`py-2 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
            activeSubTab === 'stats'
              ? 'bg-bg-elevated border border-wood-accent text-wood-accent'
              : 'bg-bg-card border border-wood-border/20 text-stone-400 hover:text-stone-200'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          Thống Kê Số
        </button>
      </div>

      {/* Error state */}
      {error && (
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

      {/* TAB 1: Bảng Kết Quả */}
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

      {/* TAB 2: Đầu Đuôi Lô Tô */}
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

      {/* TAB 3: THỐNG KÊ CÁC CON SỐ (Lô Gan, Số Về Nhiều, Thống kê ĐB) */}
      {activeSubTab === 'stats' && (
        <div className="space-y-4">
          {loadingStats && !stats && (
            <div className="bg-bg-card rounded-xl border border-wood-border/30 p-8 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-wood-accent animate-spin mx-auto" />
              <p className="text-sm text-stone-400">Đang tổng hợp dữ liệu thống kê {availableDates.length || 15} kỳ gần nhất...</p>
            </div>
          )}

          {stats && (
            <>
              {/* Thống kê Tổng quan */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <div className="bg-bg-card border border-wood-border/30 rounded-xl p-3 text-center">
                  <p className="text-stone-400 text-[11px]">Kỳ phân tích</p>
                  <p className="text-lg font-bold text-wood-accent font-mono">{stats.totalDays} ngày</p>
                </div>
                <div className="bg-bg-card border border-wood-border/30 rounded-xl p-3 text-center">
                  <p className="text-stone-400 text-[11px]">Số nóng nhất</p>
                  <p className="text-lg font-bold text-red-400 font-mono">
                    {stats.topFrequent[0]?.number} ({stats.topFrequent[0]?.count} lần)
                  </p>
                </div>
                <div className="bg-bg-card border border-wood-border/30 rounded-xl p-3 text-center col-span-2 sm:col-span-1">
                  <p className="text-stone-400 text-[11px]">Lô Gan đầu bảng</p>
                  <p className="text-lg font-bold text-cyan-400 font-mono">
                    {stats.loGan[0]?.number} ({stats.loGan[0]?.count === 0 ? 'Chưa về' : `${stats.loGan[0]?.daysAgo} ngày chưa ra`})
                  </p>
                </div>
              </div>

              {/* 2 Cột: Số Về Nhiều vs Lô Gan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Top Số Về Nhiều */}
                <div className="bg-bg-card rounded-xl border border-wood-border/40 overflow-hidden">
                  <div className="bg-bg-elevated px-3 py-2 border-b border-wood-border/30 text-xs font-bold text-red-400 flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-red-400" />
                    TOP 10 SỐ VỀ NHIỀU NHẤT
                  </div>
                  <div className="divide-y divide-wood-border/20 text-xs">
                    {stats.topFrequent.map((item, index) => (
                      <div key={item.number} className="flex px-3 py-2 items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-4 text-[10px] text-stone-500 font-mono">{index + 1}</span>
                          <span className="w-8 h-8 rounded-full bg-red-950/60 border border-red-700/40 text-red-300 font-mono font-bold flex items-center justify-center">
                            {item.number}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-ivory font-mono">{item.count}</span>
                          <span className="text-stone-400 text-[11px]"> lần</span>
                          {item.lastAppearanceDate && (
                            <p className="text-[10px] text-stone-500">Gần nhất: {item.lastAppearanceDate}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Lô Gan */}
                <div className="bg-bg-card rounded-xl border border-wood-border/40 overflow-hidden">
                  <div className="bg-bg-elevated px-3 py-2 border-b border-wood-border/30 text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                    <Snowflake className="w-3.5 h-3.5 text-cyan-400" />
                    TOP 10 LÔ GAN (ÍCH VỀ / LÂU CHƯA RA)
                  </div>
                  <div className="divide-y divide-wood-border/20 text-xs">
                    {stats.loGan.map((item, index) => (
                      <div key={item.number} className="flex px-3 py-2 items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-4 text-[10px] text-stone-500 font-mono">{index + 1}</span>
                          <span className="w-8 h-8 rounded-full bg-cyan-950/60 border border-cyan-700/40 text-cyan-300 font-mono font-bold flex items-center justify-center">
                            {item.number}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-stone-300 font-mono">
                            {item.count === 0 ? '0 lần' : `${item.count} lần`}
                          </span>
                          <p className="text-[10px] text-cyan-400/90 font-mono">
                            {item.daysAgo === 999 ? 'Chưa ra kỳ nào' : `Vắng ${item.daysAgo} kỳ`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Lịch Sử 2 Số Cuối Giải Đặc Biệt */}
              <div className="bg-bg-card rounded-xl border border-wood-border/40 overflow-hidden">
                <div className="bg-bg-elevated px-3 py-2 border-b border-wood-border/30 text-xs font-bold text-wood-accent flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-wood-accent" />
                  THỐNG KÊ 2 SỐ CUỐI GIẢI ĐẶC BIỆT CÁC KỲ
                </div>
                <div className="divide-y divide-wood-border/20 text-xs">
                  {stats.specialHistory.map((item) => (
                    <div key={item.date} className="flex items-center justify-between px-3.5 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-stone-400 font-mono text-[11px]">{item.date}</span>
                        <span className="font-mono text-stone-500 text-[11px]">({item.fullSpecial})</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-0.5 rounded bg-north-red/20 border border-north-red/40 text-red-300 font-bold font-mono text-sm">
                          {item.twoDigits}
                        </span>
                        <span className="text-[11px] text-stone-400">
                          Tổng: <strong className="text-ivory font-mono">{item.sum}</strong>
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${item.isEven ? 'bg-amber-950/60 text-amber-300 border border-amber-700/30' : 'bg-stone-800 text-stone-300'}`}>
                          {item.isEven ? 'Chẵn' : 'Lẻ'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Information card */}
      <div className="bg-bg-card/70 border border-wood-border/30 rounded-xl p-3.5 text-xs text-stone-400 space-y-1.5">
        <p className="font-semibold text-stone-300 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-wood-accent" />
          Lịch quay thưởng Xổ Số Miền Bắc:
        </p>
        <p>• Quay thưởng trực tiếp từ <strong>18:15 đến 18:35</strong> các ngày trong tuần.</p>
        <p>• Tính năng Thống kê tự động phân tích tần suất, cặp số nóng và lô gan theo chu kỳ gần nhất.</p>
      </div>
    </div>
  );
};
