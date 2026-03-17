import React, { useState } from 'react';
import { ArrowLeft, Plus, DollarSign, Image as ImageIcon, MapPin, Calendar, Check, Trash2 } from 'lucide-react';

export default function TripDetail({ trip, onBack, onUpdateTrip }) {
  if (!trip) return null;

  const [activeTab, setActiveTab] = useState('expenses');
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCat, setExpenseCat] = useState('food');

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
      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem', borderRadius: 'var(--radius-lg)' }}>
        <div className="trip-header-info">
          <div>
            <h1 style={{ marginBottom: '0.5rem', background: 'linear-gradient(135deg, var(--color-primary-start), var(--color-secondary))', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {trip.name}
            </h1>
            <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <MapPin size={18} /> {trip.destination}
            </p>
            <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
              <Calendar size={18} /> {new Date(trip.startDate).toLocaleDateString()}
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
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--color-glass-border)', paddingBottom: '1rem' }}>
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
      </div>

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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem' }}>
              {safePhotos.map((photo, idx) => (
                <div key={idx} className="glass-panel" style={{ position: 'relative', height: '200px', borderRadius: 'var(--radius-md)', overflow: 'hidden', group: 'photo' }}>
                  <img src={photo} alt="Trip Memory" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button 
                    onClick={() => removePhoto(idx)} 
                    style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', padding: '0.5rem', cursor: 'pointer', backdropFilter: 'blur(4px)' }}
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
    </div>
  );
}
