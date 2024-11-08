import React from "react";
import "./styles.css";

const ErrorMessage = ({ message, retryAction, actionText = "Retry" }) => (
  <div className="error-container">
    <div className="error-icon">⚠️</div>
    <p className="error-message">{message}</p>
    {retryAction && (
      <button className="retry-button" onClick={retryAction}>
        {actionText}
      </button>
    )}
  </div>
);

export default ErrorMessage;
