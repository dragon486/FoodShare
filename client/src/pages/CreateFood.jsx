import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { PlusCircle, ArrowLeft, UtensilsCrossed, Clock, Leaf, Plus, Trash2, Image } from 'lucide-react';

const toISOFromLocalInput = (localStr) => {
  if (!localStr) return null;
  const d = new Date(localStr);
  return isNaN(d.getTime()) ? null : d.toISOString();
};

const formatForDateTimeInput = (d) => {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const CreateFood = () => {
  const now = new Date();
  const defaultMinDateTime = formatForDateTimeInput(now);
  // Default expiry date & time is set to 4 hours in the future from creation time
  const defaultExpiryDateTime = formatForDateTimeInput(new Date(now.getTime() + 4 * 60 * 60 * 1000));

  // Multiple items state: EACH item has its OWN Dietary Category (Pure Veg / Non-Veg), Name, Qty, Description, Expiry, & Photo!
  const [items, setItems] = useState([
    { name: '', quantity: '', dietaryType: 'Veg', description: '', expiryTime: defaultExpiryDateTime, image: '' }
  ]);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  if (user?.role !== 'donor') {
    return (
      <div className="max-w-md mx-auto text-center py-24 px-4">
        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <UtensilsCrossed className="h-8 w-8 text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Access Denied</h2>
        <p className="text-slate-500 mb-6">Only donors can post food listings.</p>
        <Link to="/dashboard" className="btn-primary">Back to Dashboard</Link>
      </div>
    );
  }

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const addItemRow = () => {
    setItems([...items, { name: '', quantity: '', dietaryType: 'Veg', description: '', expiryTime: defaultExpiryDateTime, image: '' }]);
  };

  const removeItemRow = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const validItems = items.filter(it => it.name && it.quantity);

      if (validItems.length === 0) {
        setError('Please add at least one food item with name and quantity.');
        setLoading(false);
        return;
      }

      // Auto calculate total quantity from items
      const totalQty = validItems.reduce((acc, curr) => acc + Number(curr.quantity || 0), 0);

      // Earliest item expiry
      const itemExpiries = validItems.map(i => i.expiryTime).filter(Boolean);
      const overallExpiry = itemExpiries.length > 0 ? itemExpiries.sort()[0] : defaultExpiryDateTime;

      // Auto cover image from first item with image
      const coverImage = validItems.find(i => i.image)?.image || '';

      // Primary title from first item
      const mainTitle = validItems[0].name;

      const payload = {
        foodType: mainTitle,
        dietaryType: validItems[0].dietaryType || 'Veg',
        quantity: totalQty,
        expiryTime: toISOFromLocalInput(overallExpiry),
        image: coverImage,
        description: validItems.map(i => `${i.name} (${i.quantity} servings)`).join(' | '),
        items: validItems.map(it => ({
          ...it,
          quantity: Number(it.quantity),
          expiryTime: toISOFromLocalInput(it.expiryTime)
        }))
      };

      await api.post('/foods', payload);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to post food listing');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-green-600 font-medium mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Dashboard
      </Link>

      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-200">
          <PlusCircle className="h-7 w-7 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>
            Post Food Donation
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Add individual food items, selecting Pure Veg or Non-Veg for each dish</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 sm:p-8">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl mb-6 text-sm flex items-center gap-2">
                <span>⚠</span> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Food Items & Details</h3>
                  <p className="text-xs text-slate-500">Add each dish with its own category (Veg/Non-Veg), servings, expiry time, & photo</p>
                </div>
                <button
                  type="button"
                  onClick={addItemRow}
                  className="text-xs font-bold text-green-600 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-xl flex items-center gap-1 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Item
                </button>
              </div>

              {/* Items List */}
              <div className="space-y-6">
                {items.map((item, idx) => (
                  <div key={idx} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 relative">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Item #{idx + 1}</span>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItemRow(idx)}
                          className="text-red-500 hover:text-red-700 p-1 text-xs font-bold flex items-center gap-1"
                        >
                          <Trash2 className="h-4 w-4" /> Remove Item
                        </button>
                      )}
                    </div>

                    {/* Per-Item Veg / Non-Veg Selection */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1.5">Dietary Category</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => handleItemChange(idx, 'dietaryType', 'Veg')}
                          className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border-2 font-bold text-xs transition-all ${
                            item.dietaryType === 'Veg'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-500 ring-2 ring-emerald-200'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300'
                          }`}
                        >
                          <span className="w-3 h-3 rounded-full bg-emerald-600 flex-shrink-0"></span>
                          <span>Pure Veg 🥬</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleItemChange(idx, 'dietaryType', 'Non-Veg')}
                          className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border-2 font-bold text-xs transition-all ${
                            item.dietaryType === 'Non-Veg'
                              ? 'bg-red-50 text-red-800 border-red-500 ring-2 ring-red-200'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-red-300'
                          }`}
                        >
                          <span className="w-3 h-3 rounded-full bg-red-600 flex-shrink-0"></span>
                          <span>Non-Veg 🍗</span>
                        </button>
                      </div>
                    </div>

                    {/* Item Name & Servings Qty */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="text-[11px] font-bold text-slate-600">Item Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Ajwa Chicken Biryani / Paneer Butter Masala"
                          value={item.name}
                          onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                          className="input-field text-sm bg-white"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-600">Servings Qty</label>
                        <input
                          type="number"
                          placeholder="e.g. 80"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                          className="input-field text-sm bg-white"
                          min="1"
                          required
                        />
                      </div>
                    </div>

                    {/* Item Description & Expiry Date */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-600">Item Description / Notes</label>
                        <input
                          type="text"
                          placeholder="e.g. Cooked 2 hours ago, includes raita & salan"
                          value={item.description}
                          onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                          className="input-field text-sm bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-blue-600" /> Expiry Date & Time
                        </label>
                        <input
                          type="datetime-local"
                          value={item.expiryTime || defaultExpiryDateTime}
                          onChange={(e) => handleItemChange(idx, 'expiryTime', e.target.value)}
                          className="input-field text-sm bg-white py-2"
                          min={defaultMinDateTime}
                          required
                        />
                      </div>
                    </div>

                    {/* Item Photo URL */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                        <Image className="h-3.5 w-3.5 text-slate-400" /> Photo URL
                      </label>
                      <input
                        type="url"
                        placeholder="https://images.unsplash.com/photo-..."
                        value={item.image}
                        onChange={(e) => handleItemChange(idx, 'image', e.target.value)}
                        className="input-field text-sm bg-white"
                      />

                      {/* Live Image Preview */}
                      {item.image && (
                        <div className="mt-2.5">
                          <p className="text-[10px] font-bold text-slate-500 mb-1">Live Photo Preview:</p>
                          <div className="h-32 w-48 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shadow-sm">
                            <img
                              src={item.image}
                              alt={item.name || 'Item'}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400';
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full justify-center text-base py-3.5 shadow-lg shadow-green-200"
              >
                {loading ? (
                  <span>Posting Food Donation...</span>
                ) : (
                  <><PlusCircle className="h-5 w-5" /> Submit Food Donation</>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-green-50 to-teal-50 border border-green-100 rounded-3xl p-6">
            <div className="w-10 h-10 bg-green-100 rounded-2xl flex items-center justify-center mb-4">
              <Leaf className="h-5 w-5 text-green-600" />
            </div>
            <h3 className="font-bold text-slate-800 mb-3 text-sm">Per-Item Customization</h3>
            <ul className="space-y-2.5 text-xs text-slate-600">
              {[
                'Select Pure Veg 🥬 or Non-Veg 🍗 individually for each item',
                'Specify individual quantities, descriptions, and expiry times',
                'Each dish appears as its own standalone food listing for NGOs',
                'Live photo previews render instantly for every item URL',
              ].map((tip, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-green-500 text-white text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">
                    {i + 1}
                  </span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateFood;
