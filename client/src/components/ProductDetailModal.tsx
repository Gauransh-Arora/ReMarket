import { useState, useEffect } from 'react';
import { X, Star, MessageSquare, ShoppingCart, User, Clock, Tag, Heart, ShieldCheck } from 'lucide-react';
import type { Product } from '../data/products';
import { useAuth, API_BASE } from '../context/AuthContext';
import './ProductDetailModal.css';

interface Review {
  reviewer: string;
  rating: number;
  comment: string;
}

interface ProductDetailModalProps {
  product: Product;
  onClose: () => void;
  onAddToCart: (p: Product) => void;
  onMessageSeller: (p: Product) => void;
  isWishlisted: boolean;
  onWishlistToggle: () => void;
  onPlaceOffer: (productId: string, price: number) => void;
}

export default function ProductDetailModal({ 
  product, 
  onClose, 
  onAddToCart, 
  onMessageSeller,
  isWishlisted,
  onWishlistToggle,
  onPlaceOffer
}: ProductDetailModalProps) {
  const { user, accessToken } = useAuth();
  const [offerPrice, setOfferPrice] = useState<string>(product.price.toString());
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchReviews = async () => {
    if (!product.seller_id || !accessToken) return;
    try {
      const res = await fetch(`${API_BASE}/reviews/user/${product.seller_id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok) setReviews(data);
    } catch (err) {
      console.error('Failed to fetch reviews', err);
    } finally {
      setLoadingReviews(false);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, we need a transaction_id. 
    // Since we don't have a simple way to get one for any product, 
    // we'll show a message or use a dummy one if the backend allows.
    alert("In this version, you can only review after a verified transaction. This feature is coming soon!");
  };

  useEffect(() => {
    fetchReviews();
  }, [product.seller_id, accessToken]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <X size={20} />
        </button>

        <div className="modal-body">
          {/* Left: Images */}
          <div className="modal-gallery">
            <div className="main-image" style={{ background: product.imageBg }}>
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} />
              ) : (
                <span className="emoji-large">{product.imageEmoji}</span>
              )}
            </div>
          </div>

          {/* Right: Info */}
          <div className="modal-info">
            <div className="info-header">
              <span className="info-category">{product.category}</span>
              <h1 className="info-title">{product.name}</h1>
              <div className="info-price">₹{product.price.toLocaleString('en-IN')}</div>
            </div>

            <div className="seller-card">
              <div className="seller-avatar">
                <User size={20} />
              </div>
              <div className="seller-details">
                <div className="seller-name">{product.seller_name || 'Hostel Seller'}</div>
                <div className="seller-rating">
                  <Star size={12} fill="#FFD700" color="#FFD700" />
                  <span>{product.seller_rating ? Number(product.seller_rating).toFixed(1) : '5.0'} ({product.seller_reviews || 0} reviews)</span>
                </div>
              </div>
              <button className="seller-msg-btn" onClick={() => onMessageSeller(product)}>
                <MessageSquare size={16} />
                Chat
              </button>
            </div>

            <div className="info-description">
              <h3>Description</h3>
              <p>{product.description || 'No description provided.'}</p>
            </div>

            <div className="info-meta">
              <div className="meta-row">
                <Tag size={16} />
                <span>Condition: <strong>{product.condition}</strong></span>
              </div>
              <div className="meta-row">
                <Clock size={16} />
                <span>Listed: <strong>Recently</strong></span>
              </div>
              <div className="meta-row">
                <ShieldCheck size={16} />
                <span>Verified Listing</span>
              </div>
            </div>

            <div className="modal-actions">
              <button className="buy-btn" onClick={() => onAddToCart(product)}>
                <ShoppingCart size={18} />
                Add to Cart
              </button>
              <button className={`wish-btn ${isWishlisted ? 'active' : ''}`} onClick={onWishlistToggle}>
                <Heart size={18} fill={isWishlisted ? 'currentColor' : 'none'} />
                {isWishlisted ? 'Saved' : 'Wishlist'}
              </button>
            </div>

            {user?.id !== product.seller_id && (
              <div className="offer-section">
                <div className="offer-input-group">
                  <div className="offer-input-wrapper">
                    <span>₹</span>
                    <input 
                      type="number" 
                      value={offerPrice}
                      onChange={e => setOfferPrice(e.target.value)}
                      placeholder="Enter bid price"
                    />
                  </div>
                  <button className="offer-btn" onClick={() => onPlaceOffer(product.id, Number(offerPrice))}>
                    <Tag size={16} />
                    Make Offer
                  </button>
                </div>
                <p className="offer-note">Offers can only be placed on Sundays.</p>
              </div>
            )}

            {/* Reviews Section */}
            <div className="reviews-section">
              <div className="reviews-header">
                <h3>Seller Reviews</h3>
                <span className="reviews-count">{reviews.length} total</span>
              </div>

              <div className="reviews-list">
                {loadingReviews ? (
                  <div className="reviews-loading">Loading reviews...</div>
                ) : reviews.length === 0 ? (
                  <div className="no-reviews">No reviews for this seller yet.</div>
                ) : (
                  reviews.map((r, i) => (
                    <div key={i} className="review-item">
                      <div className="review-top">
                        <span className="reviewer-name">{r.reviewer}</span>
                        <div className="review-stars">
                          {[...Array(5)].map((_, si) => (
                            <Star key={si} size={10} fill={si < r.rating ? '#FFD700' : 'none'} color={si < r.rating ? '#FFD700' : '#ddd'} />
                          ))}
                        </div>
                      </div>
                      <p className="review-comment">{r.comment}</p>
                    </div>
                  ))
                )}
              </div>

              {user?.id !== product.seller_id && (
                <form className="review-form" onSubmit={handleReviewSubmit}>
                  <h4>Write a Review</h4>
                  <div className="rating-select">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button 
                        key={star} 
                        type="button" 
                        onClick={() => setNewReview(prev => ({ ...prev, rating: star }))}
                        className={newReview.rating >= star ? 'active' : ''}
                      >
                        <Star size={16} fill={newReview.rating >= star ? '#FFD700' : 'none'} color={newReview.rating >= star ? '#FFD700' : '#ddd'} />
                      </button>
                    ))}
                  </div>
                  <textarea 
                    placeholder="Share your experience with this seller..."
                    value={newReview.comment}
                    onChange={e => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
                  />
                  <button type="submit" className="submit-review-btn">Post Review</button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
