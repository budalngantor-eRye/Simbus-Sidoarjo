import { useMemo } from 'react';
import {
  Activity,
  AlertTriangle,
  Bus as BusIcon,
  CalendarCheck2,
  Clock,
  Eye,
  TrendingUp,
} from 'lucide-react';
import { Booking, Bus } from '../../types';
import {
  BULAN_ID,
  countDurationDays,
  findAllOverlappingBookings,
  formatRentangTanggal,
  getWIBDateParts,
} from '../../utils/bookingUtils';
import { BookingStatusLabel } from '../StatusBadge';

interface AdminDashboardViewProps {
  buses: Bus[];
  bookings: Booking[];
  onGoToVerification: () => void;
  onInspectBooking: (booking: Booking) => void;
}

export function AdminDashboardView({
  buses,
  bookings,
  onGoToVerification,
  onInspectBooking,
}: AdminDashboardViewProps) {
  const wibNow = getWIBDateParts();
  const currentMonthPrefix = `${wibNow.year}-${String(wibNow.month).padStart(2, '0')}`;
  const currentMonthName = BULAN_ID[wibNow.month - 1] || 'Bulan Ini';
  const activeBuses = buses.filter((b) => b.status === 'Aktif');
  const pendingBookings = bookings.filter((b) => b.status === 'Menunggu Verifikasi');
  const approvedCurrentMonthBookings = bookings.filter(
    (b) => b.status === 'Disetujui' && (b.tanggalMulai || '').startsWith(currentMonthPrefix)
  );

  // Calculate fleet utilization % for active month based on active buses * 22 operational days
  const utilizationPct = useMemo(() => {
    const capacityDays = Math.max(1, activeBuses.length * 22);
    const usedDays = approvedCurrentMonthBookings.reduce(
      (sum, b) => sum + countDurationDays(b.tanggalMulai, b.tanggalSelesai),
      0
    );
    return Math.min(100, Math.round((usedDays / capacityDays) * 100));
  }, [activeBuses.length, approvedCurrentMonthBookings]);

  const monthlyStats = useMemo(() => {
    return BULAN_ID.map((namaBulan, index) => {
      const mm = String(index + 1).padStart(2, '0');
      const monthBookings = bookings.filter((b) =>
        (b.tanggalMulai || '').startsWith(`${wibNow.year}-${mm}`)
      );
      const approved = monthBookings.filter((b) => b.status === 'Disetujui').length;
      const pending = monthBookings.filter((b) => b.status === 'Menunggu Verifikasi').length;
      const rejected = monthBookings.filter((b) => b.status === 'Ditolak').length;
      return {
        label: namaBulan.slice(0, 3),
        fullLabel: namaBulan,
        approved,
        pending,
        rejected,
        total: monthBookings.length,
      };
    });
  }, [bookings, wibNow.year]);

  const maxMonthlyTotal = Math.max(3, ...monthlyStats.map((m) => m.total));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Dashboard Operasional Pengelola Aset
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Ringkasan kesiapan armada bus luar kelas, antrean verifikasi proposal, dan utilisasi
          bulanan Tahun {wibNow.year}.
        </p>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Total Armada Bus</span>
            <BusIcon className="w-4 h-4 text-blue-900" />
          </div>
          <p className="text-2xl font-bold text-slate-900 tabular-nums">{buses.length} Unit</p>
          <p className="text-xs text-slate-600 tabular-nums">
            {activeBuses.length} Aktif · {buses.length - activeBuses.length} Dalam Perawatan
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Menunggu Verifikasi</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-amber-600 tabular-nums">
            {pendingBookings.length} Pengajuan
          </p>
          <p className="text-xs text-slate-600">Memerlukan pemeriksaan proposal</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Disetujui Bulan Ini</span>
            <CalendarCheck2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-700 tabular-nums">
            {approvedCurrentMonthBookings.length} Jadwal
          </p>
          <p className="text-xs text-slate-600">
            Periode {currentMonthName} {wibNow.year}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Tingkat Utilisasi Armada</span>
            <Activity className="w-4 h-4 text-sky-600" />
          </div>
          <p className="text-2xl font-bold text-blue-900 tabular-nums">{utilizationPct}%</p>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-sky-600 rounded-full transition-all"
              style={{ width: `${utilizationPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Bar Chart + Pending Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Monthly Bar Chart */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between gap-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-900" />
                <span>Perbandingan Jumlah Peminjaman per Bulan ({wibNow.year})</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Distribusi pengajuan Disetujui, Menunggu Verifikasi, dan Ditolak
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-600">
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600 inline-block" /> Disetujui
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" /> Menunggu
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" /> Ditolak
              </span>
            </div>
          </div>

          <div className="h-56 flex items-end justify-between gap-2 pt-4 border-b border-slate-200 pb-2">
            {monthlyStats.map((m) => {
              const heightPct = (m.total / maxMonthlyTotal) * 100;
              return (
                <div
                  key={m.label}
                  className="flex-1 flex flex-col items-center justify-end h-full group"
                  title={`${m.fullLabel} ${wibNow.year}: ${m.total} pengajuan (${m.approved} disetujui, ${m.pending} menunggu, ${m.rejected} ditolak)`}
                >
                  <span className="text-[11px] font-mono-tabular font-semibold text-slate-700 mb-1">
                    {m.total > 0 ? m.total : ''}
                  </span>
                  <div
                    className="w-full max-w-[32px] rounded-t-md overflow-hidden flex flex-col-reverse bg-slate-100 transition-all"
                    style={{ height: `${Math.max(m.total > 0 ? 14 : 4, heightPct)}%` }}
                  >
                    {m.approved > 0 && (
                      <div
                        className="w-full bg-emerald-600"
                        style={{ height: `${(m.approved / m.total) * 100}%` }}
                      />
                    )}
                    {m.pending > 0 && (
                      <div
                        className="w-full bg-amber-400"
                        style={{ height: `${(m.pending / m.total) * 100}%` }}
                      />
                    )}
                    {m.rejected > 0 && (
                      <div
                        className="w-full bg-rose-500"
                        style={{ height: `${(m.rejected / m.total) * 100}%` }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between gap-2 text-[11px] font-medium text-slate-500">
            {monthlyStats.map((m) => (
              <span key={m.label} className="flex-1 text-center">
                {m.label}
              </span>
            ))}
          </div>
        </div>

        {/* Pending Queue Snapshot */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between gap-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Antrean Perlu Tindakan</h2>
              <button
                type="button"
                onClick={onGoToVerification}
                className="text-xs font-semibold text-sky-700 hover:text-blue-900"
              >
                Lihat Semua &rarr;
              </button>
            </div>

            {pendingBookings.length === 0 ? (
              <div className="p-6 rounded-lg bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                Seluruh pengajuan yang masuk telah selesai diverifikasi.
              </div>
            ) : (
              <div className="space-y-3">
                {pendingBookings.slice(0, 4).map((bk) => {
                  const bus = buses.find((b) => b.id === bk.busId);
                  const overlaps = findAllOverlappingBookings(bookings, bk);
                  return (
                    <div
                      key={bk.id}
                      className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 space-y-2"
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
                      <p className="text-xs text-slate-600 tabular-nums">
                        {bus?.nama} · {formatRentangTanggal(bk.tanggalMulai, bk.tanggalSelesai)}
                      </p>
                      {overlaps.length > 0 && (
                        <p className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>Bentrok tanggal dengan {overlaps.length} pengajuan lain</span>
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => onInspectBooking(bk)}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-900 bg-white border border-slate-300 rounded-md hover:bg-blue-50 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Periksa Proposal</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
