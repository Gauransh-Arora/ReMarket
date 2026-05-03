import { useState, useEffect } from 'react';
import type { Product } from '../data/products';
import { categories as mockCategories } from '../data/products';
import ProductCard from './ProductCard';
import * as LucideIcons from 'lucide-react';
import { API_BASE } from '../context/AuthContext';
import './MainPanel.css';

interface Category {
  id: string | number;
  name: string;
}

interface MainPanelProps {
  products: Product[];
  onAddToCart: (product: Product, size: string, gender: string, color: { label: string; hex: string }) => void;
  onMessageSeller: (product: Product) => void;
  cartItemCount: number;
  onAddClick: () => void;
  isOrderPanelVisible: boolean;
  onToggleOrderPanel: () => void;
}

export default function MainPanel({ 
  products, 
  onAddToCart, 
  onMessageSeller, 
  cartItemCount, 
  onAddClick,
  isOrderPanelVisible,
  onToggleOrderPanel
}: MainPanelProps) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);

  useEffect(() => {
    const fetchCats = async () => {
      try {
        const res = await fetch(`${API_BASE}/categories`);
        const data = await res.json();
        if (res.ok) {
          // Add 'all' category manually
          setCategories([{ id: 'all', name: 'All Items' }, ...data.categories]);
        }
      } catch (err) {
        console.error('Failed to fetch categories', err);
        // Fallback to mock if server fails
        setCategories(mockCategories.map(c => ({ id: c.id, name: c.label, icon_name: c.icon })));
      } finally {
        setLoadingCats(false);
      }
    };
    fetchCats();
  }, []);

  const filteredProducts = products.filter(p => {
    const matchCategory = activeCategory === 'all' || p.category === activeCategory;
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <main className="main-panel">
      {/* Top bar */}
      <div className="main-topbar">
        <div className="main-title-group">
          <h1 className="main-title">ReMarket</h1>
          <p className="main-subtitle">Hostel Resale Management System</p>
        </div>
        <div className="topbar-controls">
          <div className="search-pill">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              placeholder="Search products..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="filter-btn" onClick={onAddClick} style={{ background: 'var(--accent-green)', color: 'white', border: 'none' }}>
            <LucideIcons.Plus size={14} strokeWidth={2.5} />
            Add Product
          </button>
          <button className="filter-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="8" y1="12" x2="16" y2="12" />
              <line x1="11" y1="18" x2="13" y2="18" />
            </svg>
            Filters
          </button>
          <button 
            className={`filter-btn ${isOrderPanelVisible ? 'active' : ''}`} 
            onClick={onToggleOrderPanel}
            style={{ position: 'relative' }}
          >
            <LucideIcons.ShoppingCart size={14} />
            Cart
            {cartItemCount > 0 && <span className="cart-badge-dot">{cartItemCount}</span>}
          </button>
        </div>
      </div>

      {/* Category tabs */}
      <div className="category-tabs">
        {loadingCats ? (
          <div className="auth-spinner" style={{ width: 20, height: 20, borderTopColor: 'var(--accent-green)' }} />
        ) : (
          categories.map(cat => {
            const iconMap: Record<string, string> = {
              'All Items': 'LayoutGrid',
              'Clothes': 'Shirt',
              'Accessories': 'Glasses',
              'Books': 'Book',
              'Electronics': 'Zap',
              'Home Goods': 'Home'
            };
            const iconName = iconMap[cat.name] || 'HelpCircle';
            const IconComponent = (LucideIcons as any)[iconName] || LucideIcons.HelpCircle;
            return (
              <button
                key={cat.id}
                className={`tab-btn${activeCategory === (cat.name === 'All Items' ? 'all' : cat.name) ? ' active' : ''}`}
                onClick={() => setActiveCategory(cat.name === 'All Items' ? 'all' : cat.name)}
              >
                <span className="tab-icon">
                  <IconComponent size={14} strokeWidth={2.5} />
                </span>
                {cat.name}
              </button>
            );
          })
        )}
      </div>

      {/* Product grid */}
      {activeCategory === 'ordered' ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: 'var(--text-muted)' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3 }}>
            <path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" />
            <polyline points="16 3 12 7 8 3" />
          </svg>
          <p style={{ fontSize: 13 }}>View active cart items in the Order Panel →</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: 'var(--text-muted)' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3 }}>
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <p style={{ fontSize: 13 }}>No products found for "{searchQuery}"</p>
        </div>
      ) : (
        <div className="product-grid">
          {filteredProducts.map(product => (
            <ProductCard 
              key={product.id} 
              product={product} 
              onAddToCart={onAddToCart} 
              onMessageSeller={onMessageSeller}
            />
          ))}
        </div>
      )}
    </main>
  );
}
