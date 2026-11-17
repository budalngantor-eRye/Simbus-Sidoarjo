import { CheckCircle2, Clock, Wrench, XCircle } from 'lucide-react';
import { BookingStatus, BusStatus } from '../types';

interface BookingStatusProps {
  status: BookingStatus;
  compact?: boolean;
}

export function BookingStatusLabel({ status, compact = false }: BookingStatusProps) {
  if (status === 'Disetujui') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-medium text-emerald-700 ${
          compact ? 'text-xs' : 'text-xs px-2.5 py-1 rounded bg-emerald-50 border border-emerald-200'
        } whitespace-nowrap`}
      >
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
        <span>Disetujui</span>
      </span>
    );
  }
  if (status === 'Menunggu Verifikasi') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-medium text-amber-700 ${
          compact ? 'text-xs' : 'text-xs px-2.5 py-1 rounded bg-amber-50 border border-amber-200'
        } whitespace-nowrap`}
      >
        <Clock className="w-3.5 h-3.5 shrink-0 text-amber-600" />
        <span>Menunggu Verifikasi</span>
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium text-rose-700 ${
        compact ? 'text-xs' : 'text-xs px-2.5 py-1 rounded bg-rose-50 border border-rose-200'
      } whitespace-nowrap`}
    >
      <XCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
      <span>Ditolak</span>
    </span>
  );
}

interface BusStatusProps {
  status: BusStatus;
}

export function BusStatusLabel({ status }: BusStatusProps) {
  if (status === 'Aktif') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded whitespace-nowrap">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
        <span>Aktif / Tersedia</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded whitespace-nowrap">
      <Wrench className="w-3.5 h-3.5 shrink-0 text-rose-600" />
      <span>Dalam Perawatan</span>
    </span>
  );
}
