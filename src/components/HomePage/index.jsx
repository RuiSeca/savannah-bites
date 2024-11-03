import React from 'react';
import { useNavigate } from 'react-router-dom';
import './styles.css';
import HomeFood from '../../images/HomePage.jpg';
import JellofRice from '../../images/jollof-rice.jpg'
import Bobotie from '../../images/bobotie.jpg'
import PapChakalaka from '../../images/pap-chakalaka.jpg'



function HomePage() {
  const navigate = useNavigate();

  const handleMenuClick = () => {
    navigate('/menu');
  };

  const handleReservationClick = () => {
    navigate('/reservation');
  }

  const handleOrderClick = (dishName, price) => {
    // You can implement order functionality here
    console.log(`Ordered: ${dishName} - ${price}`);
  };

  return (
    <div className="home-page">
      <header className="header">
        <div className="header-content">
          <h1>Savannah Bites</h1>
          <p className="tagline">Embark on a Culinary Safari</p>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-text">
            <h2>Taste the Essence of Africa</h2>
            <p>
              Welcome to Savannah Bites, where every dish tells a story of tradition, 
              flavor, and passion. Our expert chefs bring the vibrant tastes of 
              African cuisine right to your plate, creating an unforgettable dining 
              experience.From rich spices to fresh, authentic ingredients, 
              each meal celebrates the heart and soul of home-cooked goodness, 
              creating an unforgettable dining experience designed to bring you 
              closer to the warmth of these cherished culinary traditions.
            </p>

            <div class="button-container">
              <button onClick={handleMenuClick} className="btn-home-menu">
              Order Our Menu
              </button>

              <button onClick={handleReservationClick} className="btn-home-reservation">
               Online Reservation
             </button>
            </div>

          </div>

          <div className="hero-image floating">
            <img 
              src={HomeFood} 
              alt="A colorful spread of various African dishes" 
            />
          </div>
        </section>

       <h2 className="section-title">Restaurant Featured Dishes</h2>
        <section className="featured-dishes">
          <div className="dish-card">
            <img src={JellofRice} alt="Jollof Rice Royale" />
            <div className="dish-info">
              <h3>Jollof Rice Royale</h3>
              <p>Our signature spicy rice dish, perfectly seasoned and served with succulent grilled chicken.</p>
              <p className="price">£14.99</p>
              <button 
                className="btn-home-order"
                onClick={() => handleOrderClick('Jollof Rice Royale', '£14.99')}
              >
                Add to Order
              </button>
            </div>
          </div>

          <div className="dish-card">
            <img src={PapChakalaka} alt="Pap & Chakalaka Fusion" />
            <div className="dish-info">
              <h3>Pap & Chakalaka Fusion</h3>
              <p>Smooth cornmeal porridge paired with our zesty vegetable relish for a burst of flavors.</p>
              <p className="price">£12.99</p>
              <button 
                className="btn-home-order"
                onClick={() => handleOrderClick('Pap & Chakalaka Fusion', '£12.99')}
              >
                Add to Order
              </button>
            </div>
          </div>

          <div className="dish-card">
            <img src={Bobotie} alt="Cape Bobotie Delight" />
            <div className="dish-info">
              <h3>Cape Bobotie Delight</h3>
              <p>A beloved South African dish featuring spiced minced meat topped with creamy egg custard.</p>
              <p className="price">£16.99</p>
              <button 
                className="btn-home-order"
                onClick={() => handleOrderClick('Cape Bobotie Delight', '£16.99')}
              >
                Add to Order
              </button>
            </div>
          </div>
        </section>

        <section className="info-blocks">
      <div className="info-block">
        <div className="icon">
          <svg viewBox="0 0 24 24" width="48" height="48">
            <path fill="var(--primary-color)" d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.21,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.21,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.67 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z"></path>
          </svg>
        </div>
        <h3>Traditional Recipes</h3>
        <p>Our dishes are crafted from authentic recipes passed down through generations, preserving the true essence of African cuisine.</p>
      </div>

      <div className="info-block">
        <div className="icon">
          <svg viewBox="0 0 24 24" width="48" height="48">
            <path fill="var(--primary-color)" d="M12,3L2,12H5V20H19V12H22L12,3M12,8.75A2.25,2.25 0 0,1 14.25,11A2.25,2.25 0 0,1 12,13.25A2.25,2.25 0 0,1 9.75,11A2.25,2.25 0 0,1 12,8.75M12,15C13.5,15 16.5,15.75 16.5,17.25V18H7.5V17.25C7.5,15.75 10.5,15 12,15Z"></path>
          </svg>
        </div>
        <h3>Expert Chefs</h3>
        <p>Our team of skilled chefs brings years of experience in authentic African cuisine, ensuring every dish is a masterpiece.</p>
      </div>

      <div className="info-block">
        <div className="icon">
          <svg viewBox="0 0 24 24" width="48" height="48">
            <path fill="var(--primary-color)" d="M12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,12.5A1.5,1.5 0 0,1 10.5,11A1.5,1.5 0 0,1 12,9.5A1.5,1.5 0 0,1 13.5,11A1.5,1.5 0 0,1 12,12.5M12,7.2C9.9,7.2 8.2,8.9 8.2,11C8.2,14 12,17.5 12,17.5C12,17.5 15.8,14 15.8,11C15.8,8.9 14.1,7.2 12,7.2Z"></path>
          </svg>
        </div>
        <h3>Fresh Ingredients</h3>
        <p>We source the finest local and imported ingredients to create authentic flavors that transport you straight to Africa.</p>
      </div>
    </section>

    <section className="testimonials">
      <h2>What Our Customers Say</h2>
      <div className="testimonial-grid">
        <div className="testimonial-card">
          <div className="quote">"The best African food I've had outside of Lagos! The Jollof Rice is absolutely incredible."</div>
          <div className="author">- Sarah M.</div>
          <div className="stars">★★★★★</div>
        </div>
        <div className="testimonial-card">
          <div className="quote">"Amazing flavors and excellent service. The Pap & Chakalaka brought back memories of my grandmother's cooking."</div>
          <div className="author">- Michael O.</div>
          <div className="stars">★★★★★</div>
        </div>
        <div className="testimonial-card">
          <div className="quote">"A must-visit restaurant! The authenticity of the dishes and the warm atmosphere make it special."</div>
          <div className="author">- Lisa K.</div>
          <div className="stars">★★★★★</div>
        </div>
      </div>
    </section>

    <section className="special-offers">
      <div className="offer-banner">
        <h2>Online Special Offers</h2>
        <div className="offer-content">
          <div className="offer">
            <h3>Family Feast</h3>
            <p>2 large main courses + 2 starters + 2 large drinks + 1 dessert</p>
            <p className="price">£89.99</p>
            <small>Perfect for family gatherings!</small>
          </div>
          <div className="offer">
            <h3>Lunch Special</h3>
            <p>Main course + side + drink + dessert</p>
            <p className="price">£17.99</p>
            <small>Available Mon-Fri, 11AM-3PM</small>
          </div>
          <div className="offer">
            <h3>Solo Trip Special</h3>
            <p>Main course + side + drink</p>
            <p className="price">£18.99</p>
            <small>Perfect for a solo meal!</small>
          </div>
        </div>
      </div>
    </section>
      </main>
    </div>
  );
}

export default HomePage;