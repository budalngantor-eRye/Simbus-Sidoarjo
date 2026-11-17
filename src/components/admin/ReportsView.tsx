import { useMemo, useState } from 'react';
import { Download, FileSpreadsheet, Printer, X } from 'lucide-react';
import { Booking, Bus } from '../../types';
import {
  BULAN_ID,
  ReportPeriodType,
  countDurationDays,
  exportBookingsToCSV,
  filterBookingsByPeriod,
  formatRentangTanggal,
  getPeriodLabel,
  getTodayWIBFormatted,
  getWIBDateParts,
} from '../../utils/bookingUtils';
import { BookingStatusLabel } from '../StatusBadge';

interface ReportsViewProps {
  bookings: Booking[];
  buses: Bus[];
}

export function ReportsView({ bookings, buses }: ReportsViewProps) {
  const wibNow = getWIBDateParts();
  const [periodType, setPeriodType] = useState<ReportPeriodType>('bulanan');
  const [periodValue, setPeriodValue] = useState<number>(wibNow.month);
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  const handleChangePeriodType = (nextType: ReportPeriodType) => {
    setPeriodType(nextType);
    if (nextType === 'bulanan') setPeriodValue(wibNow.month);
    else if (nextType === 'triwulanan') setPeriodValue(Math.ceil(wibNow.month / 3));
    else setPeriodValue(wibNow.month <= 6 ? 1 : 2);
  };

  const filteredBookings = useMemo(() => {
    return filterBookingsByPeriod(bookings, periodType, periodValue);
  }, [bookings, periodType, periodValue]);

  const periodLabel = getPeriodLabel(periodType, periodValue, wibNow.year);

  const summary = useMemo(() => {
    const total = filteredBookings.length;
    const disetujui = filteredBookings.filter((b) => b.status === 'Disetujui').length;
    const ditolak = filteredBookings.filter((b) => b.status === 'Ditolak').length;
    const menunggu = filteredBookings.filter((b) => b.status === 'Menunggu Verifikasi').length;
    return { total, disetujui, ditolak, menunggu };
  }, [filteredBookings]);

  const busUsageSummary = useMemo(() => {
    return buses.map((bus) => {
      const busApproved = filteredBookings.filter(
        (b) => b.busId === bus.id && b.status === 'Disetujui'
      );
      const hariPakai = busApproved.reduce(
        (sum, b) => sum + countDurationDays(b.tanggalMulai, b.tanggalSelesai),
        0
      );
      const jamPakai = hariPakai * 8; // Standar operasional 8 jam per hari dinas
      const totalPeserta = busApproved.reduce((sum, b) => sum + b.jumlahPeserta, 0);
      return {
        bus,
        tripCount: busApproved.length,
        hariPakai,
        jamPakai,
        totalPeserta,
      };
    });
  }, [buses, filteredBookings]);

  const handleExportCSV = () => {
    const slug = periodLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    exportBookingsToCSV(filteredBookings, buses, `rekap-simbus-disdikbud-${slug}.csv`);
  };

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Laporan &amp; Rekapitulasi Periodik
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Rekapitulasi peminjaman armada bus dinas per Bulan, Triwulan, atau Semester beserta
            ekspor CSV &amp; cetak laporan resmi.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={filteredBookings.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-300 rounded-lg hover:bg-emerald-100 disabled:opacity-40 transition-colors whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            <span>Export Excel (CSV)</span>
          </button>

          <button
            type="button"
            onClick={() => setShowPrintPreview(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-900 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Laporan Resmi (PDF)</span>
          </button>
        </div>
      </div>

      {/* Period Filters */}
      <div className="no-print bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(
              [
                { key: 'bulanan', label: 'Per Bulan' },
                { key: 'triwulanan', label: 'Per Triwulan' },
                { key: 'semesteran', label: 'Per Semester' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => handleChangePeriodType(opt.key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  periodType === opt.key
                    ? 'bg-white text-blue-900 font-semibold shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {periodType === 'bulanan' && (
            <select
              value={periodValue}
              onChange={(e) => setPeriodValue(Number(e.target.value))}
              aria-label="Pilih bulan rekapitulasi"
              className="px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:border-blue-900"
            >
              <option value={0}>Semua Bulan (Januari – Desember {wibNow.year})</option>
              {BULAN_ID.map((nama, idx) => (
                <option key={nama} value={idx + 1}>
                  {nama} {wibNow.year}
                </option>
              ))}
            </select>
          )}

          {periodType === 'triwulanan' && (
            <select
              value={periodValue}
              onChange={(e) => setPeriodValue(Number(e.target.value))}
              aria-label="Pilih triwulan rekapitulasi"
              className="px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:border-blue-900"
            >
              <option value={1}>Triwulan I (Jan – Mar {wibNow.year})</option>
              <option value={2}>Triwulan II (Apr – Jun {wibNow.year})</option>
              <option value={3}>Triwulan III (Jul – Sep {wibNow.year})</option>
              <option value={4}>Triwulan IV (Okt – Des {wibNow.year})</option>
            </select>
          )}

          {periodType === 'semesteran' && (
            <select
              value={periodValue}
              onChange={(e) => setPeriodValue(Number(e.target.value))}
              aria-label="Pilih semester rekapitulasi"
              className="px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:border-blue-900"
            >
              <option value={1}>Semester 1 (Jan – Jun {wibNow.year})</option>
              <option value={2}>Semester 2 (Jul – Des {wibNow.year})</option>
            </select>
          )}
        </div>

        <span className="text-xs font-medium text-slate-500">
          Menampilkan: <strong className="text-slate-900">{periodLabel}</strong>
        </span>
      </div>

      {/* Summary Metric Strip */}
      <div className="no-print grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Total Pengajuan Masuk</p>
          <p className="text-2xl font-bold text-slate-900 tabular-nums mt-1">{summary.total}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Total Disetujui</p>
          <p className="text-2xl font-bold text-emerald-700 tabular-nums mt-1">
            {summary.disetujui}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Total Ditolak</p>
          <p className="text-2xl font-bold text-rose-700 tabular-nums mt-1">{summary.ditolak}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Menunggu Verifikasi</p>
          <p className="text-2xl font-bold text-amber-600 tabular-nums mt-1">
            {summary.menunggu}
          </p>
        </div>
      </div>

      {/* Rekap Utilisasi per Armada */}
      <div className="no-print bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-blue-900" />
          <h2 className="text-sm font-bold text-slate-900">
            Rekapitulasi Hari &amp; Jam Pakai per Armada ({periodLabel})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-3 px-4">Armada Bus</th>
                <th className="py-3 px-4">Nopol</th>
                <th className="py-3 px-4">Sopir Penanggung Jawab</th>
                <th className="py-3 px-4 text-right">Perjalanan Disetujui</th>
                <th className="py-3 px-4 text-right">Total Hari Pakai</th>
                <th className="py-3 px-4 text-right">Estimasi Jam Operasional</th>
                <th className="py-3 px-4 text-right">Total Peserta Terlayani</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {busUsageSummary.map((row) => (
                <tr key={row.bus.id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 font-semibold text-slate-900">{row.bus.nama}</td>
                  <td className="py-3 px-4 font-mono-tabular text-slate-700">{row.bus.nopol}</td>
                  <td className="py-3 px-4 text-slate-600">{row.bus.sopir}</td>
                  <td className="py-3 px-4 text-right font-mono-tabular font-semibold">
                    {row.tripCount}x
                  </td>
                  <td className="py-3 px-4 text-right font-mono-tabular">{row.hariPakai} hari</td>
                  <td className="py-3 px-4 text-right font-mono-tabular">{row.jamPakai} jam</td>
                  <td className="py-3 px-4 text-right font-mono-tabular">
                    {row.totalPeserta} orang
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Filtered History Table */}
      <div className="no-print bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h2 className="text-sm font-bold text-slate-900">
            Rincian Riwayat Pengajuan Peminjaman ({filteredBookings.length} Data)
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-3 px-4">Kode</th>
                <th className="py-3 px-4">Sekolah / Instansi</th>
                <th className="py-3 px-4">Armada</th>
                <th className="py-3 px-4">Tanggal</th>
                <th className="py-3 px-4">Lokasi Tujuan</th>
                <th className="py-3 px-4 text-right">Peserta</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Tidak ada riwayat peminjaman pada periode {periodLabel}.
                  </td>
                </tr>
              ) : (
                filteredBookings.map((bk) => {
                  const bus = buses.find((b) => b.id === bk.busId);
                  return (
                    <tr key={bk.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-mono-tabular font-semibold text-blue-900">
                        {bk.kodeBooking}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">{bk.namaSekolah}</td>
                      <td className="py-3 px-4 text-slate-700">{bus?.nama || bk.busId}</td>
                      <td className="py-3 px-4 text-slate-700 tabular-nums">
                        {formatRentangTanggal(bk.tanggalMulai, bk.tanggalSelesai)}
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                        {bk.lokasiTujuan}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-tabular">{bk.jumlahPeserta}</td>
                      <td className="py-3 px-4">
                        <BookingStatusLabel status={bk.status} compact />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Official Print Report Modal */}
      {showPrintPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 print:static print:bg-white print:p-0"
          role="dialog"
          aria-modal="true"
          aria-labelledby="official-report-title"
        >
          <div className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden print-container print:max-h-none">
            <div className="no-print flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 shrink-0">
              <div>
                <h3 id="official-report-title" className="text-base font-bold text-slate-900">
                  Pratinjau Cetak Laporan Resmi Periodik
                </h3>
                <p className="text-xs text-slate-500">{periodLabel}</p>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-900 rounded-lg hover:bg-blue-800"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak / Simpan PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPrintPreview(false)}
                  className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-200"
                  aria-label="Tutup pratinjau laporan"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 print:p-4 bg-white">
              <div className="max-w-3xl mx-auto space-y-6 text-slate-900">
                {/* Kop Surat Resmi */}
                <div className="border-b-4 border-double border-slate-900 pb-4 text-center space-y-0.5">
                  <p className="text-xs font-semibold tracking-wider uppercase text-slate-700">
                    PEMERINTAH KABUPATEN SIDOARJO
                  </p>
                  <h2 className="text-lg font-bold tracking-tight">
                    DINAS PENDIDIKAN DAN KEBUDAYAAN
                  </h2>
                  <p className="text-xs text-slate-600">
                    Jalan Pahlawan No. 4, Sidokumpul, Kec. Sidoarjo, Kabupaten Sidoarjo, Jawa Timur
                    61212
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Laman: disdikbud.sidoarjokab.go.id · Telepon: (031) 8921219
                  </p>
                </div>

                <div className="text-center space-y-1">
                  <h3 className="text-sm font-bold uppercase underline">
                    LAPORAN REKAPITULASI PEMINJAMAN ARMADA BUS PENDIDIKAN LUAR KELAS
                  </h3>
                  <p className="text-xs font-medium text-slate-700">Periode: {periodLabel}</p>
                </div>

                {/* Summary Boxes */}
                <div className="grid grid-cols-4 gap-3 text-center text-xs">
                  <div className="border border-slate-300 rounded p-2.5">
                    <p className="text-slate-600">Total Pengajuan</p>
                    <p className="text-lg font-bold tabular-nums">{summary.total}</p>
                  </div>
                  <div className="border border-slate-300 rounded p-2.5">
                    <p className="text-slate-600">Disetujui</p>
                    <p className="text-lg font-bold tabular-nums">{summary.disetujui}</p>
                  </div>
                  <div className="border border-slate-300 rounded p-2.5">
                    <p className="text-slate-600">Ditolak</p>
                    <p className="text-lg font-bold tabular-nums">{summary.ditolak}</p>
                  </div>
                  <div className="border border-slate-300 rounded p-2.5">
                    <p className="text-slate-600">Dalam Antrean</p>
                    <p className="text-lg font-bold tabular-nums">{summary.menunggu}</p>
                  </div>
                </div>

                {/* Rekap per Armada */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase text-slate-800">
                    A. Rekapitulasi Operasional Armada
                  </h4>
                  <table className="w-full text-[11px] border-collapse border border-slate-300">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="border border-slate-300 px-2.5 py-1.5 text-left">Armada</th>
                        <th className="border border-slate-300 px-2.5 py-1.5 text-left">Nopol</th>
                        <th className="border border-slate-300 px-2.5 py-1.5 text-right">
                          Trip Disetujui
                        </th>
                        <th className="border border-slate-300 px-2.5 py-1.5 text-right">
                          Hari Pakai
                        </th>
                        <th className="border border-slate-300 px-2.5 py-1.5 text-right">
                          Jam Pakai
                        </th>
                        <th className="border border-slate-300 px-2.5 py-1.5 text-right">
                          Peserta
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {busUsageSummary.map((r) => (
                        <tr key={r.bus.id}>
                          <td className="border border-slate-300 px-2.5 py-1.5 font-medium">
                            {r.bus.nama}
                          </td>
                          <td className="border border-slate-300 px-2.5 py-1.5 font-mono-tabular">
                            {r.bus.nopol}
                          </td>
                          <td className="border border-slate-300 px-2.5 py-1.5 text-right tabular-nums">
                            {r.tripCount}
                          </td>
                          <td className="border border-slate-300 px-2.5 py-1.5 text-right tabular-nums">
                            {r.hariPakai} hari
                          </td>
                          <td className="border border-slate-300 px-2.5 py-1.5 text-right tabular-nums">
                            {r.jamPakai} jam
                          </td>
                          <td className="border border-slate-300 px-2.5 py-1.5 text-right tabular-nums">
                            {r.totalPeserta} org
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Daftar Pengajuan */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase text-slate-800">
                    B. Daftar Riwayat Pengajuan Peminjaman
                  </h4>
                  <table className="w-full text-[11px] border-collapse border border-slate-300">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="border border-slate-300 px-2 py-1.5 text-left">Kode</th>
                        <th className="border border-slate-300 px-2 py-1.5 text-left">
                          Sekolah / Instansi
                        </th>
                        <th className="border border-slate-300 px-2 py-1.5 text-left">Armada</th>
                        <th className="border border-slate-300 px-2 py-1.5 text-left">Tanggal</th>
                        <th className="border border-slate-300 px-2 py-1.5 text-left">Tujuan</th>
                        <th className="border border-slate-300 px-2 py-1.5 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBookings.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="border border-slate-300 px-2 py-4 text-center text-slate-500"
                          >
                            Tidak ada catatan peminjaman pada periode ini.
                          </td>
                        </tr>
                      ) : (
                        filteredBookings.map((bk) => {
                          const bus = buses.find((b) => b.id === bk.busId);
                          return (
                            <tr key={bk.id}>
                              <td className="border border-slate-300 px-2 py-1.5 font-mono-tabular">
                                {bk.kodeBooking}
                              </td>
                              <td className="border border-slate-300 px-2 py-1.5 font-medium">
                                {bk.namaSekolah}
                              </td>
                              <td className="border border-slate-300 px-2 py-1.5">
                                {bus?.nama || bk.busId}
                              </td>
                              <td className="border border-slate-300 px-2 py-1.5 tabular-nums">
                                {formatRentangTanggal(bk.tanggalMulai, bk.tanggalSelesai)}
                              </td>
                              <td className="border border-slate-300 px-2 py-1.5">
                                {bk.lokasiTujuan}
                              </td>
                              <td className="border border-slate-300 px-2 py-1.5 font-medium">
                                {bk.status}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Signature */}
                <div className="pt-6 flex justify-end text-xs">
                  <div className="text-center w-64 space-y-1">
                    <p>Sidoarjo, {getTodayWIBFormatted()}</p>
                    <p className="font-semibold">
                      Kepala Subbagian Umum &amp; Kepegawaian
                    </p>
                    <p>Dinas Pendidikan dan Kebudayaan Kab. Sidoarjo</p>
                    <div className="h-14" />
                    <p className="font-bold underline">Pengelola Aset Daerah OPD</p>
                    <p className="text-slate-500">NIP. 19780412 200501 1 008</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
