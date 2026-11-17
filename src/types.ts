export type UserRole = 'peminjam' | 'admin';

export type PeminjamTab = 'beranda' | 'ajukan' | 'lacak';

export type AdminTab = 'dashboard' | 'verifikasi' | 'kalender' | 'armada' | 'laporan' | 'pengaturan';

export type AdminPermissionKey =
  | 'dashboard'
  | 'verifikasi'
  | 'kalender'
  | 'armada'
  | 'laporan'
  | 'pengaturan';

export interface PicAdminUser {
  id: string;
  nama: string;
  nip: string;
  jabatan: string;
  email: string;
  username: string;
  password?: string;
  peran: 'Super Admin' | 'Verifikator Proposal' | 'Pengelola Armada';
  hakAkses: AdminPermissionKey[];
  aktif: boolean;
  createdAt: string;
}

export type BusStatus = 'Aktif' | 'Dalam Perawatan';

export type BookingStatus = 'Menunggu Verifikasi' | 'Disetujui' | 'Ditolak';

export interface Bus {
  id: string;
  nama: string;
  nopol: string;
  kapasitas: number;
  sopir: string;
  teleponSopir: string;
  tahun: number;
  status: BusStatus;
  fotoUrl: string;
  keterangan?: string;
}

export interface Booking {
  id: string;
  kodeBooking: string;
  namaSekolah: string;
  npsn: string;
  picNama: string;
  picWhatsapp: string;
  email: string;
  busId: string;
  tanggalMulai: string; // YYYY-MM-DD
  tanggalSelesai: string; // YYYY-MM-DD
  tujuanKegiatan: string;
  lokasiTujuan: string;
  jumlahPeserta: number;
  namaFileProposal: string;
  ukuranFileProposal: string;
  status: BookingStatus;
  alasanPenolakan?: string;
  createdAt: string; // ISO or YYYY-MM-DD HH:mm
  verifiedAt?: string;
  verifikator?: string;
}

export interface EmailSimulation {
  id: string;
  to: string;
  subject: string;
  body: string;
  timestamp: string;
  type: 'submitted' | 'approved' | 'rejected';
  kodeBooking: string;
}
