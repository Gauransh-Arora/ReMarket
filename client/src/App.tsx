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
import WishlistPanel from './components/WishlistPanel';
import OffersPanel from './components/OffersPanel';
import ProductDetailModal from './components/ProductDetailModal';
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
  const [activeView, setActiveView] = useState<'store' | 'chat' | 'sell' | 'my-listings' | 'wishlist' | 'offers'>('store');
  const [chatTarget, setChatTarget] = useState<Product | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [wishlistedIds, setWishlistedIds] = useState<Set<string>>(new Set());
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



  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 2500);
  };

  const fetchCart = async () => {
    if (!accessToken) return;
    try {
      const res = await fetch(`${API_BASE}/cart`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok) {
        const mappedCart = data.map((item: any) => ({
          product: {
            ...item,
            id: item.product_id,
            sizes: ["Universal"],
            genders: ["Unisex"],
            colors: [{ label: "Default", hex: "#3D6B4F" }],
            imageEmoji: item.image_url ? null : '📦',
            imageBg: '#F0EDE6',
            image_url: item.image_url ? `${API_BASE}${item.image_url}` : null
          },
          qty: 1,
          selectedSize: "Universal",
          selectedGender: "Unisex",
          selectedColor: { label: "Default", hex: "#3D6B4F" }
        }));
        setCartItems(mappedCart);
      }
    } catch (err) {
      console.error('Fetch cart error:', err);
    }
  };

  const addToCart = async (product: Product) => {
    if (!accessToken) return showToast('Please login to add to cart', 'info');
    try {
      const res = await fetch(`${API_BASE}/cart`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}` 
        },
        body: JSON.stringify({ product_id: product.id }),
        credentials: 'include'
      });

      if (res.ok) {
        fetchCart();
        showToast(`${product.name} added to cart`, 'success');
      } else {
        const errData = await res.json();
        showToast(errData.message || 'Failed to add to cart', 'info');
      }
      
    } catch (err) {
      console.error('Add to cart error:', err);
    }
  };

  const removeItem = async (index: number) => {
    const item = cartItems[index];
    if (!accessToken) return;
    try {
      const res = await fetch(`${API_BASE}/cart/${item.product.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
        credentials: 'include'
      });

      if (res.ok) {
        setCartItems(prev => prev.filter((_, i) => i !== index));
        showToast('Item removed', 'info');
      }
    } catch (err) {
      console.error('Remove item error:', err);
    }
  };

  const updateQty = (index: number, delta: number) => {
    // Resale items are unique; quantity adjustment is disabled but kept for UI compatibility
    showToast('Quantity is fixed for resale items', 'info');
  };

  const clearCart = async () => {
    if (cartItems.length === 0) return;
    
    // For this project, we'll process the first item as a primary transaction
    // In a full resale marketplace, items are unique and handled individually
    const item = cartItems[0];
    try {
      const res = await fetch(`${API_BASE}/transactions/checkout`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}` 
        },
        body: JSON.stringify({ 
          product_id: item.product.id,
          final_price: item.product.price,
          seller_id: item.product.seller_id
        }),
        credentials: 'include'
      });

      if (res.ok) {
        setCartItems([]);
        showToast('Order placed successfully! 🎉', 'success');
        fetchProducts(); // Refresh to see "Sold" status
      } else {
        const errData = await res.json();
        showToast(errData.message || 'Checkout failed', 'info');
      }
    } catch (err) {
      console.error('Checkout error:', err);
    }
  };

  const placeOffer = async (productId: string, price: number) => {
    if (!accessToken) {
      showToast("Please login to make an offer", "info");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/offers`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}` 
        },
        body: JSON.stringify({ product_id: productId, offered_price: price }),
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Offer placed successfully! 🏷️");
      } else {
        showToast(data.message || "Failed to place offer", "info");
      }
    } catch (err) {
      showToast("Connection error", "info");
    }
  };

  const handleOfferCheckout = async (productId: string, price: number, sellerId: string, offerId: string) => {
    try {
      const res = await fetch(`${API_BASE}/transactions/checkout`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}` 
        },
        body: JSON.stringify({ 
          product_id: productId,
          final_price: price,
          seller_id: sellerId,
          offer_id: offerId
        }),
        credentials: 'include'
      });

      if (res.ok) {
        showToast('Negotiated purchase complete! 🎉', 'success');
        setActiveView('store');
        fetchProducts();
      } else {
        const errData = await res.json();
        showToast(errData.message || 'Checkout failed', 'info');
      }
    } catch (err) {
      console.error('Offer checkout error:', err);
    }
  };

  const handleMessageSeller = (product: Product) => {
    setChatTarget(product);
    setActiveView('chat');
  };

  const fetchWishlist = async () => {
    if (!accessToken) return;
    try {
      const res = await fetch(`${API_BASE}/wishlist`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok) {
        setWishlistedIds(new Set(data.map((item: any) => item.product_id)));
      }
    } catch (err) {
      console.error('Fetch wishlist error:', err);
    }
  };

  const toggleWishlist = async (productId: string) => {
    if (!accessToken) return showToast('Please login to use wishlist', 'info');
    
    const isCurrentlyWishlisted = wishlistedIds.has(productId);
    try {
      const method = isCurrentlyWishlisted ? 'DELETE' : 'POST';
      const url = isCurrentlyWishlisted ? `${API_BASE}/wishlist/${productId}` : `${API_BASE}/wishlist`;
      
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}` 
        },
        body: isCurrentlyWishlisted ? undefined : JSON.stringify({ product_id: productId }),
        credentials: 'include'
      });

      if (res.ok) {
        setWishlistedIds(prev => {
          const next = new Set(prev);
          if (isCurrentlyWishlisted) next.delete(productId);
          else next.add(productId);
          return next;
        });
        showToast(isCurrentlyWishlisted ? 'Removed from wishlist' : 'Added to wishlist', 'success');
      }
    } catch (err) {
      console.error('Toggle wishlist error:', err);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchWishlist();
    fetchCart();
  }, [accessToken]);

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
      <div className="main-view-container">
        {activeView === 'store' ? (
          <MainPanel 
            products={products} 
            onAddToCart={addToCart} 
            onMessageSeller={handleMessageSeller} 
            onProductClick={setSelectedProduct}
            cartItemCount={cartItems.length} 
            onAddClick={() => setActiveView('sell')}
            isOrderPanelVisible={isOrderPanelVisible}
            onToggleOrderPanel={() => setIsOrderPanelVisible(!isOrderPanelVisible)}
            wishlistedIds={wishlistedIds}
            onWishlistToggle={toggleWishlist}
          />
        ) : activeView === 'chat' ? (
          <ChatPanel 
            targetProduct={chatTarget} 
            onClearTarget={() => setChatTarget(null)} 
            onUnreadUpdate={setUnreadCount} 
          />
        ) : activeView === 'my-listings' ? (
          <MyProductsPanel onAddClick={() => setActiveView('sell')} />
        ) : activeView === 'wishlist' ? (
          <WishlistPanel onShopClick={() => setActiveView('store')} />
        ) : activeView === 'offers' ? (
          <OffersPanel onCheckout={handleOfferCheckout} />
        ) : (
          <SellPanel onBack={() => setActiveView('store')} onSuccess={() => {
            setActiveView('store');
            fetchProducts();
            showToast('Product listed successfully!', 'success');
          }} />
        )}
      </div>
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

      {selectedProduct && (
        <ProductDetailModal 
          product={selectedProduct} 
          onClose={() => setSelectedProduct(null)} 
          onAddToCart={(p) => {
            addToCart(p);
            setSelectedProduct(null);
          }}
          onMessageSeller={(p) => {
            handleMessageSeller(p);
            setSelectedProduct(null);
          }}
          isWishlisted={wishlistedIds.has(selectedProduct.id)}
          onWishlistToggle={() => toggleWishlist(selectedProduct.id)}
          onPlaceOffer={(id, price) => {
            placeOffer(id, price);
            setSelectedProduct(null);
          }}
        />
      )}
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
