import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { productService, wishlistService, cartService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Search, Filter, Heart, ShoppingCart, MapPin, Package, Loader2 } from 'lucide-react';
import { formatPrice } from '../utils';
import NavBar from '../components/NavBar';

interface Product {
  id: number;
  name: string;
  description: string;
  price: string;
  stock: number;
  is_available: boolean;
  image_url: string | null;
  images?: { id: number; image_url: string }[];
  location: string | null;
  seller: {
    id: string;
    email: string;
    username: string;
    display_name: string;
  };
}

export default function SearchPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState<number | null>(null);
  const [addingToWishlist, setAddingToWishlist] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    min_price: '',
    max_price: '',
    in_stock: false,
    ordering: '-created_at',
  });
  const { user } = useAuth();

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {};
      if (searchQuery) params.q = searchQuery;
      if (filters.min_price) params.min_price = filters.min_price;
      if (filters.max_price) params.max_price = filters.max_price;
      if (filters.in_stock) params.in_stock = 'true';
      if (filters.ordering) params.ordering = filters.ordering;
      
      const data = await productService.search(params);
      setProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProducts();
  };

  const handleAddToWishlist = async (productId: number, e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) return;
    setAddingToWishlist(productId);
    try {
      await wishlistService.add(productId);
    } catch (error) {
      console.error('Error adding to wishlist:', error);
    } finally {
      setAddingToWishlist(null);
    }
  };

  const handleAddToCart = async (productId: number, e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) return;
    setAddingToCart(productId);
    try {
      await cartService.add(productId, 1);
    } catch (error) {
      console.error('Error adding to cart:', error);
    } finally {
      setAddingToCart(null);
    }
  };

  return (
    <div className="min-h-screen">
      <NavBar showSearch />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="card p-6 mb-8 animate-fade-in">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar productos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-12"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="btn-secondary flex items-center justify-center gap-2"
            >
              <Filter className="w-5 h-5" />
              Filtros
            </button>
            <button
              type="submit"
              className="btn-primary"
            >
              Buscar
            </button>
          </form>

          {showFilters && (
            <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-1 md:grid-cols-4 gap-4 animate-fade-in">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Precio mín.</label>
                <input
                  type="number"
                  value={filters.min_price}
                  onChange={(e) => setFilters({ ...filters, min_price: e.target.value })}
                  className="input"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Precio máx.</label>
                <input
                  type="number"
                  value={filters.max_price}
                  onChange={(e) => setFilters({ ...filters, max_price: e.target.value })}
                  className="input"
                  placeholder="999999"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Ordenar por</label>
                <select
                  value={filters.ordering}
                  onChange={(e) => setFilters({ ...filters, ordering: e.target.value })}
                  className="input text-black"
                >
                  <option value="-created_at">Más recientes</option>
                  <option value="price">Menor precio</option>
                  <option value="-price">Mayor precio</option>
                  <option value="name">Nombre A-Z</option>
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.in_stock}
                    onChange={(e) => setFilters({ ...filters, in_stock: e.target.checked })}
                    className="w-4 h-4 rounded border-white/20 bg-white/5 text-teal-500 focus:ring-teal-500/50"
                  />
                  <span className="text-sm text-zinc-300">Solo disponibles</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* MONETIZACIÓN: Anuncios destacados */}
        <div className="mb-6 p-4 rounded-xl border border-zinc-700/50 bg-zinc-800/30 animate-fade-in">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-zinc-600" />
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Anuncios Destacados</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 rounded-lg bg-zinc-800/50 border border-zinc-700/30 flex items-center justify-center">
                <p className="text-xs text-zinc-600">Espacio Publicitario</p>
              </div>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-12 h-12 border-4 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <Package className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
            <p className="text-zinc-400 text-lg">No se encontraron productos</p>
          </div>
        ) : (
          <div className="flex gap-6">
            <aside className="hidden xl:block w-48 flex-shrink-0">
              <div className="sticky top-24 space-y-4">
                <div className="h-64 rounded-xl border border-zinc-700/30 bg-zinc-800/30 flex items-center justify-center">
                  <p className="text-xs text-zinc-600 text-center px-2">Espacio Publicitario</p>
                </div>
                <div className="h-64 rounded-xl border border-zinc-700/30 bg-zinc-800/30 flex items-center justify-center">
                  <p className="text-xs text-zinc-600 text-center px-2">Espacio Publicitario</p>
                </div>
              </div>
            </aside>
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
            {products.map((product, index) => (
              <article
                key={product.id}
                className="card p-4 hover:bg-white/10 transition-all duration-300 hover:scale-[1.02] animate-fade-in group"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <Link to={`/product/${product.id}`}>
                  <div className="w-full aspect-square rounded-xl bg-gradient-to-br from-teal-900/50 to-cyan-900/50 mb-4 flex items-center justify-center overflow-hidden relative">
                    {(() => {
                      const img = product.images?.[0]?.image_url || product.image_url;
                      return img ? (
                        <img
                          src={img}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      ) : (
                        <Package className="w-12 h-12 text-teal-500/50" />
                      );
                    })()}
                    {!product.is_available && (
                      <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                        <span className="text-white font-medium px-3 py-1 bg-red-500/80 rounded-lg">Agotado</span>
                      </div>
                    )}
                  </div>
                </Link>
                <Link to={`/product/${product.id}`} className="block">
                  <h3 className="text-lg font-semibold text-white mb-1 truncate">{product.name}</h3>
                  <p className="text-zinc-400 text-sm line-clamp-2 mb-3">{product.description}</p>
                </Link>
                {product.location && (
                  <div className="flex items-center gap-1 text-sm text-zinc-500 mb-3">
                    <MapPin className="w-4 h-4" />
                    <span className="truncate">{product.location}</span>
                  </div>
                )}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xl font-bold text-teal-400">
                    ${formatPrice(product.price)}
                  </span>
                  <span className="text-sm text-zinc-500">
                    Stock: {product.stock}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => handleAddToWishlist(product.id, e)}
                    disabled={addingToWishlist === product.id || !user}
                    className="flex-1 py-2 border border-white/10 rounded-xl hover:bg-white/10 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {addingToWishlist === product.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Heart className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={(e) => handleAddToCart(product.id, e)}
                    disabled={!product.is_available || addingToCart === product.id || !user}
                    className="flex-1 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl hover:from-teal-500 hover:to-cyan-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {addingToCart === product.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ShoppingCart className="w-4 h-4" />
                    )}
                    <span>Agregar</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
            <aside className="hidden xl:block w-48 flex-shrink-0">
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
      </main>
    </div>
  );
}
