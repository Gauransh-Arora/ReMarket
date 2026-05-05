import { useState, useEffect } from 'react';
import { X, Upload, CheckCircle } from 'lucide-react';
import { API_BASE } from '../context/AuthContext';
import './SellPanel.css'; // Reuse form styles

interface Category {
  id: number;
  name: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  condition: string;
  category: string;
  image_url?: string;
}

interface EditProductModalProps {
  product: Product;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditProductModal({ product, onClose, onSuccess }: EditProductModalProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState({
    name: product.name,
    description: product.description || '',
    price: product.price.toString(),
    categoryId: '', // Will be set after categories load
    condition: product.condition || 'Good'
  });
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(product.image_url ? `${API_BASE}${product.image_url}` : null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchCats = async () => {
      try {
        const res = await fetch(`${API_BASE}/categories`);
        const data = await res.json();
        if (res.ok) {
          setCategories(data.categories);
          // Match current product category name to ID
          const currentCat = data.categories.find((c: Category) => c.name === product.category);
          if (currentCat) {
            setFormData(prev => ({ ...prev, categoryId: currentCat.id.toString() }));
          }
        }
      } catch (err) {
        console.error('Failed to fetch categories', err);
      }
    };
    fetchCats();
  }, [product.category]);

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
      const res = await fetch(`${API_BASE}/products/${product.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`
        },
        body: data
      });

      if (res.ok) {
        onSuccess();
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to update product');
      }
    } catch (err) {
      console.error('Update error:', err);
      alert('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', padding: '0' }}>
        <div className="main-topbar" style={{ padding: '20px 30px', borderBottom: '1px solid var(--border-color)' }}>
          <div className="main-title-group" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div>
              <h1 className="main-title" style={{ fontSize: '20px' }}>Edit Listing</h1>
              <p className="main-subtitle">Update your product details</p>
            </div>
            <button onClick={onClose} className="back-btn-circle" style={{ background: 'var(--bg-page)' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="sell-form" style={{ padding: '30px', maxHeight: '80vh', overflowY: 'auto' }}>
          <div className="sell-form-grid">
            <div className="sell-image-section">
              <label className="image-upload-box" style={{ backgroundImage: preview ? `url(${preview})` : 'none', height: '240px' }}>
                {!preview && (
                  <div className="upload-placeholder">
                    <Upload size={32} strokeWidth={1.5} color="var(--text-muted)" />
                    <span>Upload Product Photo</span>
                  </div>
                )}
                <input type="file" accept="image/*" onChange={handleImageChange} hidden />
                {preview && <div className="change-image-overlay">Change Image</div>}
              </label>
            </div>

            <div className="sell-details-section">
              <div className="form-group">
                <label>Product Name</label>
                <input 
                  type="text" 
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
                  rows={3} 
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
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
