import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ShoppingBag, Heart, ShoppingCart, Plus, LogOut, 
  User, MessageCircle, Search, Menu, X, Settings, Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavBarProps {
  showSearch?: boolean;
  showFullNav?: boolean;
}

export default function NavBar({ showSearch = false, showFullNav = true }: NavBarProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
    setShowUserMenu(false);
    setShowMobileMenu(false);
  };

  return (
    <header className="border-b border-white/10 bg-black/20 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-600 to-cyan-600 flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
            MedanoMarket
          </span>
        </Link>
        

<nav className="flex items-center gap-1 md:gap-2">
          {user ? (
            <>
              {showFullNav && (
                <>
                  <Link to="/search" className="flex items-center justify-center text-zinc-400 hover:text-white transition-colors p-2 md:p-3" title="Buscar">
                    <Search className="w-5 h-5" />
                  </Link>
                  <Link to="/orders" className="hidden sm:flex items-center justify-center text-zinc-400 hover:text-white transition-colors p-2 md:p-3" title="Pedidos">
                    <MessageCircle className="w-5 h-5" />
                  </Link>
                  <Link to="/wishlist" className="hidden sm:flex items-center justify-center text-zinc-400 hover:text-white transition-colors p-2 md:p-3" title="Wishlist">
                    <Heart className="w-5 h-5" />
                  </Link>
                  <Link to="/cart" className="flex items-center justify-center text-zinc-400 hover:text-white transition-colors p-2 md:p-3" title="Carrito">
                    <ShoppingCart className="w-5 h-5" />
                  </Link>
                  <Link to="/create-product" className="hidden md:flex items-center justify-center text-zinc-400 hover:text-white transition-colors p-2 md:p-3" title="Crear">
                    <Plus className="w-5 h-5" />
                  </Link>
                </>
              )}
              
              <Link
                to={user.is_pro ? "/pro/dashboard" : "/pro/upgrade"}
                className="relative group flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-black text-xs font-bold uppercase tracking-wider shadow-[0_0_12px_rgba(251,191,36,0.5)] hover:shadow-[0_0_20px_rgba(251,191,36,0.8)] transition-all duration-500 animate-pulse"
              >
                <Sparkles className="w-3.5 h-3.5" />
                PRO
              </Link>

              <button 
                onClick={() => {
                  setShowUserMenu(!showUserMenu);
                  setShowMobileMenu(false);
                }}
                className="flex items-center justify-center text-zinc-400 hover:text-white transition-colors gap-2 p-2"
              >
                {user.profile_picture_url ? (
                  <img src={user.profile_picture_url} alt={user.display_name} className="w-6 h-6 rounded-full object-cover" />
                ) : (
                  <User className="w-5 h-5" />
                )}
                <span className="hidden md:inline text-sm">{user.display_name}</span>
                {user.is_pro && (
                  <span className="hidden md:inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-bold uppercase tracking-wider">
                    <Sparkles className="w-2.5 h-2.5" />
                    PRO
                  </span>
                )}
              </button>
              
              <button 
                onClick={() => {
                  setShowMobileMenu(!showMobileMenu);
                  setShowUserMenu(false);
                }}
                className="flex sm:hidden items-center justify-center text-zinc-400 hover:text-white transition-colors p-2"
              >
                {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              
              {showUserMenu && (
                <div className="absolute top-full right-4 mt-2 w-56 bg-zinc-800/95 backdrop-blur-xl rounded-xl shadow-lg overflow-hidden border border-white/10 animate-fade-in">
                  <div className="px-4 py-3 border-b border-white/10 flex items-center gap-3">
                    {user.profile_picture_url ? (
                      <img src={user.profile_picture_url} alt={user.display_name} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center text-white font-medium">
                        {user.display_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-white font-medium flex items-center gap-2">
                        {user.display_name}
                        {user.is_pro && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-bold uppercase tracking-wider">
                            <Sparkles className="w-2.5 h-2.5" />
                            PRO
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-zinc-400">{user.email}</p>
                    </div>
                  </div>
                  <Link 
                    to="/edit-profile" 
                    className="flex items-center gap-3 px-4 py-2.5 text-zinc-300 hover:bg-white/10 transition-colors"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <Settings className="w-4 h-4" />
                    Editar perfil
                  </Link>
                  {user.is_pro && (
                    <Link 
                      to="/pro/dashboard" 
                      className="flex items-center gap-3 px-4 py-2.5 text-amber-400 hover:bg-white/10 transition-colors"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <Sparkles className="w-4 h-4" />
                      Dashboard PRO
                    </Link>
                  )}
                  {showFullNav && (
                    <>
                      <Link 
                        to="/orders" 
                        className="flex items-center gap-3 px-4 py-2.5 text-zinc-300 hover:bg-white/10 transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <MessageCircle className="w-4 h-4" />
                        Mis pedidos
                      </Link>
                      <Link 
                        to="/wishlist" 
                        className="flex items-center gap-3 px-4 py-2.5 text-zinc-300 hover:bg-white/10 transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <Heart className="w-4 h-4" />
                        Lista de deseos
                      </Link>
                      <Link 
                        to="/cart" 
                        className="flex items-center gap-3 px-4 py-2.5 text-zinc-300 hover:bg-white/10 transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <ShoppingCart className="w-4 h-4" />
                        Carrito
                      </Link>
                      <Link 
                        to="/create-product" 
                        className="flex items-center gap-3 px-4 py-2.5 text-zinc-300 hover:bg-white/10 transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <Plus className="w-4 h-4" />
                        Crear producto
                      </Link>
                    </>
                  )}
                  <button 
                    onClick={handleLogout}
                    className="w-full px-4 py-2.5 text-left text-red-400 hover:bg-white/10 flex items-center gap-3 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Cerrar sesión
                  </button>
                </div>
              )}
              
              {showMobileMenu && (
                <div className="absolute top-full left-0 right-0 bg-zinc-900/95 backdrop-blur-xl border-b border-white/10 animate-fade-in">
                  <div className="max-w-7xl mx-auto px-4 py-4 space-y-1">
                    {showSearch && (
                      <Link 
                        to="/search" 
                        className="flex items-center gap-3 px-4 py-3 text-zinc-300 hover:bg-white/10 rounded-xl transition-colors"
                        onClick={() => setShowMobileMenu(false)}
                      >
                        <Search className="w-5 h-5" />
                        Buscar productos
                      </Link>
                    )}
                    <Link 
                      to="/edit-profile" 
                      className="flex items-center gap-3 px-4 py-3 text-zinc-300 hover:bg-white/10 rounded-xl transition-colors"
                      onClick={() => setShowMobileMenu(false)}
                    >
                      <Settings className="w-5 h-5" />
                      Editar perfil
                    </Link>
                    <Link 
                      to="/orders" 
                      className="flex items-center gap-3 px-4 py-3 text-zinc-300 hover:bg-white/10 rounded-xl transition-colors"
                      onClick={() => setShowMobileMenu(false)}
                    >
                      <MessageCircle className="w-5 h-5" />
                      Mis pedidos
                    </Link>
                    <Link 
                      to="/wishlist" 
                      className="flex items-center gap-3 px-4 py-3 text-zinc-300 hover:bg-white/10 rounded-xl transition-colors"
                      onClick={() => setShowMobileMenu(false)}
                    >
                      <Heart className="w-5 h-5" />
                      Lista de deseos
                    </Link>
                    <Link 
                      to="/cart" 
                      className="flex items-center gap-3 px-4 py-3 text-zinc-300 hover:bg-white/10 rounded-xl transition-colors"
                      onClick={() => setShowMobileMenu(false)}
                    >
                      <ShoppingCart className="w-5 h-5" />
                      Carrito
                    </Link>
                    <Link 
                      to="/create-product" 
                      className="flex items-center gap-3 px-4 py-3 text-zinc-300 hover:bg-white/10 rounded-xl transition-colors"
                      onClick={() => setShowMobileMenu(false)}
                    >
                      <Plus className="w-5 h-5" />
                      Crear producto
                    </Link>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <Link to="/login" className="btn-secondary text-sm px-3 md:px-4 py-2">
                Iniciar Sesión
              </Link>
              <Link to="/register" className="btn-primary text-sm px-3 md:px-4 py-2">
                Registrarse
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
