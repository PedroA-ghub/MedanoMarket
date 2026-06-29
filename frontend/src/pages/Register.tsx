import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Loader2, Mail, User, CheckCircle, Upload, Calendar, CreditCard } from 'lucide-react';
import { authService } from '../services/api';

export default function Register() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password1, setPassword1] = useState('');
  const [password2, setPassword2] = useState('');
  const [age, setAge] = useState('');
  const [identityCard, setIdentityCard] = useState('');
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');

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
    
    if (password1 !== password2) {
      setError('Las contraseñas no coinciden');
      return;
    }
    
    if (password1.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    
    if (age && (parseInt(age) < 18 || parseInt(age) > 120)) {
      setError('La edad debe estar entre 18 y 120 años');
      return;
    }
    
    setLoading(true);
    
    try {
      await authService.csrf();
      const response = await authService.register({
        email,
        username: username || undefined,
        password1,
        password2,
        age: age ? parseInt(age) : undefined,
        identity_card: identityCard || undefined,
        profile_picture: profilePicture || undefined,
      });
      setSuccess(true);
      setVerificationEmail(response.email || email);
    } catch (err: any) {
      const errors = err.response?.data;
      if (errors?.email) {
        setError(errors.email[0]);
      } else if (errors?.password1) {
        setError(errors.password1[0]);
      } else if (errors?.age) {
        setError(errors.age[0]);
      } else if (errors?.identity_card) {
        setError(errors.identity_card[0]);
      } else {
        setError(errors?.error || 'Error al registrarse');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setLoading(true);
    try {
      await authService.csrf();
      await authService.resendVerification(verificationEmail);
      alert('Correo de verificación reenviado');
    } catch {
      alert('Error al reenviar el correo');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center justify-center gap-3 mb-12">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-600 to-cyan-600 flex items-center justify-center">
              <ShoppingBag className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
              MedanoMarket
            </span>
          </Link>

          <div className="card p-8 animate-fade-in text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">¡Cuenta creada!</h1>
            <p className="text-zinc-400 mb-6">
              Hemos enviado un enlace de verificación a:
            </p>
            <p className="text-teal-400 font-medium mb-6">{verificationEmail}</p>
            <p className="text-zinc-500 text-sm mb-6">
              Haz clic en el enlace para activar tu cuenta. Revisa también la carpeta de spam.
            </p>
            
            <button
              onClick={handleResendVerification}
              disabled={loading}
              className="btn-secondary w-full mb-4"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Reenviar correo de verificación'}
            </button>
            
            <Link to="/login" className="text-teal-400 hover:text-teal-300 text-sm">
              Ya verifiqué mi cuenta
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-3 mb-12">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-600 to-cyan-600 flex items-center justify-center">
            <ShoppingBag className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
            MedanoMarket
          </span>
        </Link>

        <div className="card p-8 animate-fade-in">
          <h1 className="text-2xl font-bold text-white mb-2 text-center">Crear Cuenta</h1>
          <p className="text-zinc-400 text-center mb-8">Regístrate con tu correo electrónico</p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-zinc-800 border-2 border-dashed border-zinc-600 flex items-center justify-center overflow-hidden">
                  {profilePreview ? (
                    <img src={profilePreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Upload className="w-8 h-8 text-zinc-500" />
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
                <label className="block text-sm text-zinc-400 mb-2">Cédula de identidad</label>
                <div className="relative">
                  <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                  <input
                    type="text"
                    value={identityCard}
                    onChange={(e) => setIdentityCard(e.target.value)}
                    className="input pl-12"
                    placeholder="000-0000000-0"
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-2">Contraseña</label>
              <input
                type="password"
                value={password1}
                onChange={(e) => setPassword1(e.target.value)}
                className="input"
                placeholder="Mínimo 8 caracteres"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-2">Confirmar Contraseña</label>
              <input
                type="password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                className="input"
                placeholder="Repite la contraseña"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Crear Cuenta'}
            </button>
          </form>

          <p className="text-center text-zinc-400 mt-6">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-teal-400 hover:text-teal-300">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
