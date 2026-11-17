import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  FileText,
  Search,
  X,
  XCircle,
} from 'lucide-react';
import { Booking, BookingStatus, Bus } from '../../types';
import {
  countDurationDays,
  findAllOverlappingBookings,
  formatRentangTanggal,
} from '../../utils/bookingUtils';
import { BookingStatusLabel } from '../StatusBadge';

interface VerificationQueueViewProps {
  bookings: Booking[];
  buses: Bus[];
  onInspectBooking: (booking: Booking) => void;
  onApproveBooking: (booking: Booking) => Promise<void>;
  onRejectBooking: (booking: Booking, reason: string) => Promise<void>;
}

export function VerificationQueueView({
  bookings,
  buses,
  onInspectBooking,
  onApproveBooking,
  onRejectBooking,
}: VerificationQueueViewProps) {
  const [statusFilter, setStatusFilter] = useState<'Semua' | BookingStatus>('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [rejectTarget, setRejectTarget] = useState<Booking | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (statusFilter !== 'Semua' && b.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          b.kodeBooking.toLowerCase().includes(q) ||
          b.namaSekolah.toLowerCase().includes(q) ||
          b.lokasiTujuan.toLowerCase().includes(q) ||
          b.picNama.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [bookings, statusFilter, searchQuery]);

  const counts = useMemo(() => {
    return {
      Semua: bookings.length,
      'Menunggu Verifikasi': bookings.filter((b) => b.status === 'Menunggu Verifikasi').length,
      Disetujui: bookings.filter((b) => b.status === 'Disetujui').length,
      Ditolak: bookings.filter((b) => b.status === 'Ditolak').length,
    };
  }, [bookings]);

  const handleApproveClick = async (bk: Booking) => {
    setProcessingId(bk.id);
    try {
      await onApproveBooking(bk);
    } catch {
      // Error surfaced via actionAlert in App
    } finally {
      setProcessingId(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectTarget) return;
    if (!rejectReason.trim() || rejectReason.trim().length < 10) {
      setRejectError('Mohon tuliskan alasan penolakan yang jelas (minimal 10 karakter).');
      return;
    }
    setProcessingId(rejectTarget.id);
    setRejectError('');
    try {
      await onRejectBooking(rejectTarget, rejectReason.trim());
      setRejectTarget(null);
      setRejectReason('');
      setRejectError('');
    } catch (err) {
      setRejectError(err instanceof Error ? err.message : 'Gagal menolak pengajuan.');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Antrean Verifikasi Proposal Peminjaman
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Periksa kelengkapan surat permohonan sekolah, deteksi potensi bentrok jadwal, dan
          terbitkan persetujuan atau penolakan beserta notifikasi email otomatis.
        </p>
      </div>

      {/* Filters & Search */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-lg">
          {(['Semua', 'Menunggu Verifikasi', 'Disetujui', 'Ditolak'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                statusFilter === tab
                  ? 'bg-white text-blue-900 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab} ({counts[tab]})
            </button>
          ))}
        </div>

        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari sekolah, kode, atau lokasi..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-3.5 px-4">Kode &amp; Sekolah</th>
                <th className="py-3.5 px-4">Armada &amp; Jadwal</th>
                <th className="py-3.5 px-4">Lokasi &amp; Peserta</th>
                <th className="py-3.5 px-4">Status &amp; Peringatan</th>
                <th className="py-3.5 px-4 text-right">Tindakan Verifikator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-500">
                    Tidak ada pengajuan peminjaman yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                filteredBookings.map((bk) => {
                  const bus = buses.find((b) => b.id === bk.busId);
                  const overlaps =
                    bk.status === 'Menunggu Verifikasi'
                      ? findAllOverlappingBookings(bookings, bk)
                      : [];
                  const hasApprovedConflict = overlaps.some((o) => o.status === 'Disetujui');

                  return (
                    <tr key={bk.id} className="hover:bg-slate-50/70 transition-colors align-top">
                      <td className="py-4 px-4 space-y-1">
                        <p className="font-mono-tabular font-bold text-blue-900">{bk.kodeBooking}</p>
                        <p className="font-semibold text-slate-900 text-sm">{bk.namaSekolah}</p>
                        <p className="text-slate-500">
                          PIC: {bk.picNama} · {bk.picWhatsapp}
                        </p>
                      </td>

                      <td className="py-4 px-4 space-y-1">
                        <p className="font-semibold text-slate-900">
                          {bus ? `${bus.nama} (${bus.nopol})` : bk.busId}
                        </p>
                        <p className="text-slate-700 tabular-nums">
                          {formatRentangTanggal(bk.tanggalMulai, bk.tanggalSelesai)}
                        </p>
                        <p className="text-slate-500 tabular-nums">
                          Durasi {countDurationDays(bk.tanggalMulai, bk.tanggalSelesai)} hari
                        </p>
                      </td>

                      <td className="py-4 px-4 space-y-1 max-w-xs">
                        <p className="font-medium text-slate-900">{bk.lokasiTujuan}</p>
                        <p className="text-slate-500 tabular-nums">{bk.jumlahPeserta} peserta</p>
                        <button
                          type="button"
                          onClick={() => onInspectBooking(bk)}
                          className="inline-flex items-center gap-1 text-sky-700 hover:text-blue-900 font-medium"
                        >
                          <FileText className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate max-w-[180px]">{bk.namaFileProposal}</span>
                        </button>
                      </td>

                      <td className="py-4 px-4 space-y-2">
                        <BookingStatusLabel status={bk.status} />

                        {overlaps.length > 0 && (
                          <div
                            className={`p-2 rounded-md border text-[11px] flex items-start gap-1.5 ${
                              hasApprovedConflict
                                ? 'bg-rose-50 border-rose-200 text-rose-800'
                                : 'bg-amber-50 border-amber-200 text-amber-900'
                            }`}
                          >
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>
                              <strong>Conflict Alert:</strong> Bersamaan dengan{' '}
                              {overlaps.map((o) => o.namaSekolah).join(', ')}
                            </span>
                          </div>
                        )}

                        {bk.status === 'Ditolak' && bk.alasanPenolakan && (
                          <p className="text-[11px] text-rose-700 max-w-xs line-clamp-2">
                            Alasan: {bk.alasanPenolakan}
                          </p>
                        )}
                      </td>

                      <td className="py-4 px-4 text-right">
                        <div className="inline-flex flex-wrap items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => onInspectBooking(bk)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-100 transition-colors whitespace-nowrap"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Pratinjau Proposal</span>
                          </button>

                          {bk.status === 'Menunggu Verifikasi' && (
                            <>
                              <button
                                type="button"
                                disabled={hasApprovedConflict || processingId === bk.id}
                                onClick={() => handleApproveClick(bk)}
                                title={
                                  hasApprovedConflict
                                    ? 'Tidak dapat disetujui karena armada sudah terbooking pada tanggal tersebut'
                                    : 'Setujui peminjaman dan kunci jadwal'
                                }
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>{processingId === bk.id ? 'Memproses...' : 'Setujui'}</span>
                              </button>

                              <button
                                type="button"
                                disabled={processingId === bk.id}
                                onClick={() => {
                                  setRejectTarget(bk);
                                  setRejectReason('');
                                  setRejectError('');
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-md hover:bg-rose-100 disabled:opacity-40 transition-colors whitespace-nowrap"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Tolak</span>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mandatory Rejection Reason Modal */}
      {rejectTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reject-modal-title"
        >
          <div className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-rose-50">
              <div className="flex items-center gap-2 text-rose-900">
                <XCircle className="w-5 h-5 text-rose-600" />
                <h3 id="reject-modal-title" className="text-sm font-bold">
                  Tolak Pengajuan Peminjaman
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRejectTarget(null)}
                className="p-1 text-slate-500 hover:text-slate-900"
                aria-label="Tutup dialog penolakan"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="text-xs text-slate-600 space-y-1">
                <p>
                  Pengajuan: <strong className="text-slate-900">{rejectTarget.namaSekolah}</strong> (
                  <span className="font-mono-tabular">{rejectTarget.kodeBooking}</span>)
                </p>
                <p>
                  Email tujuan notifikasi:{' '}
                  <strong className="text-slate-900">{rejectTarget.email}</strong>
                </p>
              </div>

              <div>
                <label
                  htmlFor="alasan-penolakan"
                  className="block text-xs font-semibold text-slate-800 mb-1.5"
                >
                  Alasan Penolakan Resmi (Wajib Diisi) *
                </label>
                <textarea
                  id="alasan-penolakan"
                  rows={4}
                  value={rejectReason}
                  onChange={(e) => {
                    setRejectReason(e.target.value);
                    setRejectError('');
                  }}
                  placeholder="Contoh: Jadwal bentrok dengan pengajuan prioritas sebelumnya, atau surat permohonan belum ditandatangani Kepala Sekolah."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600"
                />
                {rejectError && <p className="text-xs text-rose-600 mt-1">{rejectError}</p>}
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex justify-end gap-2.5">
              <button
                type="button"
                disabled={processingId === rejectTarget.id}
                onClick={() => setRejectTarget(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={processingId === rejectTarget.id}
                onClick={handleConfirmReject}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 rounded-lg hover:bg-rose-700 disabled:opacity-50"
              >
                {processingId === rejectTarget.id
                  ? 'Memproses Penolakan...'
                  : 'Konfirmasi Tolak & Kirim Email'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
