import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Clock, Tag, UtensilsCrossed, Search, Leaf, Send, Truck, AlertTriangle, XCircle } from 'lucide-react';

const StatusBadge = ({ status }) => {
  const map = {
    available: 'badge-available',
    requested: 'bg-amber-100 text-amber-800 border-amber-300',
    claimed: 'badge-claimed',
    delivered: 'badge-delivered',
  };
  const label = {
    available: 'Available',
    requested: 'Requested by NGO',
    claimed: 'Delivery In-Progress',
    delivered: 'Delivered',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${map[status] || 'badge-delivered'}`}>
      <span className="w-2 h-2 rounded-full bg-current animate-pulse"></span>
      {label[status] || status}
    </span>
  );
};

const DietaryBadge = ({ type }) => {
  const isNonVeg = type === 'Non-Veg';
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-extrabold border ${
      isNonVeg ? 'bg-red-50 text-red-700 border-red-300' : 'bg-emerald-50 text-emerald-700 border-emerald-300'
    }`}>
      <span className={`w-2 h-2 rounded-full ${isNonVeg ? 'bg-red-600' : 'bg-emerald-600'}`}></span>
      {isNonVeg ? 'Non-Veg' : 'Pure Veg'}
    </span>
  );
};

// Component for Expiry Status & Visual Progress Bar
export const ExpiryProgress = ({ expiryTime, createdAt }) => {
  if (!expiryTime) return null;

  const now = Date.now();
  const expiry = new Date(expiryTime).getTime();
  const created = createdAt ? new Date(createdAt).getTime() : expiry - (4 * 3600 * 1000);

  const totalDuration = Math.max(1000, expiry - created);
  const timeLeft = expiry - now;
  const isExpired = timeLeft <= 0;

  // Percentage remaining (0 to 100)
  const percentLeft = isExpired ? 0 : Math.min(100, Math.max(0, (timeLeft / totalDuration) * 100));
  const isExpiringSoon = !isExpired && timeLeft <= 2 * 3600 * 1000; // < 2 hours

  // Helper to format exact date and time cleanly in local timezone
  const formatDateTime = (dateObj) => {
    if (!dateObj) return '';
    const d = new Date(dateObj);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString(undefined, {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Format relative time posted (e.g. "Just now", "15m ago", "2h ago")
  const formatPostedTime = (dateObj) => {
    if (!dateObj) return null;
    const pastMs = now - new Date(dateObj).getTime();
    if (pastMs < 0) return 'Just now';
    const mins = Math.floor(pastMs / (1000 * 60));
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ${mins % 60}m ago`;
    return `${days}d ago`;
  };

  // Format time remaining text
  const formatTimeLeft = (ms) => {
    if (ms <= 0) return 'Expired';
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${mins}m left`;
    return `${mins}m left`;
  };

  const formattedPosted = createdAt ? formatDateTime(createdAt) : null;
  const postedRelative = createdAt ? formatPostedTime(createdAt) : null;
  const formattedExpiry = formatDateTime(expiryTime);

  return (
    <div className="space-y-1.5 my-2.5">
      {/* Timestamps: Posted Time & Expiry Time */}
      <div className="flex flex-col gap-1 text-[11px]">
        {createdAt && (
          <div className="flex items-center justify-between text-slate-500 font-medium">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
              <span><strong className="text-slate-700">Posted:</strong> {formattedPosted}</span>
            </span>
            {postedRelative && (
              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">
                {postedRelative}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between font-bold">
          <span className="flex items-center gap-1 text-slate-700">
            <Clock className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
            <span><strong className="text-slate-800">Expires:</strong> {formattedExpiry}</span>
          </span>

          {isExpired ? (
            <span className="text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md flex items-center gap-1">
              <XCircle className="h-3 w-3" /> EXPIRED
            </span>
          ) : isExpiringSoon ? (
            <span className="text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1 animate-pulse">
              <AlertTriangle className="h-3 w-3 text-amber-600" /> {formatTimeLeft(timeLeft)} (Expiring Soon)
            </span>
          ) : (
            <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
              {formatTimeLeft(timeLeft)}
            </span>
          )}
        </div>
      </div>

      {/* Visual Progress Bar */}
      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/80">
        <div
          className={`h-full transition-all duration-500 rounded-full ${
            isExpired ? 'bg-red-500 w-0' :
            isExpiringSoon ? 'bg-gradient-to-r from-amber-500 to-red-500 animate-pulse' :
            'bg-gradient-to-r from-emerald-500 to-teal-500'
          }`}
          style={{ width: `${percentLeft}%` }}
        ></div>
      </div>
    </div>
  );
};

const FoodListings = () => {
  const [foods, setFoods] = useState([]);
  const [openDeliveries, setOpenDeliveries] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [activeTab, setActiveTab] = useState('all_foods');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dietaryFilter, setDietaryFilter] = useState('all');
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, [user?.role]);

  useEffect(() => {
    let result = foods;
    if (search) {
      result = result.filter(f =>
        f.foodType?.toLowerCase().includes(search.toLowerCase()) ||
        f.description?.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (statusFilter !== 'all') {
      result = result.filter(f => f.status === statusFilter);
    }
    if (dietaryFilter !== 'all') {
      result = result.filter(f => (f.dietaryType || 'Veg') === dietaryFilter);
    }
    setFiltered(result);
  }, [foods, search, statusFilter, dietaryFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const foodRes = await api.get('/foods');
      const foodData = Array.isArray(foodRes.data) ? foodRes.data : foodRes.data.data || [];
      setFoods(foodData);

      if (user?.role === 'partner') {
        const delRes = await api.get('/deliveries/open');
        setOpenDeliveries(Array.isArray(delRes.data) ? delRes.data : delRes.data.data || []);
      }
    } catch (err) {
      setError('Failed to load food listings');
    } finally {
      setLoading(false);
    }
  };

  const handleNgoRequestFood = async (foodId) => {
    try {
      setError('');
      setSuccessMsg('');
      await api.post('/deliveries/request', { foodListingId: foodId });
      setSuccessMsg('Food requested successfully! Delivery partners have been notified.');
      fetchData();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to request food delivery');
    }
  };

  const handlePartnerClaimDelivery = async (deliveryId) => {
    try {
      setError('');
      setSuccessMsg('');
      await api.put(`/deliveries/${deliveryId}/claim`);
      setSuccessMsg('Delivery claimed! Check your dashboard for delivery details and OTP input.');
      fetchData();
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to claim delivery');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="section-tag">
            <UtensilsCrossed className="h-3.5 w-3.5" />
            Food Share Network
          </div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>
            Available Surplus Food
          </h1>
          <p className="text-slate-500 mt-1 text-sm">Browse, filter, and request surplus food from restaurants & donors</p>
        </div>

        <div className="flex gap-3">
          {user?.role === 'partner' && (
            <button
              onClick={() => setActiveTab(activeTab === 'all_foods' ? 'open_requests' : 'all_foods')}
              className={`px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 border transition-all ${
                activeTab === 'open_requests'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                  : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50'
              }`}
            >
              <Truck className="h-4 w-4" />
              Open Delivery Requests ({openDeliveries.length})
            </button>
          )}

          {user?.role === 'donor' && (
            <Link to="/foods/create" className="btn-primary">
              + Post Food Donation
            </Link>
          )}
        </div>
      </div>

      {/* Messages */}
      {error && <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-2xl mb-6 text-sm">⚠ {error}</div>}
      {successMsg && <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-2xl mb-6 text-sm flex items-center gap-2">✅ {successMsg}</div>}

      {/* Filters */}
      {activeTab === 'all_foods' && (
        <div className="flex flex-col md:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search food type, restaurant or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-10"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field py-2 bg-white text-sm border-slate-200 w-auto"
            >
              <option value="all">All Status</option>
              <option value="available">Available</option>
              <option value="requested">Requested</option>
              <option value="claimed">Claimed</option>
              <option value="delivered">Delivered</option>
            </select>

            <select
              value={dietaryFilter}
              onChange={(e) => setDietaryFilter(e.target.value)}
              className="input-field py-2 bg-white text-sm border-slate-200 w-auto font-bold"
            >
              <option value="all">All Categories</option>
              <option value="Veg">🥬 Pure Veg</option>
              <option value="Non-Veg">🍗 Non-Veg</option>
            </select>
          </div>
        </div>
      )}

      {/* Content Area */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card overflow-hidden animate-pulse">
              <div className="w-full h-48 bg-slate-200"></div>
              <div className="p-5 space-y-3">
                <div className="h-5 bg-slate-200 rounded-lg w-2/3"></div>
                <div className="h-4 bg-slate-100 rounded-lg w-full"></div>
              </div>
            </div>
          ))}
        </div>
      ) : activeTab === 'open_requests' ? (
        /* Delivery Partner Open Requests View */
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-800">Open Delivery Requests (Waiting for Partners)</h2>
          {openDeliveries.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-300">
              <Truck className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-bold">No open delivery requests currently.</p>
              <p className="text-slate-400 text-sm">NGOs will submit requests when food is selected.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {openDeliveries.map((del) => {
                const isExpired = del.foodListingId?.expiryTime && new Date(del.foodListingId.expiryTime).getTime() <= Date.now();

                return (
                  <div key={del._id} className="card p-6 flex flex-col justify-between border-2 border-blue-100 bg-blue-50/20">
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-xs font-extrabold text-blue-700 bg-blue-100 px-3 py-1 rounded-full uppercase">
                          Open Request
                        </span>
                      </div>

                      <h3 className="font-bold text-lg text-slate-900 capitalize mb-1">
                        {del.foodListingId?.foodType || 'Food Package'}
                      </h3>
                      <p className="text-xs font-semibold text-slate-500 mb-2">
                        {del.foodListingId?.quantity} servings available
                      </p>

                      {/* Expiry Bar */}
                      <ExpiryProgress expiryTime={del.foodListingId?.expiryTime} createdAt={del.createdAt} />

                      <div className="space-y-2 text-xs border-t border-slate-200 pt-3 mb-4 mt-3">
                        <p><strong className="text-slate-700">NGO Requester:</strong> {del.ngoId?.name}</p>
                        {del.ngoId?.servingTarget && <p><strong className="text-slate-700">Serving:</strong> {del.ngoId?.servingTarget}</p>}
                        <p><strong className="text-slate-700">Pickup Donor:</strong> {del.foodListingId?.donorId?.name || 'Restaurant'}</p>
                        {del.foodListingId?.donorId?.address && <p><strong className="text-slate-700">Address:</strong> {del.foodListingId?.donorId?.address}</p>}
                      </div>
                    </div>

                    <button
                      disabled={isExpired}
                      onClick={() => handlePartnerClaimDelivery(del._id)}
                      className={`btn-primary w-full justify-center py-3 ${
                        isExpired
                          ? 'bg-slate-300 text-slate-500 border-slate-300 cursor-not-allowed shadow-none'
                          : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200'
                      }`}
                    >
                      <Truck className="h-4 w-4" /> {isExpired ? '🚫 Expired - Claim Disabled' : 'Claim & Deliver Now'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
          <UtensilsCrossed className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">No food listings found matching criteria</p>
        </div>
      ) : (
        /* Food Listings Grid */
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((food) => {
            const isExpired = food.expiryTime && new Date(food.expiryTime).getTime() <= Date.now();

            return (
              <div key={food._id} className="card overflow-hidden flex flex-col group border border-slate-100 hover:shadow-xl transition-all">
                {food.image ? (
                  <div className="relative overflow-hidden h-48">
                    <img
                      src={food.image}
                      alt={food.foodType}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 right-3 flex gap-2">
                      <DietaryBadge type={food.dietaryType} />
                      <StatusBadge status={food.status} />
                    </div>
                  </div>
                ) : (
                  <div className="relative w-full h-48 bg-gradient-to-br from-slate-100 to-green-50 flex items-center justify-center">
                    <div className="text-center">
                      <Leaf className="h-12 w-12 text-green-300 mx-auto mb-1" />
                      <span className="text-sm text-slate-600 font-bold capitalize">{food.foodType}</span>
                    </div>
                    <div className="absolute top-3 right-3 flex gap-2">
                      <DietaryBadge type={food.dietaryType} />
                      <StatusBadge status={food.status} />
                    </div>
                  </div>
                )}

                <div className="p-5 flex flex-col flex-grow">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="text-lg font-bold text-slate-900 capitalize">{food.foodType}</h3>
                  </div>

                  {/* Provider / Restaurant Donor Info */}
                  {food.donorId && (
                    <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-2.5 mb-3 text-xs">
                      <p className="font-bold text-slate-800">
                        🏪 {food.donorId.name} {food.donorId.businessType ? `(${food.donorId.businessType})` : ''}
                      </p>
                      {food.donorId.email && (
                        <p className="text-[11px] text-slate-600 mt-0.5 flex items-center gap-1">
                          ✉️ <strong className="text-slate-700">Email:</strong> {food.donorId.email}
                        </p>
                      )}
                      {food.donorId.phone && (
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          📞 <strong className="text-slate-700">Phone:</strong> {food.donorId.phone}
                        </p>
                      )}
                    </div>
                  )}

                  {food.description && <p className="text-slate-600 text-xs mb-3 leading-relaxed line-clamp-2">{food.description}</p>}

                  {/* Servings */}
                  <div className="flex items-center gap-2 text-xs text-slate-600 mb-2">
                    <Tag className="h-3.5 w-3.5 text-amber-600" />
                    <span><strong className="text-slate-800">{food.quantity}</strong> servings available</span>
                  </div>

                  {/* Visual Expiry Status & Progress Bar */}
                  <ExpiryProgress expiryTime={food.expiryTime} createdAt={food.createdAt} />

                  {/* Role Specific Actions */}
                  <div className="mt-auto pt-3">
                    {user?.role === 'ngo' && food.status === 'available' && (
                      <button
                        disabled={isExpired}
                        onClick={() => handleNgoRequestFood(food._id)}
                        className={`btn-primary w-full justify-center text-sm py-2.5 ${
                          isExpired
                            ? 'bg-slate-200 text-slate-400 border-slate-200 cursor-not-allowed shadow-none'
                            : 'bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-200'
                        }`}
                      >
                        <Send className="h-4 w-4" /> {isExpired ? '🚫 Expired - Request Disabled' : 'Request Food & Delivery'}
                      </button>
                    )}

                    {user?.role === 'ngo' && food.status !== 'available' && (
                      <div className="text-center py-2 px-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-700 font-bold">
                        {food.status === 'requested' ? '📌 Request Sent (Awaiting Delivery Partner)' : '🚚 Delivery In Progress'}
                      </div>
                    )}

                    {user?.role === 'partner' && food.status === 'available' && (
                      <div className="text-center py-2 px-3 rounded-xl bg-blue-50 border border-blue-100 text-xs text-blue-600 font-medium">
                        NGO must select & request food first to open delivery
                      </div>
                    )}

                    {!user && food.status === 'available' && (
                      <Link to="/login" className="btn-outline w-full justify-center text-xs py-2">
                        Sign in to Request Food
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FoodListings;
