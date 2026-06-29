import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { wishlistService, cartService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Heart, Trash2, ShoppingCart, Package, MapPin, ArrowLeft } from 'lucide-react';
import { formatPrice } from '../utils';
import Layout from '../components/Layout';

interface WishlistItem {
  id: string;
  product: {
    id: number;
    name: string;
    description: string;
    price: string;
    stock: number;
    is_available: boolean;
    image_url: string | null;
    images?: { id: number; image_url: string }[];
    location: string | null;
  };
  added_at: string;
}

export default function Wishlist() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchWishlist = async () => {
    try {
      const data = await wishlistService.list();
      setItems(data);
    } catch (error) {
      console.error('Error fetching wishlist:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchWishlist();
    } else {
      setLoading(false);
    }
  }, [user]);

  const handleRemove = async (productId: number) => {
    try {
      await wishlistService.remove(productId);
      setItems(items.filter((item) => item.product.id !== productId));
    } catch (error) {
      console.error('Error removing from wishlist:', error);
    }
  };

  const handleAddToCart = async (productId: number) => {
    try {
      await cartService.add(productId, 1);
      navigate('/cart');
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  };

  if (!user) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
          <Heart className="w-16 h-16 text-zinc-600 mb-4" />
          <h2 className="text-2xl font-bold text-white mb-4">Inicia sesión para ver tu wishlist</h2>
          <Link to="/login" className="btn-primary">
            Iniciar sesión
          </Link>
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="w-12 h-12 border-4 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout showSearch>
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/" className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-zinc-400" />
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <Heart className="w-8 h-8 text-red-400" />
            Mi Wishlist
          </h1>
        </div>

        {items.length === 0 ? (
          <div className="card p-12 text-center animate-fade-in">
            <Heart className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
            <p className="text-zinc-400 text-lg mb-6">Tu wishlist está vacía</p>
            <Link to="/search" className="btn-primary inline-flex items-center gap-2">
              Explorar productos
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item, index) => (
              <article 
                key={item.id} 
                className="card p-4 md:p-6 flex flex-col sm:flex-row gap-4 animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <Link to={`/product/${item.product.id}`} className="flex-shrink-0">
                  <div className="w-24 h-24 md:w-32 md:h-32 bg-gradient-to-br from-teal-900/50 to-cyan-900/50 rounded-xl flex items-center justify-center overflow-hidden">
                    {(() => {
                      const url = item.product.images?.[0]?.image_url || item.product.image_url;
                      return url ? (
                        <img
                          src={url}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Package className="w-8 h-8 text-teal-500/50" />
                      );
                    })()}
                  </div>
                </Link>
                <div className="flex-1 min-w-0">
                  <Link to={`/product/${item.product.id}`}>
                    <h3 className="text-lg font-semibold text-white mb-1 truncate">
                      {item.product.name}
                    </h3>
                  </Link>
                  <p className="text-sm text-zinc-400 line-clamp-2 mb-2">{item.product.description}</p>
                  {item.product.location && (
                    <div className="flex items-center gap-1 text-sm text-zinc-500 mb-3">
                      <MapPin className="w-4 h-4" />
                      <span>{item.product.location}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold text-teal-400">
                      ${formatPrice(item.product.price)}
                    </span>
                    {!item.product.is_available && (
                      <span className="text-sm text-red-400 px-2 py-1 bg-red-500/20 rounded-full">
                        Agotado
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex sm:flex-col gap-2 items-center justify-center">
                  <button
                    onClick={() => handleRemove(item.product.id)}
                    className="p-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleAddToCart(item.product.id)}
                    disabled={!item.product.is_available}
                    className="p-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl hover:from-teal-500 hover:to-cyan-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Agregar al carrito"
                  >
                    <ShoppingCart className="w-5 h-5" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
