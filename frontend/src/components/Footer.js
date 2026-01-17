import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="modern-footer">
      <div className="footer-container-modern">
        <div className="footer-grid-modern">
          {/* About Section */}
          <div className="footer-column-modern">
            <h4 className="footer-heading-modern">About TeaHaven</h4>
            <p className="footer-text-modern">
              Premium teas sourced directly from the finest tea gardens in Japan, China, India, and beyond.
            </p>
            <p className="footer-text-modern">
              Based in Ohio, shipping worldwide.
            </p>
          </div>

          {/* Contact Section */}
          <div className="footer-column-modern">
            <h4 className="footer-heading-modern">Contact</h4>
            <ul className="footer-list-modern">
              <li>Email: hello@teahaven.com</li>
              <li>Phone: (555) 123-4567</li>
              <li>Hours: Mon-Fri, 9AM-6PM EST</li>
            </ul>
          </div>

          {/* Returns & Shipping */}
          <div className="footer-column-modern">
            <h4 className="footer-heading-modern">Returns & Shipping</h4>
            <ul className="footer-list-modern">
              <li><Link to="/shipping">Shipping Information</Link></li>
              <li><Link to="/returns">Return Policy</Link></li>
              <li><Link to="/tracking">Track Order</Link></li>
              <li><Link to="/faq">FAQ</Link></li>
            </ul>
          </div>

          {/* Privacy & Terms */}
          <div className="footer-column-modern">
            <h4 className="footer-heading-modern">Privacy & Terms</h4>
            <ul className="footer-list-modern">
              <li><Link to="/privacy">Privacy Policy</Link></li>
              <li><Link to="/terms">Terms of Service</Link></li>
              <li><Link to="/cookies">Cookie Policy</Link></li>
            </ul>
          </div>
        </div>

        {/* Social Links */}
        <div className="footer-social-modern">
          <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="social-link-modern">
            Facebook
          </a>
          <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="social-link-modern">
            Instagram
          </a>
          <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="social-link-modern">
            Twitter
          </a>
          <a href="https://pinterest.com" target="_blank" rel="noopener noreferrer" className="social-link-modern">
            Pinterest
          </a>
        </div>

        {/* Bottom Bar */}
        <div className="footer-bottom-modern">
          <p>&copy; 2026 TeaHaven. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
