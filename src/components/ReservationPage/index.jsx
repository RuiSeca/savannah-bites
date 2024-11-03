import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './styles.css';
import ProgressStepsReservation from '../ProgressStepsReservation/index.jsx';

const apiUrl = process.env.NODE_ENV === 'development' 
  ? process.env.REACT_APP_NGROK_URL || process.env.REACT_APP_API_BASE_URL
  : process.env.REACT_APP_API_BASE_URL;

const api = axios.create({
  baseURL: apiUrl.endsWith('/api') ? apiUrl : `${apiUrl}/api`,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
});

const TIME_SLOTS = [
  "11:00 AM", "1:00 PM", "3:00 PM", "5:00 PM", "7:00 PM", "9:00 PM"
];

const INITIAL_FORM_STATE = {
  guests: '',
  name: '',
  email: '',
  phone: '',
  allergies: ''
};

const ReservationPage = () => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [availableTables, setAvailableTables] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const dateInput = document.getElementById('date');
    const today = new Date().toISOString().split('T')[0];
    if (dateInput) dateInput.min = today;

    return () => {
      setAvailableTables({});
      setError('');
    };
  }, []);

  const fetchAvailableTables = useCallback(async () => {
    if (!selectedDate) return;

    const controller = new AbortController();
    try {
      setLoading(true);
      setError('');
      const response = await api.get(`/reservations/availability/${selectedDate}`, {
        signal: controller.signal
      });
      if (response.data.status === 'success' && response.data.availability) {
        setAvailableTables(response.data.availability);
      } else {
        setAvailableTables(TIME_SLOTS.reduce((acc, slot) => {
          acc[slot] = 10; // Default availability
          return acc;
        }, {}));
      }
    } catch (err) {
      if (!axios.isCancel(err)) {
        console.error('Error fetching availability:', err);
        setAvailableTables(TIME_SLOTS.reduce((acc, slot) => {
          acc[slot] = 10; // Default availability
          return acc;
        }, {}));
        setError('Failed to fetch availability. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    const timeoutId = selectedDate ? setTimeout(fetchAvailableTables, 300) : null;
    return () => clearTimeout(timeoutId);
  }, [selectedDate, fetchAvailableTables]);

  const validateForm = () => {
    if (!selectedDate) {
      setError('Please select a date');
      return false;
    }
    if (!selectedTime) {
      setError('Please select a time slot');
      return false;
    }
    if (!formData.name.trim()) {
      setError('Please enter your name');
      return false;
    }
    if (!formData.email.trim()) {
      setError('Please enter your email');
      return false;
    }
    if (!formData.phone.trim()) {
      setError('Please enter your phone number');
      return false;
    }
    if (!formData.guests) {
      setError('Please select number of guests');
      return false;
    }
    return true;
  };

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
    setError('');
  };

  const handleTimeSlotClick = (time) => {
    if (availableTables[time] > 0) {
      setSelectedTime(time);
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      setLoading(true);
      setError('');
      const reservationData = { ...formData, date: selectedDate, time: selectedTime };

      const response = await api.post('/reservations', reservationData);
      if (response.data.status === 'success' && response.data.data) {
        navigate('/reservation-confirmation', {
          state: {
            reservationId: response.data.data.reservationId,
            reservation: { ...reservationData, id: response.data.data.reservationId, status: response.data.data.status }
          }
        });
      } else {
        throw new Error(response.data.message || 'Failed to create reservation');
      }
    } catch (err) {
      console.error('Submission error:', err);
      setError(
        err.response?.data?.message || 
        err.response?.data?.errors?.join(', ') ||
        'Failed to submit reservation. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="reservation-page">
      <section className="reservation-form">
        <ProgressStepsReservation currentStep={1} />
        <h2>Make a Reservation</h2>
        {error && <div className="error-message" role="alert">{error}</div>}
        
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="date">Select Date:</label>
            <input
              type="date"
              id="date"
              required
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Available Time Slots:</label>
            <div className="time-slots">
              {TIME_SLOTS.map((time) => (
                <div
                  key={time}
                  className={`time-slot ${selectedTime === time ? 'selected' : ''} 
                    ${availableTables[time] === 0 ? 'full' : ''}`}
                  onClick={() => handleTimeSlotClick(time)}
                  role="button"
                  tabIndex={0}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleTimeSlotClick(time);
                    }
                  }}
                  aria-label={`Select ${time}`}
                  aria-disabled={availableTables[time] === 0}
                >
                  {time}
                  <div className="tables-left">
                    {availableTables[time] || 0} tables available
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="guests">Number of Guests:</label>
            <select
              id="guests"
              required
              value={formData.guests}
              onChange={handleInputChange}
            >
              <option value="">Select number of guests</option>
              {[1, 2, 3, 4, 5, 6].map(num => (
                <option key={num} value={num}>
                  {num} {num === 1 ? 'person' : 'people'}
                </option>
              ))}
              <option value="7+">7 or more (we'll contact you)</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="name">Full Name:</label>
            <input
              type="text"
              id="name"
              required
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter your full name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email:</label>
            <input
              type="email"
              id="email"
              required
              value={formData.email}
              onChange={handleInputChange}
              placeholder="Enter your email address"
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">Phone Number:</label>
            <input
              type="tel"
              id="phone"
              required
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="Enter your phone number"
            />
          </div>

          <div className="form-group">
            <label htmlFor="allergies">Any Food Allergies?</label>
            <textarea
              id="allergies"
              value={formData.allergies}
              onChange={handleInputChange}
              placeholder="List any allergies (optional)"
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit Reservation'}
          </button>
        </form>
      </section>
    </main>
  );
};

export default ReservationPage;
