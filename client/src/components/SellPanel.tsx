import { useState, useEffect } from 'react';
import { ArrowLeft, Upload, Package, CheckCircle } from 'lucide-react';
import { API_BASE } from '../context/AuthContext';
import './SellPanel.css';

interface Category {
  id: number;
  name: string;
}

interface SellPanelProps {
  onBack: () => void;
  onSuccess: () => void;
}

export default function SellPanel({ onBack, onSuccess }: SellPanelProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    categoryId: '',
    condition: 'Good'
  });
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchCats = async () => {
      const res = await fetch(`${API_BASE}/categories`);
      const data = await res.json();
      if (res.ok) setCategories(data.categories);
    };
    fetchCats();
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.price || !formData.categoryId) return;

    setIsSubmitting(true);
    const data = new FormData();
    data.append('name', formData.name);
    data.append('description', formData.description);
    data.append('price', formData.price);
    data.append('categoryId', formData.categoryId);
    data.append('condition', formData.condition);
    if (image) data.append('image', image);

    try {
      const accessToken = sessionStorage.getItem('accessToken');
      const res = await fetch(`${API_BASE}/products`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`
        },
        body: data // Use FormData directly
      });

      if (res.ok) {
        onSuccess();
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to list product');
      }
    } catch (err) {
      console.error('Submit error:', err);
      alert('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="main-panel" style={{ overflowY: 'auto' }}>
      <div className="main-topbar">
        <div className="main-title-group" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={onBack} className="back-btn-circle">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="main-title">List New Product</h1>
            <p className="main-subtitle">Share your items with the hostel community</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="sell-form">
        <div className="sell-form-grid">
          {/* Left Column: Image Upload */}
          <div className="sell-image-section">
            <label className="image-upload-box" style={{ backgroundImage: preview ? `url(${preview})` : 'none' }}>
              {!preview && (
                <div className="upload-placeholder">
                  <Upload size={32} strokeWidth={1.5} color="var(--text-muted)" />
                  <span>Upload Product Photo</span>
                  <p>JPG, PNG or WEBP (Max 5MB)</p>
                </div>
              )}
              <input type="file" accept="image/*" onChange={handleImageChange} hidden />
              {preview && <div className="change-image-overlay">Change Image</div>}
            </label>
          </div>

          {/* Right Column: Details */}
          <div className="sell-details-section">
            <div className="form-group">
              <label>Product Name</label>
              <input 
                type="text" 
                placeholder="e.g. Scientific Calculator" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                required
              />
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label>Category</label>
                <select 
                  value={formData.categoryId}
                  onChange={e => setFormData({...formData, categoryId: e.target.value})}
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Price (₹)</label>
                <input 
                  type="number" 
                  placeholder="0.00" 
                  value={formData.price}
                  onChange={e => setFormData({...formData, price: e.target.value})}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Condition</label>
              <div className="condition-pills">
                {['New', 'Good', 'Fair', 'Poor'].map(c => (
                  <button
                    key={c}
                    type="button"
                    className={`condition-pill ${formData.condition === c ? 'active' : ''}`}
                    onClick={() => setFormData({...formData, condition: c})}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea 
                rows={4} 
                placeholder="Tell buyers about your item (usage time, flaws, etc.)"
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
              />
            </div>

            <button type="submit" className="submit-product-btn" disabled={isSubmitting}>
              {isSubmitting ? (
                <div className="auth-spinner" style={{ width: 18, height: 18, borderTopColor: 'white' }} />
              ) : (
                <>
                  <CheckCircle size={18} />
                  List Product for Sale
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
