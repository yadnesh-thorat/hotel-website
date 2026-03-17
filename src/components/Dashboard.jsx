import React, { useState } from 'react';
import { Plus, MapPin, Calendar, Compass, ArrowRight, X } from 'lucide-react';

export default function Dashboard({ trips, onAddTrip, onViewTrip }) {
  const [showModal, setShowModal] = useState(false);
  
  // Trip Form State
  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name && destination && startDate) {
      onAddTrip({
        id: Date.now().toString(),
        name,
        destination,
        startDate,
        description,
        expenses: [],
        photos: []
      });
      setName('');
      setDestination('');
      setStartDate('');
      setDescription('');
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
                <Calendar size={16} /> <span>{new Date(trip.startDate).toLocaleDateString()}</span>
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
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '500px', backgroundColor: 'var(--color-bg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', borderBottom: '1px solid var(--color-glass-border)' }}>
              <h3 style={{ margin: 0 }}>Create a New Trip</h3>
              <button className="btn btn-secondary" style={{ padding: '0.5rem', borderRadius: '50%' }} onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label">Trip Name *</label>
                <input type="text" className="form-control" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Summer in Paris" required />
              </div>
              <div className="form-group">
                <label className="form-label">Destination *</label>
                <input type="text" className="form-control" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="e.g. Paris, France" required />
              </div>
              <div className="form-group">
                <label className="form-label">Start Date *</label>
                <input type="date" className="form-control" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Description (optional)</label>
                <textarea className="form-control" rows="3" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What's the plan?"></textarea>
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
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
