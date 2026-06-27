import { Link } from 'react-router-dom';
export default function SiteFooter() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-cols">
          <div>
            <div className="footer-logo">ಕಯ್ನಾಡ ಸುದ್ದಿ</div>
            <p className="footer-desc">ಕರ್ನಾಟಕದ ಪ್ರಮುಖ ಕನ್ನಡ ಸುದ್ದಿ ತಾಣ. ರಾಜ್ಯ, ದೇಶ, ಅಂತರಾಷ್ಟ್ರೀಯ ಸುದ್ದಿಗಳ ವಿಶ್ವಾಸಾರ್ಹ ಮೂಲ.</p>
          </div>
          <div>
            <div className="footer-col-title">ವಿಭಾಗಗಳು</div>
            <div className="footer-links">
              <Link to="/category/karnataka">ಕರ್ನಾಟಕ</Link>
              <Link to="/category/rajya">ರಾಜ್ಯ</Link>
              <Link to="/category/rajakeeyata">ರಾಜಕೀಯ</Link>
              <Link to="/category/desh">ದೇಶ</Link>
              <Link to="/category/antarashetriya">ಅಂತರಾಷ್ಟ್ರೀಯ</Link>
              <Link to="/category/entertainment">ಮನರಂಜನೆ</Link>
              <Link to="/category/sports">ಕ್ರೀಡೆ</Link>
            </div>
          </div>
          <div>
            <div className="footer-col-title">ಹೆಚ್ಚಿನ ವಿಭಾಗಗಳು</div>
            <div className="footer-links">
              <Link to="/category/science">ವಿಜ್ಞಾನ</Link>
              <Link to="/category/employment">ಉದ್ಯೋಗ</Link>
              <Link to="/category/finance">ಹಣಕಾಸು</Link>
              <Link to="/category/health">ಆರೋಗ್ಯ</Link>
            </div>
          </div>
          <div>
            <div className="footer-col-title">ನಮ್ಮ ಬಗ್ಗೆ</div>
            <div className="footer-links">
              <Link to="/page/about">ನಮ್ಮ ಬಗ್ಗೆ</Link>
              <Link to="/page/contact">ಸಂಪರ್ಕಿಸಿ</Link>
              <Link to="/page/advertise">ಜಾಹೀರಾತು</Link>
              <Link to="/page/privacy-policy">ಗೌಪ್ಯತಾ ನೀತಿ</Link>
              <Link to="/page/terms">ಸೇವಾ ನಿಯಮಗಳು</Link>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          © {new Date().getFullYear()} ಕರ್ನಾಡ ಸುದ್ದಿ. ಎಲ್ಲ ಹಕ್ಕುಗಳು ಕಾಯ್ದಿರಿಸಲಾಗಿದೆ.
        </div>
      </div>
    </footer>
  );
}
