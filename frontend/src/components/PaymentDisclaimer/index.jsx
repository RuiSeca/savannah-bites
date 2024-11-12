import React, { useState, useEffect } from "react";
import "./styles.css";

const PaymentDisclaimer = () => {
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  useEffect(() => {
    const hasSeenDisclaimer = localStorage.getItem("hasSeenPaymentDisclaimer");
    if (!hasSeenDisclaimer) {
      setShowDisclaimer(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem("hasSeenPaymentDisclaimer", "true");
    setShowDisclaimer(false);
  };

  if (!showDisclaimer) return null;

  return (
    <div className="disclaimer-overlay">
      <div className="disclaimer-modal">
        <h2>Important Notice</h2>
        <div className="disclaimer-content">
          <p className="disclaimer-text">
            This is a project showcase website. To test the payment system and
            receive an order confirmation, please use the following test card
            details:
          </p>
          <div className="test-card-details">
            <p className="card-number">Card Number: 4242 4242 4242 4242</p>
            <p>Any future expiry date</p>
            <p>Any 3-digit CVC number</p>
          </div>
          <p className="disclaimer-note">
            No real payments will be processed. This is for demonstration
            purposes only.
          </p>
        </div>
        <button onClick={handleClose} className="disclaimer-button">
          I Understand
        </button>
      </div>
    </div>
  );
};

export default PaymentDisclaimer;
