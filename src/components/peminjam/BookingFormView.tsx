import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileText,
  Info,
  Send,
  Upload,
} from 'lucide-react';
import { Booking, Bus } from '../../types';
import {
  countDurationDays,
  findApprovedConflicts,
  formatRentangTanggal,
  generateBookingCode,
  getNowWIBDateTimeStr,
  getTodayWIBDateStr,
} from '../../utils/bookingUtils';

interface BookingFormViewProps {
  buses: Bus[];
  bookings: Booking[];
  prefillDate?: string;
  prefillBusId?: string;
  onSubmitBooking: (newBooking: Booking) => Promise<void>;
  onBackToCalendar: () => void;
}

export function BookingFormView({
  buses,
  bookings,
  prefillDate,
  prefillBusId,
  onSubmitBooking,
  onBackToCalendar,
}: BookingFormViewProps) {
  const defaultBusId =
    prefillBusId && buses.some((b) => b.id === prefillBusId)
      ? prefillBusId
      : buses.find((b) => b.status === 'Aktif')?.id || buses[0]?.id || '';
  const initialDate = prefillDate || getTodayWIBDateStr();

  const [namaSekolah, setNamaSekolah] = useState('');
  const [npsn, setNpsn] = useState('');
  const [picNama, setPicNama] = useState('');
  const [picWhatsapp, setPicWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [busId, setBusId] = useState(defaultBusId);
  const [tanggalMulai, setTanggalMulai] = useState(initialDate);
  const [tanggalSelesai, setTanggalSelesai] = useState(initialDate);
  const [lokasiTujuan, setLokasiTujuan] = useState('');
  const [tujuanKegiatan, setTujuanKegiatan] = useState('');
  const [jumlahPeserta, setJumlahPeserta] = useState<string>('35');
  const [namaFileProposal, setNamaFileProposal] = useState('');
  const [ukuranFileProposal, setUkuranFileProposal] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (prefillDate) {
      setTanggalMulai(prefillDate);
      setTanggalSelesai(prefillDate);
    }
  }, [prefillDate]);

  useEffect(() => {
    if (prefillBusId && buses.some((b) => b.id === prefillBusId)) {
      setBusId(prefillBusId);
    }
  }, [prefillBusId, buses]);

  useEffect(() => {
    if (buses.length > 0 && !buses.some((b) => b.id === busId)) {
      setBusId(buses.find((b) => b.status === 'Aktif')?.id || buses[0].id);
    }
  }, [buses, busId]);

  const selectedBus = buses.find((b) => b.id === busId);

  const invalidDateOrder = Boolean(tanggalMulai && tanggalSelesai && tanggalSelesai < tanggalMulai);

  // Conflict Detection against Disetujui bookings
  const approvedConflicts = useMemo(() => {
    if (invalidDateOrder) return [];
    return findApprovedConflicts(bookings, busId, tanggalMulai, tanggalSelesai);
  }, [bookings, busId, tanggalMulai, tanggalSelesai, invalidDateOrder]);

  // Informational overlap against Menunggu Verifikasi bookings
  const pendingOverlaps = useMemo(() => {
    if (invalidDateOrder || !busId || !tanggalMulai || !tanggalSelesai) return [];
    return bookings.filter(
      (b) =>
        b.busId === busId &&
        b.status === 'Menunggu Verifikasi' &&
        tanggalMulai <= b.tanggalSelesai &&
        tanggalSelesai >= b.tanggalMulai
    );
  }, [bookings, busId, tanggalMulai, tanggalSelesai, invalidDateOrder]);

  const isMaintenance = selectedBus?.status === 'Dalam Perawatan';
  const participantNum = parseInt(jumlahPeserta, 10) || 0;
  const exceedsCapacity = selectedBus ? participantNum > selectedBus.kapasitas : false;
  const isBlocked = approvedConflicts.length > 0 || isMaintenance || invalidDateOrder;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setFormError('Dokumen proposal wajib berformat PDF (.pdf).');
      return;
    }
    setFormError('');
    setNamaFileProposal(file.name);
    const sizeKb = Math.round(file.size / 1024);
    setUkuranFileProposal(
      sizeKb >= 1024 ? `${(sizeKb / 1024).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, sizeKb)} KB`
    );
  };

  const handleAttachSamplePdf = () => {
    const slug = (namaSekolah || 'Sekolah_Sidoarjo').trim().replace(/\s+/g, '_');
    setNamaFileProposal(`Proposal_Permohonan_Bus_${slug}.pdf`);
    setUkuranFileProposal('1,2 MB');
    setFormError('');
  };

  const handleAutofillDemo = () => {
    setNamaSekolah('SMPN 4 Sidoarjo');
    setNpsn('20501758');
    setPicNama('Drs. Eko Prasetyo, M.Pd.');
    setPicWhatsapp('081235678910');
    setEmail('kesiswaan@smpn4sidoarjo.sch.id');
    setLokasiTujuan('Museum Mpu Tantular Buduran & Candi Pari Porong');
    setTujuanKegiatan('Pembelajaran Luar Kelas Sejarah Lokal & Kearifan Budaya Sidoarjo (P5)');
    setJumlahPeserta(String(Math.min(40, selectedBus?.kapasitas || 35)));
    setNamaFileProposal('Proposal_P5_SMPN4_Sidoarjo.pdf');
    setUkuranFileProposal('1,4 MB');
    setFormError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (isBlocked) {
      setFormError(
        'Pengajuan diblokir karena terdapat bentrok jadwal Disetujui atau armada dalam perawatan.'
      );
      return;
    }

    if (
      !namaSekolah.trim() ||
      !npsn.trim() ||
      !picNama.trim() ||
      !picWhatsapp.trim() ||
      !email.trim() ||
      !lokasiTujuan.trim() ||
      !tujuanKegiatan.trim()
    ) {
      setFormError('Mohon lengkapi seluruh kolom formulir yang wajib diisi.');
      return;
    }

    if (participantNum < 1) {
      setFormError('Jumlah peserta harus lebih dari 0 orang.');
      return;
    }

    if (exceedsCapacity) {
      setFormError(
        `Jumlah peserta (${participantNum}) melebihi kapasitas ${selectedBus?.nama} (${selectedBus?.kapasitas} kursi).`
      );
      return;
    }

    if (!namaFileProposal) {
      setFormError('Mohon unggah file Proposal / Surat Permohonan dalam format PDF.');
      return;
    }

    const kodeBooking = generateBookingCode(bookings, tanggalMulai);
    const timestamp = getNowWIBDateTimeStr();

    const newBooking: Booking = {
      id: `bk-${Date.now()}`,
      kodeBooking,
      namaSekolah: namaSekolah.trim(),
      npsn: npsn.trim(),
      picNama: picNama.trim(),
      picWhatsapp: picWhatsapp.trim(),
      email: email.trim(),
      busId,
      tanggalMulai,
      tanggalSelesai,
      lokasiTujuan: lokasiTujuan.trim(),
      tujuanKegiatan: tujuanKegiatan.trim(),
      jumlahPeserta: participantNum,
      namaFileProposal,
      ukuranFileProposal: ukuranFileProposal || '1,1 MB',
      status: 'Menunggu Verifikasi',
      createdAt: timestamp,
    };

    setSubmitting(true);
    try {
      await onSubmitBooking(newBooking);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Gagal mengirim pengajuan ke server. Silakan coba lagi.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={onBackToCalendar}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-blue-900 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Kalender Ketersediaan</span>
          </button>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Formulir Pengajuan Peminjaman Bus
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Sistem otomatis melakukan validasi bentrok jadwal sebelum pengajuan dikirim ke Pengelola
            Aset Disdikbud.
          </p>
        </div>
        <button
          type="button"
          onClick={handleAutofillDemo}
          className="px-3.5 py-2 text-xs font-medium text-blue-900 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors self-start whitespace-nowrap"
        >
          Isi Contoh Data Sekolah
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6"
      >
        {/* Conflict / Maintenance Alerts */}
        {isMaintenance && (
          <div
            role="alert"
            className="p-4 rounded-lg bg-rose-50 border border-rose-300 text-rose-900 flex items-start gap-3"
          >
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold text-sm">Armada Tidak Tersedia (Dalam Perawatan)</p>
              <p>
                {selectedBus?.nama} ({selectedBus?.nopol}) saat ini berstatus{' '}
                <strong>Dalam Perawatan</strong>. Silakan pilih armada bus lain yang berstatus Aktif.
              </p>
            </div>
          </div>
        )}

        {approvedConflicts.length > 0 && (
          <div
            role="alert"
            className="p-4 rounded-lg bg-rose-50 border border-rose-300 text-rose-900 flex items-start gap-3"
          >
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold text-sm">
                Peringatan Tegas: Jadwal Bentrok dengan Peminjaman Disetujui
              </p>
              <p>
                {selectedBus?.nama} sudah resmi terbooking dan <strong>Disetujui</strong> untuk{' '}
                <strong>{approvedConflicts[0].namaSekolah}</strong> (
                {approvedConflicts[0].kodeBooking}) pada tanggal{' '}
                <strong className="tabular-nums">
                  {formatRentangTanggal(
                    approvedConflicts[0].tanggalMulai,
                    approvedConflicts[0].tanggalSelesai
                  )}
                </strong>
                . Pengiriman formulir diblokir—silakan pilih tanggal atau armada bus lain.
              </p>
            </div>
          </div>
        )}

        {!isBlocked && pendingOverlaps.length > 0 && (
          <div className="p-4 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-semibold">Informasi Antrean Pengajuan</p>
              <p>
                Terdapat {pendingOverlaps.length} pengajuan lain yang masih{' '}
                <strong>Menunggu Verifikasi</strong> pada tanggal tersebut (
                {pendingOverlaps.map((p) => p.namaSekolah).join(', ')}). Anda tetap dapat mengirim
                pengajuan untuk dipertimbangkan oleh Verifikator.
              </p>
            </div>
          </div>
        )}

        {!isBlocked && tanggalMulai && tanggalSelesai && selectedBus && (
          <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-2.5 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Jadwal{' '}
              <strong className="tabular-nums">
                {formatRentangTanggal(tanggalMulai, tanggalSelesai)}
              </strong>{' '}
              ({countDurationDays(tanggalMulai, tanggalSelesai)} hari) pada{' '}
              <strong>{selectedBus.nama}</strong> bebas bentrok jadwal disetujui.
            </span>
          </div>
        )}

        {/* Section 1: Data Sekolah & PIC */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-2">
            1. Identitas Sekolah &amp; Penanggung Jawab (PIC)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-1">
              <label
                htmlFor="nama-sekolah"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Nama Sekolah / Instansi Pendidikan *
              </label>
              <input
                id="nama-sekolah"
                type="text"
                required
                placeholder="Contoh: SMPN 1 Sidoarjo"
                value={namaSekolah}
                onChange={(e) => setNamaSekolah(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
              />
            </div>

            <div>
              <label htmlFor="npsn" className="block text-xs font-semibold text-slate-700 mb-1.5">
                NPSN / Kode Instansi *
              </label>
              <input
                id="npsn"
                type="text"
                required
                placeholder="Contoh: 20501742"
                value={npsn}
                onChange={(e) => setNpsn(e.target.value)}
                className="w-full px-3.5 py-2 text-sm font-mono-tabular border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
              />
            </div>

            <div>
              <label
                htmlFor="pic-nama"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Nama Penanggung Jawab (PIC) *
              </label>
              <input
                id="pic-nama"
                type="text"
                required
                placeholder="Nama lengkap beserta gelar"
                value={picNama}
                onChange={(e) => setPicNama(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
              />
            </div>

            <div>
              <label
                htmlFor="pic-wa"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Nomor WhatsApp Aktif *
              </label>
              <input
                id="pic-wa"
                type="tel"
                required
                placeholder="Contoh: 081234567890"
                value={picWhatsapp}
                onChange={(e) => setPicWhatsapp(e.target.value)}
                className="w-full px-3.5 py-2 text-sm font-mono-tabular border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="email-pic" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Email Aktif (Untuk Notifikasi Persetujuan / Penolakan) *
              </label>
              <input
                id="email-pic"
                type="email"
                required
                placeholder="humas@sekolah.sch.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Armada & Jadwal */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-2">
            2. Pilihan Armada Bus &amp; Jadwal Pemakaian
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="pilih-bus" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Pilihan Armada Bus *
              </label>
              <select
                id="pilih-bus"
                value={busId}
                onChange={(e) => setBusId(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
              >
                {buses.map((bus) => (
                  <option key={bus.id} value={bus.id}>
                    {bus.nama} — Nopol {bus.nopol} (Kapasitas {bus.kapasitas} Kursi · {bus.status})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="tgl-mulai"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Tanggal Mulai Pemakaian *
              </label>
              <input
                id="tgl-mulai"
                type="date"
                required
                value={tanggalMulai}
                onChange={(e) => {
                  setTanggalMulai(e.target.value);
                  if (e.target.value > tanggalSelesai) {
                    setTanggalSelesai(e.target.value);
                  }
                }}
                className="w-full px-3.5 py-2 text-sm font-mono-tabular border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
              />
            </div>

            <div>
              <label
                htmlFor="tgl-selesai"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Tanggal Selesai Pemakaian *
              </label>
              <input
                id="tgl-selesai"
                type="date"
                required
                min={tanggalMulai}
                value={tanggalSelesai}
                onChange={(e) => setTanggalSelesai(e.target.value)}
                className="w-full px-3.5 py-2 text-sm font-mono-tabular border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
              />
              {invalidDateOrder && (
                <p className="text-xs text-rose-600 mt-1">
                  Tanggal selesai tidak boleh lebih awal dari tanggal mulai.
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="jumlah-peserta"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Jumlah Peserta (Siswa &amp; Guru Pendamping) *
              </label>
              <input
                id="jumlah-peserta"
                type="number"
                min={1}
                max={60}
                required
                value={jumlahPeserta}
                onChange={(e) => setJumlahPeserta(e.target.value)}
                className={`w-full px-3.5 py-2 text-sm font-mono-tabular border rounded-lg focus:outline-none focus:ring-2 ${
                  exceedsCapacity
                    ? 'border-rose-400 focus:ring-rose-500/20 focus:border-rose-600'
                    : 'border-slate-300 focus:ring-blue-900/20 focus:border-blue-900'
                }`}
              />
              {selectedBus && (
                <p
                  className={`text-xs mt-1 ${
                    exceedsCapacity ? 'text-rose-600 font-medium' : 'text-slate-500'
                  }`}
                >
                  Kapasitas maksimal {selectedBus.nama}: {selectedBus.kapasitas} kursi.
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="lokasi-tujuan"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Lokasi Tujuan Kunjungan *
              </label>
              <input
                id="lokasi-tujuan"
                type="text"
                required
                placeholder="Contoh: Museum Mpu Tantular Buduran"
                value={lokasiTujuan}
                onChange={(e) => setLokasiTujuan(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
              />
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="tujuan-kegiatan"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Deskripsi &amp; Tujuan Kegiatan Luar Kelas *
              </label>
              <textarea
                id="tujuan-kegiatan"
                rows={3}
                required
                placeholder="Jelaskan relevansi pembelajaran luar kelas / program P5 / observasi siswa..."
                value={tujuanKegiatan}
                onChange={(e) => setTujuanKegiatan(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Upload Proposal PDF */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-2">
            3. Unggah Proposal / Surat Permohonan Resmi (PDF)
          </h2>

          <div className="border-2 border-dashed border-slate-300 rounded-xl p-5 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-900/10 text-blue-900 flex items-center justify-center shrink-0">
                {namaFileProposal ? <FileText className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
              </div>
              <div className="text-xs space-y-1">
                {namaFileProposal ? (
                  <>
                    <p className="font-semibold text-slate-900 font-mono-tabular">
                      {namaFileProposal}
                    </p>
                    <p className="text-emerald-700 font-medium">
                      Berkas PDF siap dikirim · Ukuran {ukuranFileProposal}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-slate-800">
                      Pilih berkas Surat Permohonan / Proposal Kegiatan (.pdf)
                    </p>
                    <p className="text-slate-500">
                      Memuat kop surat sekolah, tanda tangan Kepala Sekolah, dan daftar peserta.
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <label className="cursor-pointer px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors">
                <span>{namaFileProposal ? 'Ganti PDF' : 'Pilih File PDF'}</span>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileChange}
                  className="sr-only"
                />
              </label>
              <button
                type="button"
                onClick={handleAttachSamplePdf}
                className="px-3 py-2 text-xs font-medium text-sky-700 bg-sky-50 border border-sky-200 rounded-lg hover:bg-sky-100 transition-colors"
              >
                Lampirkan PDF Contoh
              </button>
            </div>
          </div>
        </div>

        {formError && (
          <div
            role="alert"
            className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs font-medium text-rose-800"
          >
            {formError}
          </div>
        )}

        <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            * Wajib diisi sesuai pedoman peminjaman aset Dinas Pendidikan Kab. Sidoarjo.
          </p>
          <button
            type="submit"
            disabled={isBlocked || submitting}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-blue-900 rounded-lg hover:bg-blue-800 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
            <span>{submitting ? 'Menyimpan Pengajuan...' : 'Kirim Pengajuan Peminjaman'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
