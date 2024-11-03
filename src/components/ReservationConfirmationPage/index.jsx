import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import ProgressStepsReservation from '../ProgressStepsReservation/index.jsx';
import './styles.css';

// API configuration
const apiUrl = process.env.NODE_ENV === 'development' 
  ? process.env.REACT_APP_NGROK_URL || process.env.REACT_APP_API_BASE_URL
  : process.env.REACT_APP_API_BASE_URL;

// Create axios instance with proper URL construction
const api = axios.create({
  baseURL: apiUrl.endsWith('/api') ? apiUrl : `${apiUrl}/api`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

const ReservationConfirmationPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get reservation details from navigation state
  const { reservationId, reservation: passedReservation } = location.state || {};
  
  const [reservationDetails, setReservationDetails] = useState(passedReservation || null);
  const [loading, setLoading] = useState(!passedReservation);
  const [error, setError] = useState(null);

  useEffect(() => {
    // If no reservation data or ID, redirect to home
    if (!reservationId && !passedReservation) {
      console.log('No reservation details available, redirecting to home');
      navigate('/');
      return;
    }

    // If we have reservation details from the form submission, skip API call
    if (passedReservation) {
      setLoading(false);
      return;
    }

    const fetchReservationDetails = async () => {
      try {
        console.log('Fetching reservation details for ID:', reservationId);
        
        const response = await api.get(`/reservations/${reservationId}`);
        console.log('Reservation details response:', response.data);

        if (response.data.status === 'success' && response.data.data) {
          setReservationDetails(response.data.data);
        } else {
          throw new Error('Invalid response format from server');
        }
      } catch (error) {
        console.error('Error fetching reservation details:', error);
        setError(
          error.response?.data?.message || 
          'Failed to load reservation details'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchReservationDetails();
  }, [reservationId, navigate, passedReservation]);

  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-GB', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }).format(date);
    } catch (error) {
      console.error('Date formatting error:', error);
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="loading-container" role="status">
        <div className="spinner"></div>
        <p>Loading your reservation details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container" role="alert">
        <h2>Error Loading Reservation</h2>
        <p className="error-message">{error}</p>
        <button 
          onClick={() => navigate('/')} 
          className="return-button"
        >
          Return to Home
        </button>
      </div>
    );
  }

  if (!reservationDetails) {
    return (
      <div className="error-container" role="alert">
        <h2>Reservation Not Found</h2>
        <p>We couldn't find the reservation details you're looking for.</p>
        <button 
          onClick={() => navigate('/')} 
          className="return-button"
        >
          Return to Home
        </button>
      </div>
    );
  }

  return (
    <div className="confirmation-container">
      <ProgressStepsReservation currentStep={2} />
      
      <div className="confirmation-header">
        <h1>Reservation Confirmation</h1>
        <div className="status-badge" data-status="confirmed">
          <div className="success-icon">✓</div>
          <p className="confirmation-message">
            Your table has been reserved! A confirmation email has been sent to:
          </p>
          <p className="customer-email">{reservationDetails.email}</p>
          
          <div className="reservation-info">
            <p className="confirmation-id">
              Reservation ID: {reservationDetails.id || reservationId}
            </p>
            <p className="reservation-status">
              Status: {reservationDetails.status || 'Confirmed'}
            </p>
          </div>
        </div>
      </div>

      <div className="confirmation-content">
        <div className="customer-info section">
          <h2>Guest Information</h2>
          <div className="info-grid">
            <div className="info-item">
              <span className="label">Name:</span>
              <span className="value">{reservationDetails.name}</span>
            </div>
            <div className="info-item">
              <span className="label">Phone:</span>
              <span className="value">{reservationDetails.phone}</span>
            </div>
            <div className="info-item">
              <span className="label">Email:</span>
              <span className="value">{reservationDetails.email}</span>
            </div>
          </div>
        </div>

        <div className="reservation-details section">
          <h2>Reservation Details</h2>
          <div className="info-grid">
            <div className="info-item">
              <span className="label">Date:</span>
              <span className="value">{formatDate(reservationDetails.date)}</span>
            </div>
            <div className="info-item">
              <span className="label">Time:</span>
              <span className="value">{reservationDetails.time}</span>
            </div>
            <div className="info-item">
              <span className="label">Number of Guests:</span>
              <span className="value">
                {reservationDetails.guests} {reservationDetails.guests === 1 ? 'person' : 'people'}
              </span>
            </div>
            {reservationDetails.allergies && (
              <div className="allergies-info">
                <span className="label">Dietary Requirements:</span>
                <p className="value">{reservationDetails.allergies}</p>
              </div>
            )}
          </div>
        </div>

        <div className="next-steps section">
          <h2>What's Next?</h2>
          <div className="steps-list">
            <div className="step">
              <span className="step-number">1</span>
              <p>You'll receive an email confirmation shortly</p>
            </div>
            <div className="step">
              <span className="step-number">2</span>
              <p>Please arrive 5-10 minutes before your reservation time</p>
            </div>
            <div className="step">
              <span className="step-number">3</span>
              <p>If you need to modify your reservation, please call us directly</p>
            </div>
          </div>
        </div>

        <div className="important-info section">
          <h2>Important Information</h2>
          <ul>
            <li>Please let us know if you're running late</li>
            <li>We hold reservations for up to 15 minutes after the booking time</li>
            <li>For parties of 7 or more, please contact us directly</li>
          </ul>
        </div>

        <div className="actions section">
          <button 
            onClick={() => navigate('/')} 
            className="return-home-button"
          >
            Return to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReservationConfirmationPage;