import React, { useState } from 'react';
import {
  CheckCircle2,
  Edit3,
  Plus,
  Shield,
  Trash2,
  UserCheck,
  UserX,
  X,
} from 'lucide-react';
import { AdminPermissionKey, PicAdminUser } from '../../types';
import { getTodayWIBDateStr } from '../../utils/bookingUtils';

interface AdminSettingsViewProps {
  picUsers: PicAdminUser[];
  currentAdminUser: PicAdminUser;
  onAddPic: (user: PicAdminUser) => Promise<void>;
  onUpdatePic: (user: PicAdminUser) => Promise<void>;
  onDeletePic: (userId: string) => Promise<void>;
}

const ALL_PERMISSIONS: Array<{ key: AdminPermissionKey; label: string; desc: string }> = [
  {
    key: 'dashboard',
    label: 'Dashboard Operasional',
    desc: 'Melihat ringkasan KPI armada & grafik bulanan',
  },
  {
    key: 'verifikasi',
    label: 'Antrean Verifikasi',
    desc: 'Memeriksa proposal, menyetujui, dan menolak pengajuan',
  },
  {
    key: 'kalender',
    label: 'Kalender Jadwal',
    desc: 'Memantau jadwal pemakaian bus lintas armada',
  },
  {
    key: 'armada',
    label: 'Master Armada Bus',
    desc: 'Menambah, mengubah data bus, sopir & status perawatan',
  },
  {
    key: 'laporan',
    label: 'Laporan & Rekap Periodik',
    desc: 'Mengakses laporan bulanan/triwulan/semester & ekspor CSV/PDF',
  },
  {
    key: 'pengaturan',
    label: 'Pengaturan PIC & Hak Akses',
    desc: 'Menambah/mengubah akun pengelola dan hak akses menu',
  },
];

export function AdminSettingsView({
  picUsers,
  currentAdminUser,
  onAddPic,
  onUpdatePic,
  onDeletePic,
}: AdminSettingsViewProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<PicAdminUser | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [tableError, setTableError] = useState('');

  const [nama, setNama] = useState('');
  const [nip, setNip] = useState('');
  const [jabatan, setJabatan] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [peran, setPeran] = useState<PicAdminUser['peran']>('Verifikator Proposal');
  const [hakAkses, setHakAkses] = useState<AdminPermissionKey[]>([
    'dashboard',
    'verifikasi',
    'kalender',
  ]);
  const [aktif, setAktif] = useState(true);
  const [formError, setFormError] = useState('');

  const openAddModal = () => {
    setEditingUser(null);
    setNama('');
    setNip('');
    setJabatan('');
    setEmail('');
    setUsername('');
    setPassword('');
    setPeran('Verifikator Proposal');
    setHakAkses(['dashboard', 'verifikasi', 'kalender', 'laporan']);
    setAktif(true);
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (u: PicAdminUser) => {
    setEditingUser(u);
    setNama(u.nama);
    setNip(u.nip);
    setJabatan(u.jabatan);
    setEmail(u.email);
    setUsername(u.username);
    setPassword('');
    setPeran(u.peran);
    setHakAkses(Array.isArray(u.hakAkses) ? u.hakAkses : []);
    setAktif(u.aktif);
    setFormError('');
    setModalOpen(true);
  };

  const handleRolePreset = (nextRole: PicAdminUser['peran']) => {
    setPeran(nextRole);
    if (nextRole === 'Super Admin') {
      setHakAkses(['dashboard', 'verifikasi', 'kalender', 'armada', 'laporan', 'pengaturan']);
    } else if (nextRole === 'Verifikator Proposal') {
      setHakAkses(['dashboard', 'verifikasi', 'kalender', 'laporan']);
    } else {
      setHakAkses(['dashboard', 'kalender', 'armada', 'laporan']);
    }
  };

  const togglePermission = (key: AdminPermissionKey) => {
    setHakAkses((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!nama.trim() || !username.trim() || !email.trim() || (!editingUser && !password.trim())) {
      setFormError('Nama, username, email dinas, dan kata sandi wajib diisi.');
      return;
    }

    if (password.trim() && password.trim().length < 6) {
      setFormError('Kata sandi minimal 6 karakter.');
      return;
    }

    if (hakAkses.length === 0) {
      setFormError('Pilih minimal 1 hak akses menu untuk PIC.');
      return;
    }

    const duplicateUsername = picUsers.some(
      (u) =>
        u.id !== editingUser?.id &&
        ((u.username || '').toLowerCase() === username.trim().toLowerCase() ||
          (u.email || '').toLowerCase() === email.trim().toLowerCase())
    );
    if (duplicateUsername) {
      setFormError('Username atau email dinas sudah terdaftar pada PIC lain.');
      return;
    }

    setSaving(true);
    try {
      if (editingUser) {
        await onUpdatePic({
          ...editingUser,
          nama: nama.trim(),
          nip: nip.trim() || '-',
          jabatan: jabatan.trim() || 'Pengelola Aset OPD',
          email: email.trim(),
          username: username.trim(),
          password: password.trim(),
          peran,
          hakAkses,
          aktif,
        });
      } else {
        await onAddPic({
          id: `pic-${Date.now()}`,
          nama: nama.trim(),
          nip: nip.trim() || '-',
          jabatan: jabatan.trim() || 'Pengelola Aset OPD',
          email: email.trim(),
          username: username.trim(),
          password: password.trim(),
          peran,
          hakAkses,
          aktif,
          createdAt: getTodayWIBDateStr(),
        });
      }
      setModalOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal menyimpan pengaturan PIC.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (u: PicAdminUser) => {
    setTableError('');
    setTogglingId(u.id);
    try {
      await onUpdatePic({ ...u, aktif: !u.aktif });
    } catch (err) {
      setTableError(err instanceof Error ? err.message : 'Gagal mengubah status PIC.');
    } finally {
      setTogglingId(null);
    }
  };

  const handleConfirmDelete = async (userId: string) => {
    setTableError('');
    setDeletingId(userId);
    try {
      await onDeletePic(userId);
      setDeleteConfirmId(null);
    } catch (err) {
      setTableError(err instanceof Error ? err.message : 'Gagal menghapus akun PIC.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Pengaturan PIC &amp; Hak Akses Pengelola Aset OPD
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Tambahkan pegawai yang berwenang mengakses panel Pengelola Aset OPD beserta pembatasan
            hak akses menu masing-masing PIC.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-blue-900 rounded-lg hover:bg-blue-800 transition-colors self-start whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah PIC Pengelola</span>
        </button>
      </div>

      {tableError && (
        <div
          role="alert"
          className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center justify-between gap-3"
        >
          <span>{tableError}</span>
          <button
            type="button"
            onClick={() => setTableError('')}
            className="text-rose-700 font-semibold"
          >
            Tutup
          </button>
        </div>
      )}

      {/* PIC List Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-3.5 px-4">Nama PIC &amp; Jabatan</th>
                <th className="py-3.5 px-4">Akun Login</th>
                <th className="py-3.5 px-4">Peran &amp; Hak Akses Menu</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Pengaturan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {picUsers.map((u) => {
                const isSelf = u.id === currentAdminUser.id;
                const userPermissions = Array.isArray(u.hakAkses) ? u.hakAkses : [];
                return (
                  <tr key={u.id} className="hover:bg-slate-50/70 align-top">
                    <td className="py-4 px-4 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{u.nama}</span>
                        {isSelf && (
                          <span className="text-[11px] font-semibold text-blue-900 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                            Sedang Login
                          </span>
                        )}
                      </div>
                      <p className="text-slate-600">{u.jabatan}</p>
                      <p className="text-slate-500 font-mono-tabular">NIP: {u.nip}</p>
                    </td>

                    <td className="py-4 px-4 space-y-1">
                      <p className="font-mono-tabular font-semibold text-blue-900">{u.username}</p>
                      <p className="text-slate-600">{u.email}</p>
                      <p className="text-[11px] text-slate-400">Ditambahkan {u.createdAt}</p>
                    </td>

                    <td className="py-4 px-4 space-y-2 max-w-sm">
                      <p className="font-semibold text-slate-900 inline-flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-blue-900 shrink-0" />
                        <span>{u.peran}</span>
                      </p>
                      <p className="text-slate-600 leading-relaxed">
                        {userPermissions
                          .map(
                            (k) =>
                              ALL_PERMISSIONS.find((p) => p.key === k)?.label || k
                          )
                          .join(' · ') || 'Belum ada hak akses'}
                      </p>
                    </td>

                    <td className="py-4 px-4">
                      {u.aktif ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded whitespace-nowrap">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Aktif</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded whitespace-nowrap">
                          <UserX className="w-3.5 h-3.5 text-rose-600" />
                          <span>Nonaktif</span>
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-4 text-right">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          disabled={isSelf || togglingId === u.id}
                          onClick={() => handleToggleActive(u)}
                          title={
                            isSelf
                              ? 'Tidak dapat menonaktifkan akun yang sedang digunakan'
                              : u.aktif
                              ? 'Nonaktifkan akses PIC'
                              : 'Aktifkan akses PIC'
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>
                            {togglingId === u.id
                              ? 'Menyimpan...'
                              : u.aktif
                              ? 'Nonaktifkan'
                              : 'Aktifkan'}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => openEditModal(u)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-900 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 whitespace-nowrap"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit Akses</span>
                        </button>

                        {deleteConfirmId === u.id ? (
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              disabled={deletingId === u.id}
                              onClick={() => handleConfirmDelete(u.id)}
                              className="px-2 py-1.5 text-xs font-semibold text-white bg-rose-600 rounded-md disabled:opacity-50"
                            >
                              {deletingId === u.id ? 'Menghapus...' : 'Hapus'}
                            </button>
                            <button
                              type="button"
                              disabled={deletingId === u.id}
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-2 py-1.5 text-xs text-slate-600 bg-white border border-slate-300 rounded-md"
                            >
                              Batal
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={isSelf}
                            onClick={() => setDeleteConfirmId(u.id)}
                            title={
                              isSelf
                                ? 'Tidak dapat menghapus akun yang sedang login'
                                : 'Hapus PIC'
                            }
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-md disabled:opacity-30 disabled:cursor-not-allowed"
                            aria-label={`Hapus ${u.nama}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit PIC Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pic-modal-title"
        >
          <div className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50 shrink-0">
              <h3 id="pic-modal-title" className="text-sm font-bold text-slate-900">
                {editingUser ? `Edit Hak Akses PIC — ${editingUser.nama}` : 'Tambah PIC Pengelola Aset OPD'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-500 hover:text-slate-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nama Lengkap &amp; Gelar *
                  </label>
                  <input
                    type="text"
                    required
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    placeholder="Contoh: Budi Hartono, S.Sos."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">NIP Pegawai</label>
                  <input
                    type="text"
                    value={nip}
                    onChange={(e) => setNip(e.target.value)}
                    placeholder="19850101 201001 1 002"
                    className="w-full px-3 py-2 font-mono-tabular border border-slate-300 rounded-lg focus:outline-none focus:border-blue-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Jabatan</label>
                  <input
                    type="text"
                    value={jabatan}
                    onChange={(e) => setJabatan(e.target.value)}
                    placeholder="Staf Subbag Umum / Verifikator"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email Dinas *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="pegawai@disdikbudsidoarjo.go.id"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Username Login *</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="budi.aset"
                    className="w-full px-3 py-2 font-mono-tabular border border-slate-300 rounded-lg focus:outline-none focus:border-blue-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {editingUser ? 'Kata Sandi Baru (Opsional)' : 'Kata Sandi *'}
                  </label>
                  <input
                    type="password"
                    required={!editingUser}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={
                      editingUser
                        ? 'Kosongkan jika tidak ingin mengubah'
                        : 'Minimal 6 karakter'
                    }
                    className="w-full px-3 py-2 font-mono-tabular border border-slate-300 rounded-lg focus:outline-none focus:border-blue-900"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 space-y-2">
                <label className="block font-semibold text-slate-700">
                  Template Peran PIC
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Super Admin', 'Verifikator Proposal', 'Pengelola Armada'] as const).map(
                    (roleOpt) => (
                      <button
                        key={roleOpt}
                        type="button"
                        onClick={() => handleRolePreset(roleOpt)}
                        className={`px-3 py-2 rounded-lg border text-center font-medium transition-colors ${
                          peran === roleOpt
                            ? 'bg-blue-900 text-white border-blue-900'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {roleOpt}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block font-semibold text-slate-700">
                  Hak Akses Menu yang Diizinkan *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ALL_PERMISSIONS.map((perm) => {
                    const checked = hakAkses.includes(perm.key);
                    return (
                      <label
                        key={perm.key}
                        className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                          checked
                            ? 'bg-blue-50/70 border-blue-300'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => togglePermission(perm.key)}
                          className="mt-0.5 rounded border-slate-300 text-blue-900 focus:ring-blue-900"
                        />
                        <div>
                          <span className="font-semibold text-slate-900 block">{perm.label}</span>
                          <span className="text-[11px] text-slate-500">{perm.desc}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <label className="inline-flex items-center gap-2 font-medium text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={aktif}
                  onChange={(e) => setAktif(e.target.checked)}
                  className="rounded border-slate-300 text-blue-900 focus:ring-blue-900"
                />
                <span>Akun PIC aktif dan diizinkan login</span>
              </label>

              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800">
                  {formError}
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2.5">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 font-semibold text-white bg-blue-900 rounded-lg hover:bg-blue-800 disabled:opacity-50"
                >
                  {saving ? 'Menyimpan...' : 'Simpan Pengaturan PIC'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
