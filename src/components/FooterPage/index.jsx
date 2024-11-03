import React from 'react';
import './styles.css';

const FooterPage = () => {
    const currentYear = new Date().getFullYear();
  
    const socialIcons = {
      facebook: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
        </svg>
      ),
      instagram: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
        </svg>
      ),
      twitter: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path>
        </svg>
      ),
      youtube: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path>
          <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon>
        </svg>
      )
    };
  
    const socialLinks = [
      { icon: socialIcons.facebook, href: 'https://facebook.com/savannahbites', label: 'Facebook' },
      { icon: socialIcons.instagram, href: 'https://instagram.com/savannahbites', label: 'Instagram' },
      { icon: socialIcons.twitter, href: 'https://twitter.com/savannahbites', label: 'Twitter' },
      { icon: socialIcons.youtube, href: 'https://youtube.com/savannahbites', label: 'Youtube' }
    ];
  
    return (
      <footer className="footer">
        <div className="footer-container">
          <div className="footer-grid">
            {/* Company Info */}
            <div className="company-info">
              <h3>Savannah Bites</h3>
              <p>123 Culinary Street</p>
              <p>London, UK EC1A 1BB</p>
              <p>Tel: +44 20 1234 5678</p>
            </div>
  
            {/* Quick Links */}
            <div className="quick-links">
              <h3>Quick Links</h3>
              <ul>
                <li><a href="/menu">Menu</a></li>
                <li><a href="/about">About Us</a></li>
                <li><a href="/contact">Contact</a></li>
                <li><a href="/reservations">Reservations</a></li>
              </ul>
            </div>
  
            {/* Social Media */}
            <div className="social-media">
              <h3>Connect With Us</h3>
              <div className="social-icons">
                {socialLinks.map(({ icon, href, label }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-icon"
                    aria-label={label}
                  >
                    {icon}
                  </a>
                ))}
              </div>
            </div>
          </div>
  
          {/* Bottom Bar */}
          <div className="footer-bottom">
            <p>Bringing the heart of African cuisine to your table</p>
            <p>&copy; {currentYear} Savannah Bites. All rights reserved.</p>
          </div>
        </div>
      </footer>
    );
  };
  
  export default FooterPage;