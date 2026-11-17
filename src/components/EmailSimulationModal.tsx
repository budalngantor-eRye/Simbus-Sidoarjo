import { CheckCircle2, Mail, X, XCircle } from 'lucide-react';
import { EmailSimulation } from '../types';

interface EmailSimulationModalProps {
  email: EmailSimulation | null;
  onClose: () => void;
  onTrackCode?: (kode: string) => void;
}

export function EmailSimulationModal({ email, onClose, onTrackCode }: EmailSimulationModalProps) {
  if (!email) return null;

  const isRejected = email.type === 'rejected';
  const isApproved = email.type === 'approved';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="email-sim-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                isRejected
                  ? 'bg-rose-100 text-rose-700'
                  : isApproved
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-sky-100 text-sky-700'
              }`}
            >
              {isRejected ? (
                <XCircle className="w-4 h-4" />
              ) : isApproved ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Mail className="w-4 h-4" />
              )}
            </div>
            <div>
              <h3 id="email-sim-title" className="text-sm font-semibold text-slate-900">
                Simulasi Notifikasi Email Otomatis Terkirim
              </h3>
              <p className="text-xs text-slate-500">
                Notifikasi dikirimkan oleh sistem layanan SIMBUS Disdikbud Sidoarjo
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 transition-colors"
            aria-label="Tutup pratinjau email"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2 text-xs">
            <div className="flex gap-2">
              <span className="text-slate-500 w-20 shrink-0">Dari</span>
              <span className="text-slate-800 font-medium">
                SIMBUS Disdikbud Sidoarjo &lt;simbus@disdikbudsidoarjo.go.id&gt;
              </span>
            </div>
            <div className="flex gap-2">
              <span className="text-slate-500 w-20 shrink-0">Kepada</span>
              <span className="text-slate-900 font-medium">{email.to}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-slate-500 w-20 shrink-0">Subjek</span>
              <span className="text-slate-900 font-semibold">{email.subject}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-slate-500 w-20 shrink-0">Waktu</span>
              <span className="text-slate-600 font-mono-tabular">{email.timestamp} WIB</span>
            </div>
          </div>

          <div className="border border-slate-200 rounded-lg p-4 bg-white text-sm text-slate-700 leading-relaxed whitespace-pre-line">
            {email.body}
          </div>
        </div>

        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3">
          {onTrackCode && (
            <button
              type="button"
              onClick={() => {
                onTrackCode(email.kodeBooking);
                onClose();
              }}
              className="px-4 py-2 text-xs font-medium text-blue-900 bg-white border border-blue-900/30 rounded-lg hover:bg-blue-50 transition-colors whitespace-nowrap"
            >
              Lacak Status Pengajuan
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-white bg-blue-900 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap"
          >
            Tutup Pratinjau
          </button>
        </div>
      </div>
    </div>
  );
}
