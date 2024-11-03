import React from 'react';
import './styles.css';

const ProgressSteps = ({ currentStep }) => {
  return (
    <div className="progress-steps">
      <div className="progress-step-wrapper">
        <div className="progress-step-container">
          <div className={`progress-step-circle ${currentStep >= 1 ? 'active' : ''}`}>
            1
          </div>
          <div className={`progress-line ${currentStep >= 2 ? 'active' : ''}`} />
        </div>
        <span className="progress-step-label">Order Details</span>
      </div>

      <div className="progress-step-wrapper">
        <div className="progress-step-container">
          <div className={`progress-step-circle ${currentStep >= 2 ? 'active' : ''}`}>
            2
          </div>
          <div className={`progress-line ${currentStep >= 3 ? 'active' : ''}`} />
        </div>
        <span className="progress-step-label">Payment</span>
      </div>

      <div className="progress-step-wrapper">
        <div className="progress-step-container">
          <div className={`progress-step-circle ${currentStep >= 3 ? 'active' : ''}`}>
            3
          </div>
        </div>
        <span className="progress-step-label">Confirmation</span>
      </div>
    </div>
  );
};

export default ProgressSteps;



