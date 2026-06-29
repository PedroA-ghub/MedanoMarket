import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Package, Heart, ShoppingCart, MapPin, ArrowLeft, 
  Loader2, Check, Truck, Shield, Clock, Pencil, ChevronLeft, ChevronRight, Trash2, Flag
} from 'lucide-react';
import { productService, wishlistService, cartService, orderService, proService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import ReportUserModal from '../components/ReportUserModal';
import { formatPrice } from '../utils';

interface ProductImage {
  id: number;
  image_url: string;
}

interface Product {
  id: number;
  name: string;
  description: string;
  price: string;
  price_bs: string | null;
  stock: number;
  is_available: boolean;
  image_url: string | null;
  images: ProductImage[];
  location: string | null;
  seller: {
    id: string;
    email: string;
    username: string;
    display_name: string;
  };
  created_at: string;
}

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addingToCart, setAddingToCart] = useState(false);
  const [addingToWishlist, setAddingToWishlist] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [shippingAddress, setShippingAddress] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [proAnalytics, setProAnalytics] = useState<{
    view_count: number;
    favorite_count: number;
    order_count: number;
    revenue: string;
  } | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadProduct();
  }, [id]);

  useEffect(() => {
    if (product && user?.is_pro && isOwner) {
      loadProAnalytics();
    }
  }, [product, user]);

  const loadProAnalytics = async () => {
    try {
      const data = await proService.dashboard();
      const thisProduct = data.products?.find((p: { id: number }) => p.id === product?.id);
      if (thisProduct) {
        setProAnalytics({
          view_count: thisProduct.view_count,
          favorite_count: thisProduct.favorite_count,
          order_count: thisProduct.order_count,
          revenue: thisProduct.revenue,
        });
      }
    } catch {
      // Not PRO or error
    }
  };

  const loadProduct = async () => {
    if (!id) return;
    try {
      const data = await productService.get(parseInt(id));
      setProduct(data);
    } catch {
      setError('Producto no encontrado');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!product || !user) return;
    setAddingToCart(true);
    try {
      await cartService.add(product.id, quantity);
    } catch (error) {
      console.error('Error adding to cart:', error);
    } finally {
      setAddingToCart(false);
    }
  };

  const handleAddToWishlist = async () => {
    if (!product || !user) return;
    setAddingToWishlist(true);
    try {
      await wishlistService.add(product.id);
    } catch (error) {
      console.error('Error adding to wishlist:', error);
    } finally {
      setAddingToWishlist(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!product || !user || !shippingAddress.trim()) return;
    setPlacingOrder(true);
    try {
      const order = await orderService.create(product.id, shippingAddress, quantity);
      setOrderSuccess(true);
      setTimeout(() => {
        navigate(`/chat/${order.id}`);
      }, 2000);
    } catch (error) {
      console.error('Error placing order:', error);
    } finally {
      setPlacingOrder(false);
    }
  };

  if (loading) {
    return (
      <Layout showSearch>
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="w-12 h-12 border-4 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  if (error || !product) {
    return (
      <Layout showSearch>
        <div className="max-w-7xl mx-auto px-6 py-16 text-center">
          <Package className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Producto no encontrado</h1>
          <p className="text-zinc-400 mb-6">{error}</p>
          <Link to="/" className="btn-primary">
            Volver al inicio
          </Link>
        </div>
      </Layout>
    );
  }

  const isOwner = user?.id === product.seller.id;

  const allImages = product.images
    ? product.images.map((img: ProductImage) => img.image_url)
    : product.image_url
    ? [product.image_url]
    : [];

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await productService.delete(product.id);
      navigate('/');
    } catch {
      alert('Error al eliminar el producto');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Layout showSearch>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Link 
          to="/"
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
          <div className="card p-4">
            <div className="relative w-full aspect-square rounded-2xl bg-gradient-to-br from-teal-900/50 to-cyan-900/50 flex items-center justify-center overflow-hidden">
              {allImages.length > 0 ? (
                <>
                  <img
                    src={allImages[currentImageIndex]}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                  {allImages.length > 1 && (
                    <>
                      <button
                        onClick={() => setCurrentImageIndex(prev => (prev === 0 ? allImages.length - 1 : prev - 1))}
                        className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
                      >
                        <ChevronLeft className="w-5 h-5 text-white" />
                      </button>
                      <button
                        onClick={() => setCurrentImageIndex(prev => (prev === allImages.length - 1 ? 0 : prev + 1))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
                      >
                        <ChevronRight className="w-5 h-5 text-white" />
                      </button>
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                        {allImages.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => setCurrentImageIndex(idx)}
                            className={`w-2 h-2 rounded-full transition-all ${
                              idx === currentImageIndex ? 'bg-white w-4' : 'bg-white/50'
                            }`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <Package className="w-24 h-24 text-teal-500/50" />
              )}
            </div>
            {allImages.length > 1 && (
              <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
                {allImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                      idx === currentImageIndex ? 'border-teal-400' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                {product.name}
              </h1>
              <div className="flex items-center gap-4 text-sm text-zinc-400">
                <span>Vendedor: <Link to={`/seller/${product.seller.id}`} className="hover:text-teal-400 transition-colors">{product.seller.display_name}</Link></span>
                {product.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {product.location}
                  </span>
                )}
                {user && !isOwner && (
                  <button
                    onClick={() => setShowReportModal(true)}
                    className="ml-auto flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors"
                  >
                    <Flag className="w-3.5 h-3.5" />
                    Denunciar
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-baseline gap-3">
              <div className="flex flex-col">
                <span className="text-4xl font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
                  ${formatPrice(product.price)}
                </span>
                {product.price_bs && (
                  <span className="text-lg text-zinc-400 mt-1">
                    Bs {formatPrice(product.price_bs)}
                  </span>
                )}
              </div>
              <span className={`text-sm px-3 py-1 rounded-full ${
                product.is_available 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-red-500/20 text-red-400'
              }`}>
                {product.is_available ? `Stock: ${product.stock}` : 'Agotado'}
              </span>
            </div>

            <p className="text-zinc-300 leading-relaxed">
              {product.description}
            </p>

            <div className="grid grid-cols-3 gap-4">
              <div className="card p-4 text-center">
                <Truck className="w-6 h-6 text-teal-400 mx-auto mb-2" />
                <p className="text-xs text-zinc-400">Envío seguro</p>
              </div>
              <div className="card p-4 text-center">
                <Shield className="w-6 h-6 text-teal-400 mx-auto mb-2" />
                <p className="text-xs text-zinc-400">Compra protegida</p>
              </div>
              <div className="card p-4 text-center">
                <Clock className="w-6 h-6 text-teal-400 mx-auto mb-2" />
                <p className="text-xs text-zinc-400">Soporte 24/7</p>
              </div>
            </div>

            {!isOwner && product.is_available && user && (
              <div className="card p-6 space-y-4">
                <div className="flex items-center gap-4">
                  <label className="text-sm text-zinc-400">Cantidad:</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={quantity}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '');
                      const num = parseInt(value) || 1;
                      setQuantity(Math.min(num, product.stock));
                    }}
                    className="input w-24 text-center"
                    min="1"
                    max={product.stock}
                  />
                  <span className="text-xs text-zinc-500">Max: {product.stock}</span>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleAddToWishlist}
                    disabled={addingToWishlist}
                    className="flex-1 py-3 border border-white/10 rounded-xl hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                  >
                    {addingToWishlist ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Heart className="w-5 h-5" />
                    )}
                    Favoritos
                  </button>
                  <button
                    onClick={handleAddToCart}
                    disabled={addingToCart}
                    className="flex-1 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl hover:from-teal-500 hover:to-cyan-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {addingToCart ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <ShoppingCart className="w-5 h-5" />
                    )}
                    Agregar al carrito
                  </button>
                </div>
                <button
                  onClick={() => setShowOrderModal(true)}
                  className="w-full btn-primary"
                >
                  Comprar ahora
                </button>
              </div>
            )}

            {!user && (
              <div className="card p-6 text-center">
                <p className="text-zinc-400 mb-4">Inicia sesión para comprar este producto</p>
                <div className="flex gap-3 justify-center">
                  <Link to="/login" className="btn-secondary">
                    Iniciar Sesión
                  </Link>
                  <Link to="/register" className="btn-primary">
                    Registrarse
                  </Link>
                </div>
              </div>
            )}

            {isOwner && (
              <div className="card p-6 space-y-4">
                <p className="text-teal-400 text-center text-sm">Este es tu producto</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => navigate(`/product/${id}/edit`)}
                    className="flex-1 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl hover:from-teal-500 hover:to-cyan-500 transition-all flex items-center justify-center gap-2"
                  >
                    <Pencil className="w-5 h-5" />
                    Editar Producto
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-6 py-3 bg-red-600/20 text-red-400 rounded-xl hover:bg-red-600/30 transition-all flex items-center justify-center gap-2 border border-red-600/30"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showOrderModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-lg p-6 animate-fade-in">
            {orderSuccess ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">¡Pedido realizado!</h2>
                <p className="text-zinc-400 mb-4">Serás redirigido al chat con el vendedor...</p>
                <div className="w-8 h-8 border-4 border-teal-500/30 border-t-teal-500 rounded-full animate-spin mx-auto" />
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-white mb-6">Completar pedido</h2>
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm text-zinc-400 mb-2">Dirección de envío</label>
                    <textarea
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      className="input h-32 resize-none"
                      placeholder="Ingresa tu dirección completa..."
                      required
                    />
                  </div>
                  <div className="flex justify-between text-zinc-300">
                    <span>Cantidad:</span>
                    <span>{quantity}</span>
                  </div>
                  <div className="flex justify-between text-xl font-bold">
                    <span className="text-white">Total:</span>
                    <span className="text-teal-400">
                      ${formatPrice(parseFloat(product.price) * quantity)}
                    </span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowOrderModal(false)}
                    className="flex-1 btn-secondary"
                    disabled={placingOrder}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handlePlaceOrder}
                    disabled={placingOrder || !shippingAddress.trim()}
                    className="flex-1 btn-primary flex items-center justify-center gap-2"
                  >
                    {placingOrder ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      'Confirmar pedido'
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {isOwner && (
        <div className="max-w-7xl mx-auto px-6 mt-8 animate-fade-in">
          <div className={`card p-6 border ${user?.is_pro && proAnalytics ? 'border-amber-500/20 bg-amber-500/5' : 'border-zinc-700/50 bg-zinc-800/30'}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-3 h-3 rounded-full ${user?.is_pro && proAnalytics ? 'bg-amber-500' : 'bg-zinc-600'}`} />
              <h2 className={`text-lg font-semibold ${user?.is_pro && proAnalytics ? 'text-amber-400' : 'text-zinc-500'}`}>
                {user?.is_pro && proAnalytics ? 'Analíticas de este producto' : 'Panel de Analíticas PRO'}
              </h2>
            </div>
            {user?.is_pro && proAnalytics ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="h-24 rounded-xl bg-zinc-800/50 border border-zinc-700/30 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">{proAnalytics.view_count}</p>
                    <p className="text-xs text-zinc-400">Visitas</p>
                  </div>
                </div>
                <div className="h-24 rounded-xl bg-zinc-800/50 border border-zinc-700/30 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">{proAnalytics.favorite_count}</p>
                    <p className="text-xs text-zinc-400">Favoritos</p>
                  </div>
                </div>
                <div className="h-24 rounded-xl bg-zinc-800/50 border border-zinc-700/30 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">{proAnalytics.order_count}</p>
                    <p className="text-xs text-zinc-400">Pedidos</p>
                  </div>
                </div>
                <div className="h-24 rounded-xl bg-zinc-800/50 border border-zinc-700/30 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-emerald-400">${formatPrice(proAnalytics.revenue)}</p>
                    <p className="text-xs text-zinc-400">Ingresos</p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {["Visitas", "Favoritos", "Conversión", "Tendencia"].map((label) => (
                    <div key={label} className="h-24 rounded-xl bg-zinc-800/50 border border-zinc-700/30 flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-6 h-6 bg-zinc-700 rounded mx-auto mb-2" />
                        <p className="text-xs text-zinc-600">{label}</p>
                        <p className="text-xs text-zinc-700">—</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-zinc-700 text-center mt-3">
                  {user ? 'Actualiza a PRO para ver analíticas detalladas' : 'Inicia sesión como vendedor para ver analíticas'}
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md p-6 animate-fade-in">
            <h2 className="text-xl font-bold text-white mb-2">Eliminar producto</h2>
            <p className="text-zinc-400 mb-6">
              ¿Estás seguro de que quieres eliminar "{product.name}"? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl hover:bg-red-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {deleting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-5 h-5" />
                    Eliminar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <ReportUserModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        reportedUser={product.seller}
        productId={product.id}
      />
    </Layout>
  );
}
