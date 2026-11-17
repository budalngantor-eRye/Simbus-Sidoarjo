import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Bus as BusIcon,
  CheckCircle2,
  Clock,
  FileText,
  Printer,
  Search,
  Send,
  XCircle,
} from 'lucide-react';
import { Booking, Bus } from '../../types';
import {
  countDurationDays,
  formatRentangTanggal,
  getTodayWIBDateStr,
} from '../../utils/bookingUtils';
import { PermitPrintModal } from '../PermitPrintModal';
import { BookingStatusLabel } from '../StatusBadge';

interface TrackingViewProps {
  bookings: Booking[];
  buses: Bus[];
  initialSearchCode?: string;
}

export function TrackingView({ bookings, buses, initialSearchCode }: TrackingViewProps) {
  const sampleCodePlaceholder = `BK-${getTodayWIBDateStr().slice(0, 7).replace('-', '')}-001`;
  const [searchInput, setSearchInput] = useState(initialSearchCode || bookings[0]?.kodeBooking || '');
  const [activeCode, setActiveCode] = useState(initialSearchCode || bookings[0]?.kodeBooking || '');
  const [printBooking, setPrintBooking] = useState<Booking | null>(null);

  useEffect(() => {
    if (initialSearchCode) {
      setSearchInput(initialSearchCode);
      setActiveCode(initialSearchCode);
    }
  }, [initialSearchCode]);

  useEffect(() => {
    if (!activeCode && bookings[0]?.kodeBooking) {
      setSearchInput(bookings[0].kodeBooking);
      setActiveCode(bookings[0].kodeBooking);
    }
  }, [bookings, activeCode]);

  const foundBooking = bookings.find(
    (b) => b.kodeBooking.toLowerCase() === activeCode.trim().toLowerCase()
  );
  const foundBus = foundBooking ? buses.find((bus) => bus.id === foundBooking.busId) : undefined;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveCode(searchInput.trim());
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Lacak Status Pengajuan Peminjaman Bus
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Masukkan Kode Booking untuk melihat tahapan verifikasi, alasan penolakan, atau mencetak
            Bukti Izin Pemakaian Bus.
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={`Masukkan Kode Booking (contoh: ${sampleCodePlaceholder})`}
              className="w-full pl-10 pr-4 py-2.5 text-sm font-mono-tabular border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-900 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap"
          >
            Lacak Pengajuan
          </button>
        </form>

        {/* Quick-pick sample codes */}
        <div className="pt-2 border-t border-slate-100">
          <p className="text-xs font-medium text-slate-500 mb-2">
            Pilih cepat contoh pengajuan sekolah:
          </p>
          <div className="flex flex-wrap gap-2">
            {bookings.slice(0, 6).map((b) => {
              const isSelected = b.kodeBooking.toLowerCase() === activeCode.trim().toLowerCase();
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    setSearchInput(b.kodeBooking);
                    setActiveCode(b.kodeBooking);
                  }}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-colors text-left ${
                    isSelected
                      ? 'bg-blue-900 text-white border-blue-900'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="font-mono-tabular font-semibold">{b.kodeBooking}</span>
                  <span className="mx-1.5 opacity-60">·</span>
                  <span>{b.namaSekolah}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tracking Result */}
      {!foundBooking ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-2">
          <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
          <h2 className="text-base font-semibold text-slate-900">
            Kode Booking Tidak Ditemukan
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Kode <span className="font-mono-tabular font-semibold">{activeCode || '-'}</span> belum
            terdaftar. Periksa kembali penulisan kode atau pilih salah satu pengajuan contoh di atas.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-8">
          {/* Header Result */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
            <div>
              <div className="text-xs font-mono-tabular text-slate-500">
                Kode Booking: <span className="font-bold text-blue-900">{foundBooking.kodeBooking}</span> ·
                Diajukan {foundBooking.createdAt}
              </div>
              <h2 className="text-xl font-bold text-slate-900 mt-1">{foundBooking.namaSekolah}</h2>
              <p className="text-xs text-slate-600 mt-0.5">
                NPSN {foundBooking.npsn} · PIC: {foundBooking.picNama} ({foundBooking.picWhatsapp})
              </p>
            </div>
            <BookingStatusLabel status={foundBooking.status} />
          </div>

          {/* 3-Step Progress Stepper */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
              Tahapan Proses Pengajuan
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Step 1 */}
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800">1. Pengajuan Terkirim</span>
                  <Send className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-xs text-slate-600">
                  Formulir dan proposal PDF berhasil masuk ke sistem antrean verifikasi.
                </p>
                <p className="text-[11px] font-mono-tabular text-emerald-700">
                  {foundBooking.createdAt} WIB
                </p>
              </div>

              {/* Step 2 */}
              <div
                className={`p-4 rounded-xl border space-y-2 ${
                  foundBooking.status === 'Menunggu Verifikasi'
                    ? 'border-amber-300 bg-amber-50/70'
                    : 'border-emerald-200 bg-emerald-50/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold ${
                      foundBooking.status === 'Menunggu Verifikasi'
                        ? 'text-amber-900'
                        : 'text-emerald-800'
                    }`}
                  >
                    2. Verifikasi Pengelola Aset
                  </span>
                  {foundBooking.status === 'Menunggu Verifikasi' ? (
                    <Clock className="w-4 h-4 text-amber-600" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  )}
                </div>
                <p className="text-xs text-slate-600">
                  {foundBooking.status === 'Menunggu Verifikasi'
                    ? 'Sedang diperiksa oleh Verifikator Subbag Umum & Kepegawaian Disdikbud Sidoarjo.'
                    : 'Dokumen proposal dan ketersediaan armada telah selesai diperiksa.'}
                </p>
                <p className="text-[11px] font-mono-tabular text-slate-500">
                  {foundBooking.verifiedAt ? `${foundBooking.verifiedAt} WIB` : 'Dalam antrean'}
                </p>
              </div>

              {/* Step 3 */}
              <div
                className={`p-4 rounded-xl border space-y-2 ${
                  foundBooking.status === 'Disetujui'
                    ? 'border-emerald-300 bg-emerald-50'
                    : foundBooking.status === 'Ditolak'
                    ? 'border-rose-300 bg-rose-50'
                    : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold ${
                      foundBooking.status === 'Disetujui'
                        ? 'text-emerald-900'
                        : foundBooking.status === 'Ditolak'
                        ? 'text-rose-900'
                        : 'text-slate-500'
                    }`}
                  >
                    3. Keputusan Final
                  </span>
                  {foundBooking.status === 'Disetujui' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : foundBooking.status === 'Ditolak' ? (
                    <XCircle className="w-4 h-4 text-rose-600" />
                  ) : (
                    <Clock className="w-4 h-4 text-slate-400" />
                  )}
                </div>
                <p className="text-xs text-slate-600">
                  {foundBooking.status === 'Disetujui'
                    ? 'Permohonan disetujui. Jadwal armada terkunci resmi untuk sekolah Anda.'
                    : foundBooking.status === 'Ditolak'
                    ? 'Permohonan belum dapat disetujui. Silakan baca catatan alasan penolakan.'
                    : 'Menunggu hasil keputusan verifikator pengelola aset.'}
                </p>
                <p className="text-[11px] font-mono-tabular text-slate-500">
                  {foundBooking.status === 'Menunggu Verifikasi'
                    ? 'Belum diputuskan'
                    : foundBooking.status}
                </p>
              </div>
            </div>
          </div>

          {/* Decision Callout: Rejected or Approved */}
          {foundBooking.status === 'Ditolak' && (
            <div
              role="alert"
              className="p-5 rounded-xl bg-rose-50 border border-rose-300 text-rose-950 space-y-2"
            >
              <div className="flex items-center gap-2 font-bold text-sm text-rose-800">
                <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>Alasan Penolakan dari Pengelola Aset OPD</span>
              </div>
              <p className="text-sm leading-relaxed text-rose-900">
                {foundBooking.alasanPenolakan ||
                  'Permohonan ditolak karena persyaratan administrasi atau jadwal armada tidak terpenuhi.'}
              </p>
            </div>
          )}

          {foundBooking.status === 'Disetujui' && (
            <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-bold text-sm text-emerald-900">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>Izin Pemakaian Bus Dinas Telah Terbit</span>
                </div>
                <p className="text-xs text-emerald-800">
                  Silakan cetak atau unduh Bukti Izin Pemakaian Bus resmi untuk ditunjukkan kepada
                  pengemudi saat keberangkatan.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPrintBooking(foundBooking)}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 transition-colors whitespace-nowrap shrink-0"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak / Unduh Bukti Izin</span>
              </button>
            </div>
          )}

          {/* Details Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200 text-xs">
            <div className="space-y-2">
              <p className="text-slate-500 font-medium">Armada &amp; Jadwal</p>
              <p className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <BusIcon className="w-4 h-4 text-blue-900 shrink-0" />
                <span>
                  {foundBus ? `${foundBus.nama} (${foundBus.nopol})` : foundBooking.busId}
                </span>
              </p>
              <p className="text-slate-700 tabular-nums">
                Tanggal: {formatRentangTanggal(foundBooking.tanggalMulai, foundBooking.tanggalSelesai)} (
                {countDurationDays(foundBooking.tanggalMulai, foundBooking.tanggalSelesai)} hari)
              </p>
              <p className="text-slate-700 tabular-nums">
                Peserta: {foundBooking.jumlahPeserta} orang
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-slate-500 font-medium">Kegiatan &amp; Berkas</p>
              <p className="text-sm font-semibold text-slate-900">{foundBooking.lokasiTujuan}</p>
              <p className="text-slate-600 leading-relaxed">{foundBooking.tujuanKegiatan}</p>
              <p className="inline-flex items-center gap-1.5 text-blue-900 font-mono-tabular">
                <FileText className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {foundBooking.namaFileProposal} ({foundBooking.ukuranFileProposal})
                </span>
              </p>
            </div>
          </div>
        </div>
      )}

      <PermitPrintModal
        booking={printBooking}
        bus={printBooking ? buses.find((b) => b.id === printBooking.busId) : undefined}
        onClose={() => setPrintBooking(null)}
      />
    </div>
  );
}
