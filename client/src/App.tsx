import { useState, useEffect } from 'react';
import './index.css';
import Sidebar from './components/Sidebar';
import MainPanel from './components/MainPanel';
import OrderPanel from './components/OrderPanel';
import type { Product } from './data/products';
import { AuthProvider, useAuth, API_BASE } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import ChatPanel from './components/ChatPanel';
import SellPanel from './components/SellPanel';
import MyProductsPanel from './components/MyProductsPanel';
import { ShoppingCart } from 'lucide-react';

export interface CartItem {
  product: Product;
  qty: number;
  selectedSize: string;
  selectedGender: string;
  selectedColor: { label: string; hex: string };
}

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'info';
}

function MainApp() {
  const { user, isLoading, accessToken } = useAuth();
  const [activeView, setActiveView] = useState<'store' | 'chat' | 'sell' | 'my-listings'>('store');
  const [chatTarget, setChatTarget] = useState<Product | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOrderPanelVisible, setIsOrderPanelVisible] = useState(true);

  const fetchUnreadCount = async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API_BASE}/chat/conversations`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok) {
        const total = data.conversations.reduce((sum: number, c: any) => sum + parseInt(c.unread_count || '0'), 0);
        setUnreadCount(total);
      }
    } catch (err) {
      console.error('Failed to fetch unread count', err);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
  }, [user, accessToken]);

  const fetchProducts = async () => {
    try {
      const res = await fetch(`${API_BASE}/products`);
      const data = await res.json();
      if (res.ok) {
        // Map backend products to include frontend-only fields like emojis/colors
        const mapped = data.products.map((p: any) => ({
          ...p,
          id: p.id,
          sizes: ["XS", "S", "M", "L", "XL"], // Defaults
          genders: ["Unisex"],
          colors: [{ label: "Default", hex: "#3D6B4F" }],
          imageEmoji: p.image_url ? null : (p.category === 'Clothes' ? '👕' : p.category === 'Books' ? '📚' : '📦'),
          imageBg: p.image_url ? '#FFFFFF' : '#F0EDE6',
          image_url: p.image_url ? `${API_BASE}${p.image_url}` : null
        }));
        setProducts(mapped);
      }
    } catch (err) {
      console.error('Failed to fetch products', err);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 2500);
  };

  const addToCart = (product: Product, size: string, gender: string, color: { label: string; hex: string }) => {
    setCartItems(prev => {
      const existing = prev.find(
        item =>
          item.product.id === product.id &&
          item.selectedSize === size &&
          item.selectedGender === gender &&
          item.selectedColor.label === color.label
      );
      if (existing) {
        return prev.map(item =>
          item === existing ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { product, qty: 1, selectedSize: size, selectedGender: gender, selectedColor: color }];
    });
    showToast(`${product.name} added to cart`, 'success');
  };

  const updateQty = (index: number, delta: number) => {
    setCartItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], qty: Math.max(1, updated[index].qty + delta) };
      return updated;
    });
  };

  const removeItem = (index: number) => {
    setCartItems(prev => prev.filter((_, i) => i !== index));
    showToast('Item removed', 'info');
  };

  const clearCart = () => {
    setCartItems([]);
    showToast('Order placed successfully! 🎉', 'success');
  };

  const handleMessageSeller = (product: Product) => {
    setChatTarget(product);
    setActiveView('chat');
  };

  if (isLoading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-page)' }}>
        <div className="auth-spinner" style={{ borderTopColor: 'var(--accent-green)', width: 32, height: 32 }} />
      </div>
    );
  }

  if (!user) {
    return <AuthPage onSuccess={() => {}} />;
  }

  return (
    <div className="app-shell">
      <Sidebar activeView={activeView} onViewChange={setActiveView} unreadCount={unreadCount} />
      {activeView === 'store' ? (
        <MainPanel 
          products={products} 
          onAddToCart={addToCart} 
          onMessageSeller={handleMessageSeller} 
          cartItemCount={cartItems.length} 
          onAddClick={() => setActiveView('sell')}
          isOrderPanelVisible={isOrderPanelVisible}
          onToggleOrderPanel={() => setIsOrderPanelVisible(!isOrderPanelVisible)}
        />
      ) : activeView === 'chat' ? (
        <ChatPanel 
          targetProduct={chatTarget} 
          onClearTarget={() => setChatTarget(null)} 
          onUnreadUpdate={setUnreadCount} 
        />
      ) : activeView === 'my-listings' ? (
        <MyProductsPanel onAddClick={() => setActiveView('sell')} />
      ) : (
        <SellPanel onBack={() => setActiveView('store')} onSuccess={() => {
          setActiveView('store');
          fetchProducts();
          showToast('Product listed successfully!', 'success');
        }} />
      )}
      <OrderPanel 
        cartItems={cartItems} 
        onUpdateQty={updateQty} 
        onRemove={removeItem} 
        onCheckout={clearCart} 
        isVisible={isOrderPanelVisible}
        onToggle={() => setIsOrderPanelVisible(!isOrderPanelVisible)}
      />

      {/* Peeking Cart Button */}
      {!isOrderPanelVisible && (
        <button 
          className="peeking-cart-btn" 
          onClick={() => setIsOrderPanelVisible(true)}
          title="Open Cart"
        >
          <div className="peeking-icon-wrap">
            <ShoppingCart size={18} />
            {cartItems.length > 0 && <span className="peeking-badge">{cartItems.length}</span>}
          </div>
        </button>
      )}

      {/* Toast notifications */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast ${toast.type}`}>
            {toast.type === 'success' ? '✓' : 'ℹ'} {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;
