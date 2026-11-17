import 'dotenv/config';
import crypto from 'crypto';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import fs from 'fs';
import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  INITIAL_BOOKINGS,
  INITIAL_BUSES,
  INITIAL_PIC_USERS,
} from './src/data/mockData.ts';
import type { AdminPermissionKey, PicAdminUser } from './src/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RTDB_BASE_URL =
  process.env.FIREBASE_DATABASE_URL ||
  'https://simbus-disdikbud-sidoarjo-default-rtdb.asia-southeast1.firebasedatabase.app';

// Ephemeral-safe per-process fallback secret if SESSION_SECRET is not set
const SESSION_HMAC_KEY =
  process.env.SESSION_SECRET?.trim() || crypto.randomBytes(32).toString('hex');

const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

interface ResetOtpEntry {
  userId: string;
  code: string;
  expiresAt: number;
  attempts: number;
  lastRequestedAt: number;
}

const otpStore = new Map<string, ResetOtpEntry>();

function hashPassword(plain: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(plain, salt, 64).toString('hex');
  return `scrypt:${salt}:${derived}`;
}

function isScryptHash(stored?: string): boolean {
  return Boolean(stored && stored.startsWith('scrypt:') && stored.split(':').length === 3);
}

function verifyPassword(plain: string, stored?: string): boolean {
  if (!stored || !plain) return false;
  if (isScryptHash(stored)) {
    const [, salt, hexHash] = stored.split(':');
    const derived = crypto.scryptSync(plain, salt, 64);
    const storedBuf = Buffer.from(hexHash, 'hex');
    if (derived.length !== storedBuf.length) return false;
    return crypto.timingSafeEqual(derived, storedBuf);
  }
  const a = Buffer.from(plain, 'utf8');
  const b = Buffer.from(stored, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function signAdminToken(userId: string): string {
  const payloadObj = {
    uid: userId,
    exp: Date.now() + SESSION_TTL_MS,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payloadObj), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_HMAC_KEY).update(payloadB64).digest('base64url');
  return `${payloadB64}.${sig}`;
}

function verifyAdminToken(token: string): string | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', SESSION_HMAC_KEY)
    .update(payloadB64)
    .digest('base64url');
  const sigBuf = Buffer.from(sig, 'utf8');
  const expBuf = Buffer.from(expectedSig, 'utf8');
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as {
      uid?: string;
      exp?: number;
    };
    if (!parsed.uid || !parsed.exp || parsed.exp < Date.now()) {
      return null;
    }
    return parsed.uid;
  } catch {
    return null;
  }
}

function maskEmail(email: string): string {
  const parts = email.split('@');
  if (parts.length !== 2) return '***';
  const [local, domain] = parts;
  if (local.length <= 2) {
    return `${local[0] || '*'}***@${domain}`;
  }
  return `${local.slice(0, 2)}${'*'.repeat(Math.min(6, Math.max(3, local.length - 2)))}@${domain}`;
}

function cleanEnvValue(raw?: string): string {
  if (!raw) return '';
  return raw.trim().replace(/^["']|["']$/g, '').trim();
}

function isPlaceholderEnv(val: string): boolean {
  return !val || val.startsWith('MY_SMTP_');
}

function isSmtpConfigured(): boolean {
  const user = cleanEnvValue(process.env.SMTP_USER);
  const pass = cleanEnvValue(process.env.SMTP_PASS);
  return !isPlaceholderEnv(user) && !isPlaceholderEnv(pass);
}

async function sendOtpEmail(toEmail: string, nama: string, otpCode: string): Promise<void> {
  const smtpUser = cleanEnvValue(process.env.SMTP_USER);
  let smtpPass = cleanEnvValue(process.env.SMTP_PASS);
  if (isPlaceholderEnv(smtpUser) || isPlaceholderEnv(smtpPass)) {
    throw new Error('SMTP_NOT_CONFIGURED');
  }

  const rawHost = cleanEnvValue(process.env.SMTP_HOST);
  const smtpHost = isPlaceholderEnv(rawHost) ? 'smtp.gmail.com' : rawHost;
  const smtpPort = Number(cleanEnvValue(process.env.SMTP_PORT)) || 465;
  const rawFrom = cleanEnvValue(process.env.SMTP_FROM);
  const smtpFrom =
    !rawFrom || rawFrom.includes('MY_SMTP_')
      ? `SIMBUS DISDIKBUD SIDOARJO <${smtpUser}>`
      : rawFrom;

  // Google App Passwords are 16 characters often copied with spaces ("xxxx xxxx xxxx xxxx")
  if (smtpHost.toLowerCase().includes('gmail')) {
    smtpPass = smtpPass.replace(/\s+/g, '');
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    requireTLS: smtpPort === 587,
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 10000,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  await transporter.sendMail({
    from: smtpFrom,
    to: toEmail,
    subject: '[SIMBUS DISDIKBUD SIDOARJO] Kode OTP Pemulihan Kata Sandi Pengelola',
    text:
      `Yth. ${nama}\n\n` +
      `Kami menerima permintaan pemulihan kata sandi akun Pengelola Aset OPD SIMBUS Dinas Pendidikan dan Kebudayaan Kabupaten Sidoarjo.\n\n` +
      `Kode OTP Verifikasi Anda: ${otpCode}\n` +
      `Berlaku selama 10 menit.\n\n` +
      `PENTING: Jangan bagikan kode ini kepada siapa pun. Jika Anda tidak merasa meminta reset kata sandi, abaikan email ini.\n\n` +
      `Hormat kami,\nSistem Informasi Peminjaman Bus Luar Kelas (SIMBUS)\nDinas Pendidikan dan Kebudayaan Kabupaten Sidoarjo`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">
        <div style="background: #172554; color: #ffffff; padding: 18px 24px;">
          <h2 style="margin: 0; font-size: 16px;">SIMBUS DISDIKBUD SIDOARJO</h2>
          <p style="margin: 4px 0 0; font-size: 12px; color: #bae6fd;">Pemulihan Kata Sandi Pengelola Aset OPD</p>
        </div>
        <div style="padding: 24px; color: #0f172a; font-size: 13px; line-height: 1.6;">
          <p style="margin-top: 0;">Yth. <strong>${nama}</strong>,</p>
          <p>Kami menerima permintaan pemulihan kata sandi untuk akun Pengelola Aset OPD Anda. Gunakan kode OTP berikut untuk melanjutkan proses reset kata sandi:</p>
          <div style="margin: 20px 0; padding: 14px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; text-align: center;">
            <span style="font-family: monospace; font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #1e3a8a;">${otpCode}</span>
          </div>
          <p style="font-size: 12px; color: #475569;">Kode ini berlaku selama <strong>10 menit</strong>. Demi keamanan, <strong>jangan pernah membagikan kode ini kepada siapa pun</strong> termasuk petugas lain.</p>
          <p style="font-size: 12px; color: #64748b; margin-bottom: 0;">Jika Anda tidak meminta reset kata sandi, abaikan email ini karena akun Anda tetap aman.</p>
        </div>
      </div>
    `,
  });
}

function sanitizePic(user: PicAdminUser): PicAdminUser {
  const { password: _removed, ...rest } = user;
  return {
    ...rest,
    hakAkses: Array.isArray(user.hakAkses) ? user.hakAkses : [],
    aktif: user.aktif !== false,
  };
}

function getWIBDateTimeNow(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date());
  const map: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== 'literal') map[p.type] = p.value;
  }
  const hour = map.hour === '24' ? '00' : map.hour;
  return `${map.year}-${map.month}-${map.day} ${hour}:${map.minute}`;
}

function getWIBDateNow(): string {
  return getWIBDateTimeNow().split(' ')[0];
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      clean[k] = v;
    }
  }
  return clean;
}

async function rtdbGet<T>(nodePath: string): Promise<T | null> {
  const res = await fetch(`${RTDB_BASE_URL}/${nodePath}.json`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Firebase RTDB GET ${nodePath} gagal (${res.status}): ${text}`);
  }
  return (await res.json()) as T | null;
}

async function rtdbPut(nodePath: string, payload: Record<string, unknown>): Promise<void> {
  const res = await fetch(`${RTDB_BASE_URL}/${nodePath}.json`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Firebase RTDB PUT ${nodePath} gagal (${res.status}): ${text}`);
  }
}

async function rtdbPatch(nodePath: string, payload: Record<string, unknown>): Promise<void> {
  const res = await fetch(`${RTDB_BASE_URL}/${nodePath}.json`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Firebase RTDB PATCH ${nodePath} gagal (${res.status}): ${text}`);
  }
}

async function rtdbDelete(nodePath: string): Promise<void> {
  const res = await fetch(`${RTDB_BASE_URL}/${nodePath}.json`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Firebase RTDB DELETE ${nodePath} gagal (${res.status}): ${text}`);
  }
}

let seedInFlight: Promise<void> | null = null;

async function ensureServerRtdbSeeded(): Promise<void> {
  if (seedInFlight) return seedInFlight;
  seedInFlight = (async () => {
    const seeded = await rtdbGet<boolean>('simbus/meta/seeded');
    if (seeded === true) return;

    const busesMap: Record<string, unknown> = {};
    for (const b of INITIAL_BUSES) {
      busesMap[b.id] = stripUndefined(b as unknown as Record<string, unknown>);
    }

    const bookingsMap: Record<string, unknown> = {};
    for (const bk of INITIAL_BOOKINGS) {
      bookingsMap[bk.id] = stripUndefined(bk as unknown as Record<string, unknown>);
    }

    const picMap: Record<string, unknown> = {};
    for (const u of INITIAL_PIC_USERS) {
      picMap[u.id] = stripUndefined({
        ...u,
        password: u.password ? hashPassword(u.password) : undefined,
      } as unknown as Record<string, unknown>);
    }

    await rtdbPatch('simbus', {
      buses: busesMap,
      bookings: bookingsMap,
      picUsers: picMap,
      meta: {
        seeded: true,
        seededAt: getWIBDateTimeNow(),
      },
    });
  })().finally(() => {
    seedInFlight = null;
  });

  return seedInFlight;
}

async function fetchLivePicUsers(): Promise<PicAdminUser[]> {
  await ensureServerRtdbSeeded();
  const raw = await rtdbGet<Record<string, PicAdminUser>>('simbus/picUsers');
  if (!raw || typeof raw !== 'object') return [];
  const list = Object.values(raw).filter((u): u is PicAdminUser => Boolean(u && u.id));

  // Transparently upgrade any legacy plaintext passwords in RTDB to salted scrypt hashes
  for (const u of list) {
    if (u.password && !isScryptHash(u.password)) {
      const upgradedHash = hashPassword(u.password);
      u.password = upgradedHash;
      await rtdbPatch(`simbus/picUsers/${u.id}`, { password: upgradedHash }).catch(() => {});
    }
  }
  return list;
}

interface AuthenticatedRequest extends Request {
  adminUser?: PicAdminUser;
}

function requireAdminPermission(permission: AdminPermissionKey) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
      const uid = token ? verifyAdminToken(token) : null;
      if (!uid) {
        res.status(401).json({
          error: 'Sesi admin telah berakhir atau tidak valid. Silakan login kembali.',
        });
        return;
      }
      const picUsers = await fetchLivePicUsers();
      const caller = picUsers.find((u) => u.id === uid);
      if (!caller || !caller.aktif) {
        res.status(401).json({
          error: 'Akun pengelola sudah tidak aktif. Silakan login kembali.',
        });
        return;
      }
      const perms = Array.isArray(caller.hakAkses) ? caller.hakAkses : [];
      if (!perms.includes(permission)) {
        res.status(403).json({
          error: 'Akun Anda tidak memiliki izin untuk mengelola pengaturan PIC.',
        });
        return;
      }
      req.adminUser = caller;
      next();
    } catch {
      res.status(502).json({ error: 'Gagal memverifikasi sesi pengelola.' });
    }
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      database: 'firebase-rtdb',
      smtpConfigured: isSmtpConfigured(),
      serverTimeWIB: getWIBDateTimeNow(),
    });
  });

  // Trigger silent password migration to scrypt hash on startup without crashing boot if offline
  fetchLivePicUsers().catch(() => {});

  // PIC Auth: Login against live Firebase RTDB
  app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const { identifier, password } = req.body as { identifier?: string; password?: string };
      const idLower = (identifier || '').trim().toLowerCase();
      if (!idLower || !password) {
        res.status(400).json({ error: 'Username/email dinas dan kata sandi wajib diisi.' });
        return;
      }

      const picUsers = await fetchLivePicUsers();
      const user = picUsers.find(
        (u) =>
          (u.username || '').toLowerCase() === idLower ||
          (u.email || '').toLowerCase() === idLower
      );

      if (!user || !verifyPassword(password, user.password)) {
        res.status(401).json({ error: 'Username / email dinas atau kata sandi tidak sesuai.' });
        return;
      }

      if (!user.aktif) {
        res.status(403).json({
          error:
            'Akun PIC ini sedang dinonaktifkan oleh Super Admin. Silakan hubungi pengelola utama.',
        });
        return;
      }

      const token = signAdminToken(user.id);
      res.json({ user: sanitizePic(user), token });
    } catch (err) {
      console.error('Login error:', err);
      res.status(502).json({
        error: 'Gagal terhubung ke Firebase Realtime Database saat memverifikasi akun.',
      });
    }
  });

  // PIC Auth: Forgot Password (Real SMTP Email Delivery only — NEVER exposes OTP to browser)
  app.post('/api/auth/forgot-password', async (req: Request, res: Response) => {
    try {
      const { action, identifier, code, newPassword } = req.body as {
        action: 'request' | 'confirm';
        identifier?: string;
        code?: string;
        newPassword?: string;
      };

      const idLower = (identifier || '').trim().toLowerCase();
      const picUsers = await fetchLivePicUsers();
      const user = picUsers.find(
        (u) =>
          (u.username || '').toLowerCase() === idLower ||
          (u.email || '').toLowerCase() === idLower
      );

      if (action === 'request') {
        if (!user) {
          res.status(404).json({
            error: 'Username atau email dinas tidak terdaftar sebagai PIC Pengelola Aset OPD.',
          });
          return;
        }
        if (!user.aktif) {
          res.status(403).json({
            error: 'Akun PIC ini sedang dinonaktifkan. Hubungi Super Admin untuk mengaktifkan.',
          });
          return;
        }
        if (!isSmtpConfigured()) {
          res.status(503).json({
            error:
              'Layanan pengiriman email OTP (SMTP) belum dikonfigurasi pada server. Demi keamanan, kode OTP hanya dikirim ke email terdaftar dan tidak pernah ditampilkan di layar. Hubungi Super Admin untuk reset sandi melalui menu Pengaturan PIC atau konfigurasi SMTP_USER & SMTP_PASS di Secrets.',
          });
          return;
        }

        const existing = otpStore.get(user.id);
        if (existing && Date.now() - existing.lastRequestedAt < 60 * 1000) {
          const waitSec = Math.ceil((60 * 1000 - (Date.now() - existing.lastRequestedAt)) / 1000);
          res.status(429).json({
            error: `Tunggu ${waitSec} detik sebelum meminta kode OTP baru.`,
          });
          return;
        }

        const otpCode = String(crypto.randomInt(100000, 1000000));
        otpStore.set(user.id, {
          userId: user.id,
          code: otpCode,
          expiresAt: Date.now() + 10 * 60 * 1000,
          attempts: 0,
          lastRequestedAt: Date.now(),
        });

        try {
          await sendOtpEmail(user.email, user.nama, otpCode);
        } catch (mailErr) {
          otpStore.delete(user.id);
          const errObj = mailErr as {
            code?: string;
            responseCode?: number;
            message?: string;
          };
          const isAuthRejected =
            errObj?.code === 'EAUTH' ||
            errObj?.responseCode === 535 ||
            (errObj?.message || '').includes('535');

          const configuredUser = cleanEnvValue(process.env.SMTP_USER);
          res.status(400).json({
            error: isAuthRejected
              ? `Autentikasi SMTP ditolak oleh server email untuk pengirim "${configuredUser}" (535 Username/Password not accepted). Gunakan akun Gmail pribadi (@gmail.com) dengan Verifikasi 2 Langkah aktif dan isi SMTP_PASS dengan 16 huruf Sandi Aplikasi (App Password) Google—bukan kata sandi akun biasa atau akun @dinas.belajar.id. Atau minta Super Admin mereset sandi melalui menu Pengaturan PIC.`
              : 'Gagal mengirim email OTP melalui server SMTP. Periksa konfigurasi SMTP_HOST, SMTP_PORT, SMTP_USER, dan SMTP_PASS.',
          });
          return;
        }

        res.json({
          ok: true,
          maskedEmail: maskEmail(user.email),
          timestamp: getWIBDateTimeNow(),
        });
        return;
      }

      if (action === 'confirm') {
        if (!user) {
          res.status(404).json({ error: 'Akun tidak ditemukan.' });
          return;
        }
        const entry = otpStore.get(user.id);
        if (!entry || entry.expiresAt < Date.now()) {
          otpStore.delete(user.id);
          res.status(400).json({ error: 'Kode OTP tidak valid atau sudah kedaluwarsa.' });
          return;
        }
        if (entry.attempts >= 5) {
          otpStore.delete(user.id);
          res.status(429).json({
            error: 'Terlalu banyak percobaan kode OTP salah. Silakan minta kode OTP baru.',
          });
          return;
        }
        if (entry.code !== (code || '').trim()) {
          entry.attempts += 1;
          res.status(400).json({
            error: 'Kode verifikasi 6 digit salah. Periksa kembali kotak masuk email Anda.',
          });
          return;
        }
        if (!newPassword || newPassword.trim().length < 6) {
          res.status(400).json({ error: 'Kata sandi baru minimal 6 karakter.' });
          return;
        }

        await rtdbPatch(`simbus/picUsers/${user.id}`, {
          password: hashPassword(newPassword.trim()),
        });
        otpStore.delete(user.id);

        res.json({ ok: true, message: 'Kata sandi berhasil diperbarui. Silakan login kembali.' });
        return;
      }

      res.status(400).json({ error: 'Aksi tidak dikenali.' });
    } catch (err) {
      console.error('Forgot password error:', err);
      res.status(502).json({
        error: 'Gagal mengakses layanan pemulihan kata sandi.',
      });
    }
  });

  // Authenticated PIC Management Endpoints (salted scrypt hashing on server)
  app.post(
    '/api/admin/pics',
    requireAdminPermission('pengaturan'),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const input = req.body as Partial<PicAdminUser>;
        if (!input.nama?.trim() || !input.username?.trim() || !input.email?.trim() || !input.password?.trim()) {
          res.status(400).json({ error: 'Nama, username, email, dan kata sandi wajib diisi.' });
          return;
        }
        if (input.password.trim().length < 6) {
          res.status(400).json({ error: 'Kata sandi minimal 6 karakter.' });
          return;
        }

        const picUsers = await fetchLivePicUsers();
        const duplicate = picUsers.some(
          (u) =>
            (u.username || '').toLowerCase() === input.username!.trim().toLowerCase() ||
            (u.email || '').toLowerCase() === input.email!.trim().toLowerCase()
        );
        if (duplicate) {
          res.status(409).json({ error: 'Username atau email dinas sudah terdaftar pada PIC lain.' });
          return;
        }

        const id = input.id?.trim() || `pic-${Date.now()}`;
        const record: PicAdminUser = {
          id,
          nama: input.nama.trim(),
          nip: (input.nip || '-').trim(),
          jabatan: (input.jabatan || 'Pengelola Aset OPD').trim(),
          email: input.email.trim(),
          username: input.username.trim(),
          password: hashPassword(input.password.trim()),
          peran: input.peran || 'Verifikator Proposal',
          hakAkses:
            Array.isArray(input.hakAkses) && input.hakAkses.length > 0
              ? input.hakAkses
              : ['dashboard', 'verifikasi', 'kalender'],
          aktif: input.aktif !== false,
          createdAt: input.createdAt || getWIBDateNow(),
        };

        await rtdbPut(
          `simbus/picUsers/${id}`,
          stripUndefined(record as unknown as Record<string, unknown>)
        );

        res.status(201).json({ user: sanitizePic(record) });
      } catch (err) {
        console.error('Create PIC error:', err);
        res.status(502).json({ error: 'Gagal menyimpan data PIC ke Firebase Realtime Database.' });
      }
    }
  );

  app.put(
    '/api/admin/pics/:id',
    requireAdminPermission('pengaturan'),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { id } = req.params;
        const input = req.body as Partial<PicAdminUser>;
        const picUsers = await fetchLivePicUsers();
        const existing = picUsers.find((u) => u.id === id);
        if (!existing) {
          res.status(404).json({ error: 'Data PIC tidak ditemukan.' });
          return;
        }

        const nextUsername = input.username !== undefined ? input.username.trim() : existing.username;
        const nextEmail = input.email !== undefined ? input.email.trim() : existing.email;
        const duplicate = picUsers.some(
          (u) =>
            u.id !== id &&
            ((u.username || '').toLowerCase() === nextUsername.toLowerCase() ||
              (u.email || '').toLowerCase() === nextEmail.toLowerCase())
        );
        if (duplicate) {
          res.status(409).json({ error: 'Username atau email dinas sudah terdaftar pada PIC lain.' });
          return;
        }

        if (input.password && input.password.trim().length > 0 && input.password.trim().length < 6) {
          res.status(400).json({ error: 'Kata sandi baru minimal 6 karakter.' });
          return;
        }

        const patch: Record<string, unknown> = {
          nama: input.nama !== undefined ? input.nama.trim() : existing.nama,
          nip: input.nip !== undefined ? input.nip.trim() : existing.nip,
          jabatan: input.jabatan !== undefined ? input.jabatan.trim() : existing.jabatan,
          email: nextEmail,
          username: nextUsername,
          peran: input.peran ?? existing.peran,
          hakAkses:
            Array.isArray(input.hakAkses) && input.hakAkses.length > 0
              ? input.hakAkses
              : existing.hakAkses,
          aktif: input.aktif !== undefined ? input.aktif : existing.aktif,
        };

        if (input.password && input.password.trim().length >= 6) {
          patch.password = hashPassword(input.password.trim());
        }

        await rtdbPatch(`simbus/picUsers/${id}`, patch);
        const updatedUser = sanitizePic({ ...existing, ...(patch as Partial<PicAdminUser>) });
        res.json({ user: updatedUser });
      } catch (err) {
        console.error('Update PIC error:', err);
        res.status(502).json({ error: 'Gagal memperbarui data PIC di Firebase Realtime Database.' });
      }
    }
  );

  app.delete(
    '/api/admin/pics/:id',
    requireAdminPermission('pengaturan'),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { id } = req.params;
        if (req.adminUser?.id === id) {
          res.status(400).json({ error: 'Tidak dapat menghapus akun PIC yang sedang login.' });
          return;
        }
        await rtdbDelete(`simbus/picUsers/${id}`);
        res.json({ ok: true });
      } catch (err) {
        console.error('Delete PIC error:', err);
        res.status(502).json({ error: 'Gagal menghapus akun PIC dari Firebase Realtime Database.' });
      }
    }
  );

  // Serve existing /src/assets/images/* paths reliably in both dev and production builds
  app.use('/src/assets/images', express.static(path.resolve(__dirname, 'src/assets/images')));

  // Frontend middleware / static serving
  const isProd =
    process.env.NODE_ENV === 'production' && fs.existsSync(path.resolve(__dirname, 'dist'));
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distDir, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`SIMBUS server running on http://0.0.0.0:${port} (Firebase RTDB)`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start SIMBUS server:', err);
  process.exit(1);
});
