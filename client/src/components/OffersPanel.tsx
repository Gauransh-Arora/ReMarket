import { useState, useEffect } from 'react';
import { Tag, Check, X, Clock, ShoppingCart, User, ArrowRight } from 'lucide-react';
import { useAuth, API_BASE } from '../context/AuthContext';
import './OffersPanel.css';

interface Offer {
  offer_id: string;
  product_id: string;
  product_name: string;
  offered_price: number;
  original_price: number;
  offer_date: string;
  offer_status: string;
  buyer_name: string;
  seller_name: string;
  seller_id: string;
  buyer_id: string;
}

interface OffersPanelProps {
  onCheckout: (productId: string, price: number, sellerId: string, offerId: string) => void;
}

export default function OffersPanel({ onCheckout }: OffersPanelProps) {
  const { accessToken, user } = useAuth();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');

  const fetchOffers = async () => {
    if (!accessToken) return;
    try {
      const res = await fetch(`${API_BASE}/offers/my-offers`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok) setOffers(data);
    } catch (err) {
      console.error('Failed to fetch offers', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, [accessToken]);

  const handleRespond = async (offerId: string, action: 'Accepted' | 'Rejected') => {
    try {
      const res = await fetch(`${API_BASE}/offers/respond`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}` 
        },
        body: JSON.stringify({ offer_id: offerId, action }),
        credentials: 'include'
      });
      if (res.ok) fetchOffers();
    } catch (err) {
      console.error('Respond error', err);
    }
  };

  const filteredOffers = offers.filter(o => {
    if (activeTab === 'received') return o.seller_id === user?.sub;
    return o.buyer_id === user?.sub;
  });

  return (
    <div className="offers-panel">
      <div className="panel-header">
        <div className="title-group">
          <h2>Negotiations</h2>
          <p>Manage your bids and offers</p>
        </div>
        <div className="tab-switcher">
          <button 
            className={activeTab === 'received' ? 'active' : ''} 
            onClick={() => setActiveTab('received')}
          >
            Received
          </button>
          <button 
            className={activeTab === 'sent' ? 'active' : ''} 
            onClick={() => setActiveTab('sent')}
          >
            Sent
          </button>
        </div>
      </div>

      <div className="offers-list">
        {loading ? (
          <div className="loading-state">Loading offers...</div>
        ) : filteredOffers.length === 0 ? (
          <div className="empty-state">
            <Tag size={40} />
            <p>No offers found in this category.</p>
          </div>
        ) : (
          filteredOffers.map(offer => (
            <div key={offer.offer_id} className={`offer-card ${offer.offer_status.toLowerCase()}`}>
              <div className="offer-info">
                <div className="product-info">
                  <span className="product-name">{offer.product_name}</span>
                  <div className="price-comparison">
                    <span className="old-price">₹{offer.original_price}</span>
                    <ArrowRight size={12} />
                    <span className="new-price">₹{offer.offered_price}</span>
                  </div>
                </div>
                <div className="user-info">
                  <User size={14} />
                  <span>{activeTab === 'received' ? offer.buyer_name : offer.seller_name}</span>
                </div>
              </div>

              <div className="offer-status-badge">
                <Clock size={12} />
                <span>{offer.offer_status}</span>
              </div>

              <div className="offer-actions">
                {activeTab === 'received' && offer.offer_status === 'Pending' && (
                  <>
                    <button className="btn-reject" onClick={() => handleRespond(offer.offer_id, 'Rejected')}>
                      <X size={16} />
                    </button>
                    <button className="btn-accept" onClick={() => handleRespond(offer.offer_id, 'Accepted')}>
                      <Check size={16} />
                      Accept
                    </button>
                  </>
                )}

                {activeTab === 'sent' && offer.offer_status === 'Accepted' && (
                  <button 
                    className="btn-pay" 
                    onClick={() => onCheckout(offer.product_id, offer.offered_price, offer.seller_id, offer.offer_id)}
                  >
                    <ShoppingCart size={16} />
                    Buy Now
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
