import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cartService, orderService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ShoppingCart, Trash2, Plus, Minus, Package, MapPin, CreditCard, ArrowLeft } from 'lucide-react';
import { formatPrice } from '../utils';
import Layout from '../components/Layout';

interface CartItem {
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
    seller?: { id: string };
  };
  quantity: number;
  subtotal: string;
}

export default function Cart() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [shippingAddress, setShippingAddress] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchCart = async () => {
    try {
      const data = await cartService.list();
      setItems(data);
    } catch (error) {
      console.error('Error fetching cart:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchCart();
    } else {
      setLoading(false);
    }
  }, [user]);

  const handleUpdateQuantity = async (productId: number, quantity: number) => {
    try {
      await cartService.updateQuantity(productId, quantity);
      fetchCart();
    } catch (error) {
      console.error('Error updating quantity:', error);
    }
  };

  const handleRemove = async (productId: number) => {
    try {
      await cartService.remove(productId);
      setItems(items.filter((item) => item.product.id !== productId));
    } catch (error) {
      console.error('Error removing from cart:', error);
    }
  };

  const handleCheckout = async () => {
    if (!shippingAddress.trim()) {
      alert('Por favor ingresa una dirección de envío');
      return;
    }

    setCheckoutLoading(true);
    try {
      const groups = new Map<string, { product_id: number; quantity: number }[]>();
      for (const item of items) {
        const sellerId = item.product.seller?.id || 'unknown';
        if (!groups.has(sellerId)) groups.set(sellerId, []);
        groups.get(sellerId)!.push({ product_id: item.product.id, quantity: item.quantity });
      }

      const promises: Promise<unknown>[] = [];
      for (const [, sellerItems] of groups) {
        if (sellerItems.length === 1) {
          promises.push(orderService.create(sellerItems[0].product_id, shippingAddress, sellerItems[0].quantity));
        } else {
          promises.push(orderService.createMultiItem(sellerItems, shippingAddress));
        }
      }
      await Promise.all(promises);
      await cartService.clear();
      navigate('/orders');
    } catch (error: unknown) {
      const err = error as { response?: { data?: Record<string, unknown>; status?: number }; message?: string };
      const data = err.response?.data;
      const msg =
        (typeof data === 'object' && data !== null && 'error' in data ? String(data.error) : null) ||
        (typeof data === 'object' && data !== null ? Object.values(data).flat().join(', ') : null) ||
        err.message ||
        'Error al procesar el pedido';
      alert(msg);
    } finally {
      setCheckoutLoading(false);
    }
  };

  const total = items.reduce((sum, item) => sum + parseFloat(item.subtotal), 0);

  if (!user) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
          <ShoppingCart className="w-16 h-16 text-zinc-600 mb-4" />
          <h2 className="text-2xl font-bold text-white mb-4">Inicia sesión para ver tu carrito</h2>
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
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/" className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-zinc-400" />
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <ShoppingCart className="w-8 h-8 text-teal-400" />
            Mi Carrito
          </h1>
        </div>

        {items.length === 0 ? (
          <div className="card p-12 text-center animate-fade-in">
            <ShoppingCart className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
            <p className="text-zinc-400 text-lg mb-6">Tu carrito está vacío</p>
            <Link to="/search" className="btn-primary inline-flex items-center gap-2">
              Explorar productos
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
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
                      <span className="text-sm text-zinc-500">
                        Subtotal: ${formatPrice(item.subtotal)}
                      </span>
                    </div>
                  </div>
                  <div className="flex sm:flex-col items-center justify-between sm:justify-center gap-3">
                    <div className="flex items-center gap-2 bg-white/5 rounded-lg p-1">
                      <button
                        onClick={() => handleUpdateQuantity(item.product.id, item.quantity - 1)}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        disabled={item.quantity <= 1}
                      >
                        <Minus className="w-4 h-4 text-zinc-400" />
                      </button>
                      <span className="w-8 text-center font-medium text-white">{item.quantity}</span>
                      <button
                        onClick={() => handleUpdateQuantity(item.product.id, item.quantity + 1)}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        disabled={item.quantity >= item.product.stock}
                      >
                        <Plus className="w-4 h-4 text-zinc-400" />
                      </button>
                    </div>
                    <button
                      onClick={() => handleRemove(item.product.id)}
                      className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <div className="lg:col-span-1">
              <div className="card p-6 sticky top-24">
                <h2 className="text-lg font-semibold text-white mb-4">Resumen del pedido</h2>
                
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-zinc-300">
                    <span>Productos ({items.length})</span>
                    <span>${formatPrice(total)}</span>
                  </div>
                  <div className="flex justify-between text-zinc-300">
                    <span>Envío</span>
                    <span className="text-green-400">Gratis</span>
                  </div>
                  <div className="border-t border-white/10 pt-3 flex justify-between font-bold text-xl">
                    <span className="text-white">Total</span>
                    <span className="text-teal-400">${formatPrice(total)}</span>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm text-zinc-400 mb-2">
                    Dirección de envío
                  </label>
                  <textarea
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    className="input h-24 resize-none"
                    placeholder="Ingresa tu dirección completa..."
                  />
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={checkoutLoading || !shippingAddress.trim()}
                  className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {checkoutLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5" />
                      Finalizar compra
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
