import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  X,
} from 'lucide-react';
import { PicAdminUser } from '../../types';

interface AdminLoginModalProps {
  isOpen: boolean;
  pendingCount: number;
  sessionNotice?: string;
  onSuccessLogin: (user: PicAdminUser, token: string) => void;
  onCancel: () => void;
}

type ModalMode = 'login' | 'forgot-request' | 'forgot-confirm';

export function AdminLoginModal({
  isOpen,
  pendingCount,
  sessionNotice,
  onSuccessLogin,
  onCancel,
}: AdminLoginModalProps) {
  const [mode, setMode] = useState<ModalMode>('login');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Forgot password state
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpSentInfo, setOtpSentInfo] = useState<{
    maskedEmail: string;
    timestamp: string;
  } | null>(null);

  if (!isOpen) return null;

  const resetForms = () => {
    setError('');
    setSuccessMsg('');
    setPassword('');
    setOtpCode('');
    setNewPassword('');
    setConfirmPassword('');
    setOtpSentInfo(null);
  };

  const handleClose = () => {
    resetForms();
    setMode('login');
    onCancel();
  };

  const parseJsonSafe = async <T,>(res: Response): Promise<T> => {
    const rawText = await res.text();
    try {
      return (rawText ? JSON.parse(rawText) : {}) as T;
    } catch {
      return {} as T;
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });
      const data = await parseJsonSafe<{ user?: PicAdminUser; token?: string; error?: string }>(res);
      if (!res.ok || !data.user || !data.token) {
        setError(data.error || `Gagal melakukan verifikasi akun pengelola (HTTP ${res.status}).`);
        return;
      }
      setIdentifier('');
      setPassword('');
      onSuccessLogin(data.user, data.token);
    } catch {
      setError('Tidak dapat terhubung ke server autentikasi. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request', identifier: resetIdentifier.trim() }),
      });
      const data = await parseJsonSafe<{
        ok?: boolean;
        maskedEmail?: string;
        timestamp?: string;
        error?: string;
      }>(res);
      if (!res.ok || !data.ok) {
        setError(
          data.error ||
            `Permintaan reset kata sandi gagal (HTTP ${res.status}). Silakan coba beberapa detik lagi.`
        );
        return;
      }
      setOtpSentInfo({
        maskedEmail: data.maskedEmail || 'email dinas terdaftar',
        timestamp: data.timestamp || '',
      });
      setMode('forgot-confirm');
    } catch {
      setError('Tidak dapat terhubung ke server (koneksi terputus atau sedang restart). Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword.trim().length < 6) {
      setError('Kata sandi baru minimal 6 karakter.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Konfirmasi kata sandi baru tidak cocok.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm',
          identifier: resetIdentifier.trim(),
          code: otpCode.trim(),
          newPassword: newPassword.trim(),
        }),
      });
      const data = await parseJsonSafe<{ ok?: boolean; message?: string; error?: string }>(res);
      if (!res.ok || !data.ok) {
        setError(data.error || `Gagal memperbarui kata sandi (HTTP ${res.status}).`);
        return;
      }
      setIdentifier(resetIdentifier.trim());
      resetForms();
      setSuccessMsg(data.message || 'Kata sandi berhasil diperbarui. Silakan login kembali.');
      setMode('login');
    } catch {
      setError('Gagal menghubungi server saat menyimpan kata sandi baru.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-login-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-5 bg-blue-950 text-white flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-sky-300" />
            </div>
            <div>
              <h2 id="admin-login-title" className="text-base font-bold tracking-tight">
                {mode === 'login'
                  ? 'Login Pengelola Aset OPD'
                  : 'Pemulihan Kata Sandi Pengelola'}
              </h2>
              <p className="text-xs text-sky-200 mt-0.5">
                Dinas Pendidikan dan Kebudayaan Kab. Sidoarjo
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Tutup form login"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="p-6 space-y-4">
            {sessionNotice && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-amber-50 border border-amber-300 text-xs text-amber-950 flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>{sessionNotice}</span>
              </div>
            )}

            {!sessionNotice && pendingCount > 0 && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
                Terdapat <strong className="tabular-nums">{pendingCount} pengajuan masuk</strong> yang
                menunggu verifikasi pengelola aset.
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            <div>
              <label
                htmlFor="admin-identifier"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Username atau Email Dinas
              </label>
              <input
                id="admin-identifier"
                type="text"
                required
                autoFocus
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  setError('');
                }}
                placeholder="Masukkan username atau email dinas terdaftar"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="admin-password"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Kata Sandi
                </label>
                <button
                  type="button"
                  onClick={() => {
                    resetForms();
                    setResetIdentifier(identifier);
                    setMode('forgot-request');
                  }}
                  className="text-xs font-semibold text-sky-700 hover:text-blue-900"
                >
                  Lupa password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  placeholder="Masukkan kata sandi pengelola"
                  className="w-full pl-10 pr-10 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Demi keamanan akses aset OPD, sesi pengelola otomatis berakhir apabila tidak ada
              aktivitas selama 10 menit.
            </p>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 text-xs font-semibold text-white bg-blue-900 rounded-lg hover:bg-blue-800 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Memverifikasi...' : 'Masuk ke Panel Pengelola'}
              </button>
            </div>
          </form>
        )}

        {mode === 'forgot-request' && (
          <form onSubmit={handleForgotRequest} className="p-6 space-y-4">
            <button
              type="button"
              onClick={() => {
                resetForms();
                setMode('login');
              }}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-blue-900"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke Login</span>
            </button>

            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900">Lupa Kata Sandi PIC</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Masukkan Username atau Email Dinas yang terdaftar sebagai PIC Pengelola Aset OPD
                untuk menerima kode verifikasi pemulihan.
              </p>
            </div>

            <div>
              <label
                htmlFor="reset-identifier"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Username atau Email Dinas Terdaftar
              </label>
              <input
                id="reset-identifier"
                type="text"
                required
                autoFocus
                value={resetIdentifier}
                onChange={(e) => {
                  setResetIdentifier(e.target.value);
                  setError('');
                }}
                placeholder="Contoh: admin.aset atau email@disdikbudsidoarjo.go.id"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
              />
            </div>

            {error && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="pt-2 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  resetForms();
                  setMode('login');
                }}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 text-xs font-semibold text-white bg-blue-900 rounded-lg hover:bg-blue-800 disabled:opacity-50"
              >
                {loading ? 'Mengirim Kode...' : 'Kirim Kode Verifikasi'}
              </button>
            </div>
          </form>
        )}

        {mode === 'forgot-confirm' && (
          <form onSubmit={handleForgotConfirm} className="p-6 space-y-4">
            <button
              type="button"
              onClick={() => {
                setError('');
                setMode('forgot-request');
              }}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-blue-900"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Ubah Username / Email</span>
            </button>

            {otpSentInfo && (
              <div className="p-3.5 rounded-lg bg-sky-50 border border-sky-200 text-xs text-sky-950 space-y-1.5">
                <div className="flex items-center gap-2 font-semibold">
                  <Mail className="w-4 h-4 text-sky-700 shrink-0" />
                  <span>Kode OTP Telah Dikirim ke Email Terdaftar</span>
                </div>
                <p>
                  Silakan periksa Kotak Masuk atau folder Spam pada email{' '}
                  <strong className="font-mono-tabular">{otpSentInfo.maskedEmail}</strong> (dikirim{' '}
                  <span className="font-mono-tabular">{otpSentInfo.timestamp} WIB</span>).
                </p>
                <p className="text-[11px] text-sky-800">
                  Demi keamanan, kode OTP 6 digit tidak pernah ditampilkan pada layar aplikasi dan
                  hanya berlaku selama 10 menit.
                </p>
              </div>
            )}

            <div>
              <label htmlFor="otp-code" className="block text-xs font-semibold text-slate-700 mb-1">
                Kode Verifikasi (6 Digit)
              </label>
              <input
                id="otp-code"
                type="text"
                required
                maxLength={6}
                value={otpCode}
                onChange={(e) => {
                  setOtpCode(e.target.value);
                  setError('');
                }}
                placeholder="Masukkan 6 digit kode OTP"
                className="w-full px-3.5 py-2 text-sm font-mono-tabular border border-slate-300 rounded-lg focus:outline-none focus:border-blue-900"
              />
            </div>

            <div>
              <label
                htmlFor="new-password"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Kata Sandi Baru (Minimal 6 Karakter)
              </label>
              <input
                id="new-password"
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setError('');
                }}
                placeholder="Masukkan kata sandi baru"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-900"
              />
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Konfirmasi Kata Sandi Baru
              </label>
              <input
                id="confirm-password"
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError('');
                }}
                placeholder="Ulangi kata sandi baru"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-900"
              />
            </div>

            {error && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="pt-2 flex justify-end gap-2.5">
              <button
                type="submit"
                disabled={loading}
                className="w-full px-5 py-2.5 text-xs font-semibold text-white bg-blue-900 rounded-lg hover:bg-blue-800 disabled:opacity-50"
              >
                {loading ? 'Menyimpan...' : 'Simpan Kata Sandi Baru'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
