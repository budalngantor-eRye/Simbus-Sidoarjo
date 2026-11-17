import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Bell,
  Bus as BusIcon,
  Calendar,
  CheckSquare,
  Clock,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  RefreshCw,
  Settings,
  Shield,
  UserCheck,
  X,
} from 'lucide-react';
import { CalendarAvailability } from './components/CalendarAvailability';
import { EmailSimulationModal } from './components/EmailSimulationModal';
import { ProposalPreviewModal } from './components/ProposalPreviewModal';
import { AdminDashboardView } from './components/admin/AdminDashboardView';
import { AdminLoginModal } from './components/admin/AdminLoginModal';
import { AdminSettingsView } from './components/admin/AdminSettingsView';
import { FleetManagementView } from './components/admin/FleetManagementView';
import { ReportsView } from './components/admin/ReportsView';
import { VerificationQueueView } from './components/admin/VerificationQueueView';
import { BookingFormView } from './components/peminjam/BookingFormView';
import { PeminjamHomeView } from './components/peminjam/PeminjamHomeView';
import { TrackingView } from './components/peminjam/TrackingView';
import {
  createBookingRealtime,
  deleteBusRealtime,
  ensureFirebaseSeeded,
  saveBusRealtime,
  subscribePicUsersRealtime,
  subscribePublicSimbusRealtime,
  updateBookingStatusRealtime,
} from './services/simbusFirebase';
import {
  AdminTab,
  Booking,
  Bus,
  EmailSimulation,
  PeminjamTab,
  PicAdminUser,
  UserRole,
} from './types';
import {
  findAllOverlappingBookings,
  formatRentangTanggal,
  getNowWIBDateTimeStr,
  getTodayWIBDateStr,
  getWIBDateParts,
} from './utils/bookingUtils';

const INACTIVITY_LIMIT_MS = 10 * 60 * 1000; // 10 menit
const ADMIN_SESSION_STORAGE_KEY = 'simbus_admin_session_v1';

interface StoredAdminSession {
  user: PicAdminUser;
  token: string;
  lastActivityAt: number;
}

function loadValidAdminSession(): StoredAdminSession | null {
  try {
    const raw = localStorage.getItem(ADMIN_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredAdminSession>;
    if (!parsed?.user || !parsed?.token || !parsed?.lastActivityAt) {
      localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
      return null;
    }
    if (Date.now() - parsed.lastActivityAt >= INACTIVITY_LIMIT_MS) {
      localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
      return null;
    }
    return {
      user: {
        ...parsed.user,
        hakAkses: Array.isArray(parsed.user.hakAkses) ? parsed.user.hakAkses : [],
      },
      token: parsed.token,
      lastActivityAt: parsed.lastActivityAt,
    };
  } catch {
    return null;
  }
}

function formatCountdown(seconds: number): string {
  const clamped = Math.max(0, Math.floor(seconds));
  const m = Math.floor(clamped / 60);
  const s = clamped % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function App() {
  const initialSession = useMemo(() => loadValidAdminSession(), []);

  const [role, setRole] = useState<UserRole>('peminjam');
  const [peminjamTab, setPeminjamTab] = useState<PeminjamTab>('beranda');
  const [adminTab, setAdminTab] = useState<AdminTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [buses, setBuses] = useState<Bus[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [picUsers, setPicUsers] = useState<PicAdminUser[]>([]);
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [firebaseError, setFirebaseError] = useState('');
  const [syncRetryNonce, setSyncRetryNonce] = useState(0);

  const [currentAdminUser, setCurrentAdminUser] = useState<PicAdminUser | null>(
    initialSession?.user || null
  );
  const [adminToken, setAdminToken] = useState<string | null>(initialSession?.token || null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [sessionNotice, setSessionNotice] = useState('');
  const [remainingIdleSeconds, setRemainingIdleSeconds] = useState<number>(600);
  const [actionAlert, setActionAlert] = useState<string>('');

  const lastActivityAtRef = useRef<number>(initialSession?.lastActivityAt || Date.now());
  const lastStorageWriteRef = useRef<number>(0);

  // Pre-fill state when clicking available calendar date
  const [prefillDate, setPrefillDate] = useState<string>(() => getTodayWIBDateStr());
  const [prefillBusId, setPrefillBusId] = useState<string>('BUS-01');
  const [trackingCode, setTrackingCode] = useState<string>('');

  // Modals
  const [previewBooking, setPreviewBooking] = useState<Booking | null>(null);
  const [emailModal, setEmailModal] = useState<EmailSimulation | null>(null);
  const [rejectFromPreviewTarget, setRejectFromPreviewTarget] = useState<Booking | null>(null);
  const [rejectReasonInput, setRejectReasonInput] = useState('');
  const [rejectReasonError, setRejectReasonError] = useState('');
  const [rejectingFromPreview, setRejectingFromPreview] = useState(false);

  // Real-time Firebase Realtime Database Sync (Public data: buses & bookings)
  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | null = null;
    let busesLoaded = false;
    let bookingsLoaded = false;

    const checkReady = () => {
      if (active && busesLoaded && bookingsLoaded) {
        setFirebaseReady(true);
      }
    };

    const startSync = async () => {
      setFirebaseError('');
      try {
        await ensureFirebaseSeeded();
        if (!active) return;

        unsubscribe = subscribePublicSimbusRealtime({
          onBuses: (list) => {
            if (!active) return;
            setBuses(list);
            busesLoaded = true;
            checkReady();
          },
          onBookings: (list) => {
            if (!active) return;
            setBookings(list);
            setTrackingCode((prev) => prev || list[0]?.kodeBooking || '');
            bookingsLoaded = true;
            checkReady();
          },
          onError: (err) => {
            if (!active) return;
            setFirebaseError(
              `Koneksi real-time Firebase terganggu: ${err.message}. Pastikan aturan Realtime Database aktif.`
            );
          },
        });
      } catch (err) {
        if (!active) return;
        const msg = err instanceof Error ? err.message : 'Gagal terhubung ke Firebase.';
        setFirebaseError(
          `Tidak dapat memuat data dari Firebase Realtime Database: ${msg}`
        );
      }
    };

    startSync();

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [syncRetryNonce]);

  // Real-time PIC Users Sync — subscribed ONLY when authenticated as admin
  const currentAdminId = currentAdminUser?.id || null;
  useEffect(() => {
    if (!currentAdminId || !adminToken) {
      setPicUsers([]);
      return;
    }

    let active = true;
    const unsubscribe = subscribePicUsersRealtime({
      onPicUsers: (list) => {
        if (!active) return;
        setPicUsers(list);
        const fresh = list.find((u) => u.id === currentAdminId);
        if (!fresh || !fresh.aktif) {
          localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
          setCurrentAdminUser(null);
          setAdminToken(null);
          setSessionNotice(
            'Akun pengelola Anda dinonaktifkan atau dihapus. Silakan hubungi Super Admin.'
          );
          setRole((prevRole) => {
            if (prevRole === 'admin') {
              setLoginModalOpen(true);
            }
            return 'peminjam';
          });
          return;
        }

        setCurrentAdminUser(fresh);
        setAdminTab((prevTab) =>
          fresh.hakAkses.includes(prevTab) ? prevTab : fresh.hakAkses[0] || 'dashboard'
        );
        try {
          localStorage.setItem(
            ADMIN_SESSION_STORAGE_KEY,
            JSON.stringify({
              user: fresh,
              token: adminToken,
              lastActivityAt: lastActivityAtRef.current,
            })
          );
        } catch {
          // Ignore storage errors
        }
      },
      onError: (err) => {
        if (!active) return;
        setActionAlert(`Sinkronisasi data PIC terganggu: ${err.message}`);
      },
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [currentAdminId, adminToken, syncRetryNonce]);

  const handleRetrySync = useCallback(() => {
    setFirebaseReady(false);
    setFirebaseError('');
    setSyncRetryNonce((n) => n + 1);
  }, []);

  // 10-Minute Inactivity Auto-Logout Timer for Pengelola Aset OPD
  useEffect(() => {
    if (!currentAdminUser || !adminToken) return;

    const recordActivity = () => {
      const now = Date.now();
      lastActivityAtRef.current = now;
      if (now - lastStorageWriteRef.current > 2000) {
        lastStorageWriteRef.current = now;
        try {
          localStorage.setItem(
            ADMIN_SESSION_STORAGE_KEY,
            JSON.stringify({ user: currentAdminUser, token: adminToken, lastActivityAt: now })
          );
        } catch {
          // Ignore storage quota errors
        }
      }
    };

    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    activityEvents.forEach((evt) => window.addEventListener(evt, recordActivity, { passive: true }));

    const interval = setInterval(() => {
      const elapsed = Date.now() - lastActivityAtRef.current;
      const remaining = Math.max(0, Math.ceil((INACTIVITY_LIMIT_MS - elapsed) / 1000));
      setRemainingIdleSeconds(remaining);

      if (elapsed >= INACTIVITY_LIMIT_MS) {
        localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
        setCurrentAdminUser(null);
        setAdminToken(null);
        setSessionNotice(
          'Sesi pengelola berakhir otomatis karena tidak ada aktivitas selama 10 menit. Silakan login kembali.'
        );
        if (role === 'admin') {
          setRole('peminjam');
          setLoginModalOpen(true);
        }
      }
    }, 1000);

    return () => {
      activityEvents.forEach((evt) => window.removeEventListener(evt, recordActivity));
      clearInterval(interval);
    };
  }, [currentAdminUser, adminToken, role]);

  const pendingCount = useMemo(
    () => bookings.filter((b) => b.status === 'Menunggu Verifikasi').length,
    [bookings]
  );

  const handleRequestAdminRole = () => {
    setMobileMenuOpen(false);
    if (currentAdminUser && adminToken) {
      const elapsed = Date.now() - lastActivityAtRef.current;
      if (elapsed >= INACTIVITY_LIMIT_MS) {
        localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
        setCurrentAdminUser(null);
        setAdminToken(null);
        setSessionNotice(
          'Sesi pengelola berakhir otomatis karena tidak ada aktivitas selama 10 menit. Silakan login kembali.'
        );
        setLoginModalOpen(true);
        return;
      }
      const perms = Array.isArray(currentAdminUser.hakAkses) ? currentAdminUser.hakAkses : [];
      setRole('admin');
      if (!perms.includes(adminTab)) {
        setAdminTab(perms[0] || 'dashboard');
      }
    } else {
      setSessionNotice('');
      setLoginModalOpen(true);
    }
  };

  const handleAdminLoginSuccess = (user: PicAdminUser, token: string) => {
    const normalizedUser: PicAdminUser = {
      ...user,
      hakAkses: Array.isArray(user.hakAkses) ? user.hakAkses : [],
    };
    const now = Date.now();
    lastActivityAtRef.current = now;
    setRemainingIdleSeconds(600);
    try {
      localStorage.setItem(
        ADMIN_SESSION_STORAGE_KEY,
        JSON.stringify({ user: normalizedUser, token, lastActivityAt: now })
      );
    } catch {
      // Ignore storage quota errors
    }
    setCurrentAdminUser(normalizedUser);
    setAdminToken(token);
    setSessionNotice('');
    setLoginModalOpen(false);
    setRole('admin');
    setAdminTab(normalizedUser.hakAkses[0] || 'dashboard');
  };

  const handleAdminLogout = () => {
    localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
    setCurrentAdminUser(null);
    setAdminToken(null);
    setRole('peminjam');
    setMobileMenuOpen(false);
  };

  const handleStartBooking = (dateStr?: string, busId?: string) => {
    if (dateStr) setPrefillDate(dateStr);
    if (busId) setPrefillBusId(busId);
    setPeminjamTab('ajukan');
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmitBooking = async (newBooking: Booking) => {
    const {
      id: _id,
      kodeBooking: _kb,
      createdAt: _ca,
      status: _st,
      ...payload
    } = newBooking;
    const saved = await createBookingRealtime(payload);
    const bus = buses.find((b) => b.id === saved.busId);

    setEmailModal({
      id: `mail-${Date.now()}`,
      to: saved.email,
      subject: `[SIMBUS DISDIKBUD SIDOARJO] Pengajuan Diterima (${saved.kodeBooking})`,
      body:
        `Yth. ${saved.picNama}\n${saved.namaSekolah}\n\n` +
        `Pengajuan peminjaman bus luar kelas Anda telah berhasil tercatat dan tersimpan secara real-time pada sistem SIMBUS Dinas Pendidikan dan Kebudayaan Kabupaten Sidoarjo serta diteruskan ke Pengelola Aset OPD untuk diverifikasi.\n\n` +
        `Kode Booking : ${saved.kodeBooking}\n` +
        `Armada       : ${bus ? `${bus.nama} (${bus.nopol})` : saved.busId}\n` +
        `Jadwal       : ${formatRentangTanggal(saved.tanggalMulai, saved.tanggalSelesai)}\n` +
        `Tujuan       : ${saved.lokasiTujuan}\n\n` +
        `Silakan pantau status verifikasi secara berkala melalui menu Lacak Status Booking dengan memasukkan kode ${saved.kodeBooking}.\n\n` +
        `Hormat kami,\nPengelola Aset Transportasi Pendidikan\nDinas Pendidikan dan Kebudayaan Kabupaten Sidoarjo`,
      timestamp: saved.createdAt || getNowWIBDateTimeStr(),
      type: 'submitted',
      kodeBooking: saved.kodeBooking,
    });

    setTrackingCode(saved.kodeBooking);
    setPeminjamTab('lacak');
  };

  const handleApproveBooking = async (target: Booking) => {
    setActionAlert('');
    try {
      const updated = await updateBookingStatusRealtime(
        target,
        'Disetujui',
        currentAdminUser?.nama || 'Subbag Umum & Kepegawaian Disdikbud'
      );
      setPreviewBooking(null);

      const bus = buses.find((b) => b.id === target.busId);
      setEmailModal({
        id: `mail-${Date.now()}`,
        to: target.email,
        subject: `[DISETUJUI] Izin Pemakaian Bus Dinas — ${target.kodeBooking}`,
        body:
          `Yth. ${target.picNama}\n${target.namaSekolah}\n\n` +
          `Selamat! Permohonan peminjaman armada bus luar kelas Anda telah DISETUJUI oleh Pengelola Aset Dinas Pendidikan dan Kebudayaan Kabupaten Sidoarjo. Jadwal armada telah resmi dikunci untuk instansi Anda.\n\n` +
          `Kode Booking : ${target.kodeBooking}\n` +
          `Armada       : ${bus ? `${bus.nama} (${bus.nopol})` : target.busId}\n` +
          `Pengemudi    : ${bus ? `${bus.sopir} (${bus.teleponSopir})` : '-'}\n` +
          `Tanggal      : ${formatRentangTanggal(target.tanggalMulai, target.tanggalSelesai)}\n` +
          `Lokasi       : ${target.lokasiTujuan}\n\n` +
          `Silakan cetak Bukti Izin Pemakaian Bus melalui halaman Lacak Status Booking pada portal SIMBUS dan berkoordinasi dengan pengemudi minimal H-1 keberangkatan.\n\n` +
          `Hormat kami,\nDinas Pendidikan dan Kebudayaan Kabupaten Sidoarjo`,
        timestamp: updated.verifiedAt || getNowWIBDateTimeStr(),
        type: 'approved',
        kodeBooking: target.kodeBooking,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menyetujui pengajuan.';
      setActionAlert(msg);
      throw err;
    }
  };

  const handleRejectBooking = async (target: Booking, reason: string) => {
    setActionAlert('');
    try {
      const updated = await updateBookingStatusRealtime(
        target,
        'Ditolak',
        currentAdminUser?.nama || 'Subbag Umum & Kepegawaian Disdikbud',
        reason
      );
      setPreviewBooking(null);

      const bus = buses.find((b) => b.id === target.busId);
      setEmailModal({
        id: `mail-${Date.now()}`,
        to: target.email,
        subject: `[DITOLAK] Pemberitahuan Pengajuan Bus Dinas — ${target.kodeBooking}`,
        body:
          `Yth. ${target.picNama}\n${target.namaSekolah}\n\n` +
          `Mohon maaf, permohonan peminjaman armada bus luar kelas Anda untuk jadwal ${formatRentangTanggal(
            target.tanggalMulai,
            target.tanggalSelesai
          )} (${bus ? bus.nama : target.busId}) belum dapat disetujui dengan alasan berikut:\n\n` +
          `"${reason}"\n\n` +
          `Anda dapat melengkapi persyaratan atau mengajukan ulang pada tanggal lain yang tersedia di kalender portal SIMBUS.\n\n` +
          `Hormat kami,\nDinas Pendidikan dan Kebudayaan Kabupaten Sidoarjo`,
        timestamp: updated.verifiedAt || getNowWIBDateTimeStr(),
        type: 'rejected',
        kodeBooking: target.kodeBooking,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menolak pengajuan.';
      setActionAlert(msg);
      throw err;
    }
  };

  const handleAddBus = async (newBus: Bus) => {
    setActionAlert('');
    try {
      await saveBusRealtime(newBus);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menambahkan armada bus.';
      setActionAlert(msg);
      throw err;
    }
  };

  const handleUpdateBus = async (updatedBus: Bus) => {
    setActionAlert('');
    try {
      await saveBusRealtime(updatedBus);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal memperbarui data armada bus.';
      setActionAlert(msg);
      throw err;
    }
  };

  const handleDeleteBus = async (busId: string) => {
    setActionAlert('');
    try {
      await deleteBusRealtime(busId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus armada bus.';
      setActionAlert(msg);
      throw err;
    }
  };

  const callAdminPicApi = async (
    url: string,
    method: 'POST' | 'PUT' | 'DELETE',
    body?: Record<string, unknown>
  ) => {
    if (!adminToken) {
      localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
      setCurrentAdminUser(null);
      setRole('peminjam');
      setSessionNotice('Sesi pengelola tidak ditemukan. Silakan login kembali.');
      setLoginModalOpen(true);
      throw new Error('Sesi pengelola tidak valid. Silakan login kembali.');
    }

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const rawText = await res.text();
    let data: { error?: string } = {};
    try {
      data = rawText ? (JSON.parse(rawText) as { error?: string }) : {};
    } catch {
      data = {};
    }

    if (res.status === 401) {
      localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
      setCurrentAdminUser(null);
      setAdminToken(null);
      setRole('peminjam');
      setSessionNotice(
        data.error || 'Sesi pengelola telah berakhir. Silakan login kembali.'
      );
      setLoginModalOpen(true);
      throw new Error(data.error || 'Sesi pengelola telah berakhir. Silakan login kembali.');
    }

    if (!res.ok) {
      throw new Error(data.error || `Permintaan gagal (HTTP ${res.status}).`);
    }
  };

  const handleAddPic = async (newUser: PicAdminUser) => {
    setActionAlert('');
    try {
      await callAdminPicApi('/api/admin/pics', 'POST', newUser as unknown as Record<string, unknown>);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menambahkan PIC pengelola.';
      setActionAlert(msg);
      throw err;
    }
  };

  const handleUpdatePic = async (updated: PicAdminUser) => {
    setActionAlert('');
    try {
      await callAdminPicApi(
        `/api/admin/pics/${encodeURIComponent(updated.id)}`,
        'PUT',
        updated as unknown as Record<string, unknown>
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal memperbarui pengaturan PIC.';
      setActionAlert(msg);
      throw err;
    }
  };

  const handleDeletePic = async (userId: string) => {
    setActionAlert('');
    try {
      await callAdminPicApi(`/api/admin/pics/${encodeURIComponent(userId)}`, 'DELETE');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus akun PIC.';
      setActionAlert(msg);
      throw err;
    }
  };

  const allAdminNavItems: Array<{
    id: AdminTab;
    label: string;
    icon: typeof LayoutDashboard;
    badge?: number;
  }> = [
    { id: 'dashboard', label: 'Dashboard Operasional', icon: LayoutDashboard },
    { id: 'verifikasi', label: 'Antrean Verifikasi', icon: CheckSquare, badge: pendingCount },
    { id: 'kalender', label: 'Kalender Jadwal', icon: Calendar },
    { id: 'armada', label: 'Master Armada Bus', icon: BusIcon },
    { id: 'laporan', label: 'Laporan & Rekap Periodik', icon: BarChart3 },
    { id: 'pengaturan', label: 'Pengaturan PIC & Akses', icon: Settings },
  ];

  const visibleAdminNavItems = currentAdminUser
    ? allAdminNavItems.filter((item) => currentAdminUser.hakAkses.includes(item.id))
    : [];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Navbar */}
      <header className="no-print sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4 sm:gap-8">
          {/* Zone 1: Brand Wordmark */}
          <button
            type="button"
            onClick={() => {
              if (role === 'peminjam') setPeminjamTab('beranda');
              else setAdminTab(visibleAdminNavItems[0]?.id || 'dashboard');
            }}
            className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 focus:outline-none"
          >
            <div className="w-9 h-9 rounded-lg bg-blue-900 text-white flex items-center justify-center shrink-0">
              <BusIcon className="w-5 h-5" />
            </div>
            <span className="font-display font-bold text-sm sm:text-base tracking-tight text-blue-950">
              SIMBUS DISDIKBUD SIDOARJO
            </span>
          </button>

          {/* Zone 2: Nav Links (Peminjam mode on Desktop) */}
          {role === 'peminjam' ? (
            <nav
              aria-label="Navigasi Portal Peminjam"
              className="hidden lg:flex items-center gap-6 text-sm font-medium"
            >
              <button
                type="button"
                onClick={() => setPeminjamTab('beranda')}
                className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                  peminjamTab === 'beranda'
                    ? 'text-blue-900 border-blue-900 font-semibold'
                    : 'text-slate-600 border-transparent hover:text-slate-900'
                }`}
              >
                Beranda &amp; Cek Jadwal
              </button>
              <button
                type="button"
                onClick={() => setPeminjamTab('ajukan')}
                className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                  peminjamTab === 'ajukan'
                    ? 'text-blue-900 border-blue-900 font-semibold'
                    : 'text-slate-600 border-transparent hover:text-slate-900'
                }`}
              >
                Ajukan Peminjaman
              </button>
              <button
                type="button"
                onClick={() => setPeminjamTab('lacak')}
                className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                  peminjamTab === 'lacak'
                    ? 'text-blue-900 border-blue-900 font-semibold'
                    : 'text-slate-600 border-transparent hover:text-slate-900'
                }`}
              >
                Lacak Status Booking
              </button>
            </nav>
          ) : (
            <div className="hidden lg:block text-xs font-medium text-slate-500 whitespace-nowrap">
              Panel Pengelola Aset OPD · {currentAdminUser?.nama}
            </div>
          )}

          {/* Zone 3: Role Switcher + Incoming Request Badge & Mobile Menu */}
          <div className="flex items-center gap-2 shrink-0">
            <div
              role="group"
              aria-label="Pengalih Peran"
              className="hidden sm:inline-flex items-center p-1 bg-slate-100 border border-slate-200 rounded-lg"
            >
              <button
                type="button"
                onClick={() => {
                  setRole('peminjam');
                  setMobileMenuOpen(false);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  role === 'peminjam'
                    ? 'bg-blue-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Portal Peminjam</span>
              </button>
              <button
                type="button"
                onClick={handleRequestAdminRole}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  role === 'admin'
                    ? 'bg-blue-900 text-white shadow-sm'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Pengelola Aset OPD</span>
                {pendingCount > 0 && (
                  <span
                    title={`${pendingCount} pengajuan masuk menunggu verifikasi`}
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono-tabular font-bold leading-none ${
                      role === 'admin'
                        ? 'bg-amber-400 text-slate-950'
                        : 'bg-rose-600 text-white'
                    }`}
                  >
                    <Bell className="w-2.5 h-2.5" />
                    <span>{pendingCount}</span>
                  </span>
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="lg:hidden p-2 rounded-lg text-slate-700 hover:bg-slate-100"
              aria-label="Buka menu navigasi"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-4">
            <div className="grid grid-cols-2 gap-2 sm:hidden">
              <button
                type="button"
                onClick={() => {
                  setRole('peminjam');
                  setMobileMenuOpen(false);
                }}
                className={`px-3 py-2 text-xs font-semibold rounded-lg border ${
                  role === 'peminjam'
                    ? 'bg-blue-900 text-white border-blue-900'
                    : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                Portal Peminjam
              </button>
              <button
                type="button"
                onClick={handleRequestAdminRole}
                className={`px-3 py-2 text-xs font-semibold rounded-lg border inline-flex items-center justify-center gap-1.5 ${
                  role === 'admin'
                    ? 'bg-blue-900 text-white border-blue-900'
                    : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                <span>Pengelola Aset OPD</span>
                {pendingCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white text-[10px] font-mono-tabular font-bold">
                    {pendingCount}
                  </span>
                )}
              </button>
            </div>

            {role === 'peminjam' ? (
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setPeminjamTab('beranda');
                    setMobileMenuOpen(false);
                  }}
                  className={`px-3 py-2.5 text-left text-sm rounded-lg ${
                    peminjamTab === 'beranda'
                      ? 'bg-blue-50 text-blue-900 font-semibold'
                      : 'text-slate-700'
                  }`}
                >
                  Beranda &amp; Cek Jadwal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPeminjamTab('ajukan');
                    setMobileMenuOpen(false);
                  }}
                  className={`px-3 py-2.5 text-left text-sm rounded-lg ${
                    peminjamTab === 'ajukan'
                      ? 'bg-blue-50 text-blue-900 font-semibold'
                      : 'text-slate-700'
                  }`}
                >
                  Ajukan Peminjaman
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPeminjamTab('lacak');
                    setMobileMenuOpen(false);
                  }}
                  className={`px-3 py-2.5 text-left text-sm rounded-lg ${
                    peminjamTab === 'lacak'
                      ? 'bg-blue-50 text-blue-900 font-semibold'
                      : 'text-slate-700'
                  }`}
                >
                  Lacak Status Booking
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {visibleAdminNavItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setAdminTab(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`px-3 py-2.5 text-left text-sm rounded-lg flex items-center justify-between ${
                        adminTab === item.id
                          ? 'bg-blue-50 text-blue-900 font-semibold'
                          : 'text-slate-700'
                      }`}
                    >
                      <span className="inline-flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        {item.label}
                      </span>
                      {typeof item.badge === 'number' && item.badge > 0 && (
                        <span className="text-xs font-mono-tabular font-semibold text-amber-700">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={handleAdminLogout}
                  className="mt-2 px-3 py-2.5 text-left text-sm rounded-lg text-rose-700 bg-rose-50 font-medium inline-flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Keluar Sesi Pengelola</span>
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Main Content */}
      {firebaseError ? (
        <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-12">
          <div
            role="alert"
            className="max-w-lg mx-auto bg-white border border-rose-200 rounded-xl p-6 text-center space-y-4 shadow-sm"
          >
            <div className="w-11 h-11 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-base font-bold text-slate-900">
                Koneksi Real-Time Database Terputus
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">{firebaseError}</p>
            </div>
            <button
              type="button"
              onClick={handleRetrySync}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-900 rounded-lg hover:bg-blue-800 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Coba Hubungkan Ulang</span>
            </button>
          </div>
        </main>
      ) : !firebaseReady ? (
        <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-16">
          <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-xl p-8 text-center space-y-3 shadow-sm">
            <Loader2 className="w-7 h-7 text-blue-900 animate-spin mx-auto" />
            <h2 className="text-sm font-bold text-slate-900">
              Menghubungkan ke Database Real-Time SIMBUS
            </h2>
            <p className="text-xs text-slate-500">
              Menyinkronkan jadwal armada bus, pengajuan sekolah, dan data pengelola secara real-time...
            </p>
          </div>
        </main>
      ) : role === 'peminjam' ? (
        <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-8">
          {peminjamTab === 'beranda' && (
            <PeminjamHomeView
              buses={buses}
              bookings={bookings}
              onStartBooking={handleStartBooking}
              onGoToTracking={() => setPeminjamTab('lacak')}
            />
          )}

          {peminjamTab === 'ajukan' && (
            <BookingFormView
              buses={buses}
              bookings={bookings}
              prefillDate={prefillDate}
              prefillBusId={prefillBusId}
              onSubmitBooking={handleSubmitBooking}
              onBackToCalendar={() => setPeminjamTab('beranda')}
            />
          )}

          {peminjamTab === 'lacak' && (
            <TrackingView
              bookings={bookings}
              buses={buses}
              initialSearchCode={trackingCode}
            />
          )}
        </main>
      ) : (
        <div className="flex-1 max-w-[1440px] w-full mx-auto flex">
          {/* Desktop Admin Sidebar */}
          <aside className="no-print hidden lg:flex flex-col w-64 shrink-0 border-r border-slate-200 bg-white p-4 justify-between gap-4">
            <nav aria-label="Menu Pengelola Aset" className="space-y-1">
              <p className="px-3 py-2 text-xs font-semibold text-slate-400">
                Menu Pengelola Aset
              </p>
              {visibleAdminNavItems.map((item) => {
                const Icon = item.icon;
                const active = adminTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setAdminTab(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 text-sm rounded-lg transition-colors ${
                      active
                        ? 'bg-blue-900 text-white font-semibold'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="inline-flex items-center gap-2.5 truncate">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </span>
                    {typeof item.badge === 'number' && item.badge > 0 && (
                      <span
                        className={`text-xs font-mono-tabular font-bold px-1.5 py-0.5 rounded ${
                          active
                            ? 'bg-white/20 text-white'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {currentAdminUser && (
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-2.5">
                <div className="space-y-0.5">
                  <p className="font-semibold text-slate-900 truncate">{currentAdminUser.nama}</p>
                  <p className="text-blue-900 font-medium">{currentAdminUser.peran}</p>
                  <p className="text-slate-500 truncate">{currentAdminUser.jabatan}</p>
                </div>
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>Batas diam</span>
                  </span>
                  <span className="font-mono-tabular font-semibold text-slate-700">
                    {formatCountdown(remainingIdleSeconds)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAdminLogout}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-700 bg-white border border-rose-200 rounded-md hover:bg-rose-50 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Keluar Akun</span>
                </button>
              </div>
            )}
          </aside>

          {/* Admin Main Content */}
          <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 space-y-4">
            {actionAlert && (
              <div
                role="alert"
                className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center justify-between gap-3"
              >
                <span>{actionAlert}</span>
                <button
                  type="button"
                  onClick={() => setActionAlert('')}
                  className="text-rose-700 font-semibold"
                >
                  Tutup
                </button>
              </div>
            )}

            {adminTab === 'dashboard' && currentAdminUser?.hakAkses.includes('dashboard') && (
              <AdminDashboardView
                buses={buses}
                bookings={bookings}
                onGoToVerification={() => setAdminTab('verifikasi')}
                onInspectBooking={(bk) => setPreviewBooking(bk)}
              />
            )}

            {adminTab === 'verifikasi' && currentAdminUser?.hakAkses.includes('verifikasi') && (
              <VerificationQueueView
                bookings={bookings}
                buses={buses}
                onInspectBooking={(bk) => setPreviewBooking(bk)}
                onApproveBooking={handleApproveBooking}
                onRejectBooking={handleRejectBooking}
              />
            )}

            {adminTab === 'kalender' && currentAdminUser?.hakAkses.includes('kalender') && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                    Kalender Jadwal Armada Dinas
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Pantau jadwal pemakaian yang telah disetujui dan antrean tanggal per armada bus.
                  </p>
                </div>
                <CalendarAvailability
                  buses={buses}
                  bookings={bookings}
                  mode="admin"
                  onInspectBooking={(bk) => setPreviewBooking(bk)}
                />
              </div>
            )}

            {adminTab === 'armada' && currentAdminUser?.hakAkses.includes('armada') && (
              <FleetManagementView
                buses={buses}
                onAddBus={handleAddBus}
                onUpdateBus={handleUpdateBus}
                onDeleteBus={handleDeleteBus}
              />
            )}

            {adminTab === 'laporan' && currentAdminUser?.hakAkses.includes('laporan') && (
              <ReportsView bookings={bookings} buses={buses} />
            )}

            {adminTab === 'pengaturan' &&
              currentAdminUser?.hakAkses.includes('pengaturan') && (
                <AdminSettingsView
                  picUsers={picUsers}
                  currentAdminUser={currentAdminUser}
                  onAddPic={handleAddPic}
                  onUpdatePic={handleUpdatePic}
                  onDeletePic={handleDeletePic}
                />
              )}

            {visibleAdminNavItems.length === 0 && (
              <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-2">
                <p className="text-sm font-bold text-slate-900">
                  Belum Ada Hak Akses Menu Aktif
                </p>
                <p className="text-xs text-slate-600">
                  Akun Anda belum memiliki izin menu pada panel Pengelola Aset OPD. Hubungi Super
                  Admin untuk mengatur hak akses PIC.
                </p>
              </div>
            )}
          </main>
        </div>
      )}

      {/* Quiet Government Footer */}
      <footer className="no-print border-t border-slate-200 bg-white mt-auto">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <p>
            &copy; {getWIBDateParts().year} Dinas Pendidikan dan Kebudayaan Kabupaten Sidoarjo ·
            Jalan Pahlawan No. 4 Sidoarjo
          </p>
          <p>SIMBUS — Layanan Peminjaman Bus Luar Kelas Sekolah (SPBE Kabupaten Sidoarjo)</p>
        </div>
      </footer>

      {/* Shared Modals */}
      <ProposalPreviewModal
        booking={previewBooking}
        bus={previewBooking ? buses.find((b) => b.id === previewBooking.busId) : undefined}
        conflicts={previewBooking ? findAllOverlappingBookings(bookings, previewBooking) : []}
        onClose={() => setPreviewBooking(null)}
        onApprove={role === 'admin' ? handleApproveBooking : undefined}
        onRequestReject={
          role === 'admin'
            ? (bk) => {
                setPreviewBooking(null);
                setRejectFromPreviewTarget(bk);
                setRejectReasonInput('');
                setRejectReasonError('');
              }
            : undefined
        }
      />

      {/* Rejection Dialog triggered from ProposalPreviewModal */}
      {rejectFromPreviewTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-rose-50">
              <h3 className="text-sm font-bold text-rose-900">
                Alasan Penolakan — {rejectFromPreviewTarget.kodeBooking}
              </h3>
              <button
                type="button"
                onClick={() => setRejectFromPreviewTarget(null)}
                className="p-1 text-slate-500 hover:text-slate-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-xs text-slate-600">
                Tuliskan alasan resmi penolakan untuk{' '}
                <strong>{rejectFromPreviewTarget.namaSekolah}</strong>:
              </p>
              <textarea
                rows={4}
                value={rejectReasonInput}
                onChange={(e) => {
                  setRejectReasonInput(e.target.value);
                  setRejectReasonError('');
                }}
                placeholder="Masukkan alasan penolakan yang akan dikirim ke email sekolah..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-rose-600"
              />
              {rejectReasonError && (
                <p className="text-xs text-rose-600">{rejectReasonError}</p>
              )}
            </div>
            <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex justify-end gap-2.5">
              <button
                type="button"
                disabled={rejectingFromPreview}
                onClick={() => setRejectFromPreviewTarget(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={rejectingFromPreview}
                onClick={async () => {
                  if (rejectReasonInput.trim().length < 10) {
                    setRejectReasonError('Alasan penolakan minimal 10 karakter.');
                    return;
                  }
                  setRejectingFromPreview(true);
                  setRejectReasonError('');
                  try {
                    await handleRejectBooking(rejectFromPreviewTarget, rejectReasonInput.trim());
                    setRejectFromPreviewTarget(null);
                  } catch (err) {
                    setRejectReasonError(
                      err instanceof Error ? err.message : 'Gagal menolak pengajuan.'
                    );
                  } finally {
                    setRejectingFromPreview(false);
                  }
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 rounded-lg hover:bg-rose-700 disabled:opacity-50"
              >
                {rejectingFromPreview
                  ? 'Memproses Penolakan...'
                  : 'Konfirmasi Tolak & Kirim Email'}
              </button>
            </div>
          </div>
        </div>
      )}

      <EmailSimulationModal
        email={emailModal}
        onClose={() => setEmailModal(null)}
        onTrackCode={
          role === 'peminjam'
            ? (kode) => {
                setTrackingCode(kode);
                setPeminjamTab('lacak');
              }
            : undefined
        }
      />

      <AdminLoginModal
        isOpen={loginModalOpen}
        pendingCount={pendingCount}
        sessionNotice={sessionNotice}
        onSuccessLogin={handleAdminLoginSuccess}
        onCancel={() => {
          setSessionNotice('');
          setLoginModalOpen(false);
        }}
      />
    </div>
  );
}
