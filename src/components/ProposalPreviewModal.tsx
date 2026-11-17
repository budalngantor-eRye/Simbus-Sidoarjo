import { useState } from 'react';
import { AlertTriangle, CheckCircle2, FileText, Users, X, XCircle } from 'lucide-react';
import { Booking, Bus } from '../types';
import {
  countDurationDays,
  formatRentangTanggal,
  getWIBDateParts,
} from '../utils/bookingUtils';
import { BookingStatusLabel } from './StatusBadge';

interface ProposalPreviewModalProps {
  booking: Booking | null;
  bus: Bus | undefined;
  conflicts: Booking[];
  onClose: () => void;
  onApprove?: (booking: Booking) => Promise<void>;
  onRequestReject?: (booking: Booking) => void;
}

export function ProposalPreviewModal({
  booking,
  bus,
  conflicts,
  onClose,
  onApprove,
  onRequestReject,
}: ProposalPreviewModalProps) {
  const [submitting, setSubmitting] = useState(false);

  if (!booking) return null;

  const approvedConflicts = conflicts.filter((c) => c.status === 'Disetujui');
  const pendingConflicts = conflicts.filter((c) => c.status === 'Menunggu Verifikasi');
  const durasi = countDurationDays(booking.tanggalMulai, booking.tanggalSelesai);
  const letterDate = (booking.createdAt || '').split(' ')[0] || getWIBDateParts().dateStr;
  const letterYear = letterDate.slice(0, 4) || String(getWIBDateParts().year);

  const handleApproveClick = async () => {
    if (!onApprove) return;
    setSubmitting(true);
    try {
      await onApprove(booking);
    } catch {
      // Error surfaced via actionAlert in App
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="proposal-preview-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-blue-900/10 text-blue-900 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 id="proposal-preview-title" className="text-base font-semibold text-slate-900 truncate">
                Pratinjau Proposal & Berkas Permohonan
              </h3>
              <p className="text-xs text-slate-500 font-mono-tabular">
                {booking.kodeBooking} · {booking.namaSekolah} (NPSN {booking.npsn})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 transition-colors"
            aria-label="Tutup modal pratinjau"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Metadata */}
          <div className="lg:col-span-5 space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Status Pengajuan</span>
              <BookingStatusLabel status={booking.status} />
            </div>

            {approvedConflicts.length > 0 && booking.status === 'Menunggu Verifikasi' && (
              <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-rose-900">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>Bentrok Jadwal Disetujui</span>
                </div>
                <p>
                  Armada {bus?.nama} sudah disetujui untuk{' '}
                  <strong>{approvedConflicts[0].namaSekolah}</strong> pada tanggal tersebut.
                </p>
              </div>
            )}

            {pendingConflicts.length > 0 && booking.status === 'Menunggu Verifikasi' && (
              <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>Antrean Pengajuan Bersamaan ({pendingConflicts.length})</span>
                </div>
                <p>
                  Terdapat pengajuan lain yang menunggu verifikasi pada armada dan rentang tanggal yang sama:{' '}
                  {pendingConflicts.map((c) => c.namaSekolah).join(', ')}.
                </p>
              </div>
            )}

            <div className="border border-slate-200 rounded-lg divide-y divide-slate-200 text-xs">
              <div className="p-3 flex justify-between gap-4">
                <span className="text-slate-500">Sekolah / Instansi</span>
                <span className="font-semibold text-slate-900 text-right">{booking.namaSekolah}</span>
              </div>
              <div className="p-3 flex justify-between gap-4">
                <span className="text-slate-500">Penanggung Jawab</span>
                <span className="font-medium text-slate-900 text-right">{booking.picNama}</span>
              </div>
              <div className="p-3 flex justify-between gap-4">
                <span className="text-slate-500">Kontak PIC</span>
                <span className="text-slate-800 text-right font-mono-tabular">
                  {booking.picWhatsapp}
                  <br />
                  <span className="text-slate-500 font-sans">{booking.email}</span>
                </span>
              </div>
              <div className="p-3 flex justify-between gap-4">
                <span className="text-slate-500">Armada Bus</span>
                <span className="font-semibold text-blue-900 text-right">
                  {bus ? `${bus.nama} (${bus.nopol})` : booking.busId}
                </span>
              </div>
              <div className="p-3 flex justify-between gap-4">
                <span className="text-slate-500">Jadwal Pemakaian</span>
                <span className="font-medium text-slate-900 text-right tabular-nums">
                  {formatRentangTanggal(booking.tanggalMulai, booking.tanggalSelesai)} ({durasi} hari)
                </span>
              </div>
              <div className="p-3 flex justify-between gap-4">
                <span className="text-slate-500">Jumlah Peserta</span>
                <span className="font-medium text-slate-900 text-right inline-flex items-center gap-1 tabular-nums">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  {booking.jumlahPeserta} orang {bus ? `/ maks ${bus.kapasitas}` : ''}
                </span>
              </div>
              <div className="p-3 space-y-1">
                <span className="text-slate-500 block">Lokasi Tujuan</span>
                <span className="font-medium text-slate-900 block">{booking.lokasiTujuan}</span>
              </div>
              <div className="p-3 space-y-1">
                <span className="text-slate-500 block">Tujuan Kegiatan</span>
                <span className="text-slate-700 block leading-relaxed">{booking.tujuanKegiatan}</span>
              </div>
            </div>

            {booking.status === 'Ditolak' && booking.alasanPenolakan && (
              <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1">
                <span className="font-semibold block">Alasan Penolakan Tercatat:</span>
                <p className="leading-relaxed">{booking.alasanPenolakan}</p>
              </div>
            )}
          </div>

          {/* Right: Simulated PDF Document Viewer */}
          <div className="lg:col-span-7 flex flex-col border border-slate-300 rounded-lg bg-slate-100 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800 text-white text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-sky-400 shrink-0" />
                <span className="truncate font-mono-tabular">{booking.namaFileProposal}</span>
              </div>
              <span className="text-slate-300 shrink-0 font-mono-tabular">
                PDF · {booking.ukuranFileProposal}
              </span>
            </div>

            <div className="p-5 overflow-y-auto max-h-[480px] flex justify-center">
              <div className="bg-white border border-slate-200 shadow-sm w-full max-w-lg p-7 text-[11px] text-slate-800 leading-relaxed space-y-4">
                <div className="border-b-2 border-slate-900 pb-3 text-center">
                  <p className="font-bold text-xs tracking-wide text-slate-900">
                    PEMERINTAH KABUPATEN SIDOARJO
                  </p>
                  <p className="font-bold text-sm text-slate-900">
                    DINAS PENDIDIKAN DAN KEBUDAYAAN
                  </p>
                  <p className="font-semibold text-xs text-blue-900 mt-0.5">
                    {booking.namaSekolah.toUpperCase()}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    NPSN: {booking.npsn} · Kabupaten Sidoarjo, Jawa Timur
                  </p>
                </div>

                <div className="flex justify-between text-[10px]">
                  <div>
                    <p>Nomor : 421.2 / 148 / {(booking.npsn || '0000').slice(-4)} / {letterYear}</p>
                    <p>Hal : Permohonan Peminjaman Bus Pendidikan Luar Kelas</p>
                  </div>
                  <p className="text-slate-600 font-mono-tabular">
                    Sidoarjo, {letterDate}
                  </p>
                </div>

                <div className="space-y-2">
                  <p>
                    Yth. Kepala Dinas Pendidikan dan Kebudayaan Kabupaten Sidoarjo
                    <br />
                    c.q. Pengelola Aset Armada Transportasi Pendidikan
                    <br />
                    di Sidoarjo
                  </p>
                  <p>Dengan hormat,</p>
                  <p className="text-justify">
                    Sehubungan dengan pelaksanaan program pembelajaran kontekstual di luar kelas
                    (Kurikulum Merdeka / P5), bersama ini kami mengajukan permohonan peminjaman
                    armada bus dinas milik Dinas Pendidikan dan Kebudayaan Kabupaten Sidoarjo
                    dengan rincian sebagai berikut:
                  </p>
                </div>

                <table className="w-full text-[10px] border-collapse">
                  <tbody>
                    <tr className="border-b border-slate-200">
                      <td className="py-1 text-slate-500 w-36">Nama Kegiatan</td>
                      <td className="py-1 font-medium text-slate-900">: {booking.tujuanKegiatan}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="py-1 text-slate-500">Lokasi Tujuan</td>
                      <td className="py-1 font-medium text-slate-900">: {booking.lokasiTujuan}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="py-1 text-slate-500">Tanggal Pelaksanaan</td>
                      <td className="py-1 font-medium text-slate-900">
                        : {formatRentangTanggal(booking.tanggalMulai, booking.tanggalSelesai)}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="py-1 text-slate-500">Armada Dimohon</td>
                      <td className="py-1 font-medium text-slate-900">
                        : {bus ? `${bus.nama} (${bus.nopol})` : booking.busId}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1 text-slate-500">Jumlah Rombongan</td>
                      <td className="py-1 font-medium text-slate-900">
                        : {booking.jumlahPeserta} Orang (Siswa & Guru Pendamping)
                      </td>
                    </tr>
                  </tbody>
                </table>

                <p className="text-justify">
                  Kami berkomitmen menjaga ketertiban, kebersihan armada, serta mematuhi seluruh
                  prosedur operasional standar peminjaman kendaraan dinas. Atas perhatian dan izin
                  yang diberikan, kami sampaikan terima kasih.
                </p>

                <div className="pt-4 flex justify-end">
                  <div className="text-center w-48">
                    <p>Penanggung Jawab / Koordinator,</p>
                    <div className="h-10 flex items-center justify-center text-[10px] italic text-slate-400">
                      [Tertanda secara elektronik]
                    </div>
                    <p className="font-semibold underline text-slate-900">{booking.picNama}</p>
                    <p className="text-[10px] text-slate-500">WA: {booking.picWhatsapp}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <span className="text-xs text-slate-500">
            Diajukan pada <span className="font-mono-tabular">{booking.createdAt}</span>
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Tutup
            </button>
            {booking.status === 'Menunggu Verifikasi' && onRequestReject && (
              <button
                type="button"
                disabled={submitting}
                onClick={() => onRequestReject(booking)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 disabled:opacity-50 transition-colors"
              >
                <XCircle className="w-4 h-4" />
                <span>Tolak Pengajuan</span>
              </button>
            )}
            {booking.status === 'Menunggu Verifikasi' && onApprove && (
              <button
                type="button"
                disabled={approvedConflicts.length > 0 || submitting}
                onClick={handleApproveClick}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{submitting ? 'Memproses...' : 'Setujui Peminjaman'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
