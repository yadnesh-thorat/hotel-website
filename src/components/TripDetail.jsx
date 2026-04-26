import React, { useState } from 'react';
import { ArrowLeft, Plus, DollarSign, Image as ImageIcon, MapPin, Calendar, Check, Trash2, Info, Hotel, X, Search, Star, Loader2 } from 'lucide-react';

export default function TripDetail({ trip, onBack, onUpdateTrip }) {
  if (!trip) return null;

  const [activeTab, setActiveTab] = useState('expenses');
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCat, setExpenseCat] = useState('food');
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  
  // Hotel Booking State
  const [searchCity, setSearchCity] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [bookingStatus, setBookingStatus] = useState({ loading: false, success: null });
  const [selectedHotelForDetails, setSelectedHotelForDetails] = useState(null);
  const [hotelDetailsLoading, setHotelDetailsLoading] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || '/api';

  const addExpense = (e) => {
    e.preventDefault();
    if (expenseDesc && expenseAmount) {
      const newExp = {
        id: Date.now().toString(),
        description: expenseDesc,
        amount: parseFloat(expenseAmount),
        category: expenseCat,
        date: new Date().toISOString()
      };
      
      const updatedTrip = {
        ...trip,
        expenses: [...(trip.expenses || []), newExp]
      };
      
      onUpdateTrip(updatedTrip);
      setExpenseDesc('');
      setExpenseAmount('');
    }
  };

  const deleteExpense = (id) => {
    const updatedTrip = {
      ...trip,
      expenses: (trip.expenses || []).filter(ex => ex.id !== id)
    };
    onUpdateTrip(updatedTrip);
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        const updatedTrip = {
          ...trip,
          photos: [...(trip.photos || []), base64String]
        };
        onUpdateTrip(updatedTrip);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = (idx) => {
    const newPhotos = [...(trip.photos || [])];
    newPhotos.splice(idx, 1);
    onUpdateTrip({ ...trip, photos: newPhotos });
  };

  const handleSearchHotels = async (e) => {
    e.preventDefault();
    if (!searchCity.trim()) return;
    
    setIsSearching(true);
    setSearchResults([]);
    try {
      const response = await fetch(`${API_URL}/hotels?city=${encodeURIComponent(searchCity)}`);
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleBookHotel = async (hotel) => {
    setBookingStatus({ loading: true, success: null });
    try {
      const response = await fetch(`${API_URL}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'current-user',
          hotelId: hotel.id,
          hotelName: hotel.name,
          price: hotel.price,
          tripId: trip.id
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setBookingStatus({ loading: false, success: true });
        
        // Update local trip state with new booking
        const updatedTrip = {
          ...trip,
          bookings: [...(trip.bookings || []), data.booking]
        };
        onUpdateTrip(updatedTrip);
        
        // Clear search results after short delay
        setTimeout(() => {
          setSearchResults([]);
          setSearchCity('');
          setBookingStatus({ loading: false, success: null });
        }, 2000);
      } else {
        throw new Error(data.error || 'Booking failed');
      }
    } catch (error) {
      console.error('Booking failed:', error);
      setBookingStatus({ loading: false, success: false });
      alert('Booking failed: ' + error.message);
    }
  };

  const handleViewHotelDetails = async (hotel) => {
    setSelectedHotelForDetails(hotel);
    setHotelDetailsLoading(true);
    try {
      // We'll call the chat API or a dedicated AI route to get details
      const response = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Give me a 3-sentence luxury description and 5 bullet point amenities for ${hotel.name} in ${searchCity}.`,
          history: []
        })
      });
      const data = await response.json();
      setSelectedHotelForDetails(prev => ({ ...prev, richDetails: data.reply }));
    } catch (error) {
      console.error('Failed to fetch hotel details:', error);
    } finally {
      setHotelDetailsLoading(false);
    }
  };

  const safeExpenses = trip.expenses || [];
  const safePhotos = trip.photos || [];
  
  const totalExpense = safeExpenses.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);

  const categories = ['food', 'transport', 'hotel', 'shopping', 'other'];

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
      <button onClick={onBack} className="btn" style={{ padding: '0.5rem', background: 'transparent', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--text-muted)' }}>
        <ArrowLeft size={20} /> Back to Dashboard
      </button>

      {/* Trip Header */}
      <div className="glass-panel trip-header-card" style={{ marginBottom: '2rem', borderRadius: 'var(--radius-lg)' }}>
        <div className="trip-header-info">
          <div>
            <h1 style={{ marginBottom: '0.5rem', background: 'linear-gradient(135deg, var(--color-primary-start), var(--color-secondary))', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {trip.name}
            </h1>
            <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <MapPin size={18} /> {trip.destination}
            </p>
            <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
              <Calendar size={18} /> {new Date(trip.startDate).toLocaleDateString()} {trip.endDate ? `- ${new Date(trip.endDate).toLocaleDateString()}` : '- Ongoing'}
            </p>
            {trip.description && <p style={{ marginTop: '1rem', maxWidth: '600px' }}>{trip.description}</p>}
          </div>

          <div className="stat-box" style={{ padding: '1.5rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 'var(--radius-lg)', textAlign: 'center', minWidth: '150px' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Total Spent</p>
            <h2 style={{ color: 'var(--color-success)', margin: 0, fontSize: '2rem' }}>
              {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(parseFloat(totalExpense) || 0)}
            </h2>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-group">
        <button 
          onClick={() => setActiveTab('details')} 
          className="btn" 
          style={{ 
            background: activeTab === 'details' ? 'var(--color-primary-start)' : 'transparent', 
            color: activeTab === 'details' ? 'white' : 'var(--text-main)',
            boxShadow: activeTab === 'details' ? '0 4px 15px rgba(99, 102, 241, 0.4)' : 'none'
          }}
        >
          <Info size={18} /> Details
        </button>
        <button 
          onClick={() => setActiveTab('expenses')} 
          className="btn" 
          style={{ 
            background: activeTab === 'expenses' ? 'var(--color-primary-start)' : 'transparent', 
            color: activeTab === 'expenses' ? 'white' : 'var(--text-main)',
            boxShadow: activeTab === 'expenses' ? '0 4px 15px rgba(99, 102, 241, 0.4)' : 'none'
          }}
        >
          <DollarSign size={18} /> Expenses
        </button>
        <button 
          onClick={() => setActiveTab('photos')} 
          className="btn" 
          style={{ 
            background: activeTab === 'photos' ? 'var(--color-secondary)' : 'transparent', 
            color: activeTab === 'photos' ? 'white' : 'var(--text-main)',
            boxShadow: activeTab === 'photos' ? '0 4px 15px rgba(236, 72, 153, 0.4)' : 'none'
          }}
        >
          <ImageIcon size={18} /> Photos
        </button>
        <button 
          onClick={() => setActiveTab('bookings')} 
          className="btn" 
          style={{ 
            background: activeTab === 'bookings' ? 'var(--color-primary-start)' : 'transparent', 
            color: activeTab === 'bookings' ? 'white' : 'var(--text-main)',
            boxShadow: activeTab === 'bookings' ? '0 4px 15px rgba(99, 102, 241, 0.4)' : 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Hotel size={18} /> Bookings
          {trip.bookings && trip.bookings.length > 0 && (
            <span style={{ 
              background: activeTab === 'bookings' ? 'white' : 'var(--color-primary-start)', 
              color: activeTab === 'bookings' ? 'var(--color-primary-start)' : 'white', 
              fontSize: '0.7rem', 
              padding: '0.1rem 0.4rem', 
              borderRadius: 'var(--radius-full)',
              fontWeight: 'bold'
            }}>
              {trip.bookings.length}
            </span>
          )}
        </button>
      </div>

      {/* Details Tab */}
      {activeTab === 'details' && (
        <div className="glass-panel animate-fade-in" style={{ padding: '2rem' }}>
          <h3>Extended Trip Details</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Trip Number</p>
              <p style={{ fontWeight: 500 }}>{trip.tripNumber || 'N/A'}</p>
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Mode used</p>
              <p style={{ fontWeight: 500 }}>{trip.mode || 'N/A'}</p>
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Travel Distance</p>
              <p style={{ fontWeight: 500 }}>{trip.distance ? `${trip.distance} km/miles` : 'N/A'}</p>
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Trip purpose</p>
              <p style={{ fontWeight: 500 }}>{trip.purpose || 'N/A'}</p>
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Number of Companions</p>
              <p style={{ fontWeight: 500 }}>{trip.companions || 0}</p>
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Frequency</p>
              <p style={{ fontWeight: 500 }}>{trip.frequency || 'N/A'}</p>
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Cost Incurred</p>
              <p style={{ fontWeight: 500 }}>{trip.cost ? `₹${trip.cost}` : 'N/A'}</p>
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Start Time</p>
              <p style={{ fontWeight: 500 }}>{trip.startTime || 'N/A'}</p>
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>End Date</p>
              <p style={{ fontWeight: 500 }}>{trip.endDate ? new Date(trip.endDate).toLocaleDateString() : 'Ongoing'}</p>
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>End Time</p>
              <p style={{ fontWeight: 500 }}>{trip.endTime || 'N/A'}</p>
            </div>
            <div style={{ gridColumn: '1 / -1', marginTop: '1rem', borderTop: '1px solid var(--color-glass-border)', paddingTop: '1rem' }}>
              <h4 style={{ marginBottom: '1rem' }}>Coordinates</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                <div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Origin</p>
                  <p style={{ fontWeight: 500 }}>Lat: {trip.originLat || 'N/A'}, Lng: {trip.originLng || 'N/A'}</p>
                </div>
                <div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Destination</p>
                  <p style={{ fontWeight: 500 }}>Lat: {trip.destLat || 'N/A'}, Lng: {trip.destLng || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expenses Tab */}
      {activeTab === 'expenses' && (
        <div className="trip-content-layout">
          <div className="glass-panel" style={{ flex: '1', minWidth: '300px', maxWidth: '100%', padding: '1.5rem', height: 'fit-content' }}>
            <h3>Add Expense</h3>
            <form onSubmit={addExpense} style={{ marginTop: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label">Description</label>
                <input type="text" className="form-control" value={expenseDesc} onChange={e => setExpenseDesc(e.target.value)} placeholder="e.g. Dinner at Luigi's" required />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Amount (₹)</label>
                  <input type="number" step="0.01" className="form-control" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} placeholder="e.g. 1500" required />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Category</label>
                  <select className="form-control" value={expenseCat} onChange={e => setExpenseCat(e.target.value)}>
                    {categories.map(cat => <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <button type="submit" className="btn btn-primary w-full" style={{ marginTop: '1rem' }}>
                <Plus size={18} /> Add Expense
              </button>
            </form>
          </div>

          <div style={{ flex: '2', minWidth: '300px' }}>
            <h3>Expense Breakdown</h3>
            {safeExpenses.length > 0 && (
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                {categories.map(cat => {
                  const catTotal = safeExpenses.filter(e => e.category === cat).reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
                  if (catTotal === 0) return null;
                  const percentage = totalExpense > 0 ? Math.round((catTotal / totalExpense) * 100) : 0;
                  return (
                    <div key={cat} style={{ background: 'var(--color-glass)', border: '1px solid var(--color-glass-border)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-full)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                      <span style={{ textTransform: 'capitalize', fontWeight: 500 }}>{cat}</span>
                      <span style={{ color: 'var(--color-primary-start)' }}>{percentage}%</span>
                    </div>
                  );
                })}
              </div>
            )}

            <h3>Expense History</h3>
            {safeExpenses.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>No expenses recorded yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
                {safeExpenses.slice().reverse().map(exp => (
                  <div key={exp.id} className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderLeft: `4px solid var(--color-primary-start)` }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 500, color: 'var(--text-main)' }}>{exp.description}</p>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{exp.category} &bull; {new Date(exp.date).toLocaleDateString()}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--text-main)' }}>
                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(parseFloat(exp.amount) || 0)}
                      </span>
                      <button onClick={() => deleteExpense(exp.id)} style={{ background: 'transparent', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: '0.5rem' }}>
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Photos Tab */}
      {activeTab === 'photos' && (
        <div className="animate-fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3>Trip Memories</h3>
            <div>
              <input type="file" id="photo-upload" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} />
              <label htmlFor="photo-upload" className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                <Plus size={18} /> Upload Photo
              </label>
            </div>
          </div>

          {safePhotos.length === 0 ? (
            <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
              <ImageIcon size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem', opacity: 0.5 }} />
              <p>No photos uploaded yet.</p>
            </div>
          ) : (
            <div className="responsive-grid" style={{ gap: '1.5rem' }}>
              {safePhotos.map((photo, idx) => (
                <div 
                  key={idx} 
                  className="glass-panel" 
                  style={{ position: 'relative', height: '200px', borderRadius: 'var(--radius-md)', overflow: 'hidden', cursor: 'pointer' }}
                  onClick={() => setSelectedPhoto(photo)}
                >
                  <img src={photo} alt="Trip Memory" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform var(--transition-normal)' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'} />
                  <button 
                    onClick={(e) => { e.stopPropagation(); removePhoto(idx); }} 
                    style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', padding: '0.5rem', cursor: 'pointer', backdropFilter: 'blur(4px)', zIndex: 10 }}
                    title="Delete Photo"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bookings Tab */}
      {activeTab === 'bookings' && (
        <div className="animate-fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3>Hotel Bookings</h3>
          </div>

          {/* Hotel Search Section */}
          <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', borderBottom: '2px solid var(--color-primary-start)' }}>
            <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Search size={18} /> Find & Book a Hotel
            </h4>
            <form onSubmit={handleSearchHotels} style={{ display: 'flex', gap: '1rem' }}>
              <input 
                type="text" 
                className="form-control" 
                value={searchCity} 
                onChange={(e) => setSearchCity(e.target.value)} 
                placeholder="Enter city (e.g., Pune, Mumbai, Delhi)" 
                style={{ flex: 1 }}
              />
              <button type="submit" className="btn btn-primary" disabled={isSearching}>
                {isSearching ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />} Search
              </button>
            </form>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="responsive-grid" style={{ marginTop: '1.5rem', gap: '1rem' }}>
                {searchResults.map(hotel => (
                  <div 
                    key={hotel.id} 
                    className="glass-panel" 
                    style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.5)', transition: 'all 0.2s', cursor: 'pointer' }}
                    onClick={() => handleViewHotelDetails(hotel)}
                    onMouseOver={e => e.currentTarget.style.transform = 'translateY(-4px)'}
                    onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <h5 style={{ margin: 0, fontSize: '1rem' }}>{hotel.name}</h5>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#f59e0b', fontSize: '0.8rem' }}>
                        <Star size={12} fill="#f59e0b" /> {hotel.rating}
                      </div>
                    </div>
                    <p style={{ margin: '0 0 1rem 0', fontWeight: 600, color: 'var(--color-primary-start)' }}>
                      ₹{hotel.price.toLocaleString()} <span style={{ fontWeight: 400, fontSize: '0.8rem', color: 'var(--text-muted)' }}>/ night</span>
                    </p>
                    <button 
                      onClick={() => handleBookHotel(hotel)} 
                      className="btn btn-success w-full"
                      disabled={bookingStatus.loading}
                    >
                      {bookingStatus.loading ? 'Booking...' : 'Book Now'}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {searchCity && !isSearching && searchResults.length === 0 && (
              <p style={{ marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center' }}>
                No hotels found for "{searchCity}". Try Pune, Mumbai or Delhi.
              </p>
            )}
          </div>

          {/* Success Message */}
          {bookingStatus.success && (
            <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.5rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)', textAlign: 'center', border: '1px solid var(--color-success)' }}>
              <Check size={18} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} /> Hotel booked successfully!
            </div>
          )}

          {/* Current Bookings List */}
          <div style={{ marginTop: '2rem' }}>
            <h4 style={{ marginBottom: '1rem' }}>Your Booked Hotels</h4>
            {!(trip.bookings && trip.bookings.length > 0) ? (
              <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                <Hotel size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem', opacity: 0.5 }} />
                <p>No hotel bookings yet. Search above to find a hotel!</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {trip.bookings.slice().reverse().map((booking) => (
                  <div key={booking.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '4px solid var(--color-primary-start)' }}>
                    <div>
                      <h4 style={{ margin: 0, marginBottom: '0.5rem', fontSize: '1.1rem', color: 'var(--text-main)' }}>{booking.hotelName}</h4>
                      <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', display: 'flex', gap: '1rem' }}>
                        <span><strong>Check-in:</strong> {booking.checkIn || 'N/A'}</span>
                        <span><strong>Check-out:</strong> {booking.checkOut || 'N/A'}</span>
                      </p>
                      <p style={{ margin: 0, marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        <strong>Ref:</strong> {booking.bookingRef}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontWeight: 600, fontSize: '1.2rem', color: 'var(--text-main)' }}>
                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(parseFloat(booking.price) || 0)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Photo Lightbox Modal */}
      {selectedPhoto && (
        <div 
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '2rem' }}
          onClick={() => setSelectedPhoto(null)}
        >
          <button 
            style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'var(--color-glass)', color: 'var(--text-main)', border: '1px solid var(--color-glass-border)', borderRadius: '50%', width: '44px', height: '44px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => setSelectedPhoto(null)}
          >
            <X size={24} />
          </button>
          <img 
            src={selectedPhoto} 
            alt="Enlarged view" 
            style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: 'var(--radius-md)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', objectFit: 'contain' }} 
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
      {/* Hotel Details Modal */}
      {selectedHotelForDetails && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100, padding: '1rem' }}>
          <div className="glass-panel animate-fade-in modal-content" style={{ width: '100%', maxWidth: '600px', backgroundColor: 'var(--color-bg)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ position: 'relative' }}>
              <div style={{ height: '200px', background: 'linear-gradient(135deg, var(--color-primary-start), var(--color-secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                <Hotel size={64} style={{ opacity: 0.5 }} />
              </div>
              <button 
                onClick={() => setSelectedHotelForDetails(null)} 
                className="btn btn-secondary" 
                style={{ position: 'absolute', top: '1rem', right: '1rem', borderRadius: '50%', padding: '0.5rem', background: 'white' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <h2 style={{ margin: 0 }}>{selectedHotelForDetails.name}</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f59e0b', marginTop: '0.5rem' }}>
                    <Star size={18} fill="#f59e0b" /> {selectedHotelForDetails.rating} Rating
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-primary-start)' }}>
                    ₹{selectedHotelForDetails.price.toLocaleString()}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>per night</p>
                </div>
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <h4 style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Info size={18} /> About this Hotel
                </h4>
                {hotelDetailsLoading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="loading-pulse" style={{ height: '1rem', width: '100%', borderRadius: '4px' }}></div>
                    <div className="loading-pulse" style={{ height: '1rem', width: '90%', borderRadius: '4px' }}></div>
                    <div className="loading-pulse" style={{ height: '1rem', width: '80%', borderRadius: '4px' }}></div>
                  </div>
                ) : (
                  <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', color: 'var(--text-main)' }}>
                    {selectedHotelForDetails.richDetails || "No additional details available."}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button 
                  onClick={() => setSelectedHotelForDetails(null)} 
                  className="btn btn-secondary w-full"
                >
                  Close
                </button>
                <button 
                  onClick={() => {
                    handleBookHotel(selectedHotelForDetails);
                    setSelectedHotelForDetails(null);
                  }} 
                  className="btn btn-primary w-full"
                  disabled={bookingStatus.loading}
                >
                  {bookingStatus.loading ? <Loader2 className="animate-spin" /> : <><Check size={18} /> Book This Hotel</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
