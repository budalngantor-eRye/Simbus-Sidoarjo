import { ArrowRight, Bus as BusIcon, CalendarCheck, FileSearch, ShieldCheck, Users } from 'lucide-react';
import { HERO_BANNER_IMAGE } from '../../data/mockData';
import { Booking, Bus } from '../../types';
import { getTodayWIBDateStr, getWIBDateParts } from '../../utils/bookingUtils';
import { CalendarAvailability } from '../CalendarAvailability';
import { BusStatusLabel } from '../StatusBadge';

interface PeminjamHomeViewProps {
  buses: Bus[];
  bookings: Booking[];
  onStartBooking: (prefillDate?: string, prefillBusId?: string) => void;
  onGoToTracking: () => void;
}

export function PeminjamHomeView({
  buses,
  bookings,
  onStartBooking,
  onGoToTracking,
}: PeminjamHomeViewProps) {
  const todayWib = getTodayWIBDateStr();
  const currentYear = getWIBDateParts().year;
  const activeBusesCount = buses.filter((b) => b.status === 'Aktif').length;
  const approvedCount = bookings.filter((b) => b.status === 'Disetujui').length;

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch">
        <div className="lg:col-span-6 p-6 sm:p-8 lg:p-10 flex flex-col justify-between gap-6">
          <div className="space-y-4">
            <div className="text-xs font-semibold text-sky-700 tracking-wide">
              Layanan Publik SPBE · Dinas Pendidikan dan Kebudayaan Kabupaten Sidoarjo
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight leading-tight [text-wrap:balance]">
              Peminjaman Bus Luar Kelas Resmi &amp; Terjadwal Online
            </h1>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl">
              Sekolah dan satuan pendidikan di Kabupaten Sidoarjo dapat memeriksa jadwal kosong
              armada bus dinas, mengunggah proposal kegiatan secara daring, dan memantau status
              verifikasi tanpa harus datang langsung ke kantor dinas.
            </p>
          </div>

          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onStartBooking(todayWib, buses.find((b) => b.status === 'Aktif')?.id)}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-900 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap"
              >
                <span>Ajukan Peminjaman Bus</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onGoToTracking}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-blue-900 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
              >
                <FileSearch className="w-4 h-4" />
                <span>Lacak Kode Booking</span>
              </button>
            </div>

            <div className="pt-4 border-t border-slate-200 grid grid-cols-3 gap-4 text-xs">
              <div>
                <p className="text-slate-500">Armada Siap Pakai</p>
                <p className="text-lg font-bold text-slate-900 tabular-nums mt-0.5">
                  {activeBusesCount} Unit
                </p>
              </div>
              <div>
                <p className="text-slate-500">Izin Terbit {currentYear}</p>
                <p className="text-lg font-bold text-slate-900 tabular-nums mt-0.5">
                  {approvedCount} Perjalanan
                </p>
              </div>
              <div>
                <p className="text-slate-500">Biaya Retribusi</p>
                <p className="text-lg font-bold text-emerald-700 mt-0.5">Gratis (Dinas)</p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-6 relative min-h-[260px] lg:min-h-[380px] bg-slate-100">
          <img
            src={HERO_BANNER_IMAGE}
            alt="Siswa sekolah di Kabupaten Sidoarjo bersiap menaiki bus pendidikan luar kelas di Museum Mpu Tantular"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/85 via-slate-950/40 to-transparent p-5 text-white">
            <p className="text-xs font-medium text-sky-200">
              Kegiatan Pembelajaran Kontekstual Luar Kelas
            </p>
            <p className="text-sm font-semibold mt-0.5">
              Fasilitas Transportasi Gratis bagi SD / SMP Negeri &amp; Swasta Kab. Sidoarjo
            </p>
          </div>
        </div>
      </section>

      {/* 3-Step Flow Strip */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-blue-900 font-semibold text-sm">
            <CalendarCheck className="w-4 h-4 shrink-0" />
            <span>01. Cek Jadwal Real-Time</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Lihat tanggal hijau yang masih kosong pada kalender ketersediaan dan klik tanggal untuk
            mengunci usulan jadwal sekolah Anda.
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-blue-900 font-semibold text-sm">
            <BusIcon className="w-4 h-4 shrink-0" />
            <span>02. Unggah Proposal PDF</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Lengkapi formulir daring beserta surat permohonan resmi sekolah dalam format PDF. Sistem
            otomatis mendeteksi bentrok jadwal.
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-blue-900 font-semibold text-sm">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>03. Unduh Surat Izin</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Pantau verifikasi menggunakan Kode Booking dan cetak Bukti Izin Pemakaian Bus resmi
            setelah pengajuan disetujui pengelola aset.
          </p>
        </div>
      </section>

      {/* Interactive Real-time Calendar */}
      <section id="kalender-ketersediaan">
        <CalendarAvailability
          buses={buses}
          bookings={bookings}
          mode="peminjam"
          onSelectAvailableDate={(dateStr, busId) => onStartBooking(dateStr, busId)}
        />
      </section>

      {/* Fleet Showcase */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Daftar Armada Bus Dinas Pendidikan Sidoarjo
            </h2>
            <p className="text-xs text-slate-500">
              Informasi spesifikasi kapasitas tempat duduk dan status kesiapan unit armada
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {buses.map((bus) => (
            <div
              key={bus.id}
              className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col justify-between"
            >
              <div>
                <div className="aspect-video bg-slate-100 relative overflow-hidden">
                  <img
                    src={bus.fotoUrl}
                    alt={`${bus.nama} (${bus.nopol})`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{bus.nama}</h3>
                      <p className="text-xs font-mono-tabular text-slate-500 mt-0.5">
                        Nopol {bus.nopol} · Tahun {bus.tahun}
                      </p>
                    </div>
                    <BusStatusLabel status={bus.status} />
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">{bus.keterangan}</p>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-700">
                    <span className="inline-flex items-center gap-1.5 font-medium tabular-nums">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      Kapasitas {bus.kapasitas} Kursi
                    </span>
                    <span className="text-slate-500 truncate max-w-[160px]">{bus.sopir}</span>
                  </div>
                </div>
              </div>

              <div className="px-5 pb-5">
                <button
                  type="button"
                  disabled={bus.status !== 'Aktif'}
                  onClick={() => onStartBooking(todayWib, bus.id)}
                  className="w-full px-4 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed text-blue-900 bg-blue-50/60 border-blue-200 hover:bg-blue-100"
                >
                  {bus.status === 'Aktif' ? 'Pilih Armada Ini untuk Booking' : 'Sedang Perawatan'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
