import { get, onValue, ref, remove, set, update } from 'firebase/database';
import { INITIAL_BOOKINGS, INITIAL_BUSES, INITIAL_PIC_USERS } from '../data/mockData';
import { rtdb } from '../firebase';
import { Booking, BookingStatus, Bus, PicAdminUser } from '../types';
import {
  datesOverlap,
  generateBookingCode,
  getNowWIBDateTimeStr,
} from '../utils/bookingUtils';

function stripUndefined<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      clean[k] = v;
    }
  }
  return clean;
}

function normalizePic(user: PicAdminUser): PicAdminUser {
  const { password: _removed, ...rest } = user;
  return {
    ...rest,
    hakAkses: Array.isArray(user.hakAkses) ? user.hakAkses : [],
    aktif: user.aktif !== false,
  };
}

function recordToArray<T>(val: Record<string, T> | null | undefined): T[] {
  if (!val || typeof val !== 'object') return [];
  return Object.values(val).filter((item): item is T => Boolean(item && typeof item === 'object'));
}

let seedPromise: Promise<void> | null = null;

export async function ensureFirebaseSeeded(): Promise<void> {
  if (seedPromise) return seedPromise;
  seedPromise = (async () => {
    const metaSnap = await get(ref(rtdb, 'simbus/meta/seeded'));
    if (metaSnap.exists() && metaSnap.val() === true) {
      return;
    }

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
      picMap[u.id] = stripUndefined(u as unknown as Record<string, unknown>);
    }

    await update(ref(rtdb, 'simbus'), {
      buses: busesMap,
      bookings: bookingsMap,
      picUsers: picMap,
      meta: {
        seeded: true,
        seededAt: getNowWIBDateTimeStr(),
      },
    });
  })().catch((err) => {
    seedPromise = null;
    throw err;
  });

  return seedPromise;
}

export function subscribePublicSimbusRealtime(handlers: {
  onBuses: (buses: Bus[]) => void;
  onBookings: (bookings: Booking[]) => void;
  onError?: (err: Error) => void;
}): () => void {
  const unsubBuses = onValue(
    ref(rtdb, 'simbus/buses'),
    (snap) => {
      const list = recordToArray<Bus>(snap.val());
      list.sort((a, b) => (a.id || '').localeCompare(b.id || ''));
      handlers.onBuses(list);
    },
    (err) => handlers.onError?.(err)
  );

  const unsubBookings = onValue(
    ref(rtdb, 'simbus/bookings'),
    (snap) => {
      const list = recordToArray<Booking>(snap.val());
      list.sort((a, b) => {
        const cmp = (b.createdAt || '').localeCompare(a.createdAt || '');
        if (cmp !== 0) return cmp;
        return (b.kodeBooking || '').localeCompare(a.kodeBooking || '');
      });
      handlers.onBookings(list);
    },
    (err) => handlers.onError?.(err)
  );

  return () => {
    unsubBuses();
    unsubBookings();
  };
}

export function subscribePicUsersRealtime(handlers: {
  onPicUsers: (users: PicAdminUser[]) => void;
  onError?: (err: Error) => void;
}): () => void {
  return onValue(
    ref(rtdb, 'simbus/picUsers'),
    (snap) => {
      const list = recordToArray<PicAdminUser>(snap.val()).map(normalizePic);
      list.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
      handlers.onPicUsers(list);
    },
    (err) => handlers.onError?.(err)
  );
}

export async function createBookingRealtime(
  input: Omit<Booking, 'id' | 'kodeBooking' | 'createdAt' | 'status'>
): Promise<Booking> {
  const [busesSnap, bookingsSnap] = await Promise.all([
    get(ref(rtdb, 'simbus/buses')),
    get(ref(rtdb, 'simbus/bookings')),
  ]);

  const currentBuses = recordToArray<Bus>(busesSnap.val());
  const currentBookings = recordToArray<Booking>(bookingsSnap.val());

  const targetBus = currentBuses.find((b) => b.id === input.busId);
  if (!targetBus) {
    throw new Error('Armada bus tidak ditemukan.');
  }
  if (targetBus.status === 'Dalam Perawatan') {
    throw new Error(`${targetBus.nama} sedang dalam perawatan berkala.`);
  }

  const conflict = currentBookings.find(
    (b) =>
      b.busId === input.busId &&
      b.status === 'Disetujui' &&
      datesOverlap(input.tanggalMulai, input.tanggalSelesai, b.tanggalMulai, b.tanggalSelesai)
  );
  if (conflict) {
    throw new Error(
      `Jadwal bentrok dengan peminjaman Disetujui (${conflict.kodeBooking} - ${conflict.namaSekolah}).`
    );
  }

  const newBooking: Booking = {
    ...input,
    id: `bk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    kodeBooking: generateBookingCode(currentBookings, input.tanggalMulai),
    status: 'Menunggu Verifikasi',
    createdAt: getNowWIBDateTimeStr(),
  };

  await set(
    ref(rtdb, `simbus/bookings/${newBooking.id}`),
    stripUndefined(newBooking as unknown as Record<string, unknown>)
  );

  return newBooking;
}

export async function updateBookingStatusRealtime(
  target: Booking,
  status: Extract<BookingStatus, 'Disetujui' | 'Ditolak'>,
  verifikator: string,
  alasanPenolakan?: string
): Promise<Booking> {
  if (status === 'Disetujui') {
    const bookingsSnap = await get(ref(rtdb, 'simbus/bookings'));
    const currentBookings = recordToArray<Booking>(bookingsSnap.val());
    const conflict = currentBookings.find(
      (b) =>
        b.id !== target.id &&
        b.busId === target.busId &&
        b.status === 'Disetujui' &&
        datesOverlap(target.tanggalMulai, target.tanggalSelesai, b.tanggalMulai, b.tanggalSelesai)
    );
    if (conflict) {
      throw new Error(
        `Tidak dapat disetujui karena bentrok dengan ${conflict.kodeBooking} (${conflict.namaSekolah}).`
      );
    }
  }

  const verifiedAt = getNowWIBDateTimeStr();
  const patch: Record<string, unknown> = {
    status,
    verifiedAt,
    verifikator,
    alasanPenolakan: status === 'Ditolak' ? (alasanPenolakan || '').trim() : null,
  };

  await update(ref(rtdb, `simbus/bookings/${target.id}`), patch);

  return {
    ...target,
    status,
    verifiedAt,
    verifikator,
    alasanPenolakan: status === 'Ditolak' ? (alasanPenolakan || '').trim() : undefined,
  };
}

export async function saveBusRealtime(bus: Bus): Promise<void> {
  await set(
    ref(rtdb, `simbus/buses/${bus.id}`),
    stripUndefined(bus as unknown as Record<string, unknown>)
  );
}

export async function deleteBusRealtime(busId: string): Promise<void> {
  await remove(ref(rtdb, `simbus/buses/${busId}`));
}
