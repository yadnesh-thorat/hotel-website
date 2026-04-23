import React, { useState } from 'react';
import { Plus, MapPin, Calendar, Compass, ArrowRight, X } from 'lucide-react';

export default function Dashboard({ trips, onAddTrip, onViewTrip }) {
  const [showModal, setShowModal] = useState(false);
  
  // Trip Form State
  const [name, setName] = useState('');
  const [originAddress, setOriginAddress] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');

  const [loadingOrigin, setLoadingOrigin] = useState(false);
  const [loadingDest, setLoadingDest] = useState(false);

  const [tripNumber, setTripNumber] = useState('');
  const [originLat, setOriginLat] = useState('');
  const [originLng, setOriginLng] = useState('');
  const [startTime, setStartTime] = useState('');
  const [destLat, setDestLat] = useState('');
  const [destLng, setDestLng] = useState('');
  const [endTime, setEndTime] = useState('');
  const [mode, setMode] = useState('');
  const [distance, setDistance] = useState('');
  const [purpose, setPurpose] = useState('');
  const [companions, setCompanions] = useState('');
  const [frequency, setFrequency] = useState('');
  const [cost, setCost] = useState('');

  // Geocoding Helper
  const fetchCoords = async (address, type) => {
    if (!address || address.length < 3) return;
    
    if (type === 'origin') setLoadingOrigin(true);
    else setLoadingDest(true);

    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`, {
        headers: { 'User-Agent': 'TripLogApp/1.0' }
      });
      const data = await response.json();
      
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        if (type === 'origin') {
          setOriginLat(lat);
          setOriginLng(lon);
        } else {
          setDestLat(lat);
          setDestLng(lon);
        }
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    } finally {
      if (type === 'origin') setLoadingOrigin(false);
      else setLoadingDest(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name && destination && startDate) {
      onAddTrip({
        id: Date.now().toString(),
        name,
        originAddress,
        destination,
        startDate,
        endDate,
        description,
        tripNumber,
        originLat: parseFloat(originLat) || null,
        originLng: parseFloat(originLng) || null,
        startTime,
        destLat: parseFloat(destLat) || null,
        destLng: parseFloat(destLng) || null,
        endTime,
        mode,
        distance: parseFloat(distance) || null,
        purpose,
        companions: parseInt(companions, 10) || 0,
        frequency,
        cost: parseFloat(cost) || null,
        expenses: [],
        photos: [],
        bookings: []
      });
      setName('');
      setOriginAddress('');
      setDestination('');
      setStartDate('');
      setEndDate('');
      setDescription('');
      setTripNumber('');
      setOriginLat('');
      setOriginLng('');
      setStartTime('');
      setDestLat('');
      setDestLng('');
      setEndTime('');
      setMode('');
      setDistance('');
      setPurpose('');
      setCompanions('');
      setFrequency('');
      setCost('');
      setShowModal(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="responsive-flex-header">
        <div>
          <h2>Your Journeys</h2>
          <p>Track your past trips and plan new adventures</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          <Plus size={20} /> New Trip
        </button>
      </div>

      {trips.length === 0 ? (
        <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', padding: '1.5rem', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--color-primary-start)', marginBottom: '1.5rem' }}>
            <Compass size={48} />
          </div>
          <h3>No trips yet</h3>
          <p style={{ maxWidth: '400px', margin: '0 auto 2rem' }}>You haven't added any trips. Start recording your adventures by creating your first trip.</p>
          <button onClick={() => setShowModal(true)} className="btn btn-secondary">
            Create First Trip
          </button>
        </div>
      ) : (
        <div className="responsive-grid">
          {trips.map(trip => (
            <div key={trip.id} className="glass-panel" style={{ padding: '1.5rem', cursor: 'pointer', display: 'flex', flexDirection: 'column' }} onClick={() => onViewTrip(trip.id)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0 }}>{trip.name}</h3>
                <div style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--color-primary-start)', padding: '0.5rem', borderRadius: 'var(--radius-full)' }}>
                  <Compass size={20} />
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                <MapPin size={16} /> <span>{trip.destination}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                <Calendar size={16} /> <span>{new Date(trip.startDate).toLocaleDateString()} {trip.endDate ? `- ${new Date(trip.endDate).toLocaleDateString()}` : '- Ongoing'}</span>
              </div>
              
              {trip.description && (
                <p style={{ fontSize: '0.9rem', flex: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {trip.description}
                </p>
              )}
              
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--color-glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{trip.expenses?.length || 0} Expenses</span>
                <span style={{ color: 'var(--color-primary-start)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.9rem', fontWeight: 500 }}>
                  View <ArrowRight size={16} />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal for creating trip */}
      {showModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="glass-panel animate-fade-in modal-content" style={{ width: '100%', maxWidth: '500px', backgroundColor: 'var(--color-bg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', borderBottom: '1px solid var(--color-glass-border)' }}>
              <h3 style={{ margin: 0 }}>Create a New Trip</h3>
              <button className="btn btn-secondary" style={{ padding: '0.5rem', borderRadius: '50%' }} onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="modal-scroll-area">
                {/* Section 1: Trip Basics */}
                <div className="form-section">
                  <div className="section-title">
                    <Compass size={18} /> Trip Basics
                  </div>
                  <div className="form-group">
                    <label className="form-label">Trip Name *</label>
                    <input type="text" className="form-control" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Summer in Paris" required />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Trip Number</label>
                      <input type="text" className="form-control" value={tripNumber} onChange={(e) => setTripNumber(e.target.value)} placeholder="e.g. TR-001" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Trip Purpose</label>
                      <input type="text" className="form-control" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g. Vacation" />
                    </div>
                  </div>
                </div>
                
                {/* Section 2: Locations */}
                <div className="form-section">
                  <div className="section-title">
                    <MapPin size={18} /> Locations
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Origin Address (Auto-fetches coordinates)</label>
                    <div style={{ position: 'relative' }}>
                      <input 
                        type="text" 
                        className={`form-control ${loadingOrigin ? 'loading-pulse' : ''}`} 
                        value={originAddress} 
                        onChange={(e) => setOriginAddress(e.target.value)} 
                        onBlur={() => fetchCoords(originAddress, 'origin')}
                        placeholder="e.g. Mumbai, India" 
                      />
                      {loadingOrigin && <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.7rem', color: 'var(--color-primary-start)' }}>Fetching...</div>}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Origin Lat</label>
                      <input type="number" step="any" className="form-control" value={originLat} onChange={(e) => setOriginLat(e.target.value)} placeholder="19.07" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Origin Lng</label>
                      <input type="number" step="any" className="form-control" value={originLng} onChange={(e) => setOriginLng(e.target.value)} placeholder="72.87" />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Destination Name * (Auto-fetches coordinates)</label>
                    <div style={{ position: 'relative' }}>
                      <input 
                        type="text" 
                        className={`form-control ${loadingDest ? 'loading-pulse' : ''}`} 
                        value={destination} 
                        onChange={(e) => setDestination(e.target.value)} 
                        onBlur={() => fetchCoords(destination, 'destination')}
                        placeholder="e.g. Paris, France" 
                        required 
                      />
                      {loadingDest && <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.7rem', color: 'var(--color-primary-start)' }}>Fetching...</div>}
                    </div>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Dest Lat</label>
                      <input type="number" step="any" className="form-control" value={destLat} onChange={(e) => setDestLat(e.target.value)} placeholder="48.85" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Dest Lng</label>
                      <input type="number" step="any" className="form-control" value={destLng} onChange={(e) => setDestLng(e.target.value)} placeholder="2.35" />
                    </div>
                  </div>
                </div>

                {/* Section 3: Schedule & Logistics */}
                <div className="form-section">
                  <div className="section-title">
                    <Calendar size={18} /> Schedule & Logistics
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Start Date *</label>
                      <input type="date" className="form-control" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Start Time</label>
                      <input type="time" className="form-control" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">End Date</label>
                      <input type="date" className="form-control" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">End Time</label>
                      <input type="time" className="form-control" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Mode of Travel</label>
                      <input type="text" className="form-control" value={mode} onChange={(e) => setMode(e.target.value)} placeholder="e.g. Flight" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Distance</label>
                      <input type="number" step="any" className="form-control" value={distance} onChange={(e) => setDistance(e.target.value)} placeholder="e.g. 500" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Companions</label>
                      <input type="number" className="form-control" value={companions} onChange={(e) => setCompanions(e.target.value)} placeholder="0" />
                    </div>
                  </div>
                </div>

                {/* Section 4: Budget & Notes */}
                <div className="form-section">
                  <div className="section-title">
                    <ArrowRight size={18} /> Budget & Notes
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Frequency</label>
                      <input type="text" className="form-control" value={frequency} onChange={(e) => setFrequency(e.target.value)} placeholder="e.g. Annual" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Est. Cost</label>
                      <input type="number" step="any" className="form-control" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="50000" />
                    </div>
                  </div>
                  <div className="form-group" style={{ marginTop: '1rem' }}>
                    <label className="form-label">Description (optional)</label>
                    <textarea className="form-control" rows="2" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description..."></textarea>
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', padding: '0 1.5rem 1.5rem' }}>
                <button type="button" className="btn btn-secondary w-full" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary w-full">Save Trip</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
