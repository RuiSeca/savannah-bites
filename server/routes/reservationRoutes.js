// reservationRoutes.js - Routes
const express = require("express");
const router = express.Router();
const Reservation = require("../Models/Reservation");
const reservationEmailService = require("../Services/reservationEmailService");

// Get availability for a specific date
router.get("/availability/:date", async (req, res) => {
  try {
    const { date } = req.params;

    // Validate date format
    if (!date || isNaN(new Date(date).getTime())) {
      return res.status(400).json({
        status: "error",
        message: "Invalid date format",
      });
    }

    console.log("Checking availability for date:", date);
    const availability = await Reservation.checkAvailability(date);

    console.log("Availability:", availability);
    res.json({
      status: "success",
      availability,
    });
  } catch (error) {
    console.error("Error checking availability:", error);
    res.status(500).json({
      status: "error",
      message: "Error checking availability",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Create new reservation
router.post("/", async (req, res) => {
  try {
    console.log("Received reservation request:", req.body);

    // Basic validation
    const requiredFields = ["name", "email", "phone", "date", "time", "guests"];
    const missingFields = requiredFields.filter((field) => !req.body[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        status: "error",
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    // Check if date is valid
    const reservationDate = new Date(req.body.date);
    if (isNaN(reservationDate.getTime())) {
      return res.status(400).json({
        status: "error",
        message: "Invalid date format",
      });
    }

    // Check if tables are available
    const availability = await Reservation.checkAvailability(req.body.date);
    if (availability[req.body.time] <= 0) {
      return res.status(400).json({
        status: "error",
        message: "No tables available for selected time",
      });
    }

    // Create reservation
    const reservation = new Reservation(req.body);
    await reservation.save();

    // Send confirmation email
    try {
      await reservationEmailService.sendReservationConfirmation(
        reservation.email,
        reservation
      );
    } catch (emailError) {
      console.error(
        "Failed to send reservation confirmation email:",
        emailError
      );
    }

    res.status(201).json({
      status: "success",
      message: "Reservation created successfully",
      data: {
        reservationId: reservation._id,
        date: reservation.date,
        time: reservation.time,
        guests: reservation.guests,
        status: reservation.status,
      },
    });
  } catch (error) {
    console.error("Error creating reservation:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        status: "error",
        message: "Validation failed",
        errors: Object.values(error.errors).map((err) => err.message),
      });
    }

    res.status(500).json({
      status: "error",
      message: "Failed to create reservation",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

module.exports = router;
