import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './Footer.css';

const Footer: React.FC = () => {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const emailRegex = /\S+@\S+\.\S+/;
    if (!email || !emailRegex.test(email)) {
      alert('Please enter a valid email address');
      return;
    }
    // Here you would typically send the email to the backend
    alert('Subscribed successfully!');
    setEmail('');
  };

  return (
    <footer className="footer">
      <div className="footer-content">
        {/* Social Media */}
        <div>
          <h3>{t('Connect With Us')}</h3>
          <div className="social-links">
            <a href="https://facebook.com/usiu.africa" target="_blank" rel="noopener noreferrer">
              <svg className="social-icon" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" fill="currentColor"/></svg> Facebook
            </a>
            <a href="https://twitter.com/usiu_africa" target="_blank" rel="noopener noreferrer">
              <svg className="social-icon" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" fill="currentColor"/></svg> Twitter
            </a>
            <a href="https://instagram.com/usiu_africa" target="_blank" rel="noopener noreferrer">
              <svg className="social-icon" viewBox="0 0 24 24"><path d="M12.017 0C8.396 0 7.996.014 6.79.067 5.59.12 4.694.265 3.94.51c-.806.26-1.49.598-2.175 1.282C.598 2.476.26 3.16.01 3.966c-.245.754-.39 1.65-.443 2.85C-.01 7.996-.024 8.396 0 12.017s.014 4.021.067 5.227c.053 1.2.198 2.096.443 2.85.26.806.598 1.49 1.282 2.175.686.686 1.37 1.024 2.175 1.282.754.245 1.65.39 2.85.443C7.996 23.99 8.396 24 12.017 24s4.021-.014 5.227-.067c1.2-.053 2.096-.198 2.85-.443.806-.26 1.49-.598 2.175-1.282.686-.686 1.024-1.37 1.282-2.175.245-.754.39-1.65.443-2.85.067-1.206.067-1.606.067-5.227s-.014-4.021-.067-5.227c-.053-1.2-.198-2.096-.443-2.85-.26-.806-.598-1.49-1.282-2.175C21.524.598 20.84.26 20.034.01c-.754-.245-1.65-.39-2.85-.443C16.021.014 15.621 0 12.017 0zm0 2.187c3.583 0 4.005.014 5.417.078 1.3.06 2.007.28 2.48.465.566.218 1.087.6 1.568 1.08.48.48.862 1.002 1.08 1.568.185.473.405 1.18.465 2.48.064 1.412.078 1.834.078 5.417s-.014 4.005-.078 5.417c-.06 1.3-.28 2.007-.465 2.48-.218.566-.6 1.087-1.08 1.568-.48.48-1.002.862-1.568 1.08-.473.185-1.18.405-2.48.465-1.412.064-1.834.078-5.417.078s-4.005-.014-5.417-.078c-1.3-.06-2.007-.28-2.48-.465-.566-.218-1.087-.6-1.568-1.08-.48-.48-.862-1.002-1.08-1.568-.185-.473-.405-1.18-.465-2.48C2.202 16.022 2.188 15.6 2.187 12.017s.014-4.005.078-5.417c.06-1.3.28-2.007.465-2.48.218-.566.6-1.087 1.08-1.568.48-.48 1.002-.862 1.568-1.08.473-.185 1.18-.405 2.48-.465 1.412-.064 1.834-.078 5.417-.078zm0 3.124c-3.867 0-7 3.133-7 7s3.133 7 7 7 7-3.133 7-7-3.133-7-7-7zm0 11.5c-2.485 0-4.5-2.015-4.5-4.5s2.015-4.5 4.5-4.5 4.5 2.015 4.5 4.5-2.015 4.5-4.5 4.5zm8.156-11.406c0 .9-.73 1.63-1.63 1.63-.9 0-1.63-.73-1.63-1.63s.73-1.63 1.63-1.63 1.63.73 1.63 1.63z" fill="currentColor"/></svg> Instagram
            </a>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <form className="newsletter-form" onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Enter your email address for updates"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '200px' }}
          />
          <button className="newsletter-btn" type="submit">{t('Subscribe')}</button>
        </form>
        <div className="copyright">
          &copy; {currentYear} USIU-Africa. {t('All rights reserved.')} Contact: +254711226429
        </div>
      </div>
    </footer>
  );
};

export default Footer;