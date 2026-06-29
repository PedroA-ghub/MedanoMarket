import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Check, Loader2, ArrowLeft, Crown, Upload, Building2, Phone, User as UserIcon, Banknote, Clock } from 'lucide-react';
import { proService, exchangeRateService, authService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatPrice } from '../utils';
import NavBar from '../components/NavBar';

const DEV_PHONE = '0424-3120446';
const DEV_ID = '30.493.434';
const DEV_BANK = 'Mercantil';
const PRO_PRICE_USD = 3.99;

export default function ProUpgrade() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [bsAmount, setBsAmount] = useState<string | null>(null);
  const [freshUser, setFreshUser] = useState<{
    is_pro: boolean;
    pro_pending: boolean;
  } | null>(null);
  const [fetchingUser, setFetchingUser] = useState(true);
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    authService.me().then((data) => {
      setFreshUser(data);
      updateUser(data);
    }).catch(() => {}).finally(() => setFetchingUser(false));

    exchangeRateService.getRate().then((data) => {
      if (data.rate) {
        const bs = (PRO_PRICE_USD * parseFloat(data.rate)).toFixed(2);
        setBsAmount(bs);
      }
    }).catch(() => {});
  }, []);

  const displayUser = freshUser || user;

  if (fetchingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0e0e10]">
        <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
      </div>
    );
  }

  if (displayUser?.is_pro) {
    return (
      <div className="min-h-screen">
        <NavBar showSearch />
        <main className="max-w-7xl mx-auto px-6 py-16 text-center">
          <div className="card p-12 max-w-lg mx-auto">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(251,191,36,0.4)]">
              <Crown className="w-10 h-10 text-black" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">¡Ya eres PRO!</h1>
            <p className="text-zinc-400 mb-8">Disfruta de todas las funciones premium de MedanoMarket</p>
            <button
              onClick={() => navigate('/pro/dashboard')}
              className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-black font-bold shadow-[0_0_16px_rgba(251,191,36,0.4)] hover:shadow-[0_0_28px_rgba(251,191,36,0.7)] hover:scale-105 transition-all duration-500"
            >
              <Sparkles className="w-5 h-5" />
              Ir al Dashboard PRO
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (displayUser?.pro_pending) {
    return (
      <div className="min-h-screen">
        <NavBar showSearch />
        <main className="max-w-7xl mx-auto px-6 py-16 text-center">
          <div className="card p-12 max-w-lg mx-auto animate-fade-in">
            <div className="w-20 h-20 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-6">
              <Clock className="w-10 h-10 text-amber-400" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Solicitud enviada</h1>
            <p className="text-zinc-400 mb-4">
              Tu comprobante de pago está siendo revisado por el administrador.
              Te notificaremos cuando tu cuenta PRO esté activa.
            </p>
            <button
              onClick={() => navigate('/')}
              className="btn-primary inline-flex items-center gap-2"
            >
              Volver al inicio
            </button>
          </div>
        </main>
      </div>
    );
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage(file);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!image) return;
    setLoading(true);
    try {
      const data = await proService.sendProof(image);
      updateUser({ pro_pending: data.pro_pending });
      setSuccess(true);
    } catch {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen">
        <NavBar showSearch />
        <main className="max-w-7xl mx-auto px-6 py-16 text-center">
          <div className="card p-12 max-w-lg mx-auto animate-fade-in">
            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-green-400" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">¡Comprobante enviado!</h1>
            <p className="text-zinc-400 mb-4">
              Hemos recibido tu comprobante. El administrador verificará el pago y activará tu cuenta PRO.
            </p>
            <button
              onClick={() => navigate('/')}
              className="btn-primary inline-flex items-center gap-2"
            >
              Volver al inicio
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <NavBar showSearch />
      <main className="max-w-7xl mx-auto px-6 py-12">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al inicio
        </button>

        <div className="text-center mb-12 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            MEDANOMARKET PRO
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Lleva tu negocio al{' '}
            <span className="bg-gradient-to-r from-amber-400 to-yellow-400 bg-clip-text text-transparent">
              siguiente nivel
            </span>
          </h1>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
            Realiza el pago y envía el comprobante para activar tu cuenta PRO
          </p>
        </div>

        <div className="text-center mb-10 animate-fade-in">
          <div className="inline-flex items-baseline gap-3 p-6 rounded-2xl bg-zinc-800/40 border border-zinc-700/30">
            <span className="text-4xl font-bold text-white">{formatPrice(PRO_PRICE_USD)} $</span>
            <span className="text-zinc-500 text-xl">/</span>
            <span className="text-2xl font-semibold text-amber-400">~ {bsAmount ? formatPrice(bsAmount) : "..."} Bs</span>
          </div>
          <p className="text-zinc-500 text-sm mt-3">Pago mensual · Cancela cuando quieras</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="card p-8 animate-fade-in">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Banknote className="w-6 h-6 text-amber-400" />
              Datos para el pago
            </h2>
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/30">
                <Phone className="w-5 h-5 text-amber-400 mt-0.5" />
                <div>
                  <p className="text-sm text-zinc-400">Teléfono</p>
                  <p className="text-white font-semibold">{DEV_PHONE}</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/30">
                <UserIcon className="w-5 h-5 text-amber-400 mt-0.5" />
                <div>
                  <p className="text-sm text-zinc-400">Cédula de Identidad</p>
                  <p className="text-white font-semibold">{DEV_ID}</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/30">
                <Building2 className="w-5 h-5 text-amber-400 mt-0.5" />
                <div>
                  <p className="text-sm text-zinc-400">Banco</p>
                  <p className="text-white font-semibold">{DEV_BANK}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card p-8 animate-fade-in">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Upload className="w-6 h-6 text-amber-400" />
              Sube tu comprobante
            </h2>
            <div className="space-y-6">
              <label className="block">
                <div className="border-2 border-dashed border-zinc-600 rounded-xl p-8 text-center cursor-pointer hover:border-amber-500/50 transition-colors">
                  {preview ? (
                    <img src={preview} alt="Preview" className="max-h-48 mx-auto rounded-lg" />
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="w-10 h-10 text-zinc-500" />
                      <p className="text-zinc-400">Haz clic para seleccionar la imagen</p>
                      <p className="text-zinc-600 text-sm">PNG, JPG o WEBP</p>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>

              <button
                onClick={handleSubmit}
                disabled={loading || !image}
                className="w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-black shadow-[0_0_16px_rgba(251,191,36,0.4)] hover:shadow-[0_0_28px_rgba(251,191,36,0.7)] hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Crown className="w-4 h-4" />
                    Enviar comprobante
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-16 text-center">
          <p className="text-zinc-500 text-sm">
            ¿Preguntas? Contáctanos en{' '}
            <span className="text-zinc-400 underline">soporte@medanomarket.com</span>
          </p>
        </div>
      </main>
    </div>
  );
}