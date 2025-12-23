import React, { useState, useEffect } from 'react';
import { 
  Activity, Server, Database, Shield, ShoppingCart, CreditCard, Box, 
  Users, Terminal, Cpu, AlertCircle, CheckCircle, RefreshCw, Settings, 
  Zap, BarChart3, Search, Play, Pause, Plus, Filter, ChevronRight, 
  X, DollarSign, Bell, ArrowRight, Package, Truck, LayoutGrid, List,
  AlertTriangle, ClipboardList, LogIn, LogOut, UserPlus, Edit, Trash2, Save
} from 'lucide-react';

// --- API Integration ---

const API_BASE = {
  order: 'http://localhost:8081',
  inventory: 'http://localhost:8082',
  catalog: 'http://localhost:8083',
  payment: 'http://localhost:8084',
  notification: 'http://localhost:8085',
  user: 'http://localhost:8086',
  web3: 'http://localhost:8087',
  prometheus: '/prometheus',  // Use Vite proxy
  grafana: 'http://localhost:3000'
};

// Check service health
const checkServiceHealth = async (port) => {
  try {
    const start = Date.now();
    const response = await fetch(`http://localhost:${port}/health`, { signal: AbortSignal.timeout(3000) });
    const latency = Date.now() - start;
    return { 
      status: response.ok ? 'healthy' : 'down', 
      latency: `${latency}ms` 
    };
  } catch (error) {
    return { status: 'down', latency: 'N/A' };
  }
};

// Create Order API
const createOrder = async (orderData) => {
  try {
    const response = await fetch(`${API_BASE.order}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Order creation failed:', error);
    throw error;
  }
};

// Process Payment API
const processPayment = async (paymentData) => {
  try {
    const response = await fetch(`${API_BASE.payment}/api/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Payment processing failed:', error);
    throw error;
  }
};

// Fetch all orders
const fetchOrders = async (userId = '') => {
  try {
    const url = userId ? `${API_BASE.order}/api/orders?user_id=${userId}` : `${API_BASE.order}/api/orders`;
    const response = await fetch(url);
    
    if (!response.ok) throw new Error('Failed to fetch orders');
    
    const data = await response.json();
    return data.orders || [];
  } catch (error) {
    console.error('Failed to fetch orders:', error);
    return [];
  }
};

// Fetch order details
const fetchOrderDetails = async (orderId) => {
  try {
    const response = await fetch(`${API_BASE.order}/api/orders/${orderId}`);
    
    if (!response.ok) throw new Error('Order not found');
    
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch order details:', error);
    throw error;
  }
};

// Fetch order status with saga info
const fetchOrderStatus = async (orderId) => {
  try {
    const response = await fetch(`${API_BASE.order}/api/orders/${orderId}/status`);
    
    if (!response.ok) throw new Error('Failed to fetch status');
    
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch order status:', error);
    throw error;
  }
};

// Fetch notification history
const fetchNotifications = async (type = '') => {
  try {
    const url = type ? `${API_BASE.notification}/api/notifications/history?type=${type}` : `${API_BASE.notification}/api/notifications/history`;
    const response = await fetch(url);
    
    if (!response.ok) throw new Error('Failed to fetch notifications');
    
    const data = await response.json();
    return data.notifications || [];
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
    return [];
  }
};

// Fetch Prometheus metrics
const fetchPrometheusMetric = async (query) => {
  try {
    const response = await fetch(`${API_BASE.prometheus}/api/v1/query?query=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error('Failed to fetch metrics');
    const data = await response.json();
    return data.data?.result || [];
  } catch (error) {
    console.error('Failed to fetch Prometheus metrics:', error);
    return [];
  }
};

// Fetch system metrics for dashboard
const fetchSystemMetrics = async () => {
  try {
    const [ordersTotal, orderDuration, orderValue, notificationsSent, kafkaMessages] = await Promise.all([
      fetchPrometheusMetric('orders_created_total'),
      fetchPrometheusMetric('order_processing_duration_seconds_sum'),
      fetchPrometheusMetric('order_value_sum'),
      fetchPrometheusMetric('notifications_sent_total'),
      fetchPrometheusMetric('kafka_messages_consumed_total')
    ]);
    
    return {
      ordersTotal: ordersTotal.reduce((sum, r) => sum + parseFloat(r.value[1] || 0), 0),
      avgDuration: orderDuration.reduce((sum, r) => sum + parseFloat(r.value[1] || 0), 0),
      totalRevenue: orderValue.reduce((sum, r) => sum + parseFloat(r.value[1] || 0), 0),
      notificationsSent: notificationsSent.reduce((sum, r) => sum + parseFloat(r.value[1] || 0), 0),
      kafkaMessagesConsumed: kafkaMessages.reduce((sum, r) => sum + parseFloat(r.value[1] || 0), 0)
    };
  } catch (error) {
    console.error('Failed to fetch system metrics:', error);
    return { ordersTotal: 0, avgDuration: 0, totalRevenue: 0, notificationsSent: 0, kafkaMessagesConsumed: 0 };
  }
};

// --- Service Configuration ---

const SERVICES = [
  { id: 'order-svc', name: 'Order Service', port: 8081, status: 'checking', latency: '...', uptime: '99.9%' },
  { id: 'inventory-svc', name: 'Inventory Service', port: 8082, status: 'checking', latency: '...', uptime: '99.8%' },
  { id: 'catalog-svc', name: 'Catalog Service', port: 8083, status: 'checking', latency: '...', uptime: '99.9%' },
  { id: 'payment-svc', name: 'Payment Service', port: 8084, status: 'checking', latency: '...', uptime: '98.5%' },
  { id: 'notify-svc', name: 'Notification Service', port: 8085, status: 'checking', latency: '...', uptime: '99.9%' },
  { id: 'user-svc', name: 'User Service', port: 8086, status: 'checking', latency: '...', uptime: '99.9%' },
  { id: 'web3-svc', name: 'Web3 Service', port: 8087, status: 'checking', latency: '...', uptime: '100%' },
];

const PRODUCTS = [
  { id: 101, name: 'Quantum Noise-Canceling Headset', price: 299.99, stock: 45, category: 'Electronics', image: '🎧' },
  { id: 102, name: 'ErgoChair Pro V2', price: 450.00, stock: 12, category: 'Furniture', image: '🪑' },
  { id: 103, name: 'MechKey RGB Pro', price: 129.50, stock: 8, category: 'Electronics', image: '⌨️' },
  { id: 104, name: 'SmartHub Connect', price: 89.99, stock: 120, category: 'IoT', image: '🏠' },
  { id: 105, name: 'UltraView 4K Monitor', price: 320.00, stock: 0, category: 'Electronics', image: '🖥️' },
  { id: 106, name: 'Thunderbolt Dock', price: 75.00, stock: 34, category: 'Accessories', image: '🔌' },
];

const INITIAL_ORDERS = [
  { id: 'ORD-7782-XJ', user: 'user_12', amount: 299.99, status: 'COMPLETED', date: '10 min ago', items: 1 },
  { id: 'ORD-9921-MC', user: 'user_88', amount: 1250.00, status: 'PROCESSING', date: '15 min ago', items: 3 },
  { id: 'ORD-3321-KL', user: 'user_03', amount: 89.99, status: 'FAILED', date: '1 hour ago', items: 1 },
  { id: 'ORD-1102-PP', user: 'user_45', amount: 450.00, status: 'PENDING', date: '2 hours ago', items: 1 },
  { id: 'ORD-5512-AB', user: 'user_99', amount: 120.00, status: 'COMPLETED', date: '3 hours ago', items: 2 },
];

// --- Components ---

const GlassCard = ({ children, className = "", hoverEffect = false }) => (
  <div className={`
    relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-xl shadow-xl
    ${hoverEffect ? 'hover:bg-slate-800/60 hover:border-white/20 transition-all duration-300 hover:-translate-y-1' : ''}
    ${className}
  `}>
    {/* Noise Texture Overlay (simulated) */}
    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none"></div>
    <div className="relative z-10">{children}</div>
  </div>
);

const StatusBadge = ({ status }) => {
  const config = {
    healthy: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: CheckCircle },
    COMPLETED: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: CheckCircle },
    SUCCESS: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: CheckCircle },
    PROCESSING: { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: RefreshCw },
    PENDING: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: Activity },
    FAILED: { color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', icon: AlertCircle },
    degraded: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: AlertCircle },
    down: { color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', icon: AlertCircle },
    checking: { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: RefreshCw },
  };

  const style = config[status] || config.PENDING;
  const Icon = style.icon;

  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${style.bg} ${style.border} ${style.color} text-[10px] font-bold uppercase tracking-wider shadow-[0_0_10px_rgba(0,0,0,0.2)]`}>
      <Icon size={10} className={status === 'PROCESSING' || status === 'checking' ? 'animate-spin' : ''} />
      <span>{status}</span>
    </div>
  );
};

// Toast Notification Component
const Toast = ({ message, type = 'success', onClose }) => {
  const config = {
    success: { bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', icon: CheckCircle, iconColor: 'text-emerald-400' },
    error: { bg: 'bg-rose-500/20', border: 'border-rose-500/30', icon: AlertCircle, iconColor: 'text-rose-400' },
    info: { bg: 'bg-blue-500/20', border: 'border-blue-500/30', icon: Activity, iconColor: 'text-blue-400' },
  };

  const style = config[type] || config.info;
  const Icon = style.icon;

  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed top-4 right-4 z-[100] animate-in slide-in-from-top-2 duration-300`}>
      <GlassCard className={`flex items-center gap-3 p-4 ${style.bg} border ${style.border} min-w-[300px]`}>
        <Icon size={20} className={style.iconColor} />
        <p className="text-white text-sm flex-1">{message}</p>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
          <X size={16} />
        </button>
      </GlassCard>
    </div>
  );
};

const MetricCard = ({ title, value, trend, icon: Icon, gradient }) => (
  <GlassCard hoverEffect className="p-6 group">
    <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full bg-gradient-to-br ${gradient} blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-500`} />
    
    <div className="flex justify-between items-start mb-4">
      <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-slate-200 group-hover:scale-110 transition-transform duration-300">
        <Icon size={22} />
      </div>
      {trend && (
        <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full border ${trend > 0 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
          {trend > 0 ? '+' : ''}{trend}%
        </span>
      )}
    </div>
    
    <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">{title}</h3>
    <p className="text-3xl font-bold text-white tracking-tight">{value}</p>
  </GlassCard>
);

const SagaVisualizer = ({ order }) => {
  const steps = [
    { id: 1, label: 'Order', service: 'Order Svc', status: 'completed' },
    { id: 2, label: 'Stock', service: 'Inventory', status: 'completed' },
    { id: 3, label: 'Payment', service: 'Payment Svc', status: order.status === 'FAILED' ? 'failed' : order.status === 'PROCESSING' ? 'processing' : 'completed' },
    { id: 4, label: 'Notify', service: 'Notification', status: 'pending' },
  ];

  return (
    <div className="relative py-8">
      {/* Progress Line */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-slate-800" />
      <div className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000" 
           style={{ width: order.status === 'COMPLETED' ? '100%' : order.status === 'PROCESSING' ? '60%' : '30%' }} />

      <div className="relative flex justify-between w-full">
        {steps.map((step, idx) => {
          let style = 'bg-slate-900 border-slate-700 text-slate-500';
          let glow = '';
          
          if (step.status === 'completed') {
            style = 'bg-emerald-950 border-emerald-500 text-emerald-400';
            glow = 'shadow-[0_0_20px_rgba(16,185,129,0.4)]';
          } else if (step.status === 'processing') {
            style = 'bg-blue-950 border-blue-500 text-blue-400';
            glow = 'shadow-[0_0_20px_rgba(59,130,246,0.4)] animate-pulse';
          } else if (step.status === 'failed') {
            style = 'bg-rose-950 border-rose-500 text-rose-400';
            glow = 'shadow-[0_0_20px_rgba(244,63,94,0.4)]';
          }

          return (
            <div key={step.id} className="flex flex-col items-center gap-3 group cursor-default">
              <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center z-10 transition-all duration-500 ${style} ${glow}`}>
                {step.status === 'completed' ? <CheckCircle size={20} /> : 
                 step.status === 'failed' ? <X size={20} /> : 
                 step.status === 'processing' ? <RefreshCw size={20} className="animate-spin" /> :
                 <Activity size={20} />}
              </div>
              <div className="text-center absolute -bottom-10 w-24 opacity-60 group-hover:opacity-100 transition-opacity">
                <div className="text-xs font-bold text-slate-200">{step.label}</div>
                <div className="text-[10px] text-slate-500">{step.service}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Sales Analytics Chart
const SalesChart = () => {
  const salesData = [
    { month: 'Jan', revenue: 12500, orders: 45 },
    { month: 'Feb', revenue: 15200, orders: 52 },
    { month: 'Mar', revenue: 18900, orders: 68 },
    { month: 'Apr', revenue: 14300, orders: 51 },
    { month: 'May', revenue: 22100, orders: 79 },
    { month: 'Jun', revenue: 25800, orders: 91 },
  ];
  
  const maxRevenue = Math.max(...salesData.map(d => d.revenue));
  
  return (
    <GlassCard className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-white mb-1">Revenue Overview</h3>
          <p className="text-sm text-slate-400">Monthly sales performance</p>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-indigo-500" />
            <span className="text-xs text-slate-400">Revenue</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-purple-500" />
            <span className="text-xs text-slate-400">Orders</span>
          </div>
        </div>
      </div>
      
      <div className="flex items-end justify-between gap-4 h-64">
        {salesData.map((data, idx) => {
          const height = (data.revenue / maxRevenue) * 100;
          return (
            <div key={data.month} className="flex-1 flex flex-col items-center gap-2 group">
              <div className="relative w-full flex items-end gap-1 h-48">
                {/* Revenue Bar */}
                <div 
                  className="flex-1 bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t-lg transition-all duration-500 hover:from-indigo-500 hover:to-indigo-300 cursor-pointer relative group/bar"
                  style={{height: `${height}%`}}
                >
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover/bar:opacity-100 transition-opacity bg-slate-900 px-2 py-1 rounded text-xs font-bold text-white whitespace-nowrap border border-white/10">
                    ${(data.revenue / 1000).toFixed(1)}k
                  </div>
                </div>
                {/* Orders Bar */}
                <div 
                  className="flex-1 bg-gradient-to-t from-purple-600 to-purple-400 rounded-t-lg transition-all duration-500 hover:from-purple-500 hover:to-purple-300 cursor-pointer relative group/bar"
                  style={{height: `${(data.orders / 91) * 100}%`}}
                >
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover/bar:opacity-100 transition-opacity bg-slate-900 px-2 py-1 rounded text-xs font-bold text-white whitespace-nowrap border border-white/10">
                    {data.orders} orders
                  </div>
                </div>
              </div>
              <span className="text-xs font-medium text-slate-400 mt-2">{data.month}</span>
            </div>
          );
        })}
      </div>
      
      <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-white">$108.8k</p>
          <p className="text-xs text-slate-400 mt-1">Total Revenue</p>
        </div>
        <div className="text-center border-x border-white/10">
          <p className="text-2xl font-bold text-white">386</p>
          <p className="text-xs text-slate-400 mt-1">Total Orders</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-white">$281.87</p>
          <p className="text-xs text-slate-400 mt-1">Avg Order Value</p>
        </div>
      </div>
    </GlassCard>
  );
};

// --- Views ---

const DashboardView = ({ onNewOrder, onSelectOrder, services, recentOrders }) => (
  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
    
    {/* Health Status Strip */}
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {services.map(svc => (
        <GlassCard key={svc.id} className={`p-4 flex flex-col items-center justify-center text-center group cursor-pointer border-l-4 ${svc.status === 'healthy' ? 'border-l-emerald-500' : svc.status === 'checking' ? 'border-l-blue-500' : 'border-l-rose-500'}`}>
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-2 h-2 rounded-full ${svc.status === 'healthy' ? 'bg-emerald-500 animate-pulse' : svc.status === 'checking' ? 'bg-blue-500 animate-pulse' : 'bg-rose-500'}`} />
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">{svc.name}</span>
          </div>
          <div className="text-xl font-mono font-medium text-white tracking-tight">{svc.latency}</div>
          <div className="text-[10px] text-slate-500 mt-1">Uptime: {svc.uptime}</div>
        </GlassCard>
      ))}
    </div>

    {/* KPI Metrics */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <MetricCard title="Total Revenue" value="$42,593" trend={12.5} icon={DollarSign} gradient="from-emerald-500 to-teal-500" />
      <MetricCard title="Active Orders" value="14" trend={-2.4} icon={ShoppingCart} gradient="from-blue-500 to-indigo-500" />
      <MetricCard title="Total Products" value="842" trend={5.1} icon={Box} gradient="from-violet-500 to-purple-500" />
      <MetricCard title="System Load" value="94%" trend={8.2} icon={Cpu} gradient="from-rose-500 to-orange-500" />
    </div>

    {/* Sales Analytics Chart */}
    <SalesChart />

    {/* Main Content Grid */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Recent Orders List */}
      <GlassCard className="lg:col-span-2 min-h-[400px]">
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
          <h3 className="font-bold text-lg text-white flex items-center gap-2">
            <List size={20} className="text-indigo-400" /> Recent Transactions
          </h3>
          <button className="text-xs text-indigo-400 hover:text-white font-medium transition-colors">View All History</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-slate-500 uppercase bg-white/[0.02]">
              <tr>
                <th className="px-6 py-4 font-medium">ID</th>
                <th className="px-6 py-4 font-medium">Customer</th>
                <th className="px-6 py-4 font-medium">Amount</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Trace</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {recentOrders.map(order => (
                <tr key={order.id} className="group hover:bg-white/[0.04] transition-colors cursor-pointer" onClick={() => onSelectOrder(order)}>
                  <td className="px-6 py-4 font-mono text-slate-400 group-hover:text-indigo-300 transition-colors">{order.id}</td>
                  <td className="px-6 py-4 text-slate-300">{order.user}</td>
                  <td className="px-6 py-4 text-white font-medium">${order.amount}</td>
                  <td className="px-6 py-4"><StatusBadge status={order.status} /></td>
                  <td className="px-6 py-4 text-right">
                    <ChevronRight size={16} className="inline text-slate-600 group-hover:text-indigo-400 transform group-hover:translate-x-1 transition-all" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Action Center */}
      <div className="flex flex-col gap-6">
        <GlassCard className="p-6 bg-gradient-to-b from-indigo-500/20 to-purple-500/5 border-indigo-500/30">
          <div className="w-12 h-12 rounded-xl bg-indigo-500 flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/30">
            <Zap className="text-white" fill="currentColor" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Quick Actions</h3>
          <p className="text-sm text-slate-400 mb-6">Execute common operational tasks directly from the dashboard.</p>
          
          <div className="space-y-3">
            <button onClick={onNewOrder} className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-900/20 hover:shadow-indigo-900/40 hover:-translate-y-0.5">
              <Plus size={18} /> Create Manual Order
            </button>
            <button className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 border border-white/5 text-slate-200 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all">
              <Package size={18} /> Stock Replenishment
            </button>
            <button className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 border border-white/5 text-slate-200 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all">
              <Server size={18} /> Flush Redis Cache
            </button>
          </div>
        </GlassCard>
      </div>
    </div>
  </div>
);

const CatalogView = ({ onAddToCart, currentUser, onEditProduct, onShowProductModal, products = PRODUCTS, onRefreshProducts }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  const categories = ['All', ...new Set(products.map(p => p.category))];
  
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });
  
  const handleDeleteProduct = async (productId) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE.catalog}/api/catalog/${productId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        alert('Product deleted successfully!');
        if (onRefreshProducts) {
          await onRefreshProducts(); // Refresh products list
        }
      } else {
        alert('Failed to delete product');
      }
    } catch (error) {
      alert('Error deleting product');
    }
  };
  
  const isAdmin = currentUser?.role === 'admin';
  
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Product Catalog</h2>
          {!currentUser && (
            <p className="text-sm text-slate-400 mt-1">
              <LogIn size={14} className="inline mr-1" />
              Login as admin to manage products
            </p>
          )}
          {currentUser && !isAdmin && (
            <p className="text-sm text-slate-400 mt-1">
              Logged in as: {currentUser.email} (customer)
            </p>
          )}
          {isAdmin && (
            <p className="text-sm text-emerald-400 mt-1">
              <Shield size={14} className="inline mr-1" />
              Admin access - You can manage products
            </p>
          )}
        </div>
        
        <div className="flex flex-wrap gap-3">
          {/* Add Product Button (Admin only) */}
          {isAdmin && (
            <button
              onClick={() => { onEditProduct(null); onShowProductModal(); }}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg font-bold shadow-lg transition-all flex items-center gap-2"
            >
              <Plus size={18} />
              Add Product
            </button>
          )}
          
          {/* Search */}
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search products..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-slate-900/60 border border-white/10 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors w-64"
            />
          </div>
          
          {/* Category Filter */}
          <select 
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 bg-slate-900/60 border border-white/10 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Product Count */}
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Package size={16} />
        <span>{filteredProducts.length} products found</span>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProducts.map(product => (
          <GlassCard key={product.id} hoverEffect className="group">
            <div className="h-48 bg-gradient-to-b from-slate-800/50 to-slate-900/50 flex items-center justify-center text-7xl group-hover:scale-110 transition-transform duration-500 relative overflow-hidden">
              {/* Glow behind image */}
              <div className="absolute inset-0 bg-indigo-500/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <span className="relative z-10">{product.image}</span>
              <div className="absolute top-3 right-3 bg-slate-950/80 backdrop-blur px-2 py-1 rounded text-xs font-mono text-slate-300 border border-white/10">
                ID: {product.id}
              </div>
              {product.stock === 0 && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center">
                  <span className="text-rose-400 font-bold text-lg">OUT OF STOCK</span>
                </div>
              )}
            </div>
            <div className="p-5">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded border border-indigo-500/20">{product.category}</span>
                <span className={`text-xs font-bold ${product.stock > 10 ? 'text-emerald-400' : product.stock > 0 ? 'text-amber-400' : 'text-rose-400'}`}>
                  {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                </span>
              </div>
              <h3 className="font-bold text-white mb-1 truncate text-lg">{product.name}</h3>
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                <span className="text-xl font-bold text-white">${product.price}</span>
                <button 
                  onClick={() => onAddToCart(product)}
                  disabled={product.stock === 0}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm shadow-lg shadow-indigo-900/20 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
                >
                  <ShoppingCart size={16} />
                  Add to Cart
                </button>
              </div>
              
              {/* Admin Controls */}
              {isAdmin && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-white/5">
                  <button
                    onClick={() => { onEditProduct(product); onShowProductModal(); }}
                    className="flex-1 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-400 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1"
                  >
                    <Edit size={14} />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteProduct(product.id)}
                    className="flex-1 px-3 py-2 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-400 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              )}
            </div>
          </GlassCard>
        ))}
      </div>
      
      {filteredProducts.length === 0 && (
        <div className="text-center py-20">
          <Package size={48} className="mx-auto text-slate-600 mb-4" />
          <p className="text-slate-400">No products found</p>
        </div>
      )}
    </div>
  );
};

// Auth Modal Component (Login/Register)
const AuthModal = ({ show, onClose, mode, onLogin, onRegister, onSwitchMode }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);

  if (!show) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        await onLogin(email, password);
      } else {
        await onRegister(email, password, firstName, lastName);
      }
    } catch (error) {
      // Error handled in parent
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={onClose} />
      <GlassCard className="w-full max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              {mode === 'login' ? <LogIn size={28} className="text-indigo-400" /> : <UserPlus size={28} className="text-indigo-400" />}
              {mode === 'login' ? 'Welcome Back' : 'Create Account'}
            </h2>
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2">First Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-slate-900/60 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-slate-900/60 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    placeholder="Doe"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-slate-900/60 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-2.5 bg-slate-900/60 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                placeholder="••••••••"
              />
              {mode === 'register' && (
                <p className="text-xs text-slate-500 mt-1">Must be at least 6 characters</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-lg font-bold shadow-lg shadow-indigo-900/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  {mode === 'login' ? 'Logging in...' : 'Creating account...'}
                </>
              ) : (
                <>
                  {mode === 'login' ? <LogIn size={18} /> : <UserPlus size={18} />}
                  {mode === 'login' ? 'Login' : 'Create Account'}
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => onSwitchMode(mode === 'login' ? 'register' : 'login')}
              className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Login'}
            </button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};

// Product Modal Component (Add/Edit)
const ProductModal = ({ show, onClose, product, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    brand: '',
    price: '',
    image: '',
    description: '',
    stock: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        category: product.category || '',
        brand: product.brand || '',
        price: product.price || '',
        image: product.image || '',
        description: product.description || '',
        stock: product.stock || ''
      });
    } else {
      setFormData({
        name: '',
        category: '',
        brand: '',
        price: '',
        image: '',
        description: '',
        stock: ''
      });
    }
  }, [product]);

  if (!show) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const token = localStorage.getItem('auth_token');
      const url = product 
        ? `${API_BASE.catalog}/api/catalog/${product.id}`
        : `${API_BASE.catalog}/api/catalog`;
      
      const response = await fetch(url, {
        method: product ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: formData.name,
          category: formData.category,
          brand: formData.brand,
          price: parseFloat(formData.price),
          images: formData.image ? [formData.image] : [], // Send as array
          description: formData.description,
          stock: parseInt(formData.stock)
        })
      });

      if (response.ok) {
        alert(product ? 'Product updated successfully!' : 'Product created successfully!');
        if (onSave) {
          await onSave(); // Call refresh callback
        }
        onClose();
      } else {
        const error = await response.json();
        alert(`Failed: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      alert('Error saving product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={onClose} />
      <GlassCard className="w-full max-w-2xl relative z-10 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              {product ? <Edit size={28} className="text-blue-400" /> : <Plus size={28} className="text-emerald-400" />}
              {product ? 'Edit Product' : 'Add New Product'}
            </h2>
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">Product Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  className="w-full px-4 py-2.5 bg-slate-900/60 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  placeholder="Gaming Laptop"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">Category *</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  required
                  className="w-full px-4 py-2.5 bg-slate-900/60 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  placeholder="Electronics"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">Brand *</label>
                <input
                  type="text"
                  value={formData.brand}
                  onChange={(e) => setFormData({...formData, brand: e.target.value})}
                  required
                  className="w-full px-4 py-2.5 bg-slate-900/60 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  placeholder="Apple, Samsung, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">Stock *</label>
                <input
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({...formData, stock: e.target.value})}
                  required
                  min="0"
                  className="w-full px-4 py-2.5 bg-slate-900/60 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  placeholder="50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">Price ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: e.target.value})}
                  required
                  min="0"
                  className="w-full px-4 py-2.5 bg-slate-900/60 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  placeholder="99.99"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">Image Emoji</label>
                <input
                  type="text"
                  value={formData.image}
                  onChange={(e) => setFormData({...formData, image: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-900/60 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  placeholder="💻"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">Description *</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                required
                rows={3}
                className="w-full px-4 py-2.5 bg-slate-900/60 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                placeholder="Product description..."
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-900/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    {product ? 'Update Product' : 'Create Product'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </GlassCard>
    </div>
  );
};

// Notifications View Component
const NotificationsView = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('*');
  
  useEffect(() => {
    loadNotifications();
  }, [filter]);
  
  const loadNotifications = async () => {
    setLoading(true);
    const data = await fetchNotifications(filter === '*' ? '' : filter);
    setNotifications(data);
    setLoading(false);
  };
  
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'email': return '📧';
      case 'sms': return '📱';
      case 'push': return '🔔';
      default: return '📬';
    }
  };
  
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Notifications</h2>
        <div className="flex gap-3">
          <select 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 bg-slate-900/60 border border-white/10 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
          >
            <option value="*">All Types</option>
            <option value="email">Email</option>
            <option value="sms">SMS</option>
            <option value="push">Push</option>
          </select>
          <button 
            onClick={loadNotifications}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium flex items-center gap-2"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <RefreshCw size={32} className="animate-spin text-indigo-500" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-20">
          <Bell size={48} className="mx-auto text-slate-600 mb-4" />
          <p className="text-slate-400">No notifications found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif, idx) => (
            <GlassCard key={idx} className="p-5 hover:bg-slate-800/60 transition-colors">
              <div className="flex items-start gap-4">
                <div className="text-3xl">{getNotificationIcon(notif.type)}</div>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-bold text-white">
                        {notif.type === 'email' && notif.subject}
                        {notif.type === 'sms' && 'SMS Message'}
                        {notif.type === 'push' && notif.title}
                      </h3>
                      <p className="text-sm text-slate-400">
                        {notif.type === 'email' && `To: ${notif.to}`}
                        {notif.type === 'sms' && `To: ${notif.to}`}
                        {notif.type === 'push' && `User: ${notif.user_id}`}
                      </p>
                    </div>
                    <StatusBadge status={notif.status === 'sent' ? 'SUCCESS' : 'FAILED'} />
                  </div>
                  <p className="text-slate-300 text-sm mb-2">
                    {notif.type === 'email' && notif.body}
                    {notif.type === 'sms' && notif.message}
                    {notif.type === 'push' && notif.body}
                  </p>
                  <p className="text-xs text-slate-500">
                    {new Date(notif.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
};

// Inventory Management View Component
const InventoryView = () => {
  const [inventory, setInventory] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [filterStatus, setFilterStatus] = useState('all');
  
  useEffect(() => {
    loadInventoryData();
    const interval = setInterval(loadInventoryData, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, []);
  
  const loadInventoryData = async () => {
    try {
      const response = await fetch(`${API_BASE.inventory}/api/inventory`);
      if (!response.ok) throw new Error('Failed to fetch inventory');
      const data = await response.json();
      setInventory(data.items || []);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load inventory:', error);
      setLoading(false);
    }
  };
  
  const loadAuditLogs = async () => {
    try {
      const response = await fetch(`${API_BASE.inventory}/api/inventory/audit`);
      if (!response.ok) throw new Error('Failed to fetch audit logs');
      const data = await response.json();
      setAuditLogs(data.logs || []);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    }
  };
  
  useEffect(() => {
    if (activeTab === 'audit') {
      loadAuditLogs();
    }
  }, [activeTab]);
  
  const getStockStatus = (stock) => {
    if (stock === 0) return { label: 'Out of Stock', color: 'red', icon: AlertTriangle };
    if (stock <= 10) return { label: 'Low Stock', color: 'amber', icon: AlertCircle };
    return { label: 'In Stock', color: 'emerald', icon: CheckCircle };
  };
  
  const filteredInventory = inventory.filter(item => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'out') return item.quantity === 0;
    if (filterStatus === 'low') return item.quantity > 0 && item.quantity <= 10;
    if (filterStatus === 'ok') return item.quantity > 10;
    return true;
  });
  
  const totalItems = inventory.length;
  const lowStockItems = inventory.filter(i => i.quantity > 0 && i.quantity <= 10).length;
  const outOfStockItems = inventory.filter(i => i.quantity === 0).length;
  const totalValue = inventory.reduce((sum, item) => sum + (item.quantity * (item.price || 0)), 0);
  
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Inventory Management</h2>
          <p className="text-sm text-slate-400 mt-1">Real-time stock monitoring and audit trail</p>
        </div>
        <button 
          onClick={loadInventoryData}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
        >
          <RefreshCw size={18} />
          Refresh
        </button>
      </div>
      
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <GlassCard className="p-6 bg-gradient-to-br from-indigo-600/10 to-purple-600/10 border-indigo-500/20">
          <div className="flex items-center justify-between mb-3">
            <Package size={24} className="text-indigo-400" />
            <div className="text-3xl font-bold text-white">{totalItems}</div>
          </div>
          <h4 className="text-slate-400 text-sm font-medium">Total Products</h4>
        </GlassCard>
        
        <GlassCard className="p-6 bg-gradient-to-br from-amber-600/10 to-orange-600/10 border-amber-500/20">
          <div className="flex items-center justify-between mb-3">
            <AlertCircle size={24} className="text-amber-400" />
            <div className="text-3xl font-bold text-white">{lowStockItems}</div>
          </div>
          <h4 className="text-slate-400 text-sm font-medium">Low Stock Items</h4>
        </GlassCard>
        
        <GlassCard className="p-6 bg-gradient-to-br from-rose-600/10 to-red-600/10 border-rose-500/20">
          <div className="flex items-center justify-between mb-3">
            <AlertTriangle size={24} className="text-rose-400" />
            <div className="text-3xl font-bold text-white">{outOfStockItems}</div>
          </div>
          <h4 className="text-slate-400 text-sm font-medium">Out of Stock</h4>
        </GlassCard>
        
        <GlassCard className="p-6 bg-gradient-to-br from-emerald-600/10 to-teal-600/10 border-emerald-500/20">
          <div className="flex items-center justify-between mb-3">
            <DollarSign size={24} className="text-emerald-400" />
            <div className="text-3xl font-bold text-white">${totalValue.toFixed(0)}</div>
          </div>
          <h4 className="text-slate-400 text-sm font-medium">Total Value</h4>
        </GlassCard>
      </div>
      
      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10">
        {[
          { id: 'overview', label: 'Stock Overview', icon: Package },
          { id: 'audit', label: 'Audit Log', icon: ClipboardList }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-3 font-medium rounded-t-xl transition-all flex items-center gap-2 ${
              activeTab === tab.id 
                ? 'text-white bg-white/5 border-t border-l border-r border-white/10' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>
      
      {/* Stock Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Filter Buttons */}
          <div className="flex gap-3">
            {[
              { id: 'all', label: 'All Items', count: totalItems },
              { id: 'ok', label: 'In Stock', count: totalItems - lowStockItems - outOfStockItems },
              { id: 'low', label: 'Low Stock', count: lowStockItems },
              { id: 'out', label: 'Out of Stock', count: outOfStockItems }
            ].map(filter => (
              <button
                key={filter.id}
                onClick={() => setFilterStatus(filter.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filterStatus === filter.id
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/30'
                    : 'bg-white/5 text-slate-400 hover:bg-white/10'
                }`}
              >
                {filter.label} <span className="ml-2 text-xs opacity-75">({filter.count})</span>
              </button>
            ))}
          </div>
          
          {/* Inventory Table */}
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <RefreshCw className="animate-spin text-indigo-400" size={32} />
            </div>
          ) : (
            <GlassCard className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/5 border-b border-white/10">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Product</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">SKU</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Stock</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Value</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Last Updated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredInventory.map(item => {
                      const status = getStockStatus(item.quantity);
                      const StatusIcon = status.icon;
                      return (
                        <tr key={item.product_id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-xl">
                                {item.image || '📦'}
                              </div>
                              <div>
                                <div className="font-bold text-white">{item.name || `Product ${item.product_id.slice(0, 8)}`}</div>
                                <div className="text-sm text-slate-400">{item.description || 'No description'}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-mono text-sm text-slate-300">{item.product_id.slice(0, 8).toUpperCase()}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className={`text-2xl font-bold ${
                                item.quantity === 0 ? 'text-rose-400' :
                                item.quantity <= 10 ? 'text-amber-400' :
                                'text-emerald-400'
                              }`}>
                                {item.quantity}
                              </div>
                              <span className="text-slate-500 text-sm">units</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-${status.color}-600/20 text-${status.color}-400 border border-${status.color}-500/30`}>
                              <StatusIcon size={14} />
                              {status.label}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-white font-bold">${((item.price || 0) * item.quantity).toFixed(2)}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-slate-400 text-sm">{new Date(item.updated_at).toLocaleString()}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              {filteredInventory.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  <Package size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No items found matching the selected filter</p>
                </div>
              )}
            </GlassCard>
          )}
        </div>
      )}
      
      {/* Audit Log Tab */}
      {activeTab === 'audit' && (
        <GlassCard className="p-6">
          <div className="space-y-4">
            {auditLogs.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <ClipboardList size={48} className="mx-auto mb-4 opacity-50" />
                <p>No audit logs available</p>
                <p className="text-sm mt-2">Inventory changes will appear here</p>
              </div>
            ) : (
              auditLogs.map((log, idx) => (
                <div key={idx} className="flex items-start gap-4 p-4 bg-slate-950/50 rounded-lg border border-white/5">
                  <div className="w-10 h-10 rounded-lg bg-indigo-600/20 flex items-center justify-center">
                    <ClipboardList size={20} className="text-indigo-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-bold text-white">{log.action}</h4>
                      <span className="text-xs text-slate-500">{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-slate-400">{log.description}</p>
                    <div className="flex gap-4 mt-2 text-xs">
                      <span className="text-slate-500">Product: <span className="text-slate-300 font-mono">{log.product_id}</span></span>
                      <span className="text-slate-500">Changed by: <span className="text-slate-300">{log.user || 'System'}</span></span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </GlassCard>
      )}
    </div>
  );
};

// Monitoring View Component with Grafana
const MonitoringView = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);
  
  const loadMetrics = async () => {
    const data = await fetchSystemMetrics();
    setMetrics(data);
    setLoading(false);
  };
  
  const dashboards = [
    { id: 'overview', name: 'System Overview', iframe: `${API_BASE.grafana}/d-solo/system-overview?orgId=1&refresh=5s&theme=dark` },
    { id: 'orders', name: 'Order Metrics', iframe: `${API_BASE.grafana}/d-solo/order-metrics?orgId=1&refresh=5s&theme=dark` },
    { id: 'kafka', name: 'Kafka Monitoring', iframe: `${API_BASE.grafana}/d-solo/kafka-metrics?orgId=1&refresh=5s&theme=dark` },
    { id: 'services', name: 'Services Health', iframe: `${API_BASE.grafana}/d-solo/services-health?orgId=1&refresh=5s&theme=dark` },
  ];
  
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">System Monitoring</h2>
          <p className="text-sm text-slate-400 mt-1">Real-time metrics powered by Prometheus & Grafana</p>
        </div>
        <div className="flex gap-3">
          <a 
            href={API_BASE.prometheus} 
            target="_blank" 
            rel="noopener noreferrer"
            className="px-4 py-2 bg-slate-900/60 border border-white/10 rounded-lg text-slate-200 hover:bg-slate-800/60 transition-colors flex items-center gap-2"
          >
            <BarChart3 size={18} />
            Prometheus
          </a>
          <a 
            href={API_BASE.grafana} 
            target="_blank" 
            rel="noopener noreferrer"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium flex items-center gap-2"
          >
            <Activity size={18} />
            Grafana
          </a>
        </div>
      </div>
      
      {/* Real-time Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard 
            title="Total Orders" 
            value={Math.floor(metrics.ordersTotal)} 
            trend={5.2} 
            icon={ShoppingCart} 
            gradient="from-indigo-600 to-purple-600" 
          />
          <MetricCard 
            title="Avg Processing Time" 
            value={`${(metrics.avgDuration / Math.max(metrics.ordersTotal, 1)).toFixed(2)}s`} 
            trend={-2.1} 
            icon={Cpu} 
            gradient="from-emerald-600 to-teal-600" 
          />
          <MetricCard 
            title="Total Revenue" 
            value={`$${metrics.totalRevenue.toFixed(2)}`} 
            trend={12.5} 
            icon={DollarSign} 
            gradient="from-amber-600 to-orange-600" 
          />
          <MetricCard 
            title="Notifications Sent" 
            value={Math.floor(metrics.notificationsSent)} 
            trend={8.3} 
            icon={Bell} 
            gradient="from-rose-600 to-pink-600" 
          />
          <MetricCard 
            title="Kafka Messages" 
            value={Math.floor(metrics.kafkaMessagesConsumed)} 
            trend={15.7} 
            icon={Activity} 
            gradient="from-cyan-600 to-blue-600" 
          />
        </div>
      )}
      
      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-white/10">
        {dashboards.map(dashboard => (
          <button
            key={dashboard.id}
            onClick={() => setActiveTab(dashboard.id)}
            className={`px-4 py-3 text-sm font-medium transition-all relative ${
              activeTab === dashboard.id
                ? 'text-white border-b-2 border-indigo-500'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {dashboard.name}
          </button>
        ))}
      </div>
      
      {/* Grafana Dashboard Embed */}
      <GlassCard className="p-6">
        <div className="bg-slate-950/50 rounded-xl overflow-hidden" style={{ height: '600px' }}>
          <div className="text-center py-12 text-slate-400">
            <BarChart3 size={48} className="mx-auto mb-4 opacity-50" />
            <p className="mb-2">Grafana Dashboard Integration</p>
            <p className="text-sm">
              Access full dashboards at{' '}
              <a href={API_BASE.grafana} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300">
                {API_BASE.grafana}
              </a>
            </p>
            <div className="mt-6 flex justify-center gap-4">
              <div className="text-left">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Available Dashboards:</p>
                <ul className="text-sm space-y-1">
                  <li>• System Overview & Resource Usage</li>
                  <li>• Order Processing Metrics</li>
                  <li>• Kafka Topic Metrics</li>
                  <li>• Service Health & Latency</li>
                  <li>• Database Performance</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </GlassCard>
      
      {/* Prometheus Metrics Explorer */}
      <GlassCard className="p-6">
        <h3 className="text-lg font-bold text-white mb-4">Quick Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-950/50 p-4 rounded-lg border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Orders Created</p>
            </div>
            <p className="text-2xl font-bold text-white">{metrics ? Math.floor(metrics.ordersTotal) : '...'}</p>
          </div>
          <div className="bg-slate-950/50 p-4 rounded-lg border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Notifications Sent</p>
            </div>
            <p className="text-2xl font-bold text-white">{metrics ? Math.floor(metrics.notificationsSent) : '...'}</p>
          </div>
          <div className="bg-slate-950/50 p-4 rounded-lg border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse"></div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Kafka Messages Consumed</p>
            </div>
            <p className="text-2xl font-bold text-white">{metrics ? Math.floor(metrics.kafkaMessagesConsumed) : '...'}</p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};

// --- Layout & Main App ---

export default function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [services, setServices] = useState(SERVICES);
  const [recentOrders, setRecentOrders] = useState(INITIAL_ORDERS);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [cart, setCart] = useState([]);
  const [toast, setToast] = useState(null);
  const [systemMetrics, setSystemMetrics] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, message: 'Order #1234 has been shipped', time: '2 min ago', type: 'success', read: false },
    { id: 2, message: 'Payment received for Order #5678', time: '15 min ago', type: 'success', read: false },
    { id: 3, message: 'Low stock alert: Product SKU-001', time: '1 hour ago', type: 'warning', read: true },
  ]);
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [shippingMethod, setShippingMethod] = useState('standard');
  const [products, setProducts] = useState(PRODUCTS); // Initialize with hardcoded products as fallback
  
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  
  // Web3 state
  const [walletAddress, setWalletAddress] = useState(null);
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletBalance, setWalletBalance] = useState(null);
  const [chainId, setChainId] = useState(null);

  // Crypto payment state
  const [showCryptoPaymentModal, setShowCryptoPaymentModal] = useState(false);
  const [cryptoPayment, setCryptoPayment] = useState(null);
  const [selectedCrypto, setSelectedCrypto] = useState('MATIC');
  const [cryptoPrices, setCryptoPrices] = useState({});
  const [paymentStatus, setPaymentStatus] = useState('idle'); // idle, creating, awaiting, verifying, confirmed, failed
  
  // NFT Certificate state
  const [userCertificates, setUserCertificates] = useState([]);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [mintingCertificate, setMintingCertificate] = useState(false);
  
  // Fetch products from API on mount
  useEffect(() => {
    fetchProductsFromAPI();
  }, []);
  
  const fetchProductsFromAPI = async () => {
    try {
      const response = await fetch(`${API_BASE.catalog}/api/catalog`);
      if (response.ok) {
        const data = await response.json();
        // Transform API data to match UI format
        const apiProducts = data.products || data; // Handle both paginated and non-paginated
        const formattedProducts = apiProducts.map(p => ({
          id: p.productId || p._id,
          name: p.name,
          price: p.price,
          stock: p.stock,
          category: p.category,
          brand: p.brand,
          description: p.description,
          image: p.images?.[0] || '📦' // Use first image or default emoji
        }));
        setProducts(formattedProducts);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
      // Keep using PRODUCTS fallback
    }
  };
  
  // Check for existing auth token on mount
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      // Verify token and load user
      fetch(`${API_BASE.user}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.ok ? res.json() : Promise.reject())
        .then(user => {
          setCurrentUser(user);
          setIsAuthenticated(true);
        })
        .catch(() => {
          localStorage.removeItem('auth_token');
        });
    }
  }, []);
  
  const handleLogin = async (email, password) => {
    try {
      const response = await fetch(`${API_BASE.user}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
      }
      
      const data = await response.json();
      localStorage.setItem('auth_token', data.token);
      setCurrentUser(data.user);
      setIsAuthenticated(true);
      setShowAuthModal(false);
      showToast('✅ Logged in successfully!', 'success');
    } catch (error) {
      showToast(`❌ ${error.message}`, 'error');
      throw error;
    }
  };
  
  const handleRegister = async (email, password, firstName, lastName) => {
    try {
      const response = await fetch(`${API_BASE.user}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, firstName, lastName })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Registration failed');
      }
      
      const data = await response.json();
      localStorage.setItem('auth_token', data.token);
      setCurrentUser(data.user);
      setIsAuthenticated(true);
      setShowAuthModal(false);
      showToast('✅ Account created successfully!', 'success');
    } catch (error) {
      showToast(`❌ ${error.message}`, 'error');
      throw error;
    }
  };
  
  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    setCurrentUser(null);
    setIsAuthenticated(false);
    setCart([]);
    showToast('Logged out successfully', 'info');
  };
  
  // Web3 Wallet Functions
  const connectWallet = async () => {
    try {
      // Check if MetaMask is installed
      if (typeof window.ethereum === 'undefined') {
        showToast('❌ Please install MetaMask to connect your wallet', 'error');
        window.open('https://metamask.io/download/', '_blank');
        return;
      }

      // Request account access
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      const address = accounts[0];

      // Get chain ID
      const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
      const currentChainId = parseInt(chainIdHex, 16);
      setChainId(currentChainId);

      // Request nonce from backend
      const nonceResponse = await fetch(`${API_BASE.web3}/api/web3/wallet/request-nonce`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address })
      });

      if (!nonceResponse.ok) {
        throw new Error('Failed to request nonce');
      }

      const { message } = await nonceResponse.json();

      // Sign message with MetaMask
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, address]
      });

      // Verify signature with backend
      const verifyResponse = await fetch(`${API_BASE.web3}/api/web3/wallet/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          walletAddress: address, 
          signature, 
          message 
        })
      });

      if (!verifyResponse.ok) {
        throw new Error('Signature verification failed');
      }

      const { wallet, token } = await verifyResponse.json();

      // If user is logged in, link wallet to account
      if (isAuthenticated && currentUser) {
        await fetch(`${API_BASE.web3}/api/web3/wallet/link`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            walletAddress: address,
            userId: currentUser.user_id,
            chainId: currentChainId
          })
        });
      }

      // Get wallet balance
      const balanceResponse = await fetch(
        `${API_BASE.web3}/api/web3/wallet/balance/${address}?chainId=${currentChainId}`
      );
      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json();
        setWalletBalance(balanceData.balance);
      }

      setWalletAddress(address);
      setWalletConnected(true);
      localStorage.setItem('wallet_address', address);
      showToast(`🎉 Wallet connected: ${address.slice(0, 6)}...${address.slice(-4)}`, 'success');

      // Listen for account changes
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
    } catch (error) {
      console.error('Wallet connection error:', error);
      showToast(`❌ ${error.message || 'Failed to connect wallet'}`, 'error');
    }
  };

  const disconnectWallet = () => {
    setWalletAddress(null);
    setWalletConnected(false);
    setWalletBalance(null);
    setChainId(null);
    localStorage.removeItem('wallet_address');
    if (window.ethereum) {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', handleChainChanged);
    }
    showToast('Wallet disconnected', 'info');
  };

  const handleAccountsChanged = (accounts) => {
    if (accounts.length === 0) {
      disconnectWallet();
    } else if (accounts[0] !== walletAddress) {
      setWalletAddress(accounts[0]);
      showToast('Wallet account changed', 'info');
    }
  };

  const handleChainChanged = (chainIdHex) => {
    const newChainId = parseInt(chainIdHex, 16);
    setChainId(newChainId);
    showToast(`Network changed to Chain ID: ${newChainId}`, 'info');
    window.location.reload(); // Recommended by MetaMask
  };

  const getChainName = (id) => {
    const chains = {
      1: 'Ethereum',
      137: 'Polygon',
      80001: 'Mumbai',
      8453: 'Base'
    };
    return chains[id] || `Chain ${id}`;
  };

  // Check for saved wallet on mount
  useEffect(() => {
    const savedWallet = localStorage.getItem('wallet_address');
    if (savedWallet && window.ethereum) {
      window.ethereum.request({ method: 'eth_accounts' })
        .then(accounts => {
          if (accounts.includes(savedWallet)) {
            setWalletAddress(savedWallet);
            setWalletConnected(true);
          } else {
            localStorage.removeItem('wallet_address');
          }
        });
    }
  }, []);

  // Fetch crypto prices
  const fetchCryptoPrices = async () => {
    try {
      const response = await fetch(`${API_BASE.web3}/api/web3/payment/prices/current`);
      const data = await response.json();
      setCryptoPrices(data.prices);
    } catch (error) {
      console.error('Failed to fetch crypto prices:', error);
    }
  };

  // Create crypto payment
  const createCryptoPayment = async (orderId, amount) => {
    try {
      setPaymentStatus('creating');
      
      const response = await fetch(`${API_BASE.web3}/api/web3/payment/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          amount,
          currency: 'USD',
          cryptoCurrency: selectedCrypto,
          chainId: chainId || 137
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create crypto payment');
      }

      const paymentData = await response.json();
      setCryptoPayment(paymentData);
      setPaymentStatus('awaiting');
      return paymentData;
    } catch (error) {
      console.error('Failed to create crypto payment:', error);
      setPaymentStatus('failed');
      showToast('Failed to create crypto payment', 'error');
      throw error;
    }
  };

  // Send crypto payment
  const sendCryptoPayment = async (payment) => {
    if (!window.ethereum) {
      showToast('MetaMask not found', 'error');
      return;
    }

    try {
      setPaymentStatus('verifying');
      
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const from = accounts[0];

      // Convert crypto amount to Wei
      const amountWei = window.ethereum.utils?.toWei?.(payment.cryptoAmount, 'ether') 
        || `0x${Math.floor(parseFloat(payment.cryptoAmount) * 1e18).toString(16)}`;

      const transactionParameters = {
        from,
        to: payment.walletAddress,
        value: amountWei,
        chainId: `0x${payment.chainId.toString(16)}`
      };

      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [transactionParameters]
      });

      showToast('Transaction sent! Waiting for confirmation...', 'info');

      // Verify payment on backend
      const verifyResponse = await fetch(`${API_BASE.web3}/api/web3/payment/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: payment.paymentId,
          txHash
        })
      });

      if (!verifyResponse.ok) {
        throw new Error('Payment verification failed');
      }

      const result = await verifyResponse.json();
      
      if (result.confirmed) {
        setPaymentStatus('confirmed');
        showToast('Payment confirmed!', 'success');
        setCart([]);
        setShowCryptoPaymentModal(false);
      } else {
        setPaymentStatus('awaiting');
        showToast(`Payment sent. ${result.confirmations}/${result.requiredConfirmations} confirmations`, 'info');
        
        // Poll for confirmation
        pollPaymentStatus(payment.paymentId);
      }
    } catch (error) {
      console.error('Payment failed:', error);
      setPaymentStatus('failed');
      showToast('Payment failed: ' + error.message, 'error');
    }
  };

  // Poll payment status
  const pollPaymentStatus = (paymentId) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE.web3}/api/web3/payment/${paymentId}`);
        const data = await response.json();
        
        if (data.status === 'confirmed') {
          clearInterval(interval);
          setPaymentStatus('confirmed');
          showToast('Payment confirmed!', 'success');
          setCart([]);
          setShowCryptoPaymentModal(false);
        } else if (data.status === 'expired' || data.status === 'failed') {
          clearInterval(interval);
          setPaymentStatus('failed');
          showToast('Payment ' + data.status, 'error');
        }
      } catch (error) {
        console.error('Failed to poll payment status:', error);
      }
    }, 10000); // Check every 10 seconds

    // Stop polling after 30 minutes
    setTimeout(() => clearInterval(interval), 30 * 60 * 1000);
  };

  // Fetch crypto prices on mount
  useEffect(() => {
    fetchCryptoPrices();
    const interval = setInterval(fetchCryptoPrices, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  // Fetch user certificates when logged in
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      fetchUserCertificates();
    }
  }, [isAuthenticated, currentUser]);

  // NFT Certificate Functions
  const fetchUserCertificates = async () => {
    if (!currentUser) return;
    
    try {
      const response = await fetch(`${API_BASE.web3}/api/web3/nft/user/${currentUser.id}`);
      const data = await response.json();
      setUserCertificates(data.certificates || []);
    } catch (error) {
      console.error('Failed to fetch certificates:', error);
    }
  };

  const mintCertificate = async (orderId, productData) => {
    if (!currentUser) {
      showToast('Please login to mint certificate', 'error');
      return;
    }

    setMintingCertificate(true);
    try {
      const response = await fetch(`${API_BASE.web3}/api/web3/nft/mint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          userId: currentUser.id,
          productData: {
            productId: productData.id || 'unknown',
            name: productData.name || 'Product',
            description: productData.description || '',
            image: productData.image || productData.images?.[0] || '📦',
            price: productData.price || 0,
            brand: productData.brand || 'N/A'
          },
          onChain: false // Demo mode - free minting
        })
      });

      const result = await response.json();
      
      if (result.success) {
        showToast('🎫 Certificate minted successfully!', 'success');
        await fetchUserCertificates();
        return result.certificate;
      } else {
        showToast(result.message || 'Failed to mint certificate', 'error');
      }
    } catch (error) {
      console.error('Mint certificate error:', error);
      showToast('Failed to mint certificate', 'error');
    } finally {
      setMintingCertificate(false);
    }
  };

  const viewCertificate = (certificate) => {
    setSelectedCertificate(certificate);
    setShowCertificateModal(true);
  };

  const claimCertificate = async (certificateId) => {
    if (!walletConnected || !walletAddress) {
      showToast('Please connect your wallet first', 'error');
      return;
    }

    try {
      const response = await fetch(`${API_BASE.web3}/api/web3/nft/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          certificateId,
          walletAddress
        })
      });

      const result = await response.json();
      
      if (result.success) {
        showToast('Certificate claimed to your wallet!', 'success');
        await fetchUserCertificates();
        setSelectedCertificate(result.certificate);
      } else {
        showToast(result.message || 'Failed to claim certificate', 'error');
      }
    } catch (error) {
      console.error('Claim certificate error:', error);
      showToast('Failed to claim certificate', 'error');
    }
  };
  
  // Promo codes database
  const PROMO_CODES = {
    'SAVE10': { discount: 0.10, description: '10% off entire order' },
    'SAVE20': { discount: 0.20, description: '20% off entire order' },
    'FREESHIP': { discount: 0, freeShipping: true, description: 'Free shipping' },
    'WELCOME25': { discount: 0.25, description: '25% off for new customers' },
  };
  
  const SHIPPING_OPTIONS = [
    { id: 'standard', name: 'Standard Shipping', cost: 5.99, days: '5-7 business days' },
    { id: 'express', name: 'Express Shipping', cost: 15.99, days: '2-3 business days' },
    { id: 'overnight', name: 'Overnight Shipping', cost: 29.99, days: 'Next business day' },
  ];
  
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };
  
  const addToCart = (product) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      setCart(cart.map(item => 
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
      showToast(`Added another ${product.name} to cart`, 'success');
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
      showToast(`${product.name} added to cart`, 'success');
    }
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId));
    showToast('Item removed from cart', 'info');
  };

  const clearCart = () => {
    setCart([]);
    setAppliedPromo(null);
    setPromoCode('');
  };
  
  const applyPromoCode = () => {
    const promo = PROMO_CODES[promoCode.toUpperCase()];
    if (promo) {
      setAppliedPromo({ code: promoCode.toUpperCase(), ...promo });
      showToast(`✅ Promo code applied: ${promo.description}`, 'success');
    } else {
      showToast('❌ Invalid promo code', 'error');
    }
  };
  
  const calculateCartTotals = () => {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping = appliedPromo?.freeShipping ? 0 : SHIPPING_OPTIONS.find(s => s.id === shippingMethod)?.cost || 0;
    const discount = appliedPromo?.discount ? subtotal * appliedPromo.discount : 0;
    const tax = (subtotal - discount) * 0.08; // 8% tax
    const total = subtotal - discount + shipping + tax;
    return { subtotal, shipping, discount, tax, total };
  };

  // Check service health on mount and every 30 seconds
  useEffect(() => {
    const checkAllServices = async () => {
      const updatedServices = await Promise.all(
        SERVICES.map(async (svc) => {
          const health = await checkServiceHealth(svc.port);
          return { ...svc, ...health };
        })
      );
      setServices(updatedServices);
    };

    checkAllServices();
    const interval = setInterval(checkAllServices, 30000);
    return () => clearInterval(interval);
  }, []);
  
  // Handle PayPal payment return (success/cancel)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('order_id');
    const paypalToken = urlParams.get('token');
    
    if (window.location.pathname === '/success' && orderId) {
      clearCart();
      showToast(`✅ Payment successful! Order ${orderId} confirmed.`, 'success');
      setTimeout(() => {
        window.history.replaceState({}, document.title, '/');
        setActiveView('orders');
      }, 2000);
    } else if (window.location.pathname === '/cancel') {
      showToast('Payment canceled. Your cart has been saved.', 'info');
      setTimeout(() => {
        window.history.replaceState({}, document.title, '/');
        setShowPaymentModal(true);
      }, 1000);
    }
  }, []);
  
  // Fetch system metrics on mount and every 30 seconds
  useEffect(() => {
    const loadMetrics = async () => {
      const metrics = await fetchSystemMetrics();
      setSystemMetrics(metrics);
    };
    
    loadMetrics();
    const interval = setInterval(loadMetrics, 30000);
    return () => clearInterval(interval);
  }, []);
  
  // Real-time polling for orders (every 10 seconds)
  useEffect(() => {
    const pollOrders = async () => {
      const orders = await fetchOrders();
      setRecentOrders(orders.slice(0, 10)); // Keep last 10 orders
    };
    
    pollOrders();
    const interval = setInterval(pollOrders, 10000);
    return () => clearInterval(interval);
  }, []);
  
  // Real-time polling for notifications (every 5 seconds)
  useEffect(() => {
    const pollNotifications = async () => {
      const notifs = await fetchNotifications();
      setNotifications(notifs.slice(0, 20)); // Keep last 20
    };
    
    pollNotifications();
    const interval = setInterval(pollNotifications, 5000);
    return () => clearInterval(interval);
  }, []);

  // Handle create order submission
  const handleCreateOrder = async (formData) => {
    setIsCreatingOrder(true);
    try {
      const orderData = {
        user_id: formData.userId,
        items: [{
          product_id: formData.productId,
          quantity: parseInt(formData.quantity),
          price: parseFloat(formData.price)
        }],
        total_amount: parseFloat(formData.quantity) * parseFloat(formData.price)
      };
      
      const result = await createOrder(orderData);
      
      // Add to recent orders
      const newOrder = {
        id: result.order_id || 'ORD-' + Date.now(),
        user: formData.userId,
        amount: orderData.total_amount,
        status: result.status || 'PENDING',
        date: 'Just now',
        items: formData.quantity
      };
      
      setRecentOrders([newOrder, ...recentOrders.slice(0, 9)]);
      setShowCreateModal(false);
      showToast('Order created successfully! Saga processing started.', 'success');
    } catch (error) {
      showToast('Failed to create order: ' + error.message, 'error');
    } finally {
      setIsCreatingOrder(false);
    }
  };
  
  // Handle checkout from cart
  const handleCheckout = async () => {
    if (cart.length === 0) {
      showToast('Your cart is empty', 'error');
      return;
    }
    
    setIsCreatingOrder(true);
    try {
      const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      const orderData = {
        user_id: 'user_' + Math.floor(Math.random() * 1000),
        items: cart.map(item => ({
          product_id: 'prod_' + item.id,
          quantity: item.quantity,
          price: item.price
        })),
        total_amount: totalAmount
      };
      
      // Create order first
      const result = await createOrder(orderData);
      const orderId = result.order_id || 'ORD-' + Date.now();
      
      // Create PayPal order
      const paypalPayload = {
        order_id: orderId,
        amount: totalAmount,
        currency: 'USD',
        success_url: `${window.location.origin}/success?order_id=${orderId}`,
        cancel_url: `${window.location.origin}/cancel`
      };
      
      const paypalResponse = await fetch(`${API_BASE.payment}/api/payments/paypal/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paypalPayload)
      });
      
      if (!paypalResponse.ok) {
        throw new Error('Failed to create payment session');
      }
      
      const paymentData = await paypalResponse.json();
      
      if (paymentData.approval_url) {
        // Redirect to PayPal
        showToast('Redirecting to PayPal...', 'info');
        setTimeout(() => {
          window.location.href = paymentData.approval_url;
        }, 1000);
      } else {
        throw new Error('No approval URL received');
      }
      
    } catch (error) {
      showToast('Checkout failed: ' + error.message, 'error');
      setIsCreatingOrder(false);
    }
  };
  
  // View order details
  const viewOrderDetails = async (orderId) => {
    try {
      const details = await fetchOrderDetails(orderId);
      const status = await fetchOrderStatus(orderId);
      setSelectedOrderDetails({ ...details, ...status });
      setSelectedOrder(orderId);
    } catch (error) {
      showToast('Failed to load order details', 'error');
    }
  };

  const NavItem = ({ id, icon: Icon, label }) => (
    <button
      onClick={() => setActiveView(id)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 relative overflow-hidden group ${
        activeView === id 
          ? 'text-white bg-indigo-600/10 shadow-[0_0_20px_rgba(79,70,229,0.1)]' 
          : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
      }`}
    >
      {activeView === id && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-r-full shadow-[0_0_10px_#6366f1]" />
      )}
      <Icon size={20} className={activeView === id ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'} />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30 selection:text-white overflow-hidden">
      
      {/* Fixed Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-900/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-900/20 rounded-full blur-[120px]" />
      </div>

      {/* Sidebar */}
      <aside className="w-72 border-r border-white/5 bg-slate-900/40 backdrop-blur-xl flex flex-col fixed top-0 bottom-0 z-30">
        <div className="p-8 pb-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/20">
            <Zap size={20} fill="currentColor" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-xl text-white tracking-tight">Nexus<span className="text-indigo-400">Ops</span></span>
            <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">Control Plane</span>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-2 overflow-y-auto custom-scrollbar">
          <div className="px-4 pb-2 text-xs font-bold text-slate-600 uppercase tracking-wider">Platform</div>
          <NavItem id="dashboard" icon={LayoutGrid} label="Overview" />
          <NavItem id="orders" icon={ShoppingCart} label="Live Orders" />
          <NavItem id="catalog" icon={Box} label="Product Catalog" />
          <NavItem id="inventory" icon={Database} label="Inventory" />
          <NavItem id="nfts" icon={Award} label="My NFTs" />
          <NavItem id="notifications" icon={Bell} label="Notifications" />
          
          <div className="px-4 pb-2 pt-6 text-xs font-bold text-slate-600 uppercase tracking-wider">Infrastructure</div>
          <NavItem id="monitoring" icon={Activity} label="Monitoring" />
          <NavItem id="logs" icon={Terminal} label="Logs Stream" />
          <NavItem id="access" icon={Shield} label="Access Control" />
        </nav>

        <div className="p-6 border-t border-white/5">
          {isAuthenticated ? (
            <GlassCard className="p-3 hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-xs font-bold text-white shadow-lg">
                  {currentUser?.firstName?.[0]}{currentUser?.lastName?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-white truncate">{currentUser?.firstName} {currentUser?.lastName}</div>
                  <div className="text-xs text-slate-400 truncate">{currentUser?.email}</div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full px-3 py-2 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-400 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2"
              >
                <LogOut size={14} />
                Logout
              </button>
            </GlassCard>
          ) : (
            <button
              onClick={() => { setAuthMode('login'); setShowAuthModal(true); }}
              className="w-full px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-900/30 transition-all flex items-center justify-center gap-2"
            >
              <LogIn size={18} />
              Login / Sign Up
            </button>
          )}
        </div>
      </aside>

      {/* Main Layout */}
      <div className="flex-1 ml-72 relative z-10 flex flex-col h-screen">
        
        {/* Top Bar */}
        <header className="h-20 border-b border-white/5 bg-slate-900/40 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-white capitalize tracking-tight">{activeView === 'catalog' ? 'Product Catalog' : 'Dashboard Overview'}</h1>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="relative group">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
              <input 
                type="text" 
                placeholder="Search orders, logs, traces..." 
                className="bg-slate-950/50 border border-white/10 text-slate-200 text-sm rounded-xl pl-12 pr-4 py-2.5 w-80 focus:outline-none focus:border-indigo-500/50 focus:bg-slate-900 transition-all placeholder:text-slate-600"
              />
            </div>
            <div className="h-8 w-px bg-white/10 mx-2" />
            
            {/* Web3 Wallet Button */}
            {walletConnected ? (
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-xl px-4 py-2 flex items-center gap-3">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_#34d399]" />
                  <div>
                    <div className="text-xs text-slate-400">Wallet Connected</div>
                    <div className="text-sm font-mono text-white font-semibold">
                      {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                    </div>
                    {walletBalance && (
                      <div className="text-xs text-emerald-400">{parseFloat(walletBalance).toFixed(4)} {getChainName(chainId)}</div>
                    )}
                  </div>
                </div>
                <button 
                  onClick={disconnectWallet}
                  className="text-slate-400 hover:text-rose-400 transition-colors bg-white/5 p-2.5 rounded-xl hover:bg-rose-500/10"
                  title="Disconnect Wallet"
                >
                  <X size={18} />
                </button>
              </div>
            ) : (
              <button 
                onClick={connectWallet}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-6 py-2.5 rounded-xl font-semibold flex items-center gap-2 shadow-lg hover:shadow-purple-500/50 transition-all"
              >
                <svg width="20" height="20" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M31.5 7.5L23.75 1.25L16.25 7.5V13.75L8.75 20V32.5L16.25 38.75L23.75 32.5L31.25 38.75L38.75 32.5V20L31.25 13.75V7.5H31.5Z" fill="currentColor" opacity="0.8"/>
                </svg>
                Connect Wallet
              </button>
            )}
            
            <div className="h-8 w-px bg-white/10 mx-2" />
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative text-slate-400 hover:text-white transition-colors bg-white/5 p-2.5 rounded-xl hover:bg-white/10"
            >
              <Bell size={20} />
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center shadow-[0_0_8px_#f43f5e] font-bold">
                  {notifications.filter(n => !n.read).length}
                </span>
              )}
            </button>
            
            {/* Notification Dropdown */}
            {showNotifications && (
              <div className="absolute top-16 right-8 w-96 max-h-[500px] overflow-y-auto">
                <GlassCard className="border-white/10">
                  <div className="p-4 border-b border-white/10 flex justify-between items-center">
                    <h3 className="font-bold text-white">Notifications</h3>
                    <button 
                      onClick={() => setNotifications(notifications.map(n => ({...n, read: true})))}
                      className="text-xs text-indigo-400 hover:text-indigo-300"
                    >
                      Mark all read
                    </button>
                  </div>
                  <div className="divide-y divide-white/5">
                    {notifications.map(notif => (
                      <div 
                        key={notif.id} 
                        className={`p-4 hover:bg-white/5 transition-colors cursor-pointer ${!notif.read ? 'bg-indigo-500/5' : ''}`}
                        onClick={() => setNotifications(notifications.map(n => n.id === notif.id ? {...n, read: true} : n))}
                      >
                        <div className="flex gap-3">
                          <div className={`w-2 h-2 rounded-full mt-2 ${!notif.read ? 'bg-indigo-500' : 'bg-slate-600'}`} />
                          <div className="flex-1">
                            <p className="text-sm text-white">{notif.message}</p>
                            <p className="text-xs text-slate-400 mt-1">{notif.time}</p>
                          </div>
                          {notif.type === 'warning' && <AlertCircle size={16} className="text-amber-400 mt-1" />}
                          {notif.type === 'success' && <CheckCircle size={16} className="text-green-400 mt-1" />}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 border-t border-white/10 text-center">
                    <button 
                      onClick={() => {
                        setShowNotifications(false);
                        setActiveView('notifications');
                      }}
                      className="text-sm text-indigo-400 hover:text-indigo-300"
                    >
                      View all notifications
                    </button>
                  </div>
                </GlassCard>
              </div>
            )}
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar scroll-smooth">
          {activeView === 'dashboard' && <DashboardView onNewOrder={() => setShowCreateModal(true)} onSelectOrder={viewOrderDetails} services={services} recentOrders={recentOrders} />}
          {activeView === 'catalog' && <CatalogView onAddToCart={addToCart} currentUser={currentUser} onEditProduct={setEditingProduct} onShowProductModal={() => setShowProductModal(true)} products={products} onRefreshProducts={fetchProductsFromAPI} />}
          {activeView === 'notifications' && <NotificationsView />}
          {activeView === 'orders' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white">Order Management</h2>
              <div className="space-y-4">
                {recentOrders.map(order => (
                  <GlassCard key={order.id} className="p-6 hover:bg-slate-800/60 transition-colors cursor-pointer" onClick={() => viewOrderDetails(order.id)}>
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-bold text-white">{order.id}</h3>
                        <p className="text-sm text-slate-400">User: {order.user} • {order.items} item(s)</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-white">${order.amount}</p>
                        <StatusBadge status={order.status} />
                      </div>
                    </div>
                  </GlassCard>
                ))}
              </div>
            </div>
          )}
          {activeView === 'monitoring' && <MonitoringView />}
          {activeView === 'inventory' && <InventoryView />}
          {activeView === 'nfts' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">🎫 My NFT Certificates</h2>
                <div className="text-sm text-slate-400">
                  {userCertificates.length} certificate{userCertificates.length !== 1 ? 's' : ''}
                </div>
              </div>
              
              {userCertificates.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[50vh] text-slate-500 space-y-4">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-purple-500/30 flex items-center justify-center">
                    <Package size={40} className="text-purple-400" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-slate-300">No Certificates Yet</h3>
                    <p className="text-sm mt-1">Complete orders to receive NFT certificates!</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {userCertificates.map(cert => (
                    <GlassCard key={cert.certificateId} className="p-6 hover:bg-slate-800/60 transition-all cursor-pointer group" onClick={() => viewCertificate(cert)}>
                      <div className="space-y-4">
                        {/* Certificate Image */}
                        <div className="w-full h-48 rounded-lg bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-purple-500/30 flex items-center justify-center overflow-hidden">
                          <div className="text-6xl">{cert.metadata?.image || '🎫'}</div>
                        </div>
                        
                        {/* Certificate Info */}
                        <div>
                          <h3 className="font-bold text-white text-lg group-hover:text-purple-400 transition-colors line-clamp-2">
                            {cert.metadata?.name || 'Product Certificate'}
                          </h3>
                          <p className="text-xs text-slate-400 mt-1">
                            {new Date(cert.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        
                        {/* Status Badge */}
                        <div className="flex items-center gap-2">
                          {cert.ownerAddress ? (
                            <span className="px-3 py-1 bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 rounded-full text-xs font-bold">
                              ✓ Claimed
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-yellow-600/20 border border-yellow-500/30 text-yellow-400 rounded-full text-xs font-bold">
                              📦 Unclaimed
                            </span>
                          )}
                          {cert.mintedOnChain ? (
                            <span className="px-3 py-1 bg-purple-600/20 border border-purple-500/30 text-purple-400 rounded-full text-xs font-bold">
                              ⛓️ On-Chain
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-blue-600/20 border border-blue-500/30 text-blue-400 rounded-full text-xs font-bold">
                              💾 Demo
                            </span>
                          )}
                        </div>
                        
                        {/* Token ID */}
                        <div className="text-xs text-slate-500 font-mono">
                          Token #{cert.tokenId}
                        </div>
                      </div>
                    </GlassCard>
                  ))}
                </div>
              )}
            </div>
          )}
          {['logs', 'access'].includes(activeView) && (
             <div className="flex flex-col items-center justify-center h-[60vh] text-slate-500 space-y-4 animate-in fade-in zoom-in duration-500">
               <div className="w-24 h-24 rounded-full bg-slate-900/50 border border-white/5 flex items-center justify-center shadow-2xl">
                 <Settings size={32} className="animate-spin-slow opacity-50" />
               </div>
               <div className="text-center">
                 <h3 className="text-xl font-bold text-slate-300">Module Under Construction</h3>
                 <p className="text-sm mt-1">The {activeView} interface is being polished.</p>
               </div>
             </div>
          )}
        </main>
      </div>
      
      {/* Cart Floating Button */}
      {cart.length > 0 && (
        <button 
          onClick={() => setShowPaymentModal(true)}
          className="fixed bottom-8 right-8 z-40 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 rounded-2xl shadow-2xl hover:scale-105 transition-transform duration-300 flex items-center gap-3 animate-in slide-in-from-bottom-4"
        >
          <div className="relative">
            <ShoppingCart size={24} />
            <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {cart.reduce((sum, item) => sum + item.quantity, 0)}
            </span>
          </div>
          <div className="text-left">
            <p className="text-xs opacity-80">Cart Total</p>
            <p className="font-bold text-lg">${cart.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)}</p>
          </div>
        </button>
      )}
      
      {/* Toast Notification */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Create Order Modal (Backdrop Blur) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => !isCreatingOrder && setShowCreateModal(false)} />
          <GlassCard className="w-full max-w-lg relative z-10 animate-in fade-in zoom-in-95 duration-200 shadow-2xl border-white/10">
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
              <h3 className="text-lg font-bold text-white">Create New Order</h3>
              <button onClick={() => !isCreatingOrder && setShowCreateModal(false)} className="text-slate-500 hover:text-white transition-colors disabled:opacity-50" disabled={isCreatingOrder}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = {
                userId: e.target.userId.value,
                productId: e.target.productId.value,
                quantity: e.target.quantity.value,
                price: e.target.price.value
              };
              handleCreateOrder(formData);
            }}>
              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Customer ID</label>
                  <input name="userId" type="text" required defaultValue="user_123" className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors" placeholder="e.g. user_123" />
                </div>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                     <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Product ID</label>
                     <input name="productId" type="text" required defaultValue="prod_001" className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-indigo-500" placeholder="prod_001" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Quantity</label>
                    <input name="quantity" type="number" required defaultValue={1} min="1" className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-indigo-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Price ($)</label>
                  <input name="price" type="number" required defaultValue="99.99" step="0.01" min="0" className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-indigo-500" />
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setShowCreateModal(false)} disabled={isCreatingOrder} className="px-5 py-2.5 text-sm font-bold text-slate-400 hover:text-white transition-colors disabled:opacity-50">Cancel</button>
                  <button type="submit" disabled={isCreatingOrder} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-900/30 transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2">
                    {isCreatingOrder ? (
                      <><RefreshCw size={16} className="animate-spin" /> Creating...</>
                    ) : (
                      <>Submit Order</>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </GlassCard>
        </div>
      )}

      {/* Enhanced Order Details Modal */}
      {selectedOrder && selectedOrderDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setSelectedOrder(null)} />
          <GlassCard className="w-full max-w-4xl relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-300 border-white/10 max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              {/* Header */}
              <div className="flex justify-between items-start mb-8">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-2xl font-bold text-white tracking-tight">Order #{selectedOrderDetails.id?.slice(0, 8)}</h3>
                    <StatusBadge status={selectedOrderDetails.status} />
                  </div>
                  <p className="text-sm text-slate-400 font-mono">User: {selectedOrderDetails.user_id}</p>
                  <p className="text-xs text-slate-500 mt-1">Created: {new Date().toLocaleDateString()}</p>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="p-2 bg-white/5 rounded-full text-slate-400 hover:bg-white/10 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>

              {/* Order Status Timeline */}
              <div className="mb-8 bg-slate-950/50 rounded-xl p-6 border border-white/5">
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Order Timeline</h4>
                <div className="flex items-center justify-between relative">
                  <div className="absolute top-5 left-0 right-0 h-0.5 bg-white/10" />
                  <div className={`absolute top-5 left-0 h-0.5 bg-gradient-to-r from-green-500 to-indigo-500 transition-all duration-500`} 
                       style={{width: selectedOrderDetails.status === 'COMPLETED' ? '100%' : selectedOrderDetails.status === 'PROCESSING' ? '50%' : '25%'}} />
                  
                  {['Created', 'Processing', 'Paid', 'Completed'].map((step, idx) => (
                    <div key={step} className="flex flex-col items-center z-10">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                        idx === 0 ? 'bg-green-500 border-green-500' : 
                        idx <= 1 && selectedOrderDetails.status !== 'PENDING' ? 'bg-indigo-500 border-indigo-500' :
                        'bg-slate-800 border-white/10'
                      }`}>
                        {idx === 0 ? <CheckCircle size={20} className="text-white" /> :
                         idx <= 1 && selectedOrderDetails.status !== 'PENDING' ? <CheckCircle size={20} className="text-white" /> :
                         <div className="w-2 h-2 bg-slate-600 rounded-full" />}
                      </div>
                      <span className="text-xs text-slate-400 mt-2">{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Items */}
              <div className="mb-6 space-y-3">
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Order Items</h4>
                {selectedOrderDetails.items && selectedOrderDetails.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-slate-950/50 p-4 rounded-lg border border-white/5 hover:border-indigo-500/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-indigo-600/20 to-purple-600/20 rounded-lg flex items-center justify-center">
                        <Package size={20} className="text-indigo-400" />
                      </div>
                      <div>
                        <p className="text-white font-medium">Product {item.product_id}</p>
                        <p className="text-sm text-slate-400">Quantity: {item.quantity} × ${item.price}</p>
                      </div>
                    </div>
                    <p className="text-white font-bold">${(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
              </div>

              {/* Order Summary */}
              <div className="mb-6 bg-slate-950/50 rounded-xl p-6 border border-white/5">
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Order Summary</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-slate-300">
                    <span>Subtotal</span>
                    <span>${selectedOrderDetails.total_amount}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Shipping</span>
                    <span className="text-green-400">FREE</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Tax</span>
                    <span>$0.00</span>
                  </div>
                  <div className="border-t border-white/10 pt-3 mt-3 flex justify-between items-center">
                    <span className="text-lg font-bold text-white">Total</span>
                    <span className="text-2xl font-bold text-white">${selectedOrderDetails.total_amount}</span>
                  </div>
                </div>
              </div>

              {/* Saga Visualizer */}
              <div className="bg-slate-950/50 rounded-2xl p-8 border border-white/5 mb-6">
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Saga Status</h4>
                <SagaVisualizer order={selectedOrderDetails} />
              </div>

              {/* Actions */}
              <div className="space-y-4">
                {/* User Actions */}
                <div className="flex justify-between gap-3">
                  <button className="px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-sm font-bold transition-colors flex items-center gap-2">
                    <Truck size={16} />
                    Track Order
                  </button>
                  <div className="flex gap-3">
                    <button className="px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-sm font-bold transition-colors">
                      Print Invoice
                    </button>
                    <button onClick={() => setSelectedOrder(null)} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-900/30">
                      Close
                    </button>
                  </div>
                </div>
                
                {/* Admin Controls */}
                <div className="border-t border-white/10 pt-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Admin Controls</h4>
                  <div className="flex gap-3 flex-wrap">
                    <button 
                      onClick={async () => {
                        if (confirm('Update order status to "Processing"?')) {
                          try {
                            const response = await fetch(`${API_BASE.order}/api/orders/${selectedOrderDetails.id}/status`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ status: 'processing' })
                            });
                            if (response.ok) {
                              showToast('Order status updated', 'success');
                              viewOrderDetails(selectedOrderDetails.id);
                            }
                          } catch (error) {
                            showToast('Failed to update status', 'error');
                          }
                        }
                      }}
                      className="flex-1 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-400 rounded-lg text-sm font-bold transition-colors"
                    >
                      Mark Processing
                    </button>
                    <button 
                      onClick={async () => {
                        if (confirm('Mark order as "Completed"?')) {
                          try {
                            const response = await fetch(`${API_BASE.order}/api/orders/${selectedOrderDetails.id}/status`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ status: 'completed' })
                            });
                            if (response.ok) {
                              showToast('Order marked as completed', 'success');
                              viewOrderDetails(selectedOrderDetails.id);
                            }
                          } catch (error) {
                            showToast('Failed to update status', 'error');
                          }
                        }
                      }}
                      className="flex-1 px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 rounded-lg text-sm font-bold transition-colors"
                    >
                      Mark Completed
                    </button>
                    
                    <button 
                      onClick={async () => {
                        const firstItem = selectedOrderDetails.items?.[0];
                        if (!firstItem) {
                          showToast('No items in order', 'error');
                          return;
                        }
                        
                        const certificate = await mintCertificate(selectedOrderDetails.id, {
                          id: firstItem.product_id,
                          name: `Product ${firstItem.product_id}`,
                          description: 'Purchase Certificate',
                          image: '📦',
                          price: selectedOrderDetails.total_amount,
                          brand: 'Store'
                        });
                        
                        if (certificate) {
                          viewCertificate(certificate);
                        }
                      }}
                      disabled={mintingCertificate}
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600/20 to-pink-600/20 hover:from-purple-600/30 hover:to-pink-600/30 border border-purple-500/30 text-purple-400 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {mintingCertificate ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" />
                          Minting...
                        </>
                      ) : (
                        <>
                          🎫 Mint Certificate
                        </>
                      )}
                    </button>
                    
                    <button 
                      onClick={async () => {
                        if (confirm('Cancel this order? This action cannot be undone.')) {
                          try {
                            const response = await fetch(`${API_BASE.order}/api/orders/${selectedOrderDetails.id}`, {
                              method: 'DELETE'
                            });
                            if (response.ok) {
                              showToast('Order cancelled successfully', 'success');
                              setSelectedOrder(null);
                              // Refresh orders
                              const orders = await fetchOrders();
                              setRecentOrders(orders.slice(0, 10));
                            }
                          } catch (error) {
                            showToast('Failed to cancel order', 'error');
                          }
                        }
                      }}
                      className="flex-1 px-4 py-2 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-400 rounded-lg text-sm font-bold transition-colors"
                    >
                      Cancel Order
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      )}
      
      {/* Cart/Checkout Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => !isCreatingOrder && setShowPaymentModal(false)} />
          <GlassCard className="w-full max-w-2xl relative z-10 animate-in fade-in zoom-in-95 duration-200 shadow-2xl border-white/10 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/[0.02] sticky top-0 z-10">
              <h3 className="text-lg font-bold text-white">Shopping Cart</h3>
              <button onClick={() => !isCreatingOrder && setShowPaymentModal(false)} className="text-slate-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {cart.map(item => (
                <div key={item.id} className="flex items-center gap-4 p-4 bg-slate-950/50 rounded-lg border border-white/5">
                  <div className="text-4xl">{item.image}</div>
                  <div className="flex-1">
                    <h4 className="font-bold text-white">{item.name}</h4>
                    <p className="text-sm text-slate-400">${item.price} × {item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-white">${(item.price * item.quantity).toFixed(2)}</p>
                    <button 
                      onClick={() => removeFromCart(item.id)}
                      className="text-xs text-rose-400 hover:text-rose-300 transition-colors mt-1"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
              
              {cart.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  <ShoppingCart size={48} className="mx-auto mb-4 opacity-50" />
                  <p>Your cart is empty</p>
                </div>
              )}
            </div>
            
            {cart.length > 0 && (
              <div className="p-6 border-t border-white/10 bg-white/[0.02] space-y-4">
                {/* Promo Code */}
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2">Promo Code</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                      placeholder="Enter promo code"
                      className="flex-1 px-4 py-2 bg-slate-900/60 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      onClick={applyPromoCode}
                      className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold transition-colors"
                    >
                      Apply
                    </button>
                  </div>
                  {appliedPromo && (
                    <div className="mt-2 p-2 bg-emerald-600/20 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm flex items-center gap-2">
                      <CheckCircle size={16} />
                      {appliedPromo.description}
                    </div>
                  )}
                </div>
                
                {/* Shipping Options */}
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2">Shipping Method</label>
                  <div className="space-y-2">
                    {SHIPPING_OPTIONS.map(option => (
                      <label
                        key={option.id}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                          shippingMethod === option.id
                            ? 'bg-indigo-600/20 border-indigo-500/50'
                            : 'bg-slate-900/60 border-white/10 hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="shipping"
                            value={option.id}
                            checked={shippingMethod === option.id}
                            onChange={(e) => setShippingMethod(e.target.value)}
                            className="text-indigo-600"
                          />
                          <div>
                            <div className="font-bold text-white">{option.name}</div>
                            <div className="text-xs text-slate-400">{option.days}</div>
                          </div>
                        </div>
                        <div className="font-bold text-white">
                          {appliedPromo?.freeShipping ? <span className="text-emerald-400">FREE</span> : `$${option.cost}`}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                
                {/* Order Summary */}
                <div className="border-t border-white/10 pt-4 space-y-2">
                  <div className="flex justify-between text-slate-300">
                    <span>Subtotal</span>
                    <span>${calculateCartTotals().subtotal.toFixed(2)}</span>
                  </div>
                  {appliedPromo?.discount > 0 && (
                    <div className="flex justify-between text-emerald-400">
                      <span>Discount ({(appliedPromo.discount * 100).toFixed(0)}%)</span>
                      <span>-${calculateCartTotals().discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-300">
                    <span>Shipping</span>
                    <span>{calculateCartTotals().shipping === 0 ? <span className="text-emerald-400">FREE</span> : `$${calculateCartTotals().shipping.toFixed(2)}`}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Tax (8%)</span>
                    <span>${calculateCartTotals().tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-white/10">
                    <span className="text-lg font-bold text-slate-300">Total</span>
                    <span className="text-3xl font-bold text-white">
                      ${calculateCartTotals().total.toFixed(2)}
                    </span>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <button 
                    onClick={clearCart}
                    disabled={isCreatingOrder}
                    className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
                  >
                    Clear Cart
                  </button>
                  
                  <button 
                    onClick={handleCheckout}
                    disabled={isCreatingOrder}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-xl font-bold shadow-lg shadow-blue-900/30 transition-all disabled:opacity-50 flex flex-col items-center justify-center gap-1"
                  >
                    {isCreatingOrder ? (
                      <>
                        <RefreshCw size={18} className="animate-spin" />
                        <span className="text-sm">Redirecting to PayPal...</span>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <CreditCard size={18} />
                          <span>PayPal</span>
                        </div>
                        <span className="text-xs opacity-75">Card/Bank</span>
                      </>
                    )}
                  </button>

                  <button 
                    onClick={() => {
                      if (!walletConnected) {
                        showToast('Please connect your wallet first', 'error');
                        return;
                      }
                      setShowPaymentModal(false);
                      setShowCryptoPaymentModal(true);
                    }}
                    disabled={isCreatingOrder}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl font-bold shadow-lg shadow-purple-900/30 transition-all disabled:opacity-50 flex flex-col items-center justify-center gap-1"
                  >
                    <div className="flex items-center gap-2">
                      <Zap size={18} />
                      <span>Crypto</span>
                    </div>
                    <span className="text-xs opacity-75">ETH/MATIC/USDC</span>
                  </button>
                </div>
              </div>
            )}
          </GlassCard>
        </div>
      )}
      
      {/* Auth Modal */}
      <AuthModal
        show={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        mode={authMode}
        onLogin={handleLogin}
        onRegister={handleRegister}
        onSwitchMode={setAuthMode}
      />
      
      {/* Product Modal */}
      <ProductModal
        show={showProductModal}
        onClose={() => { setShowProductModal(false); setEditingProduct(null); }}
        product={editingProduct}
        onSave={async () => { 
          await fetchProductsFromAPI(); 
          setShowProductModal(false); 
          setEditingProduct(null); 
        }}
      />

      {/* Crypto Payment Modal */}
      {showCryptoPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => paymentStatus === 'idle' && setShowCryptoPaymentModal(false)} />
          <GlassCard className="w-full max-w-2xl relative z-10 animate-in fade-in zoom-in-95 duration-200 shadow-2xl border-white/10 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-purple-600/10 to-pink-600/10 sticky top-0 z-10">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Zap className="text-purple-400" size={24} />
                  Pay with Crypto
                </h3>
                <p className="text-xs text-slate-400 mt-1">Secure blockchain payment</p>
              </div>
              <button onClick={() => paymentStatus === 'idle' && setShowCryptoPaymentModal(false)} className="text-slate-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Order Summary */}
              <div className="bg-slate-950/50 rounded-lg p-4 border border-white/5">
                <div className="text-sm text-slate-400 mb-2">Order Total</div>
                <div className="text-3xl font-bold text-white">
                  ${calculateCartTotals().total.toFixed(2)}
                </div>
                <div className="text-xs text-slate-500 mt-1">{cart.length} items</div>
              </div>

              {/* Select Cryptocurrency */}
              {paymentStatus === 'idle' && (
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-3">Select Cryptocurrency</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { symbol: 'MATIC', name: 'Polygon', icon: '⬡', recommended: true, fee: 'Low' },
                      { symbol: 'ETH', name: 'Ethereum', icon: '⟠', fee: 'High' },
                      { symbol: 'USDC', name: 'USD Coin', icon: '$', stable: true, fee: 'Medium' },
                      { symbol: 'USDT', name: 'Tether', icon: '₮', stable: true, fee: 'Medium' }
                    ].map(crypto => (
                      <button
                        key={crypto.symbol}
                        onClick={() => setSelectedCrypto(crypto.symbol)}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          selectedCrypto === crypto.symbol
                            ? 'border-purple-500 bg-purple-600/20'
                            : 'border-white/10 bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        <div className="text-2xl mb-2">{crypto.icon}</div>
                        <div className="font-bold text-white text-sm">{crypto.name}</div>
                        <div className="text-xs text-slate-400">{crypto.symbol}</div>
                        {cryptoPrices[crypto.symbol] && (
                          <div className="text-xs text-emerald-400 mt-1">
                            ${cryptoPrices[crypto.symbol].toFixed(2)}
                          </div>
                        )}
                        <div className={`text-xs mt-1 ${crypto.fee === 'Low' ? 'text-emerald-400' : crypto.fee === 'High' ? 'text-rose-400' : 'text-yellow-400'}`}>
                          {crypto.fee} Fees
                        </div>
                        {crypto.recommended && (
                          <div className="text-xs text-purple-400 mt-1">⭐ Recommended</div>
                        )}
                        {crypto.stable && (
                          <div className="text-xs text-cyan-400 mt-1">🔒 Stablecoin</div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Payment Details */}
              {cryptoPayment && paymentStatus !== 'idle' && (
                <div className="space-y-4">
                  {/* Amount to Pay */}
                  <div className="bg-gradient-to-r from-purple-600/10 to-pink-600/10 rounded-lg p-4 border border-purple-500/20">
                    <div className="text-sm text-slate-400 mb-1">Amount to Pay</div>
                    <div className="text-2xl font-bold text-white">
                      {cryptoPayment.cryptoAmount} {cryptoPayment.cryptoCurrency}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      ≈ ${cryptoPayment.amount.toFixed(2)} USD
                    </div>
                  </div>

                  {/* Payment Address */}
                  <div className="bg-slate-950/50 rounded-lg p-4 border border-white/5">
                    <div className="text-sm text-slate-400 mb-2">Send to Address</div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs text-white bg-black/30 p-2 rounded font-mono break-all">
                        {cryptoPayment.walletAddress}
                      </code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(cryptoPayment.walletAddress);
                          showToast('Address copied!', 'success');
                        }}
                        className="px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-400 rounded text-xs transition-colors"
                      >
                        Copy
                      </button>
                    </div>
                    <div className="text-xs text-slate-500 mt-2">
                      Network: {cryptoPayment.chainName} (Chain ID: {cryptoPayment.chainId})
                    </div>
                  </div>

                  {/* QR Code Placeholder */}
                  <div className="bg-white/5 rounded-lg p-6 border border-white/5 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-48 h-48 bg-white rounded-lg mb-3 flex items-center justify-center">
                        <div className="text-xs text-slate-900 p-4">
                          QR Code<br/>
                          {cryptoPayment.walletAddress.substring(0, 10)}...
                        </div>
                      </div>
                      <p className="text-xs text-slate-400">Scan with your wallet app</p>
                    </div>
                  </div>

                  {/* Expiration Timer */}
                  <div className="bg-rose-600/10 rounded-lg p-3 border border-rose-500/20">
                    <div className="flex items-center gap-2 text-rose-400 text-sm">
                      <AlertTriangle size={16} />
                      <span>Payment expires in {new Date(cryptoPayment.expiresAt).toLocaleTimeString()}</span>
                    </div>
                  </div>

                  {/* Status Messages */}
                  {paymentStatus === 'awaiting' && (
                    <div className="bg-yellow-600/10 rounded-lg p-4 border border-yellow-500/20">
                      <div className="flex items-center gap-3">
                        <RefreshCw size={20} className="text-yellow-400 animate-spin" />
                        <div>
                          <div className="text-sm font-bold text-yellow-400">Waiting for Payment</div>
                          <div className="text-xs text-slate-400 mt-1">
                            Send exactly {cryptoPayment.cryptoAmount} {cryptoPayment.cryptoCurrency} to the address above
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {paymentStatus === 'verifying' && (
                    <div className="bg-blue-600/10 rounded-lg p-4 border border-blue-500/20">
                      <div className="flex items-center gap-3">
                        <RefreshCw size={20} className="text-blue-400 animate-spin" />
                        <div>
                          <div className="text-sm font-bold text-blue-400">Verifying Payment</div>
                          <div className="text-xs text-slate-400 mt-1">
                            Waiting for blockchain confirmation...
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {paymentStatus === 'confirmed' && (
                    <div className="bg-emerald-600/10 rounded-lg p-4 border border-emerald-500/20">
                      <div className="flex items-center gap-3">
                        <CheckCircle size={20} className="text-emerald-400" />
                        <div>
                          <div className="text-sm font-bold text-emerald-400">Payment Confirmed!</div>
                          <div className="text-xs text-slate-400 mt-1">
                            Your order has been placed successfully
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {paymentStatus === 'failed' && (
                    <div className="bg-rose-600/10 rounded-lg p-4 border border-rose-500/20">
                      <div className="flex items-center gap-3">
                        <AlertCircle size={20} className="text-rose-400" />
                        <div>
                          <div className="text-sm font-bold text-rose-400">Payment Failed</div>
                          <div className="text-xs text-slate-400 mt-1">
                            Please try again or use a different payment method
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-white/10">
                {paymentStatus === 'idle' && (
                  <>
                    <button
                      onClick={() => setShowCryptoPaymentModal(false)}
                      className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-bold transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        const totalAmount = calculateCartTotals().total;
                        const orderData = {
                          user_id: currentUser?.id || 'guest_' + Date.now(),
                          items: cart.map(item => ({
                            product_id: 'prod_' + item.id,
                            quantity: item.quantity,
                            price: item.price
                          })),
                          total_amount: totalAmount
                        };
                        
                        try {
                          const result = await createOrder(orderData);
                          const orderId = result.order_id || 'ORD-' + Date.now();
                          await createCryptoPayment(orderId, totalAmount);
                        } catch (error) {
                          showToast('Failed to create payment', 'error');
                        }
                      }}
                      disabled={!selectedCrypto || !walletConnected}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl font-bold shadow-lg shadow-purple-900/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Zap size={18} />
                        <span>Continue to Payment</span>
                      </div>
                    </button>
                  </>
                )}

                {paymentStatus === 'awaiting' && walletConnected && (
                  <button
                    onClick={() => sendCryptoPayment(cryptoPayment)}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl font-bold shadow-lg shadow-purple-900/30 transition-all"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Zap size={18} />
                      <span>Pay with MetaMask</span>
                    </div>
                  </button>
                )}

                {paymentStatus === 'confirmed' && (
                  <button
                    onClick={() => {
                      setShowCryptoPaymentModal(false);
                      setCryptoPayment(null);
                      setPaymentStatus('idle');
                      setActiveView('orders');
                    }}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-900/30 transition-all"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <CheckCircle size={18} />
                      <span>View Orders</span>
                    </div>
                  </button>
                )}

                {paymentStatus === 'failed' && (
                  <>
                    <button
                      onClick={() => {
                        setCryptoPayment(null);
                        setPaymentStatus('idle');
                      }}
                      className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-bold transition-colors"
                    >
                      Try Again
                    </button>
                    <button
                      onClick={() => {
                        setShowCryptoPaymentModal(false);
                        setShowPaymentModal(true);
                        setCryptoPayment(null);
                        setPaymentStatus('idle');
                      }}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-xl font-bold shadow-lg shadow-blue-900/30 transition-all"
                    >
                      Use PayPal Instead
                    </button>
                  </>
                )}
              </div>

              {/* Info Footer */}
              <div className="bg-slate-950/30 rounded-lg p-3 border border-white/5">
                <div className="text-xs text-slate-400 space-y-1">
                  <div className="flex items-center gap-2">
                    <Shield size={12} className="text-emerald-400" />
                    <span>Secure blockchain payment with instant confirmation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap size={12} className="text-purple-400" />
                    <span>No chargebacks, irreversible transactions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertCircle size={12} className="text-yellow-400" />
                    <span>Network fees apply based on blockchain congestion</span>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* NFT Certificate Modal */}
      {showCertificateModal && selectedCertificate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setShowCertificateModal(false)} />
          <GlassCard className="w-full max-w-2xl relative z-10 animate-in fade-in zoom-in-95 duration-200 shadow-2xl border-white/10 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-purple-600/10 to-pink-600/10 sticky top-0 z-10">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  🎫 NFT Certificate
                </h3>
                <p className="text-xs text-slate-400 mt-1">Product Purchase Authentication</p>
              </div>
              <button onClick={() => setShowCertificateModal(false)} className="text-slate-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Certificate Display */}
              <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-2xl p-8 border-2 border-purple-500/30 relative overflow-hidden">
                {/* Decorative Background */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.1),transparent_50%)]" />
                
                <div className="relative z-10 space-y-6">
                  {/* Certificate Image */}
                  <div className="flex justify-center">
                    <div className="w-48 h-48 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-8xl">
                      {selectedCertificate.metadata?.image || '🎫'}
                    </div>
                  </div>
                  
                  {/* Certificate Title */}
                  <div className="text-center">
                    <h2 className="text-2xl font-bold text-white mb-2">
                      {selectedCertificate.metadata?.name || 'Product Certificate'}
                    </h2>
                    <p className="text-sm text-slate-300">
                      {selectedCertificate.metadata?.description || 'Official purchase certificate'}
                    </p>
                  </div>
                  
                  {/* Certificate Attributes */}
                  <div className="grid grid-cols-2 gap-3">
                    {selectedCertificate.metadata?.attributes?.map((attr, idx) => (
                      <div key={idx} className="bg-black/30 rounded-lg p-3 border border-white/5">
                        <div className="text-xs text-slate-400">{attr.trait_type}</div>
                        <div className="text-sm font-bold text-white mt-1 break-all">{attr.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Certificate Details */}
              <div className="space-y-3">
                <div className="bg-slate-950/50 rounded-lg p-4 border border-white/5">
                  <div className="text-sm text-slate-400 mb-1">Certificate ID</div>
                  <div className="text-xs font-mono text-white break-all">{selectedCertificate.certificateId}</div>
                </div>
                
                <div className="bg-slate-950/50 rounded-lg p-4 border border-white/5">
                  <div className="text-sm text-slate-400 mb-1">Token ID</div>
                  <div className="text-sm font-mono text-white">#{selectedCertificate.tokenId}</div>
                </div>
                
                <div className="bg-slate-950/50 rounded-lg p-4 border border-white/5">
                  <div className="text-sm text-slate-400 mb-1">Order ID</div>
                  <div className="text-xs font-mono text-white break-all">{selectedCertificate.orderId}</div>
                </div>

                {selectedCertificate.ownerAddress && (
                  <div className="bg-emerald-600/10 rounded-lg p-4 border border-emerald-500/20">
                    <div className="text-sm text-emerald-400 mb-1">Owner Wallet</div>
                    <div className="text-xs font-mono text-emerald-300 break-all">{selectedCertificate.ownerAddress}</div>
                  </div>
                )}

                {/* Status Badges */}
                <div className="flex gap-2 flex-wrap">
                  <span className={`px-4 py-2 rounded-lg text-sm font-bold ${
                    selectedCertificate.status === 'minted' 
                      ? 'bg-emerald-600/20 border border-emerald-500/30 text-emerald-400' 
                      : 'bg-slate-600/20 border border-slate-500/30 text-slate-400'
                  }`}>
                    ✓ {selectedCertificate.status.toUpperCase()}
                  </span>
                  
                  {selectedCertificate.mintedOnChain ? (
                    <span className="px-4 py-2 bg-purple-600/20 border border-purple-500/30 text-purple-400 rounded-lg text-sm font-bold">
                      ⛓️ ON-CHAIN
                    </span>
                  ) : (
                    <span className="px-4 py-2 bg-blue-600/20 border border-blue-500/30 text-blue-400 rounded-lg text-sm font-bold">
                      💾 DEMO MODE (FREE)
                    </span>
                  )}
                  
                  {selectedCertificate.ownerAddress ? (
                    <span className="px-4 py-2 bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 rounded-lg text-sm font-bold">
                      ✓ CLAIMED
                    </span>
                  ) : (
                    <span className="px-4 py-2 bg-yellow-600/20 border border-yellow-500/30 text-yellow-400 rounded-lg text-sm font-bold">
                      📦 UNCLAIMED
                    </span>
                  )}
                </div>

                {/* Issued Date */}
                <div className="text-center text-xs text-slate-500">
                  Issued: {new Date(selectedCertificate.createdAt).toLocaleString()}
                </div>
              </div>

              {/* QR Code for Verification */}
              <div className="bg-white rounded-lg p-6 text-center">
                <div className="text-sm text-slate-900 font-bold mb-2">Scan to Verify</div>
                <div className="w-32 h-32 bg-slate-200 rounded mx-auto flex items-center justify-center">
                  <div className="text-xs text-slate-600 p-2">
                    QR Code<br/>
                    {selectedCertificate.certificateId.substring(0, 8)}...
                  </div>
                </div>
                <div className="text-xs text-slate-600 mt-2 break-all">
                  {selectedCertificate.verificationUrl}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-white/10">
                {!selectedCertificate.ownerAddress && walletConnected && (
                  <button
                    onClick={() => claimCertificate(selectedCertificate.certificateId)}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl font-bold shadow-lg shadow-purple-900/30 transition-all"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Shield size={18} />
                      <span>Claim to Wallet</span>
                    </div>
                  </button>
                )}
                
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(selectedCertificate.verificationUrl);
                    showToast('Verification link copied!', 'success');
                  }}
                  className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-bold transition-colors"
                >
                  Copy Link
                </button>
                
                <button
                  onClick={() => setShowCertificateModal(false)}
                  className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-bold transition-colors"
                >
                  Close
                </button>
              </div>

              {/* Info Footer */}
              <div className="bg-slate-950/30 rounded-lg p-3 border border-white/5">
                <div className="text-xs text-slate-400 space-y-1">
                  <div className="flex items-center gap-2">
                    <Shield size={12} className="text-purple-400" />
                    <span>Blockchain-backed authenticity proof</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle size={12} className="text-emerald-400" />
                    <span>Verifiable ownership and purchase history</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap size={12} className="text-yellow-400" />
                    <span>Demo mode - Free minting for demonstration</span>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}