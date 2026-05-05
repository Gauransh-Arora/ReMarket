import { useState, useEffect } from 'react';
import { useAuth, API_BASE } from '../context/AuthContext';
import { ShoppingBag, Star, Clock, CheckCircle, Package, ArrowRight } from 'lucide-react';
import './MainPanel.css';
import './ProductCard.css';

interface Transaction {
  transaction_id: string;
  product_name: string;
  final_price: number;
  transaction_date: string;
  status: string;
  role: 'Bought' | 'Sold';
  image_url?: string;
  is_reviewed: boolean;
}

export default function TransactionsPanel() {
  const { accessToken } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchTransactions = async () => {
    try {
      const res = await fetch(`${API_BASE}/transactions/my-transactions`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok) setTransactions(data);
    } catch (err) {
      console.error('Failed to fetch transactions', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewSubmit = async (transactionId: string) => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/reviews`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({ transaction_id: transactionId, rating, comment }),
        credentials: 'include'
      });
      if (res.ok) {
        setReviewingId(null);
        setComment('');
        setRating(5);
        fetchTransactions();
      }
    } catch (err) {
      console.error('Failed to submit review', err);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [accessToken]);

  return (
    <div className="main-panel">
      <div className="main-header">
        <div className="header-left">
          <h1 className="main-title">Transactions</h1>
          <p className="main-subtitle">History of your purchases and sales</p>
        </div>
      </div>

      <div className="product-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))' }}>
        {loading ? (
          <div className="loading-state">Loading transactions...</div>
        ) : transactions.length === 0 ? (
          <div className="empty-state">
            <ShoppingBag size={48} strokeWidth={1} style={{ opacity: 0.2 }} />
            <p>No transactions found.</p>
          </div>
        ) : (
          transactions.map(t => (
            <div key={t.transaction_id} className="product-card" style={{ height: '420px', display: 'flex', flexDirection: 'column' }}>
              <div className="card-image-wrap" style={{ height: 160, minHeight: 160, background: 'var(--bg-page)', position: 'relative' }}>
                {t.image_url ? (
                  <img src={`${API_BASE}${t.image_url}`} alt={t.product_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.1 }}>
                    <Package size={64} strokeWidth={1} />
                  </div>
                )}
                <div className="card-badges">
                  <span 
                    className="badge" 
                    style={{ 
                      background: t.role === 'Bought' ? 'var(--bg-active-nav)' : 'var(--accent-green)',
                      color: t.role === 'Bought' ? 'var(--text-primary)' : 'white'
                    }}
                  >
                    {t.role === 'Bought' ? 'PURCHASED' : 'SOLD'}
                  </span>
                </div>
              </div>

              <div className="card-body" style={{ padding: '16px 20px 20px', flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <h3 className="card-name" style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>{t.product_name}</h3>
                  <div className="card-price" style={{ fontSize: 18, fontWeight: 700 }}>₹{t.final_price.toLocaleString('en-IN')}</div>
                </div>

                <div className="card-footer-meta" style={{ marginTop: 0, borderTop: '1px solid var(--border-color)', paddingTop: 12, paddingBottom: 0 }}>
                  <div className="meta-item">
                    <Clock size={12} />
                    <span>{new Date(t.transaction_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                  <div className="meta-item">
                    <CheckCircle size={12} color="var(--accent-green)" />
                    <span style={{ color: 'var(--accent-green)', fontWeight: 500 }}>{t.status}</span>
                  </div>
                </div>

                <div style={{ marginTop: 'auto' }}>
                  {t.role === 'Bought' && !t.is_reviewed && reviewingId !== t.transaction_id && (
                    <button 
                      className="add-to-cart-btn" 
                      style={{ marginTop: 16, width: '100%', justifyContent: 'center' }}
                      onClick={() => setReviewingId(t.transaction_id)}
                    >
                      <Star size={14} fill="currentColor" />
                      Review Seller
                    </button>
                  )}

                  {t.is_reviewed && (
                    <div style={{ 
                      marginTop: 16, 
                      fontSize: 12, 
                      color: 'var(--accent-green)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      gap: 6,
                      padding: '8px',
                      background: 'rgba(16, 185, 129, 0.05)',
                      borderRadius: '8px'
                    }}>
                      <CheckCircle size={14} />
                      Feedback Shared
                    </div>
                  )}
                </div>

                {reviewingId === t.transaction_id && (
                  <div style={{ marginTop: 16, background: 'var(--bg-page)', padding: 16, borderRadius: 12, border: '1px solid var(--border-color)' }}>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Rate your experience</p>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star 
                          key={s} 
                          size={20} 
                          fill={rating >= s ? '#FFD700' : 'none'} 
                          color={rating >= s ? '#FFD700' : '#CBD5E1'} 
                          style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
                          onClick={() => setRating(s)}
                          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        />
                      ))}
                    </div>
                    <textarea 
                      placeholder="Write a brief review..."
                      value={comment}
                      onChange={e => setComment(e.target.value)}
                      style={{ 
                        width: '100%', 
                        background: 'white', 
                        border: '1px solid var(--border-color)', 
                        borderRadius: 8, 
                        padding: 12, 
                        fontSize: 13, 
                        marginBottom: 12,
                        resize: 'none',
                        minHeight: '80px'
                      }}
                    />
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button 
                        className="add-to-cart-btn" 
                        style={{ flex: 1, height: 36, fontSize: 13, justifyContent: 'center' }}
                        disabled={submitting}
                        onClick={() => handleReviewSubmit(t.transaction_id)}
                      >
                        {submitting ? 'Sharing...' : 'Submit Review'}
                      </button>
                      <button 
                        className="msg-seller-btn" 
                        style={{ width: '40px', height: '36px', padding: 0, justifyContent: 'center' }}
                        onClick={() => setReviewingId(null)}
                        title="Cancel"
                      >
                        <ArrowRight size={16} style={{ transform: 'rotate(180deg)' }} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
