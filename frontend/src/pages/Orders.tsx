import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Package, ArrowLeft } from 'lucide-react';
import { orderService } from '../services/api';
import Layout from '../components/Layout';

interface Order {
  id: string;
  status: string;
  total_amount: string;
  created_at: string;
  items: { product_name: string; quantity: number }[];
}

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  confirmed: { label: 'Confirmado', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  delivered: { label: 'Entregado', color: 'bg-teal-500/20 text-teal-400 border-teal-500/30' },
  completed: { label: 'Completado', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  cancelled: { label: 'Cancelado', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const data = await orderService.list();
      setOrders(data);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout showSearch>
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/" className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-zinc-400" />
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <ShoppingBag className="w-8 h-8 text-teal-400" />
            Mis Pedidos
          </h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-12 h-12 border-4 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="card p-12 text-center animate-fade-in">
            <Package className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">No tienes pedidos</h2>
            <p className="text-zinc-400 mb-6">Cuando hagas un pedido, aparecerá aquí</p>
            <Link to="/" className="btn-primary inline-flex items-center gap-2">
              Ver Productos
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order, index) => {
              const statusInfo = statusLabels[order.status] || statusLabels.pending;
              return (
                <Link 
                  key={order.id}
                  to={`/chat/${order.id}`}
                  className="card p-6 block hover:bg-white/10 transition-all duration-300 animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                    <div>
                      <p className="text-xs text-zinc-500 mb-1">
                        Order #{order.id.slice(0, 8)}
                      </p>
                      <p className="text-sm text-zinc-400">
                        {new Date(order.created_at).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusInfo.color} self-start`}>
                      {statusInfo.label}
                    </span>
                  </div>
                  
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      {order.items.map((item, i) => (
                        <p key={i} className="text-white">
                          {item.product_name}
                          {item.quantity > 1 && ` x${item.quantity}`}
                        </p>
                      ))}
                    </div>
                    <p className="text-xl font-bold text-teal-400 whitespace-nowrap">
                      ${order.total_amount}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
