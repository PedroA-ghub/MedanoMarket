import { useState } from 'react';
import { X, AlertTriangle, Flag } from 'lucide-react';
import { reportService } from '../services/api';

const REASONS = [
  { value: 'producto_falso', label: 'Producto Falso' },
  { value: 'estafa', label: 'Estafa / Fraude' },
  { value: 'robo', label: 'Robo de contenido / fotos' },
  { value: 'acoso', label: 'Acoso / Maltrato' },
  { value: 'spam', label: 'Spam / Publicidad no deseada' },
  { value: 'precio_abusivo', label: 'Precio abusivo o engañoso' },
  { value: 'suplantacion', label: 'Suplantación de identidad' },
  { value: 'inapropiado', label: 'Contenido inapropiado' },
  { value: 'otro', label: 'Otro' },
];

interface ReportUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportedUser: {
    id: string;
    display_name: string;
  };
  productId?: number;
  orderId?: string;
}

export default function ReportUserModal({ isOpen, onClose, reportedUser, productId, orderId }: ReportUserModalProps) {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await reportService.reportUser({
        reported_user_id: reportedUser.id,
        reason,
        description,
        ...(productId ? { related_product_id: productId } : {}),
        ...(orderId ? { related_order_id: orderId } : {}),
      });
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setReason('');
        setDescription('');
      }, 2500);
    } catch (err: any) {
      const msg = err.response?.data?.error
        || err.response?.data?.reported_user_id?.[0]
        || 'Error al enviar la denuncia. Intenta de nuevo.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setSuccess(false);
      setReason('');
      setDescription('');
      setError('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="card w-full max-w-md p-6 animate-fade-in relative">
        <button
          onClick={handleClose}
          disabled={loading}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        {success ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Flag className="w-8 h-8 text-green-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Denuncia enviada</h3>
            <p className="text-zinc-400 text-sm">
              Gracias por ayudar a mantener la comunidad segura. Revisaremos tu denuncia.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Denunciar usuario</h3>
                <p className="text-sm text-zinc-400">{reportedUser.display_name}</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                  Motivo de la denuncia
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                  className="input w-full"
                >
                  <option value="">Selecciona un motivo</option>
                  {REASONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                  Descripción detallada
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  rows={4}
                  placeholder="Explica con detalle lo que sucedió..."
                  className="input w-full h-28 resize-none"
                  maxLength={2000}
                />
                <p className="text-xs text-zinc-500 mt-1 text-right">{description.length}/2000</p>
              </div>

              {error && (
                <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className="flex-1 btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl hover:bg-red-500 transition-all font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Flag className="w-4 h-4" />
                      Enviar denuncia
                    </>
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}