import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Link } from 'react-router-dom';
import { ExpiryProgress } from './FoodListings';
import {
  Package, Truck, CheckCircle, Clock, PlusCircle,
  UtensilsCrossed, Star, ArrowRight, Eye, Edit, Trash2,
  Lock, Phone, MapPin, X, Building, User
} from 'lucide-react';

const StatCard = ({ icon: Icon, label, value, color, bg }) => (
  <div className="card p-6 flex items-center gap-4 border border-slate-100">
    <div className={`w-12 h-12 rounded-2xl ${bg} flex items-center justify-center flex-shrink-0`}>
      <Icon className={`h-5 w-5 ${color}`} />
    </div>
    <div>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-slate-900 mt-0.5" style={{ fontFamily: 'Sora, sans-serif' }}>{value}</p>
    </div>
  </div>
);

const StatusBadge = ({ status }) => {
  const map = {
    available: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    requested: 'bg-amber-100 text-amber-800 border-amber-300',
    open: 'bg-blue-100 text-blue-800 border-blue-300',
    claimed: 'bg-purple-100 text-purple-800 border-purple-300',
    pending: 'bg-purple-100 text-purple-800 border-purple-300',
    completed: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    delivered: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  };
  const label = {
    open: 'Open Request',
    claimed: 'Claimed (In-Transit)',
    completed: 'Delivered & Received',
    delivered: 'Delivered',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${map[status] || 'bg-slate-100 text-slate-700'}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
      {label[status] || status}
    </span>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modals state
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [ratingDelivery, setRatingDelivery] = useState(null);
  const [editingFood, setEditingFood] = useState(null);

  // Form states
  const [otpInputs, setOtpInputs] = useState({});
  const [ratings, setRatings] = useState({ partnerRating: 5, partnerFeedback: '', donorRating: 5, donorFeedback: '' });
  const [editFormData, setEditFormData] = useState({ foodType: '', quantity: '', description: '', dietaryType: 'Veg', expiryTime: '', image: '' });

  useEffect(() => { fetchDashboardData(); }, [user.role]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      if (user.role === 'donor') {
        const response = await api.get('/foods');
        const foods = Array.isArray(response.data) ? response.data : response.data.data || [];
        setData(foods.filter(f => {
          const donorId = typeof f.donorId === 'object' ? f.donorId?._id : f.donorId;
          return donorId === user._id;
        }));
      } else {
        const response = await api.get('/deliveries/my-deliveries');
        const deliveries = Array.isArray(response.data) ? response.data : response.data.data || [];
        setData(deliveries);
      }
    } catch (err) {
      setError('Failed to load dashboard data');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (deliveryId) => {
    const otp = otpInputs[deliveryId];
    if (!otp) return alert('Please enter the 4-digit OTP provided by the NGO');
    try {
      setError('');
      await api.put(`/deliveries/${deliveryId}/verify-otp`, { otp });
      setSuccessMsg('OTP verified successfully! Delivery completed.');
      fetchDashboardData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      alert(err.response?.data?.message || 'Incorrect OTP code');
    }
  };

  const toLocalInputFromISO = (isoStr) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '';
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };

  const toISOFromLocalInput = (localStr) => {
    if (!localStr) return null;
    const d = new Date(localStr);
    return isNaN(d.getTime()) ? null : d.toISOString();
  };

  const handleStartEdit = (food) => {
    const expiry = food.expiryTime ? toLocalInputFromISO(food.expiryTime) : '';
    setEditingFood(food);
    setEditFormData({
      foodType: food.foodType || '',
      quantity: food.quantity || '',
      description: food.description || '',
      dietaryType: food.dietaryType || 'Veg',
      expiryTime: expiry,
      image: food.image || ''
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...editFormData,
        expiryTime: editFormData.expiryTime ? toISOFromLocalInput(editFormData.expiryTime) : undefined
      };
      await api.put(`/foods/${editingFood._id}`, payload);
      setSuccessMsg('Food posting updated successfully!');
      setEditingFood(null);
      fetchDashboardData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update food listing');
    }
  };

  const handleDeleteFood = async (foodId) => {
    if (!window.confirm('Are you sure you want to delete this food posting?')) return;
    try {
      await api.delete(`/foods/${foodId}`);
      setSuccessMsg('Food posting deleted successfully!');
      fetchDashboardData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete food listing');
    }
  };

  const handleSubmitRating = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/deliveries/${ratingDelivery._id}/rate`, ratings);
      setSuccessMsg('Thank you! Ratings submitted successfully.');
      setRatingDelivery(null);
      fetchDashboardData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit ratings');
    }
  };

  const [filterTab, setFilterTab] = useState('all'); // 'all', 'active', 'completed'

  const totalItems = data.length;
  const activeItems = data.filter(d => ['available', 'requested', 'open', 'claimed', 'pending'].includes(d.status)).length;
  const completedItems = data.filter(d => ['delivered', 'completed'].includes(d.status)).length;

  const filteredData = data.filter(item => {
    if (filterTab === 'active') return ['available', 'requested', 'open', 'claimed', 'pending'].includes(item.status);
    if (filterTab === 'completed') return ['delivered', 'completed'].includes(item.status);
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-8 mb-8 shadow-2xl">
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center shadow-lg">
              {user.role === 'donor' ? <UtensilsCrossed className="h-8 w-8 text-white" /> :
               user.role === 'partner' ? <Truck className="h-8 w-8 text-white" /> :
               <Package className="h-8 w-8 text-white" />}
            </div>
            <div>
              <p className="text-slate-400 text-sm font-medium">Welcome back,</p>
              <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>{user.name}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full bg-green-500/20 text-green-300 border border-green-500/30 capitalize">
                  {user.role} Dashboard
                </span>
                <span className="text-xs text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded-md border border-amber-500/30 font-bold flex items-center gap-1">
                  <Star className="h-3 w-3 fill-amber-300 text-amber-300" />
                  {user.rating?.toFixed(1) || '5.0'} / 5.0 ({user.ratingCount || 0} reviews)
                </span>
                {user.servingTarget && (
                  <span className="text-xs text-slate-300 bg-slate-800 px-2.5 py-0.5 rounded-md border border-slate-700">
                    Serving: {user.servingTarget}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Link to="/profile" className="btn-outline border-slate-600 text-slate-200 hover:bg-slate-800">
              <User className="h-4 w-4" /> View / Edit Profile
            </Link>
            {user.role === 'donor' && (
              <Link to="/foods/create" className="btn-primary">
                <PlusCircle className="h-4 w-4" /> Post New Food
              </Link>
            )}
            {(user.role === 'partner' || user.role === 'ngo') && (
              <Link to="/foods" className="btn-primary">
                <ArrowRight className="h-4 w-4" /> Browse Food Listings
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard icon={Package} label="Total Records" value={totalItems} color="text-slate-600" bg="bg-slate-100" />
        <StatCard icon={Clock} label="Active In-Progress" value={activeItems} color="text-amber-600" bg="bg-amber-50" />
        <StatCard icon={CheckCircle} label="Completed & Received" value={completedItems} color="text-emerald-600" bg="bg-emerald-50" />
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-2xl mb-6 text-sm">{error}</div>}
      {successMsg && <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-2xl mb-6 text-sm flex items-center gap-2">✅ {successMsg}</div>}

      {/* Data Section */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>
              {user.role === 'donor' ? 'Your Food Postings' : user.role === 'partner' ? 'Your Deliveries' : 'Requested Food Deliveries'}
            </h2>
            <p className="text-slate-500 text-sm mt-0.5">
              Manage status, view food details, expiry status bar, and view completed history
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-2xl gap-1 self-start md:self-auto">
            <button
              onClick={() => setFilterTab('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterTab === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Deliveries ({totalItems})
            </button>
            <button
              onClick={() => setFilterTab('active')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterTab === 'active' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              In-Progress ({activeItems})
            </button>
            <button
              onClick={() => setFilterTab('completed')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterTab === 'completed' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Completed ({completedItems})
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse"></div>
            ))}
          </div>
        ) : filteredData.length === 0 ? (
          <div className="p-16 text-center">
            <Package className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-slate-700 font-bold mb-1">No items found</h3>
            <p className="text-slate-400 text-sm mb-4">No deliveries found under the selected filter.</p>
            <Link to={user.role === 'donor' ? '/foods/create' : '/foods'} className="btn-primary">
              Get Started
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredData.map((item) => {
              const isFoodItem = user.role === 'donor';
              const food = isFoodItem ? item : item.foodListingId;
              const delivery = isFoodItem ? null : item;

              return (
                <div key={item._id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors">
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    {/* Food Image Thumbnail */}
                    {food?.image || food?.items?.[0]?.image ? (
                      <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0 shadow-sm">
                        <img
                          src={food?.image || food?.items?.[0]?.image}
                          alt={food?.foodType || 'Food'}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300';
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center flex-shrink-0 font-bold text-xl text-slate-700 border border-slate-200">
                        {isFoodItem ? (food?.dietaryType === 'Non-Veg' ? '🍗' : '🥬') : '📦'}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {!isFoodItem ? (
                          <button
                            onClick={() => setSelectedDelivery(delivery)}
                            className="font-bold text-green-700 hover:underline flex items-center gap-1 text-sm bg-green-50 px-2.5 py-0.5 rounded-lg border border-green-200"
                          >
                            <Eye className="h-3.5 w-3.5" /> Delivery #{delivery._id.slice(-6).toUpperCase()}
                          </button>
                        ) : (
                          <h4 className="font-bold text-slate-900 text-base capitalize">{food?.foodType}</h4>
                        )}

                        <StatusBadge status={item.status} />
                      </div>

                      <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                        <p><strong className="text-slate-700">Food Item:</strong> {food?.foodType} ({food?.quantity} servings)</p>

                        {!isFoodItem && delivery?.foodListingId?.donorId && (
                          <p><strong className="text-slate-700">Restaurant Provider:</strong> {delivery.foodListingId.donorId.name} ({delivery.foodListingId.donorId.email})</p>
                        )}
                        {!isFoodItem && delivery?.partnerId && (
                          <p><strong className="text-slate-700">Delivery Partner:</strong> {delivery.partnerId?.name} ({delivery.partnerId?.phone})</p>
                        )}
                        {!isFoodItem && delivery?.ngoId && (
                          <p><strong className="text-slate-700">NGO Requester:</strong> {delivery.ngoId?.name}</p>
                        )}
                      </div>

                      {/* Visual Expiry Progress Bar */}
                      <div className="max-w-md mt-2">
                        <ExpiryProgress expiryTime={food?.expiryTime} createdAt={food?.createdAt || item.createdAt} />
                      </div>
                    </div>
                  </div>

                  {/* Actions & Verification */}
                  <div className="flex flex-col sm:flex-row items-center gap-3 flex-shrink-0">
                    {/* NGO View OTP Code & Rate Action */}
                    {user.role === 'ngo' && delivery && (
                      <div className="flex items-center gap-2">
                        {delivery.status !== 'completed' && (
                          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5">
                            <Lock className="h-3.5 w-3.5 text-amber-600" />
                            <span>OTP: <strong className="text-base text-amber-900">{delivery.otp}</strong></span>
                          </div>
                        )}

                        <button
                          onClick={() => setSelectedDelivery(delivery)}
                          className="btn-outline text-xs py-1.5 px-3"
                        >
                          <Eye className="h-3.5 w-3.5" /> View Details
                        </button>

                        {delivery.status === 'completed' && (
                          delivery.partnerRating > 0 || delivery.donorRating > 0 ? (
                            <span className="bg-amber-50 text-amber-800 border border-amber-200 text-xs px-3 py-1.5 rounded-xl font-bold flex items-center gap-1">
                              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                              Rated ({delivery.partnerRating}/5 Partner, {delivery.donorRating}/5 Donor)
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                setRatingDelivery(delivery);
                                setRatings({
                                  partnerRating: 5,
                                  partnerFeedback: '',
                                  donorRating: 5,
                                  donorFeedback: ''
                                });
                              }}
                              className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs py-1.5 px-3 rounded-xl flex items-center gap-1 shadow-sm"
                            >
                              <Star className="h-3.5 w-3.5 fill-current" />
                              Rate Partner & Donor
                            </button>
                          )
                        )}
                      </div>
                    )}

                    {/* Delivery Partner OTP Submission */}
                    {user.role === 'partner' && delivery && delivery.status === 'claimed' && (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Enter NGO OTP"
                          maxLength="4"
                          value={otpInputs[delivery._id] || ''}
                          onChange={(e) => setOtpInputs({ ...otpInputs, [delivery._id]: e.target.value })}
                          className="w-28 input-field text-center font-mono font-bold tracking-widest text-sm py-1.5"
                        />
                        <button
                          onClick={() => handleVerifyOtp(delivery._id)}
                          className="btn-primary text-xs py-2 px-3 bg-emerald-600 hover:bg-emerald-700"
                        >
                          Verify OTP
                        </button>
                      </div>
                    )}

                    {/* Donor Edit & Delete Actions */}
                    {user.role === 'donor' && isFoodItem && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleStartEdit(food)}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1"
                        >
                          <Edit className="h-3.5 w-3.5 text-blue-600" /> Edit
                        </button>
                        <button
                          onClick={() => handleDeleteFood(food._id)}
                          className="px-3 py-1.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs flex items-center gap-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 1. DELIVERY DETAILS MODAL */}
      {selectedDelivery && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedDelivery(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center text-green-700">
                <Package className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Delivery Information</h3>
                <p className="text-xs text-slate-500">ID: {selectedDelivery._id}</p>
              </div>
            </div>

            {/* OTP Alert Box */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-4 rounded-2xl text-center shadow-lg">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-100">Verification OTP for Delivery Guy</p>
              <p className="text-4xl font-extrabold tracking-widest mt-1" style={{ fontFamily: 'Sora, sans-serif' }}>
                {selectedDelivery.otp || 'N/A'}
              </p>
              <p className="text-[11px] text-amber-100 mt-1">Provide this code to the delivery partner when food arrives</p>
            </div>

            {/* Food Info */}
            <div className="bg-slate-50 p-4 rounded-2xl space-y-2 border border-slate-100">
              <h4 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                <UtensilsCrossed className="h-4 w-4 text-green-600" /> Food Details
              </h4>
              <p className="text-xs text-slate-600"><strong>Listing Title:</strong> {selectedDelivery.foodListingId?.foodType}</p>
              <p className="text-xs text-slate-600"><strong>Quantity:</strong> {selectedDelivery.foodListingId?.quantity} servings</p>
              <p className="text-xs text-slate-600"><strong>Dietary Type:</strong> {selectedDelivery.foodListingId?.dietaryType || 'Veg'}</p>

              {/* Expiry Bar in Modal */}
              <div className="pt-2">
                <ExpiryProgress expiryTime={selectedDelivery.foodListingId?.expiryTime} createdAt={selectedDelivery.createdAt} />
              </div>
            </div>

            {/* Donor Restaurant Info */}
            <div className="bg-slate-50 p-4 rounded-2xl space-y-2 border border-slate-100">
              <h4 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                <Building className="h-4 w-4 text-amber-600" /> Restaurant / Donor Provider Details
              </h4>
              <p className="text-xs text-slate-600"><strong>Name:</strong> {selectedDelivery.foodListingId?.donorId?.name || 'Donor'} {selectedDelivery.foodListingId?.donorId?.businessType ? `(${selectedDelivery.foodListingId?.donorId?.businessType})` : ''}</p>
              <p className="text-xs text-slate-600"><strong>Email:</strong> {selectedDelivery.foodListingId?.donorId?.email || 'N/A'}</p>
              <p className="text-xs text-slate-600"><strong>Phone:</strong> {selectedDelivery.foodListingId?.donorId?.phone || 'N/A'}</p>
              <p className="text-xs text-slate-600"><strong>Address:</strong> {selectedDelivery.foodListingId?.donorId?.address || 'N/A'}</p>
            </div>

            {/* Delivery Partner Info */}
            <div className="bg-slate-50 p-4 rounded-2xl space-y-2 border border-slate-100">
              <h4 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                <Truck className="h-4 w-4 text-blue-600" /> Delivery Partner Details
              </h4>
              {selectedDelivery.partnerId ? (
                <>
                  <p className="text-xs text-slate-600"><strong>Name:</strong> {selectedDelivery.partnerId?.name}</p>
                  <p className="text-xs text-slate-600"><strong>Phone:</strong> {selectedDelivery.partnerId?.phone}</p>
                  <p className="text-xs text-slate-600"><strong>Vehicle:</strong> {selectedDelivery.partnerId?.vehicleType || 'Standard Vehicle'}</p>
                  <p className="text-xs text-slate-600 flex items-center gap-1">
                    <strong>Rating:</strong> ⭐ {selectedDelivery.partnerId?.rating?.toFixed(1) || '5.0'}
                  </p>
                </>
              ) : (
                <p className="text-xs text-amber-600 font-semibold">⏳ Waiting for a delivery partner to claim this open request...</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. DUAL RATING MODAL FOR NGO */}
      {ratingDelivery && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 relative">
            <button
              onClick={() => setRatingDelivery(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="h-5 w-5" />
            </button>

            <div>
              <h3 className="text-xl font-bold text-slate-900">Rate Delivery & Donor</h3>
              <p className="text-xs text-slate-500">Provide ratings for both the delivery partner and food donor</p>
            </div>

            <form onSubmit={handleSubmitRating} className="space-y-4">
              <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                <label className="label text-blue-900 font-bold">1. Rate Delivery Partner ({ratingDelivery.partnerId?.name || 'Partner'})</label>
                <div className="flex gap-2 my-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRatings({ ...ratings, partnerRating: star })}
                      className="text-2xl transition-transform hover:scale-125"
                    >
                      <Star className={`h-6 w-6 ${star <= ratings.partnerRating ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`} />
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Feedback for delivery partner (optional)"
                  value={ratings.partnerFeedback}
                  onChange={(e) => setRatings({ ...ratings, partnerFeedback: e.target.value })}
                  className="input-field text-xs bg-white mt-2"
                />
              </div>

              <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100">
                <label className="label text-amber-900 font-bold">2. Rate Restaurant Donor ({ratingDelivery.foodListingId?.donorId?.name || 'Donor'})</label>
                <div className="flex gap-2 my-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRatings({ ...ratings, donorRating: star })}
                      className="text-2xl transition-transform hover:scale-125"
                    >
                      <Star className={`h-6 w-6 ${star <= ratings.donorRating ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`} />
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Feedback for restaurant donor (optional)"
                  value={ratings.donorFeedback}
                  onChange={(e) => setRatings({ ...ratings, donorFeedback: e.target.value })}
                  className="input-field text-xs bg-white mt-2"
                />
              </div>

              <button type="submit" className="btn-primary w-full justify-center py-3">
                Submit Ratings
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 3. EDIT FOOD MODAL FOR DONOR */}
      {editingFood && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setEditingFood(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-xl font-bold text-slate-900">Edit Food Listing</h3>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-sm">
              <div>
                <label className="label">Dietary Category</label>
                <select
                  value={editFormData.dietaryType}
                  onChange={(e) => setEditFormData({ ...editFormData, dietaryType: e.target.value })}
                  className="input-field"
                >
                  <option value="Veg">Pure Veg 🥬</option>
                  <option value="Non-Veg">Non-Veg 🍗</option>
                </select>
              </div>

              <div>
                <label className="label">Food Title / Type</label>
                <input
                  type="text"
                  value={editFormData.foodType}
                  onChange={(e) => setEditFormData({ ...editFormData, foodType: e.target.value })}
                  className="input-field"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Quantity (Servings)</label>
                  <input
                    type="number"
                    value={editFormData.quantity}
                    onChange={(e) => setEditFormData({ ...editFormData, quantity: Number(e.target.value) })}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="label">Expiry Time</label>
                  <input
                    type="datetime-local"
                    value={editFormData.expiryTime}
                    onChange={(e) => setEditFormData({ ...editFormData, expiryTime: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="label">Description</label>
                <textarea
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  className="input-field"
                  rows="3"
                ></textarea>
              </div>

              <button type="submit" className="btn-primary w-full justify-center py-3">
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
