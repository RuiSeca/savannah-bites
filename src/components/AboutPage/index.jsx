import React, { useEffect } from 'react';
import './styles.css';
import ChefAmara from '../../images/chef-amara.jpg';
import ChefSous from '../../images/sous-chef.jpg';
import Manager from '../../images/manager.jpg';
import RestaurantInterior from '../../images/restaurant-interior.jpg';
import ChefCooking from '../../images/chef-cooking.jpg';



const AboutPage = () => {
  useEffect(() => {
    // Add intersection observer for fade-in effect
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('fade-in');
          }
        });
      },
      { threshold: 0.1 }
    );

    // Observe all about items and team members
    document.querySelectorAll('.about-item, .team-member').forEach((item) => {
      observer.observe(item);
    });

    // Cleanup observer
    return () => observer.disconnect();
  }, []);

  return (
    <div className="about-page">
      <div className="header-gradient">
        <h1>About Savannah Bites</h1>
        <p className="tagline">A Taste of African Culinary Heritage</p>
      </div>

      <section className="about-section">
        <div className="about-item">
          <div className="about-text">
            <h2>Our Story</h2>
            <p>
              Savannah Bites was born from a passion for authentic African cuisine and a desire 
              to share the rich flavors of the continent with food lovers everywhere. Founded 
              in 2015 by Chef Amara Diallo, our restaurant has quickly become a culinary 
              landmark, celebrated for its innovative take on traditional African dishes.
            </p>
            <p>
              Drawing inspiration from the diverse culinary traditions of Africa, from the 
              spicy stews of West Africa to the aromatic tagines of North Africa, we create 
              a unique dining experience that transports our guests to the heart of the 
              African savannah.
            </p>
            <a href="/menu" className="btn">Explore Our Menu</a>
          </div>
          <div className="about-image">
            <img src={RestaurantInterior} alt="Savannah Bites restaurant interior" />
          </div>
        </div>

        <div className="about-item">
          <div className="about-text">
            <h2>Our Philosophy</h2>
            <p>
              At Savannah Bites, we believe in using fresh, high-quality ingredients and 
              supporting local African communities. Every dish we serve is prepared with care 
              and attention to detail, ensuring an authentic and memorable dining experience.
            </p>
            <p>
              Our mission is to bring the rich flavors and culinary traditions of Africa to 
              food lovers everywhere. We work with talented local chefs who are passionate 
              about sharing their heritage through food.
            </p>
            <a href="/philosophy" className="btn">Learn More</a>
          </div>
          <div className="about-image">
            <img src={ChefCooking} alt="Chef preparing African cuisine" />
          </div>
        </div>
      </section>

      <section className="team-section">
        <h2>Meet Our Team</h2>
        <p>The heart and soul of Savannah Bites is our dedicated team of culinary experts.</p>
        <div className="team-grid">
          <div className="team-member">
            <img src={ChefAmara} alt="Chef Amara Diallo" />
            <div className="team-member-info">
              <h3>Amara Diallo</h3>
              <p>Founder & Head Chef</p>
            </div>
          </div>
          <div className="team-member">
            <img src={ChefSous} alt="Sous Chef Kwame Osei" />
            <div className="team-member-info">
              <h3>Kwame Osei</h3>
              <p>Sous Chef</p>
            </div>
          </div>
          <div className="team-member">
            <img src={Manager} alt="Restaurant Manager Zara Mensah" />
            <div className="team-member-info">
              <h3>Zara Mensah</h3>
              <p>Restaurant Manager</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;