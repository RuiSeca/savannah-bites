import React, { useState } from "react";
import CookingPotBasket from "../CookingPotBasket";
import "./styles.css";

const Navigation = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleNavigation = (path) => {
    window.location.href = path;
  };

  const handleCartClick = () => {
    handleNavigation("/checkout");
  };

  return (
    <nav className="navigation">
      {/* Desktop Menu */}
      <ul className="desktop-menu">
        <li>
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              handleNavigation("/");
            }}
          >
            Home
          </a>
        </li>
        <li>
          <a
            href="/menu"
            onClick={(e) => {
              e.preventDefault();
              handleNavigation("/menu");
            }}
          >
            Menu
          </a>
        </li>
        <li>
          <a
            href="/Reservation"
            onClick={(e) => {
              e.preventDefault();
              handleNavigation("/Reservation");
            }}
          >
            Book A Table
          </a>
        </li>
        <li>
          <a
            href="/about"
            onClick={(e) => {
              e.preventDefault();
              handleNavigation("/about");
            }}
          >
            About Us
          </a>
        </li>
        <li>
          <a
            href="/contact"
            onClick={(e) => {
              e.preventDefault();
              handleNavigation("/contact");
            }}
          >
            Contact
          </a>
        </li>
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
      <div className={`mobile-nav ${isMobileMenuOpen ? "active" : ""}`}>
        <button
          className="close-menu"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-label="Close menu"
        >
          ×
        </button>
        <ul className="mobile-menu">
          <li>
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                handleNavigation("/");
                setIsMobileMenuOpen(false);
              }}
            >
              Home
            </a>
          </li>
          <li>
            <a
              href="/menu"
              onClick={(e) => {
                e.preventDefault();
                handleNavigation("/menu");
                setIsMobileMenuOpen(false);
              }}
            >
              Menu
            </a>
          </li>
          <li>
            <a
              href="/Reservation"
              onClick={(e) => {
                e.preventDefault();
                handleNavigation("/Reservation");
                setIsMobileMenuOpen(false);
              }}
            >
              Book A Table
            </a>
          </li>
          <li>
            <a
              href="/about"
              onClick={(e) => {
                e.preventDefault();
                handleNavigation("/about");
                setIsMobileMenuOpen(false);
              }}
            >
              About Us
            </a>
          </li>
          <li>
            <a
              href="/contact"
              onClick={(e) => {
                e.preventDefault();
                handleNavigation("/contact");
                setIsMobileMenuOpen(false);
              }}
            >
              Contact
            </a>
          </li>
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
