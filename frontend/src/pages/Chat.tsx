import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { orderService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Send, ArrowLeft, CheckCircle, XCircle, Package, ShoppingBag, Flag } from 'lucide-react';
import { formatPrice } from '../utils';
import Layout from '../components/Layout';
import ReportUserModal from '../components/ReportUserModal';

interface Message {
  id: string;
  sender: {
    id: string;
    username: string;
    display_name: string;
  };
  content: string;
  sent_at: string;
  is_read: boolean;
}

interface Order {
  id: string;
  status: string;
  buyer: {
    id: string;
    username: string;
    display_name: string;
  };
  seller: {
    id: string;
    username: string;
    display_name: string;
  };
  items: Array<{
    product_name: string;
    product_price: string;
    quantity: number;
  }>;
  total_amount: string;
  seller_delivered: boolean;
  buyer_paid: boolean;
}

export default function Chat() {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchOrder = async () => {
    if (!orderId) return;
    try {
      const orderData = await orderService.get(orderId);
      setOrder(orderData);
      setMessages(orderData.messages || []);
    } catch (error) {
      console.error('Error fetching order:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
    const interval = setInterval(fetchOrder, 5000);
    return () => clearInterval(interval);
  }, [orderId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !orderId) return;

    setSending(true);
    try {
      await orderService.sendMessage(orderId, newMessage);
      setNewMessage('');
      fetchOrder();
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleMarkDelivered = async () => {
    if (!orderId) return;
    try {
      await orderService.deliver(orderId);
      fetchOrder();
    } catch (error) {
      console.error('Error marking delivered:', error);
    }
  };

  const handleConfirmPayment = async () => {
    if (!orderId) return;
    try {
      await orderService.pay(orderId, 'efectivo');
      fetchOrder();
    } catch (error) {
      console.error('Error confirming payment:', error);
    }
  };

  const handleCancelOrder = async () => {
    if (!orderId) return;
    try {
      await orderService.cancel(orderId);
      navigate('/orders');
    } catch (error) {
      console.error('Error cancelling order:', error);
    }
  };

  if (!user) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
          <ShoppingBag className="w-16 h-16 text-zinc-600 mb-4" />
          <h2 className="text-2xl font-bold text-white mb-4">Inicia sesión para ver el chat</h2>
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

  if (!order) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
          <Package className="w-16 h-16 text-zinc-600 mb-4" />
          <h2 className="text-2xl font-bold text-white mb-4">Orden no encontrada</h2>
          <Link to="/orders" className="btn-primary">
            Volver a órdenes
          </Link>
        </div>
      </Layout>
    );
  }

  const isBuyer = order.buyer.id === user.id;
  const otherUser = isBuyer ? order.seller : order.buyer;

  return (
    <Layout showSearch>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/orders')}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-zinc-400" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-white">Chat con {otherUser.display_name}</h1>
              <button
                onClick={() => setShowReportModal(true)}
                className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors px-2 py-1 rounded-lg hover:bg-red-500/10"
              >
                <Flag className="w-3.5 h-3.5" />
                Denunciar
              </button>
            </div>
            <p className="text-sm text-zinc-400">
              Pedido #{order.id.slice(0, 8)} • {order.status}
            </p>
          </div>
        </div>

        <div className="card p-4 md:p-6 mb-6">
          <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
            <Package className="w-5 h-5 text-teal-400" />
            Detalles del pedido
          </h3>
          <div className="space-y-2 mb-4">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <span className="text-zinc-300">{item.product_name} x{item.quantity}</span>
                <span className="font-medium text-white">${formatPrice(item.product_price)}</span>
              </div>
            ))}
            <div className="border-t border-white/10 pt-2 flex justify-between font-bold">
              <span className="text-white">Total</span>
              <span className="text-teal-400">${formatPrice(order.total_amount)}</span>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {isBuyer && !order.seller_delivered && order.status !== 'cancelled' && (
              <p className="text-sm text-zinc-400 w-full">Esperando que el vendedor envíe el producto...</p>
            )}
            {isBuyer && order.seller_delivered && !order.buyer_paid && (
              <button
                onClick={handleConfirmPayment}
                className="btn-primary flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Confirmar pago
              </button>
            )}
            {!isBuyer && !order.seller_delivered && order.status !== 'cancelled' && (
              <button
                onClick={handleMarkDelivered}
                className="btn-primary flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Marcar como entregado
              </button>
            )}
            {order.status !== 'cancelled' && order.status !== 'completed' && (
              <button
                onClick={handleCancelOrder}
                className="px-4 py-2 border border-red-500/30 text-red-400 rounded-xl hover:bg-red-500/10 transition-colors flex items-center gap-2"
              >
                <XCircle className="w-4 h-4" />
                Cancelar
              </button>
            )}
            {order.seller_delivered && (
              <span className="flex items-center gap-1 text-sm text-green-400 px-3 py-1 bg-green-500/10 rounded-full">
                <CheckCircle className="w-4 h-4" /> Entregado
              </span>
            )}
            {order.buyer_paid && (
              <span className="flex items-center gap-1 text-sm text-green-400 px-3 py-1 bg-green-500/10 rounded-full">
                <CheckCircle className="w-4 h-4" /> Pagado
              </span>
            )}
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="h-64 md:h-96 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <p className="text-center text-zinc-500 py-8">No hay mensajes aún</p>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender.id === user.id ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs md:max-w-md px-4 py-3 rounded-2xl ${
                      msg.sender.id === user.id
                        ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white'
                        : 'bg-white/10 text-zinc-100'
                    }`}
                  >
                    <p className="text-xs font-semibold mb-1 opacity-80">
                      {msg.sender.id === user.id ? 'Tú' : msg.sender.display_name}
                    </p>
                    <p className="text-sm">{msg.content}</p>
                    <p className={`text-xs mt-1 ${msg.sender.id === user.id ? 'text-violet-200' : 'text-zinc-500'}`}>
                      {new Date(msg.sent_at).toLocaleString('es-ES', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="border-t border-white/10 p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Escribe un mensaje..."
                className="input flex-1"
              />
              <button
                type="submit"
                disabled={sending || !newMessage.trim()}
                className="btn-primary px-4"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </form>
        </div>
      </div>

      <ReportUserModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        reportedUser={{ id: otherUser.id, display_name: otherUser.display_name }}
        orderId={order.id}
      />
    </Layout>
  );
}
