import React from 'react';
import './Footer.css';

const Footer: React.FC = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="contact-info">
          <h3>Contact Us</h3>
          <p>Email: daudaabdulai3@gmail.com</p>
          <p>Phone: +254-711-226-429</p>
        </div>
        <div className="social-links">
          <a href="#">Facebook</a>
          <a href="#">Twitter</a>
          <a href="#">Instagram</a>
        </div>
      </div>
      <div className="copyright">
        <p>&copy; 2025 USIU-A Smart Food System. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;