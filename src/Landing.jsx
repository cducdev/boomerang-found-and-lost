import { ArrowDown, ArrowUpRight, Check, HeartHandshake, QrCode, ShieldCheck } from 'lucide-react';
import { Button, Logo, Steps, TagArt } from './components.jsx';

export default function Landing({ onAuth }) {
  return (
    <div className="landing">
      <header className="landing-header">
        <Logo />
        <nav aria-label="Giới thiệu">
          <a href="#how-it-works">Cách hoạt động</a>
          <a href="#why-boomerang">Vì sao Boomerang Lost & Found?</a>
        </nav>
        <div className="header-actions">
          <button className="text-button" onClick={() => onAuth('login')}>
            Đăng nhập
          </button>
          <Button onClick={() => onAuth('register')}>
            Bắt đầu miễn phí <ArrowUpRight size={17} />
          </Button>
        </div>
      </header>
      <main>
        <section className="landing-hero">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="live-dot" /> NHỎ NHƯ CHIẾC NHÃN. LỚN HƠN SỰ AN TÂM.
            </div>
            <h1>
              Để đồ thất lạc
              <br />
              có <span>đường về.</span>
              <svg viewBox="0 0 330 16" preserveAspectRatio="none">
                <path d="M3 11Q150 -2 325 9" />
              </svg>
            </h1>
            <p>
              Chiếc balo, chùm chìa khóa, món đồ yêu thích.
              <br className="desktop-break" /> Một mã QR nhỏ giúp người nhặt kết nối với bạn.
            </p>
            <div className="hero-actions">
              <Button onClick={() => onAuth('register')}>
                Tạo QR đầu tiên <ArrowUpRight size={19} />
              </Button>
              <a className="secondary-link" href="#how-it-works">
                Khám phá cách dùng <ArrowDown size={16} />
              </a>
            </div>
            <div className="hero-checks">
              <span>
                <Check size={15} /> Không cần thiết bị
              </span>
              <span>
                <Check size={15} /> Quét bằng camera điện thoại
              </span>
            </div>
          </div>
          <TagArt />
        </section>
        <div className="trust-strip">
          <span>DÀNH CHO NHỮNG MÓN ĐỒ BẠN THƯƠNG</span>
          <div>
            <QrCode size={18} /> Một mã cho mỗi món đồ
          </div>
          <div>
            <ShieldCheck size={18} /> Bạn chọn thông tin chia sẻ
          </div>
          <div>
            <HeartHandshake size={18} /> Kết nối từ sự tử tế
          </div>
        </div>
        <section id="how-it-works" className="landing-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">THẬT ĐƠN GIẢN</span>
              <h2>Ba bước nhỏ. Bớt một nỗi lo.</h2>
            </div>
            <p>
              Từ đồ vật của bạn
              <br />
              đến một cơ hội tìm lại.
            </p>
          </div>
          <Steps />
        </section>
        <section id="why-boomerang" className="why-section">
          <div>
            <span className="eyebrow">THÔNG TIN VỪA ĐỦ, KẾT NỐI DỄ DÀNG</span>
            <h2>
              Gửi lời nhắn,
              <br />
              không cần cài app.
            </h2>
            <p>
              Người nhặt mở camera, quét mã và để lại lời nhắn ngay trên trình duyệt. Bạn có thể giữ
              kín số điện thoại và nhận thông tin trong tài khoản Boomerang Lost & Found.
            </p>
            <Button variant="secondary" onClick={() => onAuth('register')}>
              Thử với món đồ của bạn <ArrowUpRight size={17} />
            </Button>
          </div>
          <div className="faq-list">
            {[
              [
                'QR có tự định vị đồ vật không?',
                'Boomerang Lost & Found kết nối bạn với người quét mã. Hệ thống không theo dõi vị trí liên tục; người nhặt có thể tự nguyện chia sẻ nơi nhặt hoặc vị trí hiện tại.',
              ],
              [
                'Người nhặt có cần tài khoản không?',
                'Không. Chỉ cần quét mã QR bằng điện thoại có Internet và gửi lời nhắn trên trang mở ra.',
              ],
              [
                'Tôi sẽ nhận thông báo ở đâu?',
                'Trong mục Thông báo khi đăng nhập Boomerang Lost & Found. Bản hiện tại chưa gửi email hoặc SMS.',
              ],
              [
                'Tôi có phải công khai số điện thoại?',
                'Không bắt buộc. Bạn có thể chỉ hiển thị tên và để người nhặt gửi lời nhắn qua website.',
              ],
            ].map(([q, a]) => (
              <details key={q}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <footer className="landing-footer">
        <Logo />
        <p>Mỗi món đồ đều xứng đáng có đường về.</p>
        <span>Dự án sinh viên · SS004</span>
      </footer>
    </div>
  );
}
