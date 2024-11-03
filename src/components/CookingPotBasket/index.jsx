import React, { useState, useEffect, useRef } from 'react';
import { useCart } from '../../context/CartContext';
import PropTypes from 'prop-types';
import './styles.css';

function CookingPotBasket({ onClick }) {
  const { cart } = useCart();
  const itemCount = cart.reduce((total, item) => total + item.quantity, 0);
  const [isActive, setIsActive] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const prevCountRef = useRef(itemCount);

  // Trigger animation when cart count changes
  useEffect(() => {
    if (itemCount > prevCountRef.current) {
      setIsActive(true);
      const successTimer = setTimeout(() => {
        setShowSuccess(true);
      }, 1000);

      const resetTimer = setTimeout(() => {
        setShowSuccess(false);
        setIsActive(false);
      }, 3000);

      return () => {
        clearTimeout(successTimer);
        clearTimeout(resetTimer);
      };
    }
    prevCountRef.current = itemCount;
  }, [itemCount]);

  const handleClick = (e) => {
    onClick(e);
  };

  return (
    <button 
      className={`cooking-pot-basket ${isActive ? 'active' : ''} ${showSuccess ? 'success' : ''}`}
      onClick={handleClick}
      aria-label={`Shopping cart with ${itemCount} items`}
    >
      <div className="liquid" />
      <div className="success-bg" />
      
      {/* Steam SVG */}
      <svg className="steam" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2Z"/>
      </svg>

      {/* Splash Effect */}
      <svg className="splash" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" fill="none" stroke="#ff9d6c" strokeWidth="2" />
      </svg>

      <div className="btn-content">
        {/* Cooking Pot SVG */}
        <svg className="pot" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M19,14V17A5,5,0,0,1,14,22H10A5,5,0,0,1,5,17V14H2V12H22V14ZM3,4A1,1,0,0,1,4,3H6A1,1,0,0,1,6,5H4A1,1,0,0,1,3,4ZM8,4A1,1,0,0,1,9,3h2a1,1,0,0,1,0,2H9A1,1,0,0,1,8,4ZM13,4a1,1,0,0,1,1-1h2a1,1,0,0,1,0,2H14A1,1,0,0,1,13,4ZM7,8H17l1.5,4H5.5Z"/>
        </svg>
        {itemCount > 0 && (
          <span className="item-count">{itemCount}</span>
        )}
      </div>

       {/* Update the success message part in your CookingPotBasket component */}
      <div className="success-message">
       <svg className="success-tick" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
           <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
        </svg>
      </div>

      {/* Ingredient SVG */}
      <svg className="ingredient" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
        <path d="M298.2 156.6C245.5 130.9 183.7 146.1 147.1 189.4l55.27 55.31c6.25 6.25 6.25 16.33 0 22.58c-3.127 3-7.266 4.605-11.39 4.605s-8.068-1.605-11.19-4.605L124.7 211.2C81.33 247.8 66.16 309.6 91.88 362.2c13.61 27.72 36.09 50.25 63.81 63.86c52.65 25.72 114.4 10.55 151.1-32.86L261.7 347.3c-6.25-6.25-6.25-16.38 0-22.63c6.25-6.25 16.38-6.25 22.63 0l55.15 55.15c43.28-36.65 58.45-98.4 32.73-151.1C358.6 192.7 336.1 170.2 298.2 156.6z"/>
      </svg>
    </button>
  );
}

CookingPotBasket.propTypes = {
  onClick: PropTypes.func.isRequired,
};

export default CookingPotBasket;