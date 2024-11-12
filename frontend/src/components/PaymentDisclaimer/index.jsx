import React, { useState } from "react";
import "./styles.css";

const PaymentDisclaimer = () => {
  const [showDisclaimer, setShowDisclaimer] = useState(true);

  const handleClose = () => {
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
            purposes only. Please also notice that you will receive an email
            confirmation of your order if you proceed with the payment so please
            keep an eye on your inbox.
          </p>
          <p className="disclaimer-note-2">
            Please also notice that you will receive an email confirmation of
            your order, if you proceed with the payment so please keep an eye on
            your inbox!
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
