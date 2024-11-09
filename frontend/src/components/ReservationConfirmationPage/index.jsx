import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { format } from "date-fns";
import ProgressStepsReservation from "../ProgressStepsReservation";
import "./ReservationPage.css";

// Constants
const API_CONFIG = {
  baseURL:
    process.env.NODE_ENV === "development"
      ? process.env.REACT_APP_NGROK_URL || process.env.REACT_APP_API_BASE_URL
      : process.env.REACT_APP_API_BASE_URL,
  endpoints: {
    reservations: "/api/reservations",
    availability: "/api/reservations/availability",
  },
};

const TIME_SLOTS = [
  { label: "11:00 AM", value: "11:00" },
  { label: "1:00 PM", value: "13:00" },
  { label: "3:00 PM", value: "15:00" },
  { label: "5:00 PM", value: "17:00" },
  { label: "7:00 PM", value: "19:00" },
  { label: "9:00 PM", value: "21:00" },
];

const INITIAL_FORM_STATE = {
  guests: "",
  name: "",
  email: "",
  phone: "",
  allergies: "",
};

const GUEST_OPTIONS = [
  { value: "1", label: "1 person" },
  { value: "2", label: "2 people" },
  { value: "3", label: "3 people" },
  { value: "4", label: "4 people" },
  { value: "5", label: "5 people" },
  { value: "6", label: "6 people" },
  { value: "7+", label: "7 or more (we'll contact you)" },
];

// API instance
const api = axios.create({
  baseURL: API_CONFIG.baseURL.endsWith("/api")
    ? API_CONFIG.baseURL
    : `${API_CONFIG.baseURL}/api`,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

const ReservationPage = () => {
  const navigate = useNavigate();
  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  // State management with proper types
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedTime, setSelectedTime] = useState("");
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [availableTables, setAvailableTables] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Fetch available tables with proper error handling
  const fetchAvailableTables = useCallback(async (date) => {
    const controller = new AbortController();

    try {
      setLoading(true);
      setError("");

      const response = await api.get(
        `${API_CONFIG.endpoints.availability}/${date}`,
        {
          signal: controller.signal,
        }
      );

      if (response.data.status === "success" && response.data.availability) {
        setAvailableTables(response.data.availability);
      } else {
        // Default availability if no data
        const defaultAvailability = TIME_SLOTS.reduce((acc, slot) => {
          acc[slot.value] = 10;
          return acc;
        }, {});
        setAvailableTables(defaultAvailability);
      }
    } catch (err) {
      if (!axios.isCancel(err)) {
        console.error("Error fetching availability:", err);
        setError("Failed to fetch availability. Please try again.");
      }
    } finally {
      setLoading(false);
    }

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      const timeoutId = setTimeout(
        () => fetchAvailableTables(selectedDate),
        300
      );
      return () => clearTimeout(timeoutId);
    }
  }, [selectedDate, fetchAvailableTables]);

  // Form validation
  const validateForm = useCallback(() => {
    if (!selectedDate) return "Please select a date";
    if (!selectedTime) return "Please select a time slot";
    if (!formData.guests) return "Please select number of guests";
    if (!formData.name.trim()) return "Please enter your name";
    if (!formData.email.trim()) return "Please enter your email";
    if (!formData.phone.trim()) return "Please enter your phone number";

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim()))
      return "Please enter a valid email address";

    const phoneRegex = /^[\d\s-+()]{10,}$/;
    if (!phoneRegex.test(formData.phone.replace(/\s+/g, "")))
      return "Please enter a valid phone number";

    return null;
  }, [selectedDate, selectedTime, formData]);

  // Event handlers
  const handleInputChange = useCallback((e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
    setError("");
  }, []);

  const handleTimeSlotClick = useCallback(
    (time) => {
      if (availableTables[time] > 0) {
        setSelectedTime(time);
        setError("");
      }
    },
    [availableTables]
  );

  const handleDateChange = useCallback((e) => {
    const newDate = new Date(e.target.value);
    const today = new Date();

    today.setHours(0, 0, 0, 0);
    newDate.setHours(0, 0, 0, 0);

    if (newDate >= today) {
      setSelectedDate(e.target.value);
      setSelectedTime("");
    } else {
      alert("Please select a future date");
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const reservationData = {
        ...formData,
        date: selectedDate,
        time: selectedTime,
      };

      const response = await api.post(
        API_CONFIG.endpoints.reservations,
        reservationData
      );

      if (response.data.status === "success" && response.data.data) {
        navigate("/reservation-confirmation", {
          state: {
            reservationId: response.data.data.reservationId,
            reservation: {
              ...reservationData,
              id: response.data.data.reservationId,
              status: response.data.data.status,
            },
          },
        });
      } else {
        throw new Error(
          response.data.message || "Failed to create reservation"
        );
      }
    } catch (err) {
      console.error("Submission error:", err);
      setError(
        err.response?.data?.message ||
          err.response?.data?.errors?.join(", ") ||
          "Failed to submit reservation. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Render functions
  const renderTimeSlots = useCallback(
    () => (
      <div className="time-slots-grid">
        {TIME_SLOTS.map(({ label, value }) => (
          <button
            key={value}
            type="button"
            className={`time-slot ${selectedTime === value ? "selected" : ""} 
                     ${availableTables[value] === 0 ? "full" : ""}`}
            onClick={() => handleTimeSlotClick(value)}
            disabled={availableTables[value] === 0}
          >
            <span className="time">{label}</span>
            <span className="tables-left">
              {availableTables[value] || 0} tables available
            </span>
          </button>
        ))}
      </div>
    ),
    [selectedTime, availableTables, handleTimeSlotClick]
  );

  return (
    <div className="reservation-page">
      <header className="reservation-header">
        <h1>Make a Reservation</h1>
        <p>Book Your Table at Savannah Bites</p>
      </header>

      <main className="reservation-content">
        <ProgressStepsReservation currentStep={1} />

        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="reservation-form" noValidate>
          <section className="form-section">
            <h2>Choose Your Date & Time</h2>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="date">Select Date</label>
                <input
                  type="date"
                  id="date"
                  required
                  min={today}
                  value={selectedDate}
                  onChange={handleDateChange}
                  className="date-input"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group full-width">
                <label>Available Time Slots</label>
                {loading ? (
                  <div className="loading-indicator">
                    Loading available times...
                  </div>
                ) : (
                  renderTimeSlots()
                )}
              </div>
            </div>
          </section>

          <section className="form-section">
            <h2>Guest Information</h2>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="guests">Number of Guests</label>
                <select
                  id="guests"
                  required
                  value={formData.guests}
                  onChange={handleInputChange}
                  className="select-input"
                >
                  <option value="">Select guests</option>
                  {GUEST_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row two-columns">
              <div className="form-group">
                <label htmlFor="name">Full Name</label>
                <input
                  type="text"
                  id="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter your full name"
                  className="text-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="phone">Phone Number</label>
                <input
                  type="tel"
                  id="phone"
                  required
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="Enter your phone number"
                  className="text-input"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter your email address"
                  className="text-input"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="allergies">Food Allergies</label>
                <textarea
                  id="allergies"
                  value={formData.allergies}
                  onChange={handleInputChange}
                  placeholder="List any allergies (optional)"
                  className="textarea-input"
                />
              </div>
            </div>
          </section>

          <div className="form-actions">
            <button
              type="submit"
              className={`submit-button ${submitting ? "submitting" : ""}`}
              disabled={submitting || loading}
            >
              {submitting ? "Processing..." : "Confirm Reservation"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default ReservationPage;
