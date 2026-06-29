import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { User, ShoppingBag, MapPin, ArrowLeft, Calendar, BadgeCheck, Loader2 } from 'lucide-react';
import Layout from '../components/Layout';

interface Seller {
  id: string;
  email: string;
  username: string;
  display_name: string;
  profile_picture_url: string | null;
  bio: string;
  created_at: string;
  is_verified: boolean;
  is_pro: boolean;
}

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
  location: string | null;
}

export default function SellerProfile() {
  const { id } = useParams<{ id: string }>();
  const [seller, setSeller] = useState<Seller | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSeller();
  }, [id]);

  const loadSeller = async () => {
    try {
      const res = await fetch(`/api/sellers/${id}/`);
      if (!res.ok) throw new Error('Vendedor no encontrado');
      const data = await res.json();
      setSeller(data.seller);
      setProducts(data.products);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar el perfil');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
        </div>
      </Layout>
    );
  }

  if (error || !seller) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-zinc-400">{error || 'Vendedor no encontrado'}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-6 py-8">
        <Link to="/" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-8">
          <ArrowLeft size={18} />
          Volver
        </Link>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 mb-8">
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {seller.profile_picture_url ? (
                <img src={seller.profile_picture_url} alt={seller.display_name} className="w-full h-full object-cover" />
              ) : (
                <User className="w-10 h-10 text-white" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-white truncate">{seller.display_name}</h1>
                {seller.is_verified && <BadgeCheck className="w-5 h-5 text-teal-400 flex-shrink-0" />}
                {seller.is_pro && (
                  <span className="text-xs bg-gradient-to-r from-amber-500 to-orange-500 text-white px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                    PRO
                  </span>
                )}
              </div>
              <p className="text-zinc-400 text-sm mb-3">
                @{seller.username || seller.email.split('@')[0]}
              </p>
              {seller.bio && (
                <p className="text-zinc-300 mb-3">{seller.bio}</p>
              )}
              <div className="flex items-center gap-4 text-sm text-zinc-500">
                <span className="flex items-center gap-1">
                  <Calendar size={14} />
                  Miembro desde {new Date(seller.created_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'long' })}
                </span>
                <span className="flex items-center gap-1">
                  <ShoppingBag size={14} />
                  {products.length} {products.length === 1 ? 'producto' : 'productos'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <h2 className="text-xl font-semibold text-white mb-6">Productos</h2>

        {products.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingBag className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
            <p className="text-zinc-400">Este vendedor aún no tiene productos publicados</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {products.map((product) => {
              const productImage = product.images?.[0]?.image_url || product.image_url;
              return (
                <Link
                  key={product.id}
                  to={`/product/${product.id}`}
                  className="card p-5 hover:bg-white/10 transition-all duration-300 hover:scale-[1.02] group"
                >
                  <div className="w-full h-40 rounded-xl overflow-hidden bg-gradient-to-br from-teal-900/50 to-cyan-900/50 mb-4 flex items-center justify-center">
                    {productImage ? (
                      <img src={productImage} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <ShoppingBag className="w-12 h-12 text-teal-500/50" />
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-teal-400 transition-colors">{product.name}</h3>
                  <p className="text-zinc-400 text-sm mb-3 line-clamp-2">{product.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold text-teal-400">${product.price}</span>
                    <span className="text-sm text-zinc-500">Stock: {product.stock}</span>
                  </div>
                  {product.location && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-zinc-500">
                      <MapPin size={12} />
                      {product.location}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
