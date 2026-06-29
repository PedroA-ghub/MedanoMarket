import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Eye, Heart, ShoppingBag, DollarSign, Crown, TrendingUp,
  ArrowLeft, Star, Loader2, Package, AlertTriangle, PackageOpen, BarChart3
} from 'lucide-react';
import { formatPrice } from '../utils';
import { proService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import NavBar from '../components/NavBar';

interface ProductStat {
  id: number;
  name: string;
  price: string;
  stock: number;
  featured: boolean;
  view_count: number;
  favorite_count: number;
  order_count: number;
  revenue: string;
}

interface DashboardData {
  total_views: number;
  total_favorites: number;
  total_orders: number;
  total_revenue: string;
  products: ProductStat[];
  trend: {
    labels: string[];
    views: number[];
    orders: number[];
    revenue: number[];
  };
}

export default function ProDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<number | null>(null);
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login');
      return;
    }
    if (!user.is_pro) {
      navigate('/pro/upgrade');
      return;
    }
    loadDashboard();
  }, [user, authLoading]);

  const loadDashboard = async () => {
    try {
      const dashboardData = await proService.dashboard();
      setData(dashboardData);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: unknown }; message?: string };
      console.error('Error loading dashboard:', axiosErr.response?.status, axiosErr.response?.data || axiosErr.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFeatured = async (productId: number) => {
    setToggling(productId);
    try {
      await proService.toggleFeatured(productId);
      loadDashboard();
    } catch {
      console.error('Error toggling featured');
    } finally {
      setToggling(null);
    }
  };

  const chartRef = useRef<HTMLCanvasElement>(null);
  const [chartMode, setChartMode] = useState<'views' | 'orders' | 'revenue'>('views');

  useEffect(() => {
    if (!data || !chartRef.current) return;

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js';
    script.onload = () => {
      const ctx = chartRef.current?.getContext('2d');
      if (!ctx) return;

      const series = data.trend[chartMode === 'revenue' ? 'revenue' : chartMode === 'orders' ? 'orders' : 'views'];

      new (window as any).Chart(ctx, {
        type: 'line',
        data: {
          labels: data.trend.labels,
          datasets: [{
            label: chartMode === 'views' ? 'Visitas' : chartMode === 'orders' ? 'Pedidos' : 'Ingresos ($)',
            data: series,
            borderColor: chartMode === 'views' ? '#22d3ee' : chartMode === 'orders' ? '#22c55e' : '#f59e0b',
            backgroundColor: chartMode === 'views' ? 'rgba(34,211,238,0.1)' : chartMode === 'orders' ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 3,
            pointHoverRadius: 6,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: '#71717a', maxTicksLimit: 10 }, grid: { color: 'rgba(255,255,255,0.05)' } },
            y: { ticks: { color: '#71717a' }, grid: { color: 'rgba(255,255,255,0.05)' } },
          },
        },
      });
    };
    document.head.appendChild(script);
    return () => {
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, [data, chartMode]);

  if (loading || authLoading) {
    return (
      <div className="min-h-screen">
        <NavBar showSearch />
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="w-12 h-12 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen">
        <NavBar showSearch />
        <div className="text-center py-20">
          <p className="text-zinc-400">Error al cargar el dashboard</p>
        </div>
      </div>
    );
  }

  const lowStockProducts = data.products.filter((p) => p.stock < 5);
  const lowStockCount = lowStockProducts.length;

  const statsCards = [
    {
      label: 'Visitas totales',
      value: data.total_views.toLocaleString(),
      icon: Eye,
      gradient: 'from-blue-600 to-cyan-600',
    },
    {
      label: 'Favoritos',
      value: data.total_favorites.toLocaleString(),
      icon: Heart,
      gradient: 'from-rose-600 to-pink-600',
    },
    {
      label: 'Pedidos',
      value: data.total_orders.toLocaleString(),
      icon: ShoppingBag,
      gradient: 'from-teal-600 to-emerald-600',
    },
    {
      label: 'Ingresos totales',
      value: `$${formatPrice(data.total_revenue)}`,
      icon: DollarSign,
      gradient: 'from-amber-600 to-yellow-600',
    },
  ];

  return (
    <div className="min-h-screen">
      <NavBar showSearch />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al inicio
        </button>

        <div className="flex items-center gap-3 mb-8 animate-fade-in">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center shadow-[0_0_16px_rgba(251,191,36,0.3)]">
            <Crown className="w-6 h-6 text-black" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard PRO</h1>
            <p className="text-zinc-400 text-sm">Analíticas y herramientas premium</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {statsCards.map((stat) => (
            <div key={stat.label} className="card p-5 animate-fade-in">
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.gradient} flex items-center justify-center mb-3`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-white mb-1">{stat.value}</p>
              <p className="text-xs text-zinc-400">{stat.label}</p>
            </div>
          ))}
          <div className="card p-5 animate-fade-in border-2 border-amber-500/30 bg-amber-500/5">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-600 to-orange-600 flex items-center justify-center mb-3">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <p className="text-2xl font-bold text-amber-400 mb-1">{lowStockCount}</p>
            <p className="text-xs text-zinc-400">Stock bajo</p>
          </div>
        </div>

        {lowStockProducts.length > 0 && (
          <div className="card p-6 mb-8 border border-red-500/20 bg-red-500/5 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <PackageOpen className="w-5 h-5 text-red-400" />
              <h2 className="text-lg font-semibold text-white">Productos con stock bajo</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lowStockProducts.map((product) => (
                <Link
                  key={product.id}
                  to={`/product/${product.id}/edit`}
                  className="flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-600 to-orange-600 flex items-center justify-center flex-shrink-0">
                    <Package className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{product.name}</p>
                    <p className="text-sm text-zinc-400">Stock: <span className="text-red-400 font-semibold">{product.stock}</span></p>
                  </div>
                  <span className="text-xs text-zinc-500 flex-shrink-0">Editar</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="card p-6 mb-8 animate-fade-in">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-semibold text-white">Tendencia (30 días)</h2>
            </div>
            <div className="flex gap-1 bg-zinc-800 rounded-lg p-1">
              {(['views', 'orders', 'revenue'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setChartMode(mode)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    chartMode === mode
                      ? 'bg-amber-500 text-black'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {mode === 'views' ? 'Visitas' : mode === 'orders' ? 'Pedidos' : 'Ingresos'}
                </button>
              ))}
            </div>
          </div>
          <div className="h-64">
            <canvas ref={chartRef} />
          </div>
        </div>

        <div className="card p-6 animate-fade-in">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-semibold text-white">Tus productos</h2>
            </div>
            <Link
              to="/create-product"
              className="text-sm text-teal-400 hover:text-teal-300 transition-colors"
            >
              + Nuevo producto
            </Link>
          </div>

          {data.products.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-400">No tienes productos activos</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-zinc-500 border-b border-white/10">
                    <th className="text-left py-3 px-2 font-medium">Producto</th>
                    <th className="text-center py-3 px-2 font-medium">Precio</th>
                    <th className="text-center py-3 px-2 font-medium">Stock</th>
                    <th className="text-center py-3 px-2 font-medium">
                      <Eye className="w-4 h-4 inline" />
                    </th>
                    <th className="text-center py-3 px-2 font-medium">
                      <Heart className="w-4 h-4 inline" />
                    </th>
                    <th className="text-center py-3 px-2 font-medium">
                      <ShoppingBag className="w-4 h-4 inline" />
                    </th>
                    <th className="text-center py-3 px-2 font-medium">
                      <DollarSign className="w-4 h-4 inline" />
                    </th>
                    <th className="text-center py-3 px-2 font-medium">Destacado</th>
                  </tr>
                </thead>
                <tbody>
                  {data.products.map((product) => (
                    <tr key={product.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-3 px-2">
                        <Link
                          to={`/product/${product.id}`}
                          className="text-white hover:text-teal-400 transition-colors font-medium"
                        >
                          {product.name}
                        </Link>
                      </td>
                      <td className="text-center py-3 px-2 text-zinc-300">
                        ${formatPrice(product.price)}
                      </td>
                      <td className="text-center py-3 px-2">
                        <span className={`font-semibold ${product.stock < 5 ? 'text-red-400' : 'text-zinc-300'}`}>
                          {product.stock}
                        </span>
                      </td>
                      <td className="text-center py-3 px-2 text-zinc-400">{product.view_count}</td>
                      <td className="text-center py-3 px-2 text-zinc-400">{product.favorite_count}</td>
                      <td className="text-center py-3 px-2 text-zinc-400">{product.order_count}</td>
                      <td className="text-center py-3 px-2 text-emerald-400 font-medium">
                        ${formatPrice(product.revenue)}
                      </td>
                      <td className="text-center py-3 px-2">
                        <button
                          onClick={() => handleToggleFeatured(product.id)}
                          disabled={toggling === product.id}
                          className={`p-1.5 rounded-lg transition-all ${
                            product.featured
                              ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                              : 'bg-zinc-800 text-zinc-600 hover:text-zinc-400'
                          }`}
                          title={product.featured ? 'Quitar destacado' : 'Destacar producto'}
                        >
                          {toggling === product.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Star className={`w-4 h-4 ${product.featured ? 'fill-amber-400' : ''}`} />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-8 card p-6 border border-amber-500/20 bg-amber-500/5 animate-fade-in">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-5 h-5 text-black" />
            </div>
            <div>
              <h3 className="text-white font-semibold mb-1">Consejo PRO</h3>
              <p className="text-zinc-400 text-sm">
                Destaca tus productos más vendidos para que aparezcan primero en los resultados de búsqueda.
                Los productos destacados reciben hasta 3x más visitas.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
