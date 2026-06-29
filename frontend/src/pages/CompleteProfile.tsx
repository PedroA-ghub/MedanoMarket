import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShoppingBag, Loader2, User, Upload, Calendar, CreditCard, CheckCircle } from 'lucide-react';
import { authService } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function CompleteProfile() {
  const [username, setUsername] = useState('');
  const [age, setAge] = useState('');
  const [identityCard, setIdentityCard] = useState('');
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfilePicture(file);
      setProfilePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (age && (parseInt(age) < 18 || parseInt(age) > 120)) {
      setError('La edad debe estar entre 18 y 120 años');
      return;
    }

    setLoading(true);

    try {
      await authService.csrf();

      const updatedUser = await authService.updateProfile({
        username,
        age: age ? parseInt(age) : null,
        identity_card: identityCard,
        profile_picture: profilePicture,
        onboarding_complete: 'true',
      });

      if (updatedUser) {
        updateUser(updatedUser);
      } else {
        updateUser({ username, age: age ? parseInt(age) : null, identity_card: identityCard, needs_onboarding: false });
      }

      setSuccess(true);
      setTimeout(() => navigate('/'), 1500);
    } catch (err: any) {
      const errors = err.response?.data;
      if (errors?.username) setError(errors.username[0] || errors.username);
      else if (errors?.identity_card) setError(errors.identity_card[0] || errors.identity_card);
      else if (errors?.age) setError(errors.age[0] || errors.age);
      else setError(errors?.error || 'Error al completar perfil');
    } finally {
      setLoading(false);
    }
  };

  if (!user?.needs_onboarding) {
    navigate('/');
    return null;
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-[#0e0e10]">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">¡Perfil completado!</h1>
          <p className="text-zinc-400">Redirigiendo al inicio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-[#0e0e10]">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 flex items-center justify-center">
            <ShoppingBag className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
            MedanoMarket
          </span>
        </Link>

        <div className="card p-8 animate-fade-in">
          <div className="text-center mb-6">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center">
              <User className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white">Completa tu perfil</h1>
            <p className="text-zinc-400 text-sm mt-1">
              Solo unos pasos más para disfrutar de MedanoMarket
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl mb-6 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-zinc-800 border-2 border-dashed border-zinc-600 flex items-center justify-center overflow-hidden">
                  {profilePreview ? (
                    <img src={profilePreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Upload className="w-7 h-7 text-zinc-500" />
                  )}
                </div>
                <label className="absolute bottom-0 right-0 w-7 h-7 bg-teal-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-teal-500 transition-colors">
                  <Upload className="w-3.5 h-3.5 text-white" />
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-2">Nombre de usuario</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input pl-12"
                  placeholder="Tu nombre público"
                  required
                  minLength={3}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Edad</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="input pl-12"
                    placeholder="18+"
                    min="18"
                    max="120"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Cédula</label>
                <div className="relative">
                  <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                  <input
                    type="text"
                    value={identityCard}
                    onChange={(e) => setIdentityCard(e.target.value)}
                    className="input pl-12"
                    placeholder="V-00000000"
                    required
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Completar perfil'
              )}
            </button>

            <Link
              to="/"
              className="block text-center text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Lo haré después
            </Link>
          </form>
        </div>
      </div>
    </div>
  );
}