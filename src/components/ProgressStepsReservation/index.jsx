import React from "react";
import "./styles.css";

const ProgressStepsReservation = ({ currentStep }) => {
  return (
    <div className="progress-steps-reservation">
      <div className="progress-step-wrapper-reservation">
        <div className="progress-step-container-reservation">
          <div
            className={`progress-step-circle-reservation ${currentStep >= 1 ? "active" : ""}`}
          >
            1
          </div>
          <div
            className={`progress-line-reservation ${currentStep >= 2 ? "active" : ""}`}
          />
        </div>
        <span className="progress-step-label-reservation">
          Reservation Details
        </span>
      </div>

      <div className="progress-step-wrapper-reservation">
        <div className="progress-step-container-reservation">
          <div
            className={`progress-step-circle-reservation ${currentStep >= 2 ? "active" : ""}`}
          >
            2
          </div>
        </div>
        <span className="progress-step-label-reservation">Confirmation</span>
      </div>
    </div>
  );
};

export default ProgressStepsReservation;
