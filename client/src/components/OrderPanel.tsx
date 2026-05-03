import { useState } from 'react';
import type { CartItem } from '../App';
import { ShoppingCart, Package, Trash2, Plus, Minus, CreditCard, Banknote, MapPin, Phone, User, ReceiptText, ChevronRight } from 'lucide-react';
import './OrderPanel.css';

interface OrderPanelProps {
  cartItems: CartItem[];
  onUpdateQty: (index: number, delta: number) => void;
  onRemove: (index: number) => void;
  onCheckout: () => void;
  isVisible: boolean;
  onToggle: () => void;
}

export default function OrderPanel({ 
  cartItems, 
  onUpdateQty, 
  onRemove, 
  onCheckout,
  isVisible,
  onToggle 
}: OrderPanelProps) {
  const [discountCode, setDiscountCode] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
  const [discountApplied, setDiscountApplied] = useState(false);

  const subtotal = cartItems.reduce((sum, item) => sum + item.product.price * item.qty, 0);
  const discount = discountApplied ? Math.round(subtotal * 0.1) : 0;
  const salesTax = Math.round((subtotal - discount) * 0.05);
  const total = subtotal - discount + salesTax;

  const handleDiscountKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && discountCode.toLowerCase() === 'hostel10') {
      setDiscountApplied(true);
    }
  };

  return (
    <aside className={`order-panel ${!isVisible ? 'collapsed' : ''}`}>
      <div className="cart-header">
        <ShoppingCart size={20} color="var(--accent-green)" />
        <h2 className="cart-title">Shopping Cart</h2>
      </div>

      {/* Order list */}
      <div className="order-section-title">Current Order</div>
      <div className="order-list">
        {cartItems.length === 0 ? (
          <div className="order-empty">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 001.98 1.61h9.72a2 2 0 001.98-1.61L23 6H6" />
            </svg>
            <p>Cart is empty</p>
            <p style={{ fontSize: 11 }}>Add products to get started</p>
          </div>
        ) : (
          cartItems.map((item, idx) => (
            <div key={idx} className="order-item">
              {/* Thumbnail */}
              <div className="order-thumb" style={{ background: item.product.imageBg }}>
                {item.product.image_url ? (
                  <img src={item.product.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4 }} />
                ) : (
                  <Package size={16} />
                )}
              </div>

              {/* Info */}
              <div className="order-item-info">
                <div className="order-item-name">{item.product.name}</div>
                <div className="order-item-meta">
                  {item.selectedSize} · {item.selectedColor.label}
                </div>
                {/* Qty controls */}
                <div className="qty-controls" style={{ marginTop: 4 }}>
                  <button className="qty-btn" onClick={() => onUpdateQty(idx, -1)}>−</button>
                  <span className="qty-value">{item.qty}</span>
                  <button className="qty-btn" onClick={() => onUpdateQty(idx, 1)}>+</button>
                </div>
              </div>

              {/* Price & remove */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                <div className="order-item-price">
                  ₹{(item.product.price * item.qty).toLocaleString('en-IN')}
                </div>
                <button className="remove-btn" onClick={() => onRemove(idx)}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Payment summary */}
      <div className="payment-summary">
        <div className="summary-row">
          <span>Subtotal</span>
          <span className="summary-value">₹{subtotal.toLocaleString('en-IN')}</span>
        </div>
        <div className="summary-row">
          <span>Discount {discountApplied && <span style={{ color: 'var(--accent-green)', fontSize: 10 }}>HOSTEL10</span>}</span>
          <span className="summary-value" style={{ color: discountApplied ? 'var(--accent-green)' : undefined }}>
            {discountApplied ? `-₹${discount.toLocaleString('en-IN')}` : '—'}
          </span>
        </div>
        <div className="summary-row">
          <span>Sales Tax (5%)</span>
          <span className="summary-value">₹{salesTax.toLocaleString('en-IN')}</span>
        </div>
        <div className="summary-row total">
          <span>Total Amount</span>
          <span className="summary-value">₹{total.toLocaleString('en-IN')}</span>
        </div>
      </div>

      {/* Discount code */}
      <div className="discount-input-wrap">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
          <line x1="7" y1="7" x2="7.01" y2="7" />
        </svg>
        <input
          placeholder={discountApplied ? 'Code applied: HOSTEL10 ✓' : 'Discount code (try HOSTEL10)'}
          value={discountCode}
          onChange={e => setDiscountCode(e.target.value)}
          onKeyDown={handleDiscountKeyDown}
          disabled={discountApplied}
          style={{ color: discountApplied ? 'var(--accent-green)' : undefined }}
        />
      </div>

      {/* Payment toggle */}
      <div className="payment-toggle">
        <button
          className={`payment-toggle-btn cash${paymentMethod === 'cash' ? '' : ''}`}
          style={{
            background: paymentMethod === 'cash' ? 'var(--accent-green)' : 'transparent',
            color: paymentMethod === 'cash' ? 'white' : 'var(--text-muted)',
            border: paymentMethod === 'cash' ? '1px solid var(--accent-green)' : '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8
          }}
          onClick={() => setPaymentMethod('cash')}
        >
          <Banknote size={14} />
          Cash
        </button>
        <button
          className="payment-toggle-btn card"
          style={{
            background: paymentMethod === 'card' ? 'var(--accent-green)' : 'transparent',
            color: paymentMethod === 'card' ? 'white' : 'var(--text-muted)',
            border: paymentMethod === 'card' ? '1px solid var(--accent-green)' : '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8
          }}
          onClick={() => setPaymentMethod('card')}
        >
          <CreditCard size={14} />
          Card
        </button>
      </div>

      {/* Checkout button */}
      <button
        className="checkout-btn"
        onClick={onCheckout}
        disabled={cartItems.length === 0}
        style={{ opacity: cartItems.length === 0 ? 0.5 : 1, cursor: cartItems.length === 0 ? 'not-allowed' : 'pointer' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 11 12 14 22 4" />
          <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
        </svg>
        Checkout · ₹{total.toLocaleString('en-IN')}
      </button>
    </aside>
  );
}
