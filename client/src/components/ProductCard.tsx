import { MessageSquare, User, Clock, Tag, Info, Heart, Star } from 'lucide-react';
import type { Product } from '../data/products';
import './ProductCard.css';
import { useAuth } from '../context/AuthContext';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  onMessageSeller: (product: Product) => void;
  onProductClick: (product: Product) => void;
  isWishlisted?: boolean;
  onWishlistToggle?: () => void;
}

export default function ProductCard({ 
  product, 
  onAddToCart, 
  onMessageSeller,
  onProductClick,
  isWishlisted = false,
  onWishlistToggle
}: ProductCardProps) {
  // We'll use defaults for now since these are no longer selectable in the main grid
  const defaultSize = "Universal";
  const defaultGender = "Unisex";
  const defaultColor = { label: "Default", hex: "#3D6B4F" };

  const handleAddToCart = () => {
    onAddToCart(product);
  };

  const formattedDate = product.created_at
    ? new Date(product.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    : 'Recently';

  const { user } = useAuth();
  const isOwnProduct = user?.sub === product.seller_id;

  return (
    <div className="product-card" onClick={() => onProductClick(product)} style={{ cursor: 'pointer' }}>
      {/* Product image container */}
      <div className="card-image-wrap" style={{ background: product.imageBg }}>
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} />
        ) : (
          <span style={{ fontSize: 72, lineHeight: 1, filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.08))' }}>
            {product.imageEmoji}
          </span>
        )}

        {/* Badges */}
        <div className="card-badges">
          <span className="badge category-badge">{product.category}</span>
          {!isOwnProduct && (
            <button 
              className={`wishlist-btn ${isWishlisted ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onWishlistToggle?.();
              }}
            >
              <Heart size={14} fill={isWishlisted ? 'currentColor' : 'none'} />
            </button>
          )}
          {product.condition && (
            <span className="badge condition-badge">{product.condition}</span>
          )}
        </div>
      </div>

      {/* Product Info */}
      <div className="card-body">
        <div className="card-header">
          <div className="card-name-group">
            <h3 className="card-name">{product.name}</h3>
            <div className="card-seller">
              <User size={10} />
              <span>{product.seller_name || 'Hostel Seller'}</span>
              {product.seller_rating > 0 && (
                <div className="seller-rating">
                  <Star size={10} fill="#FFD700" color="#FFD700" />
                  <span>{Number(product.seller_rating).toFixed(1)} ({product.seller_reviews})</span>
                </div>
              )}
            </div>
          </div>
          <div className="card-price">₹{product.price.toLocaleString('en-IN')}</div>
        </div>

        <p className="card-description">
          {product.description || 'No description provided for this item.'}
        </p>

        <div className="card-footer-meta">
          <div className="meta-item">
            <Clock size={11} />
            <span>{formattedDate}</span>
          </div>
          <div className="meta-item">
            <Tag size={11} />
            <span style={{ textTransform: 'capitalize' }}>{product.status}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="card-actions">
        <button className="add-to-cart-btn" onClick={(e) => { e.stopPropagation(); handleAddToCart(); }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 001.98 1.61h9.72a2 2 0 001.98-1.61L23 6H6" />
          </svg>
          Add to Cart
        </button>
        {!isOwnProduct && (
          <button
            className="msg-seller-btn"
            onClick={(e) => { e.stopPropagation(); onMessageSeller(product); }}
            title="Message Seller"
          >
            <MessageSquare size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
