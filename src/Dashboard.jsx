import { useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  Check,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  Clock3,
  Inbox,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Plus,
  QrCode,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import { Button, categoryIcons, Dialog, Steps, TagArt } from './components.jsx';
import { dateTime, statuses } from './lib.js';

function ItemCard({ item, onQR, onStatus, onDelete }) {
  const Icon = categoryIcons[item.category] || categoryIcons['Khác'];
  const [menu, setMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [statusError, setStatusError] = useState('');
  return (
    <article className={`item-card category-${Object.keys(categoryIcons).indexOf(item.category)}`}>
      <div className="item-visual">
        <span className="item-visual-ring" />
        <Icon size={65} strokeWidth={1.25} />
        <span className={`status-badge ${statuses[item.status][1]}`}>
          <span />
          {statuses[item.status][0]}
        </span>
        <button
          className="card-menu-button icon-button"
          aria-label={`Đổi trạng thái ${item.name}`}
          onClick={() => setMenu(!menu)}
          aria-expanded={menu}
        >
          <MoreHorizontal size={21} />
        </button>
        {menu && (
          <div className="card-menu">
            <button
              onClick={async () => {
                try {
                  await onStatus(item, item.status === 'lost' ? 'returned' : 'lost');
                  setMenu(false);
                } catch (err) {
                  setStatusError(err.message);
                }
              }}
            >
              {item.status === 'lost' ? (
                <>
                  <Check size={16} />
                  Đã nhận lại đồ
                </>
              ) : (
                <>
                  <Bell size={16} />
                  Báo thất lạc
                </>
              )}
            </button>
            {item.status !== 'safe' && (
              <button
                onClick={async () => {
                  try {
                    await onStatus(item, 'safe');
                    setMenu(false);
                  } catch (err) {
                    setStatusError(err.message);
                  }
                }}
              >
                <ShieldCheck size={16} />
                Đang giữ đồ
              </button>
            )}
            <button
              className="danger-text"
              onClick={() => {
                setConfirmDelete(true);
                setMenu(false);
              }}
            >
              <Trash2 size={16} />
              Xóa nhãn QR
            </button>
            {statusError && (
              <p className="form-error" role="alert">
                {statusError}
              </p>
            )}
          </div>
        )}
      </div>
      <div className="item-info">
        <span className="item-category">{item.category}</span>
        <h3>{item.name}</h3>
        <p>{item.description || 'Một món đồ, một chiếc nhãn an tâm.'}</p>
        <div className="item-footer">
          <span>
            <QrCode size={14} />
            {item.scans || 0} lượt mở QR
          </span>
          <button className="text-button" onClick={() => onQR(item)}>
            Xem QR <ArrowUpRight size={16} />
          </button>
        </div>
      </div>
      {confirmDelete && (
        <Dialog title="Xóa nhãn QR?" onClose={() => setConfirmDelete(false)}>
          <p>
            Nhãn của <strong>{item.name}</strong> và lịch sử thông báo sẽ bị xóa. QR đã in sẽ không
            còn hoạt động.
          </p>
          {statusError && (
            <p role="alert" className="form-error">
              {statusError}
            </p>
          )}
          <div className="dialog-actions">
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
              Giữ lại
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                try {
                  await onDelete(item);
                } catch (err) {
                  setStatusError(err.message);
                }
              }}
            >
              Xóa nhãn
            </Button>
          </div>
        </Dialog>
      )}
    </article>
  );
}

export function ItemsPage({ user, items, onAdd, onQR, onStatus, onDelete }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const filtered = items.filter(
    (item) =>
      (filter === 'all' || item.status === filter) &&
      (category === 'all' || item.category === category) &&
      item.name.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi')),
  );
  return (
    <>
      <div className="page-intro">
        <div>
          <p className="hello">
            Chào {user.name.split(' ').slice(-1)[0]}, hôm nay bạn thế nào? <span>☀</span>
          </p>
          <h1>
            Đồ vật của tôi<span className="heading-dot">.</span>
          </h1>
          <p className="muted">Những món đồ thân quen, thêm một cách để tìm về.</p>
        </div>
        <Button onClick={onAdd}>
          <Plus size={18} />
          Thêm đồ vật
        </Button>
      </div>
      <section className="dashboard-banner">
        <div>
          <span className="eyebrow">
            <span className="live-dot" /> MANG THEO ĐỒ VẬT, MANG THEO AN TÂM
          </span>
          <h2>
            Một chiếc nhãn nhỏ.
            <br />
            Một cơ hội tìm lại lớn hơn.
          </h2>
          <p>
            Tạo QR, in và dán. Khi ai đó quét mã,
            <br className="desktop-break" /> bạn có thêm một kết nối để tìm lại đồ.
          </p>
          <button className="text-button" onClick={onAdd}>
            Tạo nhãn cho món đồ của bạn <ArrowUpRight size={17} />
          </button>
        </div>
        <TagArt compact />
      </section>
      <section className="stats" aria-label="Thống kê đồ vật">
        <div>
          <span className="stat-icon">
            <QrCode size={19} />
          </span>
          <div>
            <span>Tổng đồ vật</span>
            <strong>{items.length.toString().padStart(2, '0')}</strong>
          </div>
          <small>Đã gắn nhãn QR</small>
        </div>
        <div>
          <span className="stat-icon amber">
            <Search size={19} />
          </span>
          <div>
            <span>Đang thất lạc</span>
            <strong>
              {items
                .filter((i) => i.status === 'lost')
                .length.toString()
                .padStart(2, '0')}
            </strong>
          </div>
          <small>Đang chờ kết nối</small>
        </div>
        <div>
          <span className="stat-icon mint">
            <CircleCheck size={19} />
          </span>
          <div>
            <span>Đã nhận lại</span>
            <strong>
              {items
                .filter((i) => i.status === 'returned')
                .length.toString()
                .padStart(2, '0')}
            </strong>
          </div>
          <small>Lại trở về bên bạn</small>
        </div>
      </section>
      <div className="collection-heading">
        <h2>
          Bộ sưu tập của bạn <span>{items.length}</span>
        </h2>
        <div className="collection-controls">
          <label className="search-field">
            <Search size={17} />
            <input
              aria-label="Tìm đồ vật"
              placeholder="Tìm tên đồ vật…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <label className="category-filter">
            <SlidersHorizontal size={16} />
            <select
              aria-label="Lọc loại đồ vật"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="all">Tất cả loại</option>
              {Object.keys(categoryIcons).map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <div className="filter-tabs" role="group" aria-label="Lọc trạng thái">
        {[
          ['all', 'Tất cả'],
          ['safe', 'Đang giữ'],
          ['lost', 'Thất lạc'],
          ['returned', 'Đã nhận lại'],
        ].map(([key, label]) => (
          <button
            key={key}
            className={filter === key ? 'selected' : ''}
            onClick={() => setFilter(key)}
          >
            {label}
            {key === 'all' && <span>{items.length}</span>}
          </button>
        ))}
      </div>
      {filtered.length ? (
        <div className="item-grid">
          {filtered.map((item) => (
            <ItemCard key={item.id} {...{ item, onQR, onStatus, onDelete }} />
          ))}
          <button className="add-item-card" onClick={onAdd}>
            <span>
              <Plus size={24} />
            </span>
            <strong>Thêm một món đồ</strong>
            <small>Thêm một chút an tâm</small>
          </button>
        </div>
      ) : (
        <div className="empty-state">
          <span className="empty-icon">
            <QrCode size={36} strokeWidth={1.4} />
          </span>
          <h3>
            {items.length
              ? 'Chưa tìm thấy món đồ phù hợp'
              : 'Chiếc nhãn đầu tiên, dành cho món đồ nào?'}
          </h3>
          <p>
            {items.length
              ? 'Thử đổi từ khóa hoặc bộ lọc để tìm lại.'
              : 'Bắt đầu với balo, ví hay chùm chìa khóa bạn mang theo mỗi ngày.'}
          </p>
          <Button
            variant="secondary"
            onClick={
              items.length
                ? () => {
                    setFilter('all');
                    setCategory('all');
                    setSearch('');
                  }
                : onAdd
            }
          >
            {items.length ? 'Xóa bộ lọc' : 'Thêm đồ vật đầu tiên'}
            <Plus size={16} />
          </Button>
        </div>
      )}
      <div className="bottom-note">
        <ShieldCheck size={15} />
        Thông tin liên hệ chỉ được hiển thị theo lựa chọn của bạn.
      </div>
    </>
  );
}

export function EventsPage({ events, onRead }) {
  return (
    <>
      <div className="page-intro">
        <div>
          <p className="hello">Những kết nối đang tìm đến bạn</p>
          <h1>
            Thông báo<span className="heading-dot">.</span>
          </h1>
          <p className="muted">Lượt mở QR và lời nhắn từ người nhặt, ở cùng một nơi.</p>
        </div>
        <Button variant="secondary" onClick={onRead} disabled={!events.some((e) => !e.isRead)}>
          <Check size={17} />
          Đánh dấu đã đọc
        </Button>
      </div>
      <div className="info-banner">
        <Bell size={19} />
        <p>
          Thông báo tự cập nhật mỗi 5 giây khi bạn mở web. Lượt mở QR chỉ cho biết trang đã được mở,
          chưa xác nhận đồ vật đã được tìm thấy.
        </p>
      </div>
      {!events.length ? (
        <div className="empty-state">
          <span className="empty-icon">
            <Inbox size={36} />
          </span>
          <h3>Hộp tin đang yên ắng</h3>
          <p>Khi ai đó mở QR hoặc gửi lời nhắn, bạn sẽ thấy thông tin tại đây.</p>
        </div>
      ) : (
        <div className="events-list">
          {events.map((event) => (
            <article key={event.id} className={`event ${!event.isRead ? 'unread' : ''}`}>
              <span className={`event-icon ${event.kind === 'message' ? 'message' : ''}`}>
                {event.kind === 'message' ? <MessageCircle size={20} /> : <QrCode size={20} />}
              </span>
              <div className="event-content">
                <div className="event-title">
                  <h2>
                    {event.kind === 'message' ? 'Có lời nhắn mới' : 'Có người vừa mở mã QR'}{' '}
                    <span>· {event.itemName}</span>
                  </h2>
                  <time>{dateTime(event.createdAt)}</time>
                </div>
                {event.kind === 'message' && (
                  <>
                    <p className="event-message">{event.message}</p>
                    {event.finderName && (
                      <p>
                        <strong>Người gửi:</strong> {event.finderName}
                      </p>
                    )}
                    {event.location && (
                      <p>
                        <MapPin size={14} />
                        {event.location}
                      </p>
                    )}
                    {event.contact && (
                      <p>
                        <strong>Liên hệ:</strong> {event.contact}
                      </p>
                    )}
                    {event.latitude != null && (
                      <a
                        href={`https://www.openstreetmap.org/?mlat=${event.latitude}&mlon=${event.longitude}#map=17/${event.latitude}/${event.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="preview-link"
                      >
                        <MapPin size={14} />
                        Xem vị trí được chia sẻ <ArrowUpRight size={14} />
                      </a>
                    )}
                  </>
                )}
              </div>
              {!event.isRead && <span className="unread-dot" aria-label="Chưa đọc" />}
            </article>
          ))}
        </div>
      )}
    </>
  );
}

export function GuidePage({ onAdd }) {
  return (
    <>
      <div className="page-intro">
        <div>
          <p className="hello">Chào mừng đến với Boomerang Lost & Found</p>
          <h1>
            Một chiếc nhãn. Ba bước<span className="heading-dot">.</span>
          </h1>
          <p className="muted">Không cần pin, không cần thiết bị đi kèm.</p>
        </div>
      </div>
      <Steps full />
      <div className="guide-note">
        <ShieldCheck size={30} />
        <h2>Chia sẻ vừa đủ để tìm được nhau.</h2>
        <p>
          QR không chứa thông tin cá nhân trực tiếp. Bạn chọn có hiển thị số điện thoại hay không.
          Người nhặt chỉ cần có Internet để gửi lời nhắn; vị trí chỉ được gửi khi họ đồng ý.
        </p>
        <p>
          Hãy in QR rõ nét, giữ phần viền trắng và dán ở nơi dễ thấy. Thử quét bằng một điện thoại
          khác trước khi sử dụng.
        </p>
        <Button onClick={onAdd}>
          Tạo QR cho món đồ của bạn <ArrowUpRight size={17} />
        </Button>
      </div>
    </>
  );
}
