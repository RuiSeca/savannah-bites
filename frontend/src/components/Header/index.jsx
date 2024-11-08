import React from 'react';
import { Link } from 'react-router-dom';
import CookingPotBasket from '../CookingPotBasket';
import './styles.css';

function Header() {
  return (
    <header className="header">
      <div className="logo">
        <Link to="/">Savannah Bites</Link>
      </div>
      <nav>
        <ul>
          <li><Link to="/">Home</Link></li>
          <li><Link to="/menu">Menu</Link></li>
          <li><Link to="/about">About</Link></li>
          <li><Link to="/contact">Contact</Link></li>
        </ul>
      </nav>
      <div className="cooking-pot-basket">
        <CookingPotBasket />
      </div>
    </header>
  );
}

export default Header;
