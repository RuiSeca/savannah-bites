import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import CookingPotBasket from '../CookingPotBasket';
import './styles.css';

const Navigation = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Reset scroll when location changes
  useEffect(() => {
    window.scrollTo(0, 0);
    setIsMobileMenuOpen(false);
  }, [location]);

  const handleCartClick = () => {
    navigate('/checkout');
  };

  // Custom link component that scrolls to top
  const ScrollToTopLink = ({ to, children, onClick }) => {
    const handleClick = (e) => {
      if (onClick) onClick(e);
      window.scrollTo(0, 0);
    };

    return (
      <Link to={to} onClick={handleClick}>
        {children}
      </Link>
    );
  };

  return (
    <nav className="navigation">
      {/* Desktop Menu */}
      <ul className="desktop-menu">
        <li><ScrollToTopLink to="/">Home</ScrollToTopLink></li>
        <li><ScrollToTopLink to="/menu">Menu</ScrollToTopLink></li>
        <li><ScrollToTopLink to="/Reservation">Book Table</ScrollToTopLink></li>
        <li><ScrollToTopLink to="/about">About Us</ScrollToTopLink></li>
        <li><ScrollToTopLink to="/contact">Contact</ScrollToTopLink></li>
        <li className="cart-button-container">
          <CookingPotBasket onClick={handleCartClick} />
        </li>
      </ul>

      {/* Mobile Menu Button */}
      <button 
        className="mobile-menu-btn"
        onClick={() => setIsMobileMenuOpen(true)}
        aria-label="Open menu"
      >
        <svg 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </button>

      <div className="mobile-cart-button">
        <CookingPotBasket onClick={handleCartClick} />
      </div>

      {/* Mobile Menu */}
      <div className={`mobile-nav ${isMobileMenuOpen ? 'active' : ''}`}>
        <button 
          className="close-menu"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-label="Close menu"
        >
          ×
        </button>
        <ul className="mobile-menu">
          <li><ScrollToTopLink to="/" onClick={() => setIsMobileMenuOpen(false)}>Home</ScrollToTopLink></li>
          <li><ScrollToTopLink to="/menu" onClick={() => setIsMobileMenuOpen(false)}>Menu</ScrollToTopLink></li>
          <li><ScrollToTopLink to="/Reservation" onClick={() => setIsMobileMenuOpen(false)}>Book Table</ScrollToTopLink></li>
          <li><ScrollToTopLink to="/about" onClick={() => setIsMobileMenuOpen(false)}>About Us</ScrollToTopLink></li>
          <li><ScrollToTopLink to="/contact" onClick={() => setIsMobileMenuOpen(false)}>Contact</ScrollToTopLink></li>
        </ul>
      </div>

      {/* Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="overlay active"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </nav>
  );
};

export default Navigation;