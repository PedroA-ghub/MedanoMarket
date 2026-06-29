import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { User, Upload, ArrowLeft, Loader2, Save, Mail, CreditCard, Calendar } from 'lucide-react';
import type { AxiosError } from 'axios';
import Layout from '../components/Layout';

export default function EditProfile() {
  const { user: authUser, updateUser } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState('');
  const [identityCard, setIdentityCard] = useState('');
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userData = await authService.me();
        setUsername(userData.username || '');
        setEmail(userData.email || '');
        setAge(userData.age ? String(userData.age) : '');
        setIdentityCard(userData.identity_card || '');
        setProfilePreview(userData.profile_picture_url || null);
      } catch {
        setError('No se pudo cargar tu perfil');
      } finally {
        setLoading(false);
      }
    };
    if (authUser) loadUserData();
    else setLoading(false);
  }, [authUser]);

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
    setSuccess(false);

    if (age && (parseInt(age) < 18 || parseInt(age) > 120)) {
      setError('La edad debe estar entre 18 y 120 años');
      return;
    }

    setSaving(true);
    try {
      const updated = await authService.updateProfile({
        username: username || undefined,
        email: email || undefined,
        age: age ? parseInt(age) : null,
        identity_card: identityCard || undefined,
        profile_picture: profilePicture || undefined,
      });
      updateUser(updated);
      if (updated.profile_picture_url) {
        setProfilePreview(updated.profile_picture_url);
      }
      setProfilePicture(null);
      setSuccess(true);
    } catch (err) {
      const axiosError = err as AxiosError<{ [key: string]: string[] | string }>;
      const errors = axiosError.response?.data;
      if (errors?.email) {
        setError(Array.isArray(errors.email) ? errors.email[0] : String(errors.email));
      } else if (errors?.identity_card) {
        setError(Array.isArray(errors.identity_card) ? errors.identity_card[0] : String(errors.identity_card));
      } else if (errors?.error) {
        setError(Array.isArray(errors.error) ? errors.error[0] : String(errors.error));
      } else {
        setError('Error al actualizar el perfil');
      }
    } finally {
      setSaving(false);
    }
  };

  if (!authUser) {
    navigate('/login');
    return null;
  }

  return (
    <Layout showSearch>
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/" className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-zinc-400" />
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <User className="w-8 h-8 text-teal-400" />
            Editar Perfil
          </h1>
        </div>

        {loading ? (
          <div className="flex justify-center items-center min-h-[50vh]">
            <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
          </div>
        ) : (
          <div className="card p-6 md:p-8 animate-fade-in">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl mb-6">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-3 rounded-xl mb-6">
                Perfil actualizado correctamente
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="w-28 h-28 rounded-full bg-zinc-800 border-2 border-dashed border-zinc-600 flex items-center justify-center overflow-hidden">
                    {profilePreview ? (
                      <img src={profilePreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-10 h-10 text-zinc-500" />
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-teal-500 transition-colors">
                    <Upload className="w-4 h-4 text-white" />
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
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">Correo electrónico</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input pl-12"
                    placeholder="correo@ejemplo.com"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Cédula de identidad</label>
                  <div className="relative">
                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                    <input
                      type="text"
                      value={identityCard}
                      onChange={(e) => setIdentityCard(e.target.value)}
                      className="input pl-12"
                      placeholder="000-0000000-0"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Guardar Cambios
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="btn-secondary px-6"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </Layout>
  );
}
