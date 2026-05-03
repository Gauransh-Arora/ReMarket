import { useState, useEffect } from 'react';
import { useAuth, API_BASE } from '../context/AuthContext';
import { Package, Edit2, Trash2, Plus, Clock, Tag } from 'lucide-react';
import './ProductCard.css'; // Reuse product card styles
import './MainPanel.css'; // Reuse grid styles

interface MyProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  condition: string;
  category: string;
  status: string;
  created_at: string;
}

export default function MyProductsPanel({ onAddClick }: { onAddClick: () => void }) {
  const { accessToken } = useAuth();
  const [myProducts, setMyProducts] = useState<MyProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMyProducts = async () => {
    try {
      const res = await fetch(`${API_BASE}/products/my-products`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok) {
        setMyProducts(data.products);
      }
    } catch (err) {
      console.error('Failed to fetch my products', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this listing?')) return;
    try {
      const res = await fetch(`${API_BASE}/products/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
        credentials: 'include'
      });
      if (res.ok) {
        setMyProducts(prev => prev.filter(p => p.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete product', err);
    }
  };

  useEffect(() => {
    fetchMyProducts();
  }, [accessToken]);

  return (
    <div className="main-panel">
      <div className="main-header">
        <div className="header-left">
          <h1 className="main-title">My Listings</h1>
          <p className="main-subtitle">Manage the items you've posted for sale</p>
        </div>
        <button className="add-btn" onClick={onAddClick}>
          <Plus size={16} />
          List New Item
        </button>
      </div>

      <div className="product-grid">
        {loading ? (
          <div className="loading-state">Loading your products...</div>
        ) : myProducts.length === 0 ? (
          <div className="empty-state">
            <Package size={48} strokeWidth={1} style={{ opacity: 0.2 }} />
            <p>You haven't listed any products yet.</p>
            <button className="add-btn" style={{ marginTop: 12 }} onClick={onAddClick}>Start Selling</button>
          </div>
        ) : (
          myProducts.map(product => (
            <div key={product.id} className="product-card">
              <div className="card-image-wrap" style={{ height: 140, background: 'var(--bg-page)' }}>
                <Package size={48} strokeWidth={1} style={{ opacity: 0.1 }} />
                <div className="card-badges">
                  <span className="badge category-badge">{product.category}</span>
                  <span className="badge status-badge" style={{ background: product.status === 'Active' ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                    {product.status}
                  </span>
                </div>
              </div>
              
              <div className="card-body">
                <div className="card-header">
                  <h3 className="card-name">{product.name}</h3>
                  <div className="card-price">₹{product.price.toLocaleString('en-IN')}</div>
                </div>
                <p className="card-description" style={{ WebkitLineClamp: 2 }}>{product.description}</p>
                
                <div className="card-footer-meta">
                  <div className="meta-item">
                    <Clock size={11} />
                    <span>{new Date(product.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="meta-item">
                    <Tag size={11} />
                    <span>{product.condition}</span>
                  </div>
                </div>
              </div>

              <div className="card-actions" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <button className="add-to-cart-btn" style={{ background: 'var(--bg-active-nav)', color: 'var(--text-primary)' }}>
                  <Edit2 size={14} />
                  Edit
                </button>
                <button 
                  className="msg-seller-btn" 
                  style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' }}
                  onClick={() => handleDelete(product.id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
