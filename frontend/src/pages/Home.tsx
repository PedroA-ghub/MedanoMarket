import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Sparkles, User, X } from 'lucide-react';
import { productService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import NavBar from '../components/NavBar';

interface ProductImage {
  id: number;
  image_url: string;
}

interface Product {
  id: number;
  name: string;
  description: string;
  price: string;
  stock: number;
  image_url: string | null;
  images: ProductImage[];
  seller: { id: string; display_name: string };
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissBanner, setDismissBanner] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const data = await productService.list();
      setProducts(data);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <NavBar showSearch />

      <main className="max-w-7xl mx-auto px-6 py-12">
        <section className="mb-16 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-b from-white via-white to-zinc-500 bg-clip-text text-transparent animate-fade-in">
            Marketplace Moderno
          </h1>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '100ms' }}>
            Compra y vende productos de forma segura con nuestro sistema de pedidos integrado
          </p>
        </section>

        {user?.needs_onboarding && !dismissBanner && (
          <div className="max-w-3xl mx-auto mb-8 animate-fade-in">
            <div className="relative bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 border border-amber-500/20 rounded-2xl p-5 pr-12">
              <button
                onClick={() => setDismissBanner(true)}
                className="absolute top-3 right-3 text-zinc-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-semibold mb-1">Completa tu perfil</h3>
                  <p className="text-zinc-400 text-sm mb-3">
                    Agrega tu nombre de usuario, edad y cédula para disfrutar de todas las funciones de MedanoMarket
                  </p>
                  <Link
                    to="/complete-profile"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium rounded-xl hover:from-amber-400 hover:to-orange-400 transition-all"
                  >
                    Completar perfil
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-12 h-12 border-4 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingBag className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
            <p className="text-zinc-400 text-lg">No hay productos disponibles</p>
          </div>
        ) : (
          <div className="flex gap-6">
            <aside className="hidden lg:block w-48 flex-shrink-0">
              <div className="sticky top-24 space-y-4">
                <div className="h-64 rounded-xl border border-zinc-700/30 bg-zinc-800/30 flex items-center justify-center">
                  <p className="text-xs text-zinc-600 text-center px-2">Espacio Publicitario</p>
                </div>
                <div className="h-64 rounded-xl border border-zinc-700/30 bg-zinc-800/30 flex items-center justify-center">
                  <p className="text-xs text-zinc-600 text-center px-2">Espacio Publicitario</p>
                </div>
              </div>
            </aside>
            <section className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
            {products.map((product, index) => {
              const productImage = product.images?.[0]?.image_url || product.image_url;
              return (
              <article 
                key={product.id} 
                className="card p-6 hover:bg-white/10 transition-all duration-300 hover:scale-[1.02] animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-full h-48 rounded-xl overflow-hidden bg-gradient-to-br from-teal-900/50 to-cyan-900/50 mb-4 flex items-center justify-center">
                  {productImage ? (
                    <img src={productImage} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <ShoppingBag className="w-16 h-16 text-teal-500/50" />
                  )}
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{product.name}</h3>
                <p className="text-zinc-400 text-sm mb-4 line-clamp-2">{product.description}</p>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-2xl font-bold text-teal-400">${product.price}</span>
                  <span className="text-sm text-zinc-500">Stock: {product.stock}</span>
                </div>
                <div className="flex items-center justify-between">
                  <Link to={`/seller/${product.seller.id}`} className="text-sm text-zinc-500 hover:text-teal-400 transition-colors">
                    {product.seller.display_name}
                  </Link>
                  {user ? (
                    <Link 
                      to={`/product/${product.id}`}
                      className="btn-primary text-sm px-4 py-2"
                    >
                      Comprar
                    </Link>
                  ) : (
                    <Link 
                      to="/login"
                      className="btn-secondary text-sm px-4 py-2"
                    >
                      Iniciar Sesión
                    </Link>
                  )}
                </div>
              </article>
              );
            })}
          </section>
            <aside className="hidden lg:block w-48 flex-shrink-0">
              <div className="sticky top-24 space-y-4">
                <div className="h-64 rounded-xl border border-zinc-700/30 bg-zinc-800/30 flex items-center justify-center">
                  <p className="text-xs text-zinc-600 text-center px-2">Espacio Publicitario</p>
                </div>
                <div className="h-64 rounded-xl border border-zinc-700/30 bg-zinc-800/30 flex items-center justify-center">
                  <p className="text-xs text-zinc-600 text-center px-2">Espacio Publicitario</p>
                </div>
              </div>
            </aside>
          </div>
        )}

        {user && !user.is_pro && (
        <section className="mt-16 mb-8 animate-fade-in">
          <div className="card p-8 border border-zinc-700/50 bg-zinc-800/30 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              FUNCIÓN EXCLUSIVA
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Desbloquea el poder PRO</h2>
            <p className="text-zinc-400 mb-6 max-w-md mx-auto">
              Analíticas avanzadas, publicidad destacada y herramientas premium para impulsar tus ventas
            </p>
            <Link
              to="/pro/upgrade"
              className="relative inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-black font-bold text-sm uppercase tracking-wider shadow-[0_0_16px_rgba(251,191,36,0.4)] hover:shadow-[0_0_28px_rgba(251,191,36,0.7)] hover:scale-105 transition-all duration-500"
            >
              <Sparkles className="w-5 h-5" />
              Actualizar a PRO
            </Link>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 rounded-xl bg-zinc-800/50 border border-zinc-700/30 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-8 h-8 bg-zinc-700 rounded-lg mx-auto mb-2" />
                    <p className="text-sm text-zinc-600">Funcionalidad PRO</p>
                    <p className="text-xs text-zinc-700 mt-1">Próximamente</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        )}
      </main>
    </div>
  );
}
