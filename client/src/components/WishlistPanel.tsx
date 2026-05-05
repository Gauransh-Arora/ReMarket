import { useState, useEffect } from 'react';
import { useAuth, API_BASE } from '../context/AuthContext';
import { Heart, ShoppingBag, ArrowRight, Package } from 'lucide-react';
import './MainPanel.css';
import './ProductCard.css';

interface WishlistItem {
  wishlist_id: number;
  product_id: string;
  name: string;
  price: number;
  status: string;
  added_at: string;
  image_url?: string;
}

export default function WishlistPanel({ onShopClick }: { onShopClick: () => void }) {
  const { accessToken } = useAuth();
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWishlist = async () => {
    try {
      const res = await fetch(`${API_BASE}/wishlist`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok) {
        setWishlist(data);
      }
    } catch (err) {
      console.error('Failed to fetch wishlist', err);
    } finally {
      setLoading(false);
    }
  };

  const removeFromWishlist = async (productId: string) => {
    try {
      const res = await fetch(`${API_BASE}/wishlist/${productId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
        credentials: 'include'
      });
      if (res.ok) {
        setWishlist(prev => prev.filter(item => item.product_id !== productId));
      }
    } catch (err) {
      console.error('Failed to remove from wishlist', err);
    }
  };

  useEffect(() => {
    fetchWishlist();
  }, [accessToken]);

  return (
    <div className="main-panel">
      <div className="main-header">
        <div className="header-left">
          <h1 className="main-title">My Wishlist</h1>
          <p className="main-subtitle">Items you've saved for later</p>
        </div>
        <button className="add-btn" style={{ background: 'var(--bg-active-nav)', color: 'var(--text-primary)' }} onClick={onShopClick}>
          <ShoppingBag size={16} />
          Back to Store
        </button>
      </div>

      <div className="product-grid">
        {loading ? (
          <div className="loading-state">Loading your wishlist...</div>
        ) : wishlist.length === 0 ? (
          <div className="empty-state">
            <Heart size={48} strokeWidth={1} style={{ opacity: 0.2, color: '#EF4444' }} />
            <p>Your wishlist is empty.</p>
            <button className="add-btn" style={{ marginTop: 12 }} onClick={onShopClick}>Browse Products</button>
          </div>
        ) : (
          wishlist.map(item => (
            <div key={item.wishlist_id} className="product-card">
              <div className="card-image-wrap" style={{ height: 140, background: 'var(--bg-page)' }}>
                {item.image_url ? (
                  <img src={`${API_BASE}${item.image_url}`} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <Package size={40} strokeWidth={1} style={{ opacity: 0.1 }} />
                )}
                <div className="card-badges">
                  <button 
                    className="wishlist-btn active" 
                    style={{ top: 8, right: 8 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFromWishlist(item.product_id);
                    }}
                  >
                    <Heart size={14} fill="#EF4444" color="#EF4444" />
                  </button>
                </div>
              </div>
              <div className="card-body">
                <div className="card-header">
                  <h3 className="card-name">{item.name}</h3>
                  <div className="card-price">₹{item.price.toLocaleString('en-IN')}</div>
                </div>
                <div className="card-footer-meta">
                   <div className="meta-item">
                     <span>Added on {new Date(item.added_at).toLocaleDateString()}</span>
                   </div>
                </div>
              </div>
              <div className="card-actions">
                <button className="add-to-cart-btn">
                  View Product
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
