import { Printer, ShieldCheck, X } from 'lucide-react';
import { Booking, Bus } from '../types';
import { countDurationDays, formatRentangTanggal, getTodayWIBDateStr } from '../utils/bookingUtils';

interface PermitPrintModalProps {
  booking: Booking | null;
  bus: Bus | undefined;
  onClose: () => void;
}

export function PermitPrintModal({ booking, bus, onClose }: PermitPrintModalProps) {
  if (!booking) return null;

  const durasi = countDurationDays(booking.tanggalMulai, booking.tanggalSelesai);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 print:static print:bg-white print:p-0"
      role="dialog"
      aria-modal="true"
      aria-labelledby="permit-print-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden print-container print:max-h-none">
        <div className="no-print flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 shrink-0">
          <div>
            <h3 id="permit-print-title" className="text-base font-semibold text-slate-900">
              Bukti Izin Pemakaian Bus Dinas
            </h3>
            <p className="text-xs text-slate-500 font-mono-tabular">
              Kode Booking: {booking.kodeBooking}
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-900 rounded-lg hover:bg-blue-800 transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Simpan PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors"
              aria-label="Tutup surat izin"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 print:p-6 bg-white">
          <div className="max-w-2xl mx-auto text-slate-900 space-y-6">
            {/* Kop Surat Resmi */}
            <div className="border-b-4 border-double border-slate-900 pb-4 text-center space-y-0.5">
              <p className="text-xs font-semibold tracking-wider uppercase text-slate-700">
                PEMERINTAH KABUPATEN SIDOARJO
              </p>
              <h2 className="text-lg font-bold tracking-tight text-slate-900">
                DINAS PENDIDIKAN DAN KEBUDAYAAN
              </h2>
              <p className="text-xs text-slate-600">
                Jalan Pahlawan No. 4, Sidokumpul, Kec. Sidoarjo, Kabupaten Sidoarjo, Jawa Timur 61212
              </p>
              <p className="text-[11px] text-slate-500">
                Laman: disdikbud.sidoarjokab.go.id · Surel: disdikbud@sidoarjokab.go.id
              </p>
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold underline uppercase tracking-wide">
                SURAT IZIN PEMAKAIAN ARMADA BUS PENDIDIKAN
              </h3>
              <p className="text-xs font-mono-tabular text-slate-600">
                Nomor Registrasi: 024 / SIMBUS / {booking.kodeBooking}
              </p>
            </div>

            <p className="text-sm leading-relaxed text-slate-800 text-justify">
              Berdasarkan hasil verifikasi dokumen permohonan dan ketersediaan jadwal armada pada
              Sistem Informasi Peminjaman Bus Luar Kelas (SIMBUS), Pengelola Aset Dinas Pendidikan
              dan Kebudayaan Kabupaten Sidoarjo memberikan izin pemakaian kendaraan dinas kepada:
            </p>

            <div className="border border-slate-300 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="px-4 py-2.5 bg-slate-50 text-slate-600 w-52 font-medium">
                      Kode Booking Resmi
                    </td>
                    <td className="px-4 py-2.5 font-mono-tabular font-semibold text-blue-900">
                      {booking.kodeBooking}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 bg-slate-50 text-slate-600 font-medium">
                      Sekolah / Instansi Peminjam
                    </td>
                    <td className="px-4 py-2.5 font-semibold text-slate-900">
                      {booking.namaSekolah} (NPSN: {booking.npsn})
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 bg-slate-50 text-slate-600 font-medium">
                      Penanggung Jawab (PIC)
                    </td>
                    <td className="px-4 py-2.5 text-slate-900">
                      {booking.picNama} · WA {booking.picWhatsapp}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 bg-slate-50 text-slate-600 font-medium">
                      Armada Bus & Nopol
                    </td>
                    <td className="px-4 py-2.5 font-semibold text-slate-900">
                      {bus ? `${bus.nama} — Nopol ${bus.nopol} (${bus.kapasitas} Kursi)` : booking.busId}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 bg-slate-50 text-slate-600 font-medium">
                      Pengemudi Bertugas
                    </td>
                    <td className="px-4 py-2.5 text-slate-900">
                      {bus ? `${bus.sopir} (${bus.teleponSopir})` : '-'}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 bg-slate-50 text-slate-600 font-medium">
                      Tanggal Pemakaian
                    </td>
                    <td className="px-4 py-2.5 font-semibold text-slate-900 tabular-nums">
                      {formatRentangTanggal(booking.tanggalMulai, booking.tanggalSelesai)} ({durasi} Hari)
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 bg-slate-50 text-slate-600 font-medium">
                      Lokasi & Tujuan Kegiatan
                    </td>
                    <td className="px-4 py-2.5 text-slate-900">
                      <span className="font-medium block">{booking.lokasiTujuan}</span>
                      <span className="text-xs text-slate-600">{booking.tujuanKegiatan}</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 bg-slate-50 text-slate-600 font-medium">
                      Jumlah Rombongan
                    </td>
                    <td className="px-4 py-2.5 text-slate-900 tabular-nums">
                      {booking.jumlahPeserta} Peserta (Siswa & Pendamping)
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs text-slate-700 space-y-1">
              <p className="font-semibold text-slate-900">Ketentuan Penggunaan Armada:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>
                  Peminjam wajib berkoordinasi dengan pengemudi minimal H-1 sebelum keberangkatan.
                </li>
                <li>
                  Surat izin ini wajib ditunjukkan kepada petugas pengamanan/pengemudi saat serah
                  terima armada.
                </li>
                <li>
                  Peminjam bertanggung jawab penuh atas ketertiban dan kebersihan kabin bus selama
                  kegiatan berlangsung.
                </li>
              </ol>
            </div>

            <div className="flex items-end justify-between pt-4">
              <div className="flex items-center gap-2.5 border border-emerald-300 bg-emerald-50 rounded-lg px-3.5 py-2.5 text-xs text-emerald-900">
                <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
                <div>
                  <p className="font-semibold">TERVERIFIKASI ELEKTRONIK</p>
                  <p className="font-mono-tabular text-[11px] text-emerald-700">
                    Disetujui: {booking.verifiedAt || getTodayWIBDateStr()}
                  </p>
                </div>
              </div>

              <div className="text-center text-xs w-60 space-y-1">
                <p>
                  Sidoarjo,{' '}
                  {booking.verifiedAt ? booking.verifiedAt.split(' ')[0] : getTodayWIBDateStr()}
                </p>
                <p className="font-semibold">a.n. Kepala Dinas Pendidikan dan Kebudayaan</p>
                <p>Pengelola Aset Armada Pendidikan</p>
                <div className="h-12" />
                <p className="font-bold underline">Subbag Umum & Kepegawaian</p>
                <p className="text-slate-500">Dinas Pendidikan & Kebudayaan Kab. Sidoarjo</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
