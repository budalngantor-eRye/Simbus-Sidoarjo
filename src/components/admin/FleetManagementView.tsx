import React, { useState } from 'react';
import { Bus as BusIcon, Edit3, Plus, Trash2, Users, Wrench, X } from 'lucide-react';
import { Bus, BusStatus } from '../../types';
import { getWIBDateParts } from '../../utils/bookingUtils';
import { BusStatusLabel } from '../StatusBadge';

interface FleetManagementViewProps {
  buses: Bus[];
  onAddBus: (bus: Bus) => Promise<void>;
  onUpdateBus: (bus: Bus) => Promise<void>;
  onDeleteBus: (busId: string) => Promise<void>;
}

export function FleetManagementView({
  buses,
  onAddBus,
  onUpdateBus,
  onDeleteBus,
}: FleetManagementViewProps) {
  const currentYear = getWIBDateParts().year;
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBus, setEditingBus] = useState<Bus | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [cardError, setCardError] = useState('');

  const [nama, setNama] = useState('');
  const [nopol, setNopol] = useState('');
  const [kapasitas, setKapasitas] = useState('40');
  const [sopir, setSopir] = useState('');
  const [teleponSopir, setTeleponSopir] = useState('');
  const [tahun, setTahun] = useState(String(currentYear));
  const [status, setStatus] = useState<BusStatus>('Aktif');
  const [keterangan, setKeterangan] = useState('');

  const openAddModal = () => {
    setEditingBus(null);
    setNama('');
    setNopol('');
    setKapasitas('40');
    setSopir('');
    setTeleponSopir('');
    setTahun(String(currentYear));
    setStatus('Aktif');
    setKeterangan('');
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (bus: Bus) => {
    setEditingBus(bus);
    setNama(bus.nama);
    setNopol(bus.nopol);
    setKapasitas(String(bus.kapasitas));
    setSopir(bus.sopir);
    setTeleponSopir(bus.teleponSopir);
    setTahun(String(bus.tahun));
    setStatus(bus.status);
    setKeterangan(bus.keterangan || '');
    setFormError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!nama.trim() || !nopol.trim() || !sopir.trim()) {
      setFormError('Nama armada, nomor polisi, dan nama sopir wajib diisi.');
      return;
    }

    setSaving(true);
    try {
      if (editingBus) {
        await onUpdateBus({
          ...editingBus,
          nama: nama.trim(),
          nopol: nopol.trim().toUpperCase(),
          kapasitas: Math.max(10, parseInt(kapasitas, 10) || 35),
          sopir: sopir.trim(),
          teleponSopir: teleponSopir.trim() || '-',
          tahun: parseInt(tahun, 10) || currentYear,
          status,
          keterangan: keterangan.trim(),
        });
      } else {
        const nextIndex = buses.length + 1;
        await onAddBus({
          id: `BUS-${String(nextIndex).padStart(2, '0')}-${Date.now().toString().slice(-3)}`,
          nama: nama.trim(),
          nopol: nopol.trim().toUpperCase(),
          kapasitas: Math.max(10, parseInt(kapasitas, 10) || 35),
          sopir: sopir.trim(),
          teleponSopir: teleponSopir.trim() || '0812-0000-0000',
          tahun: parseInt(tahun, 10) || currentYear,
          status,
          fotoUrl:
            nextIndex % 2 === 0
              ? '/src/assets/images/bus_pendidikan_02_1794887455710.jpg'
              : '/src/assets/images/bus_pendidikan_01_1794887453686.jpg',
          keterangan:
            keterangan.trim() ||
            'Armada operasional pembelajaran luar kelas Dinas Pendidikan dan Kebudayaan Kab. Sidoarjo.',
        });
      }
      setModalOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal menyimpan data armada bus.');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatusQuick = async (bus: Bus) => {
    setCardError('');
    setTogglingId(bus.id);
    try {
      await onUpdateBus({
        ...bus,
        status: bus.status === 'Aktif' ? 'Dalam Perawatan' : 'Aktif',
      });
    } catch (err) {
      setCardError(err instanceof Error ? err.message : 'Gagal mengubah status armada bus.');
    } finally {
      setTogglingId(null);
    }
  };

  const handleConfirmDelete = async (busId: string) => {
    setCardError('');
    setDeletingId(busId);
    try {
      await onDeleteBus(busId);
      setDeleteConfirmId(null);
    } catch (err) {
      setCardError(err instanceof Error ? err.message : 'Gagal menghapus armada bus.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Manajemen Master Armada Bus
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola daftar kendaraan dinas, kapasitas kursi, data pengemudi, dan status kelayakan
            operasional.
          </p>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-blue-900 rounded-lg hover:bg-blue-800 transition-colors self-start whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Armada Bus</span>
        </button>
      </div>

      {cardError && (
        <div
          role="alert"
          className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center justify-between gap-3"
        >
          <span>{cardError}</span>
          <button
            type="button"
            onClick={() => setCardError('')}
            className="text-rose-700 font-semibold"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Fleet Table / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {buses.map((bus) => (
          <div
            key={bus.id}
            className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col justify-between"
          >
            <div>
              <div className="aspect-video bg-slate-100 overflow-hidden">
                <img
                  src={bus.fotoUrl}
                  alt={bus.nama}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">{bus.nama}</h2>
                    <p className="text-xs font-mono-tabular text-slate-500">
                      Nopol {bus.nopol} · Tahun {bus.tahun}
                    </p>
                  </div>
                  <BusStatusLabel status={bus.status} />
                </div>

                <div className="text-xs text-slate-700 space-y-1.5 pt-1">
                  <p className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="tabular-nums font-medium">
                      Kapasitas {bus.kapasitas} Kursi
                    </span>
                  </p>
                  <p className="flex items-center gap-2">
                    <BusIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>
                      Sopir: <strong>{bus.sopir}</strong> ({bus.teleponSopir})
                    </span>
                  </p>
                </div>

                {bus.keterangan && (
                  <p className="text-xs text-slate-500 leading-relaxed">{bus.keterangan}</p>
                )}
              </div>
            </div>

            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                disabled={togglingId === bus.id}
                onClick={() => toggleStatusQuick(bus)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-50 transition-colors"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>
                  {togglingId === bus.id
                    ? 'Menyimpan...'
                    : bus.status === 'Aktif'
                    ? 'Set Perawatan'
                    : 'Set Aktif'}
                </span>
              </button>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => openEditModal(bus)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-900 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>

                {deleteConfirmId === bus.id ? (
                  <div className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      disabled={deletingId === bus.id}
                      onClick={() => handleConfirmDelete(bus.id)}
                      className="px-2 py-1.5 text-xs font-semibold text-white bg-rose-600 rounded-md hover:bg-rose-700 disabled:opacity-50"
                    >
                      {deletingId === bus.id ? 'Menghapus...' : 'Hapus'}
                    </button>
                    <button
                      type="button"
                      disabled={deletingId === bus.id}
                      onClick={() => setDeleteConfirmId(null)}
                      className="px-2 py-1.5 text-xs text-slate-600 bg-white border border-slate-300 rounded-md"
                    >
                      Batal
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={buses.length <= 1}
                    onClick={() => setDeleteConfirmId(bus.id)}
                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-md disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label={`Hapus ${bus.nama}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bus-modal-title"
        >
          <div className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
              <h3 id="bus-modal-title" className="text-sm font-bold text-slate-900">
                {editingBus ? `Edit Data ${editingBus.nama}` : 'Tambah Armada Bus Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-500 hover:text-slate-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Nama Armada *</label>
                  <input
                    type="text"
                    required
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    placeholder="Contoh: Bus Pendidikan 04"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nomor Polisi *</label>
                  <input
                    type="text"
                    required
                    value={nopol}
                    onChange={(e) => setNopol(e.target.value)}
                    placeholder="W 7004 NP"
                    className="w-full px-3 py-2 font-mono-tabular border border-slate-300 rounded-lg focus:outline-none focus:border-blue-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Kapasitas Kursi *
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={60}
                    required
                    value={kapasitas}
                    onChange={(e) => setKapasitas(e.target.value)}
                    className="w-full px-3 py-2 font-mono-tabular border border-slate-300 rounded-lg focus:outline-none focus:border-blue-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Sopir *</label>
                  <input
                    type="text"
                    required
                    value={sopir}
                    onChange={(e) => setSopir(e.target.value)}
                    placeholder="Nama lengkap sopir"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Telepon Sopir</label>
                  <input
                    type="text"
                    value={teleponSopir}
                    onChange={(e) => setTeleponSopir(e.target.value)}
                    placeholder="0812-xxxx-xxxx"
                    className="w-full px-3 py-2 font-mono-tabular border border-slate-300 rounded-lg focus:outline-none focus:border-blue-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tahun Pengadaan</label>
                  <input
                    type="number"
                    min={2015}
                    max={2027}
                    value={tahun}
                    onChange={(e) => setTahun(e.target.value)}
                    className="w-full px-3 py-2 font-mono-tabular border border-slate-300 rounded-lg focus:outline-none focus:border-blue-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Status Operasional
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as BusStatus)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-blue-900"
                  >
                    <option value="Aktif">Aktif / Tersedia</option>
                    <option value="Dalam Perawatan">Dalam Perawatan</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Keterangan</label>
                  <textarea
                    rows={2}
                    value={keterangan}
                    onChange={(e) => setKeterangan(e.target.value)}
                    placeholder="Catatan spesifikasi atau jadwal perawatan armada..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-900"
                  />
                </div>
              </div>

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
                  className="px-4 py-2 font-semibold text-white bg-blue-900 rounded-lg hover:bg-blue-800 disabled:opacity-50"
                >
                  {saving ? 'Menyimpan...' : 'Simpan Data Armada'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
