import { useEffect, useMemo, useState } from 'react';
import {
  Bus as BusIcon,
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Plus,
  Wrench,
  XCircle,
} from 'lucide-react';
import { Booking, Bus } from '../types';
import {
  BULAN_ID,
  HARI_SINGKAT_ID,
  formatRentangTanggal,
  formatTanggalID,
  getTodayWIBDateStr,
  getWIBDateParts,
  isDateInRange,
} from '../utils/bookingUtils';
import { BookingStatusLabel } from './StatusBadge';

interface CalendarAvailabilityProps {
  buses: Bus[];
  bookings: Booking[];
  mode: 'peminjam' | 'admin';
  onSelectAvailableDate?: (dateStr: string, busId: string) => void;
  onInspectBooking?: (booking: Booking) => void;
}

export function CalendarAvailability({
  buses,
  bookings,
  mode,
  onSelectAvailableDate,
  onInspectBooking,
}: CalendarAvailabilityProps) {
  const [wibClock, setWibClock] = useState(() => getWIBDateParts());
  const [year, setYear] = useState(wibClock.year);
  const [month, setMonth] = useState(wibClock.month - 1);
  const [selectedBusId, setSelectedBusId] = useState<string>(buses[0]?.id || 'ALL');
  const [focusedDate, setFocusedDate] = useState<string>(wibClock.dateStr);

  useEffect(() => {
    const timer = setInterval(() => {
      setWibClock(getWIBDateParts());
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (selectedBusId !== 'ALL' && !buses.some((b) => b.id === selectedBusId)) {
      setSelectedBusId(buses[0]?.id || 'ALL');
    }
  }, [buses, selectedBusId]);

  const selectedBus = buses.find((b) => b.id === selectedBusId);

  const handlePrevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    // Monday = 0 ... Sunday = 6
    const jsDay = firstDayOfMonth.getDay();
    const startOffset = jsDay === 0 ? 6 : jsDay - 1;

    const cells: Array<{ dateStr: string | null; dayNum: number | null }> = [];
    for (let i = 0; i < startOffset; i++) {
      cells.push({ dateStr: null, dayNum: null });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const mm = String(month + 1).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      cells.push({ dateStr: `${year}-${mm}-${dd}`, dayNum: d });
    }
    return cells;
  }, [year, month]);

  const getDateState = (dateStr: string) => {
    if (selectedBusId !== 'ALL' && selectedBus?.status === 'Dalam Perawatan') {
      return {
        status: 'maintenance' as const,
        dayBookings: bookings.filter(
          (b) => b.busId === selectedBusId && isDateInRange(dateStr, b.tanggalMulai, b.tanggalSelesai)
        ),
      };
    }

    const activeBuses =
      selectedBusId === 'ALL' ? buses.filter((b) => b.status === 'Aktif') : selectedBus ? [selectedBus] : [];

    const dayBookings = bookings.filter(
      (b) =>
        (selectedBusId === 'ALL' || b.busId === selectedBusId) &&
        b.status !== 'Ditolak' &&
        isDateInRange(dateStr, b.tanggalMulai, b.tanggalSelesai)
    );

    if (selectedBusId === 'ALL') {
      // Check if all active buses are approved on this date
      const approvedBusIds = new Set(
        dayBookings.filter((b) => b.status === 'Disetujui').map((b) => b.busId)
      );
      const pendingBusIds = new Set(
        dayBookings.filter((b) => b.status === 'Menunggu Verifikasi').map((b) => b.busId)
      );

      if (activeBuses.length > 0 && approvedBusIds.size >= activeBuses.length) {
        return { status: 'approved' as const, dayBookings };
      }
      if (approvedBusIds.size > 0 || pendingBusIds.size > 0) {
        return {
          status: approvedBusIds.size > 0 ? ('partial' as const) : ('pending' as const),
          dayBookings,
        };
      }
      return { status: 'available' as const, dayBookings };
    }

    const hasApproved = dayBookings.some((b) => b.status === 'Disetujui');
    const hasPending = dayBookings.some((b) => b.status === 'Menunggu Verifikasi');

    if (hasApproved) return { status: 'approved' as const, dayBookings };
    if (hasPending) return { status: 'pending' as const, dayBookings };
    return { status: 'available' as const, dayBookings };
  };

  const focusedBookings = useMemo(() => {
    return bookings.filter(
      (b) =>
        (selectedBusId === 'ALL' || b.busId === selectedBusId) &&
        isDateInRange(focusedDate, b.tanggalMulai, b.tanggalSelesai)
    );
  }, [bookings, focusedDate, selectedBusId]);

  const focusedBusAvailableId = useMemo(() => {
    if (selectedBusId !== 'ALL') {
      return selectedBus?.status === 'Aktif' ? selectedBusId : buses.find((b) => b.status === 'Aktif')?.id || '';
    }
    const activeBuses = buses.filter((b) => b.status === 'Aktif');
    const freeBus = activeBuses.find(
      (bus) =>
        !bookings.some(
          (bk) =>
            bk.busId === bus.id &&
            bk.status === 'Disetujui' &&
            isDateInRange(focusedDate, bk.tanggalMulai, bk.tanggalSelesai)
        )
    );
    return freeBus?.id || activeBuses[0]?.id || '';
  }, [buses, bookings, focusedDate, selectedBus, selectedBusId]);

  const focusedHasApprovedLock =
    selectedBusId !== 'ALL' &&
    (selectedBus?.status === 'Dalam Perawatan' ||
      focusedBookings.some((b) => b.status === 'Disetujui'));

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Header Controls */}
      <div className="p-5 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-900">
            <CalendarIcon className="w-5 h-5" />
            <h2 className="text-lg font-bold tracking-tight text-slate-900">
              Kalender Ketersediaan Armada Real-Time
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {mode === 'peminjam'
              ? 'Pilih armada dan klik tanggal berwarna hijau untuk langsung mengisi formulir peminjaman.'
              : 'Pantau jadwal pemakaian resmi dan pengajuan masuk per armada bus dinas.'}{' '}
            <span className="text-slate-400">·</span>{' '}
            <span className="font-medium text-blue-900 tabular-nums">
              Waktu Indonesia (WIB): {formatTanggalID(wibClock.dateStr)}, {wibClock.timeStr} WIB
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Bus Filter */}
          <div className="flex items-center gap-2">
            <label htmlFor="calendar-bus-select" className="text-xs font-medium text-slate-600 sr-only">
              Pilih Armada
            </label>
            <select
              id="calendar-bus-select"
              value={selectedBusId}
              onChange={(e) => setSelectedBusId(e.target.value)}
              className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
            >
              <option value="ALL">Semua Armada Bus ({buses.length})</option>
              {buses.map((bus) => (
                <option key={bus.id} value={bus.id}>
                  {bus.nama} — {bus.nopol} ({bus.status})
                </option>
              ))}
            </select>
          </div>

          {/* Month Switcher */}
          <div className="inline-flex items-center border border-slate-300 rounded-lg bg-white overflow-hidden">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              aria-label="Bulan sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1.5 text-xs font-semibold text-slate-900 min-w-[132px] text-center tabular-nums">
              {BULAN_ID[month]} {year}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              aria-label="Bulan berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
        <div className="inline-flex items-center gap-1.5 text-slate-700">
          <span className="w-3 h-3 rounded bg-emerald-500 inline-block shrink-0" />
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span className="font-medium">Tersedia (Klik untuk Booking)</span>
        </div>
        <div className="inline-flex items-center gap-1.5 text-slate-700">
          <span className="w-3 h-3 rounded bg-amber-400 inline-block shrink-0" />
          <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span className="font-medium">Menunggu Verifikasi</span>
        </div>
        <div className="inline-flex items-center gap-1.5 text-slate-700">
          <span className="w-3 h-3 rounded bg-rose-600 inline-block shrink-0" />
          <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          <span className="font-medium">Terbooking / Disetujui</span>
        </div>
        {selectedBus?.status === 'Dalam Perawatan' && (
          <div className="inline-flex items-center gap-1.5 text-rose-700 font-medium">
            <Wrench className="w-3.5 h-3.5 shrink-0" />
            <span>Armada sedang dalam perawatan berkala</span>
          </div>
        )}
      </div>

      {/* Main Split: Calendar Grid + Selected Date Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12">
        <div className="lg:col-span-8 p-5">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1.5 mb-2">
            {HARI_SINGKAT_ID.map((h) => (
              <div
                key={h}
                className="text-center text-xs font-semibold text-slate-500 py-1.5"
              >
                {h}
              </div>
            ))}
          </div>

          {/* Day Cells */}
          <div className="grid grid-cols-7 gap-1.5">
            {calendarDays.map((cell, idx) => {
              if (!cell.dateStr || !cell.dayNum) {
                return <div key={`empty-${idx}`} className="h-16 rounded-lg bg-slate-50/50" />;
              }

              const dateStr = cell.dateStr;
              const { status, dayBookings } = getDateState(dateStr);
              const isSelected = focusedDate === dateStr;
              const isToday = dateStr === getTodayWIBDateStr();

              let cellClasses =
                'bg-emerald-50/80 border-emerald-200 text-emerald-950 hover:bg-emerald-100';
              let statusText = 'Tersedia';

              if (status === 'approved') {
                cellClasses = 'bg-rose-50 border-rose-300 text-rose-950 hover:bg-rose-100';
                statusText = 'Terbooking';
              } else if (status === 'pending') {
                cellClasses = 'bg-amber-50 border-amber-300 text-amber-950 hover:bg-amber-100';
                statusText = 'Verifikasi';
              } else if (status === 'partial') {
                cellClasses = 'bg-amber-50 border-amber-300 text-amber-950 hover:bg-amber-100';
                statusText = `${dayBookings.length} Jadwal`;
              } else if (status === 'maintenance') {
                cellClasses = 'bg-slate-100 border-slate-300 text-slate-500';
                statusText = 'Perawatan';
              }

              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => {
                    setFocusedDate(dateStr);
                    if (
                      mode === 'peminjam' &&
                      status === 'available' &&
                      onSelectAvailableDate &&
                      focusedBusAvailableId
                    ) {
                      const targetBus =
                        selectedBusId !== 'ALL' ? selectedBusId : focusedBusAvailableId;
                      onSelectAvailableDate(dateStr, targetBus);
                    }
                  }}
                  className={`h-16 sm:h-[72px] p-2 rounded-lg border text-left flex flex-col justify-between transition-all cursor-pointer ${cellClasses} ${
                    isSelected ? 'ring-2 ring-blue-900 ring-offset-1' : ''
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs sm:text-sm font-bold tabular-nums">
                      {cell.dayNum}
                    </span>
                    {isToday && (
                      <span className="text-[10px] font-semibold text-blue-900 bg-blue-100 px-1.5 py-0.5 rounded">
                        Hari Ini
                      </span>
                    )}
                  </div>
                  <div className="w-full flex items-center justify-between gap-1">
                    <span className="text-[10px] font-medium truncate">{statusText}</span>
                    {dayBookings.length > 0 && (
                      <span className="text-[10px] font-mono-tabular font-semibold shrink-0">
                        {dayBookings.length}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Side Detail Panel for Focused Date */}
        <div className="lg:col-span-4 border-t lg:border-t-0 lg:border-l border-slate-200 bg-slate-50/70 p-5 flex flex-col justify-between gap-4">
          <div className="space-y-4">
            <div className="pb-3 border-b border-slate-200">
              <p className="text-xs font-medium text-slate-500">Detail Tanggal Dipilih</p>
              <h3 className="text-base font-bold text-slate-900 mt-0.5 tabular-nums">
                {formatTanggalID(focusedDate)}
              </h3>
            </div>

            {focusedBookings.length === 0 ? (
              <div className="p-4 rounded-lg bg-white border border-slate-200 space-y-2">
                <div
                  className={`flex items-center gap-2 font-semibold text-sm ${
                    selectedBus?.status === 'Dalam Perawatan'
                      ? 'text-rose-700'
                      : 'text-emerald-700'
                  }`}
                >
                  {selectedBus?.status === 'Dalam Perawatan' ? (
                    <Wrench className="w-4 h-4 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  )}
                  <span>
                    {selectedBus?.status === 'Dalam Perawatan'
                      ? 'Armada Dalam Perawatan'
                      : 'Jadwal Kosong & Tersedia'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {selectedBus?.status === 'Dalam Perawatan'
                    ? `${selectedBus.nama} sedang menjalani perawatan rutin sehingga tidak dapat dipesan.`
                    : `Belum ada pengajuan atau jadwal pemakaian pada tanggal ${formatTanggalID(
                        focusedDate
                      )}.`}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-slate-700">
                  Agenda Tercatat ({focusedBookings.length})
                </p>
                {focusedBookings.map((bk) => {
                  const bkBus = buses.find((bus) => bus.id === bk.busId);
                  return (
                    <div
                      key={bk.id}
                      className="p-3.5 rounded-lg bg-white border border-slate-200 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-mono-tabular font-semibold text-blue-900">
                            {bk.kodeBooking}
                          </p>
                          <p className="text-sm font-semibold text-slate-900 truncate">
                            {bk.namaSekolah}
                          </p>
                        </div>
                        <BookingStatusLabel status={bk.status} compact />
                      </div>
                      <div className="text-xs text-slate-600 space-y-1">
                        <p className="flex items-center gap-1.5">
                          <BusIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>
                            {bkBus ? `${bkBus.nama} (${bkBus.nopol})` : bk.busId}
                          </span>
                        </p>
                        <p className="tabular-nums text-slate-500">
                          {formatRentangTanggal(bk.tanggalMulai, bk.tanggalSelesai)} ·{' '}
                          {bk.jumlahPeserta} peserta
                        </p>
                        <p className="text-slate-700 line-clamp-2">{bk.lokasiTujuan}</p>
                      </div>
                      {mode === 'admin' && onInspectBooking && (
                        <button
                          type="button"
                          onClick={() => onInspectBooking(bk)}
                          className="w-full mt-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-900 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Periksa Proposal</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {mode === 'peminjam' && onSelectAvailableDate && (
            <button
              type="button"
              disabled={focusedHasApprovedLock || !focusedBusAvailableId}
              onClick={() => onSelectAvailableDate(focusedDate, focusedBusAvailableId)}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-blue-900 rounded-lg hover:bg-blue-800 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>
                {focusedHasApprovedLock
                  ? 'Jadwal Terkunci / Perawatan'
                  : 'Ajukan Peminjaman Tanggal Ini'}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
