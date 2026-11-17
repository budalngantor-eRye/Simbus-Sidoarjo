import { Booking, Bus } from '../types';

export const BULAN_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export const HARI_SINGKAT_ID = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

export function getWIBDateParts(date: Date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== 'literal') map[p.type] = p.value;
  }
  const year = Number(map.year);
  const month = Number(map.month); // 1-12
  const day = Number(map.day);
  const hour = map.hour === '24' ? '00' : map.hour;
  const minute = map.minute;
  return {
    year,
    month,
    day,
    dateStr: `${map.year}-${map.month}-${map.day}`,
    timeStr: `${hour}:${minute}`,
    dateTimeStr: `${map.year}-${map.month}-${map.day} ${hour}:${minute}`,
  };
}

export function getTodayWIBDateStr(): string {
  return getWIBDateParts().dateStr;
}

export function getNowWIBDateTimeStr(): string {
  return getWIBDateParts().dateTimeStr;
}

export function getTodayWIBFormatted(): string {
  return formatTanggalID(getTodayWIBDateStr());
}

export function formatTanggalID(dateStr: string): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return dateStr;
  const [year, month, day] = parts;
  return `${day} ${BULAN_ID[month - 1]} ${year}`;
}

export function formatRentangTanggal(start: string, end: string): string {
  if (start === end) return formatTanggalID(start);
  const s = start.split('-').map(Number);
  const e = end.split('-').map(Number);
  if (s.length === 3 && e.length === 3 && s[0] === e[0] && s[1] === e[1]) {
    return `${s[2]}–${e[2]} ${BULAN_ID[s[1] - 1]} ${s[0]}`;
  }
  return `${formatTanggalID(start)} s.d. ${formatTanggalID(end)}`;
}

export function countDurationDays(start: string, end: string): number {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return 1;
  const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, diff);
}

export function datesOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  return startA <= endB && endA >= startB;
}

export function isDateInRange(dateStr: string, start: string, end: string): boolean {
  return dateStr >= start && dateStr <= end;
}

export function findApprovedConflicts(
  bookings: Booking[],
  busId: string,
  startDate: string,
  endDate: string,
  excludeBookingId?: string
): Booking[] {
  if (!busId || !startDate || !endDate) return [];
  return bookings.filter(
    (b) =>
      b.id !== excludeBookingId &&
      b.busId === busId &&
      b.status === 'Disetujui' &&
      datesOverlap(startDate, endDate, b.tanggalMulai, b.tanggalSelesai)
  );
}

export function findAllOverlappingBookings(
  bookings: Booking[],
  target: Booking
): Booking[] {
  return bookings.filter(
    (b) =>
      b.id !== target.id &&
      b.busId === target.busId &&
      b.status !== 'Ditolak' &&
      datesOverlap(target.tanggalMulai, target.tanggalSelesai, b.tanggalMulai, b.tanggalSelesai)
  );
}

export function generateBookingCode(bookings: Booking[], startDate: string): string {
  const ym = startDate
    ? startDate.slice(0, 7).replace('-', '')
    : getTodayWIBDateStr().slice(0, 7).replace('-', '');
  const existingNumbers = bookings
    .map((b) => {
      const match = (b.kodeBooking || '').match(/BK-\d{6}-(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((n) => !isNaN(n));
  const nextNum = (existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0) + 1;
  return `BK-${ym}-${String(nextNum).padStart(3, '0')}`;
}

export type ReportPeriodType = 'bulanan' | 'triwulanan' | 'semesteran';

export function filterBookingsByPeriod(
  bookings: Booking[],
  periodType: ReportPeriodType,
  periodValue: number // 0 = all months (for bulanan), 1..12 for month, 1..4 for quarter, 1..2 for semester
): Booking[] {
  return bookings.filter((b) => {
    const month = parseInt((b.tanggalMulai || '').split('-')[1], 10);
    if (isNaN(month)) return false;
    if (periodType === 'bulanan') {
      return periodValue === 0 ? true : month === periodValue;
    }
    if (periodType === 'triwulanan') {
      if (periodValue === 1) return month >= 1 && month <= 3;
      if (periodValue === 2) return month >= 4 && month <= 6;
      if (periodValue === 3) return month >= 7 && month <= 9;
      if (periodValue === 4) return month >= 10 && month <= 12;
    }
    if (periodType === 'semesteran') {
      if (periodValue === 1) return month >= 1 && month <= 6;
      if (periodValue === 2) return month >= 7 && month <= 12;
    }
    return true;
  });
}

export function getPeriodLabel(
  periodType: ReportPeriodType,
  periodValue: number,
  year: number = getWIBDateParts().year
): string {
  if (periodType === 'bulanan') {
    return periodValue === 0
      ? `Tahun Anggaran ${year} (Januari – Desember)`
      : `Bulan ${BULAN_ID[periodValue - 1]} ${year}`;
  }
  if (periodType === 'triwulanan') {
    const names = [
      `Triwulan I (Januari – Maret ${year})`,
      `Triwulan II (April – Juni ${year})`,
      `Triwulan III (Juli – September ${year})`,
      `Triwulan IV (Oktober – Desember ${year})`,
    ];
    return names[periodValue - 1] || `Triwulan ${year}`;
  }
  return periodValue === 1
    ? `Semester 1 (Januari – Juni ${year})`
    : `Semester 2 (Juli – Desember ${year})`;
}

export function exportBookingsToCSV(bookings: Booking[], buses: Bus[], filename: string) {
  const busMap = new Map(buses.map((bus) => [bus.id, bus]));
  const headers = [
    'Kode Booking',
    'Nama Sekolah / Instansi',
    'NPSN',
    'Penanggung Jawab (PIC)',
    'No. WhatsApp',
    'Email',
    'Armada Bus',
    'Nopol',
    'Tanggal Mulai',
    'Tanggal Selesai',
    'Durasi (Hari)',
    'Jumlah Peserta',
    'Lokasi Tujuan',
    'Tujuan Kegiatan',
    'Status Verifikasi',
    'Alasan Penolakan',
  ];

  const escapeCsv = (val: string | number | undefined) => {
    let str = String(val ?? '');
    if (/^[=+@\t\r]/.test(str) || /^-[0-9A-Za-z(=]/.test(str)) {
      str = `'${str}`;
    }
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = bookings.map((b) => {
    const bus = busMap.get(b.busId);
    return [
      b.kodeBooking,
      b.namaSekolah,
      b.npsn,
      b.picNama,
      b.picWhatsapp,
      b.email,
      bus ? bus.nama : b.busId,
      bus ? bus.nopol : '-',
      b.tanggalMulai,
      b.tanggalSelesai,
      countDurationDays(b.tanggalMulai, b.tanggalSelesai),
      b.jumlahPeserta,
      b.lokasiTujuan,
      b.tujuanKegiatan,
      b.status,
      b.alasanPenolakan || '-',
    ]
      .map(escapeCsv)
      .join(',');
  });

  const csvContent = '\uFEFF' + [headers.map(escapeCsv).join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
