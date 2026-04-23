import React, { useState, useEffect } from 'react';
import { LogOut, Map } from 'lucide-react';
import './index.css';

import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import TripDetail from './components/TripDetail';
import Chatbot from './components/Chatbot';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [trips, setTrips] = useState([]);
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'auth', 'trip'
  const [activeTripId, setActiveTripId] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || '/api';

  useEffect(() => {
    const user = localStorage.getItem('tripLogUser');
    if (user) {
      setCurrentUser(user);
    }
  }, []);

  const fetchTrips = async (username) => {
    try {
      console.log('Fetching trips for:', username);
      const response = await fetch(`${API_URL}/trips/${username}`);
      const data = await response.json();
      console.log('API Response:', data);
      
      if (Array.isArray(data)) {
        setTrips(data);
        localStorage.setItem(`trips_${username}`, JSON.stringify(data));
      } else {
        // Fallback to local storage if API fails or returns error
        const localData = localStorage.getItem(`trips_${username}`);
        if (localData) {
          setTrips(JSON.parse(localData));
        }
      }
    } catch (error) {
      console.error('Failed to fetch trips from server, using local fallback', error);
      const localData = localStorage.getItem(`trips_${username}`);
      if (localData) {
        setTrips(JSON.parse(localData));
      }
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchTrips(currentUser);
    }
  }, [currentUser]);

  const handleLogin = async (username) => {
    try {
      await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });
      setCurrentUser(username);
      localStorage.setItem('tripLogUser', username);
      setCurrentView('dashboard');
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setTrips([]);
    setCurrentView('dashboard');
    localStorage.removeItem('tripLogUser');
  };

  const handleAddTrip = async (newTrip) => {
    try {
      const payload = { 
        ...newTrip, 
        username: currentUser,
        bookings: newTrip.bookings || [],
        expenses: newTrip.expenses || [],
        photos: newTrip.photos || []
      };
      await fetch(`${API_URL}/trips`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      // Immediately reflect locally for snappiness, or refetch
      setTrips([...trips, payload]);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateTrip = async (updatedTrip) => {
    if (!updatedTrip || !updatedTrip.id) return;
    
    // Optimistic UI update: instantly update the trip locally
    // Update local list first
    const updatedTripsList = (trips || []).map(t => t.id === updatedTrip.id ? updatedTrip : t);
    setTrips(updatedTripsList);

    try {
      // Save to localStorage immediately
      localStorage.setItem(`trips_${currentUser}`, JSON.stringify(updatedTripsList));

      const response = await fetch(`${API_URL}/trips/${updatedTrip.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...updatedTrip,
          expenses: updatedTrip.expenses || [],
          photos: updatedTrip.photos || [],
          bookings: updatedTrip.bookings || []
        })
      });
      
      if (!response.ok) throw new Error('Server update failed');
      await fetchTrips(currentUser);
    } catch (e) {
      console.error('Save to server failed, data is safe in localStorage', e);
    }
  };

  const handleViewTrip = (tripId) => {
    setActiveTripId(tripId);
    setCurrentView('trip');
  };

  const getActiveTrip = () => {
    if (!activeTripId || !trips) return null;
    return trips.find(t => String(t.id) === String(activeTripId)) || null;
  };

  const handleChatbotAction = async (actionData) => {
    if (actionData.action === 'book_hotel') {
      const tripToUpdate = getActiveTrip() || (trips && trips.length > 0 ? trips[trips.length - 1] : null);
      
      if (tripToUpdate) {
        try {
          console.log('Directly booking for trip:', tripToUpdate.id);
          const response = await fetch(`${API_URL}/bookings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tripId: tripToUpdate.id,
              hotelName: actionData.hotel,
              price: actionData.price,
              checkIn: actionData.checkIn,
              checkOut: actionData.checkOut
            })
          });
          
          if (!response.ok) throw new Error('Booking failed');
          
          const bookingResult = await response.json();
          const newBooking = {
            id: bookingResult.bookingId || Date.now().toString(),
            hotelName: actionData.hotel,
            price: actionData.price,
            checkIn: actionData.checkIn,
            checkOut: actionData.checkOut,
            bookingRef: bookingResult.bookingRef || ('TL' + Math.floor(100000 + Math.random() * 900000))
          };

          // Optimistic state update
          const updatedTrips = trips.map(t => {
            if (t.id === tripToUpdate.id) {
              return {
                ...t,
                bookings: [...(t.bookings || []), newBooking]
              };
            }
            return t;
          });
          
          setTrips(updatedTrips);
          localStorage.setItem(`trips_${currentUser}`, JSON.stringify(updatedTrips));
          
          // Still refetch to be absolutely sure we are in sync with server
          await fetchTrips(currentUser);
          
          setActiveTripId(tripToUpdate.id);
          setCurrentView('trip');
        } catch (e) {
          console.error('Direct booking failed', e);
          throw e;
        }
      }
    }
  };

  return (
    <div className="app-container">
      {currentUser && (
        <nav className="navbar">
          <div className="nav-brand" style={{ cursor: 'pointer' }} onClick={() => setCurrentView('dashboard')}>
            <Map size={28} />
            TripLog
          </div>
          <div className="nav-actions" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span className="user-greeting" style={{ fontWeight: 500, opacity: 0.8 }}>Hey, {currentUser}</span>
            <button onClick={handleLogout} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
              <LogOut size={16} /> Logout
            </button>
          </div>
        </nav>
      )}

      <main className="main-content">
        {!currentUser ? (
          <Auth onLogin={handleLogin} />
        ) : (
          <>
            {currentView === 'dashboard' && (
              <Dashboard trips={trips} onAddTrip={handleAddTrip} onViewTrip={handleViewTrip} />
            )}
            
            {currentView === 'trip' && activeTripId && getActiveTrip() ? (
              <TripDetail 
                trip={getActiveTrip()} 
                onBack={() => setCurrentView('dashboard')} 
                onUpdateTrip={handleUpdateTrip} 
              />
            ) : currentView === 'trip' ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>Loading trip details...</div>
            ) : null}
          </>
        )}
      </main>

      {currentUser && <Chatbot currentUser={currentUser} onAction={handleChatbotAction} />}
    </div>
  );
}

export default App;
