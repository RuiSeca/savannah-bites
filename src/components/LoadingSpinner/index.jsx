// src/components/LoadingSpinner/index.jsx
import React from "react";
import "./styles.css";

const LoadingSpinner = ({ message = "Loading..." }) => (
  <div className="loading-container">
    <div className="loading-spinner" />
    <p className="loading-message">{message}</p>
  </div>
);

export default LoadingSpinner;
