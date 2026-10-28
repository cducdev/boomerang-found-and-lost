import { useCallback, useEffect, useState } from 'react';
import { Bell, ChevronRight, RefreshCw, ShieldCheck, X } from 'lucide-react';
import Landing from './Landing.jsx';
import Finder from './Finder.jsx';
import { AuthDialog, Button, Sidebar } from './components.jsx';
import { EventsPage, GuidePage, ItemsPage } from './Dashboard.jsx';
import { AddItemDialog, QRDialog } from './ItemDialogs.jsx';
import { api, initials } from './lib.js';

export default function App() {
  const token = window.location.pathname.match(/^\/q\/([^/]+)\/?$/)?.[1];
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!token);
  const [auth, setAuth] = useState(null);
  const [page, setPage] = useState('items');
  const [items, setItems] = useState([]);
  const [events, setEvents] = useState([]);
  const [adding, setAdding] = useState(false);
  const [qrItem, setQrItem] = useState(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const refresh = useCallback(async () => {
    const [nextItems, nextEvents] = await Promise.all([api('/items'), api('/events')]);
    setItems(nextItems);
    setEvents(nextEvents);
    setError('');
  }, []);
  useEffect(() => {
    if (token) return;
    api('/auth/me')
      .then((data) => setUser(data.user))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);
  useEffect(() => {
    if (!user) return;
    let active = true;
    const load = () =>
      refresh().catch((err) => {
        if (active) setError(err.message);
      });
    load();
    const interval = setInterval(load, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [user, refresh]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 4000);
    return () => clearTimeout(timer);
  }, [toast]);
  async function logout() {
    try {
      await api('/auth/logout', { method: 'POST', body: {} });
      setUser(null);
      setItems([]);
      setEvents([]);
      setPage('items');
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }
  async function status(item, next) {
    await api('/items/' + item.id, { method: 'PATCH', body: { status: next } });
    await refresh();
    setToast(
      next === 'lost'
        ? 'Đã đánh dấu đồ vật thất lạc.'
        : next === 'returned'
          ? 'Thật vui vì món đồ đã trở về!'
          : 'Đã cập nhật trạng thái.',
    );
  }
  async function remove(item) {
    await api('/items/' + item.id, { method: 'DELETE' });
    await refresh();
    setToast('Đã xóa nhãn QR.');
  }
  async function read() {
    try {
      await api('/events/read', { method: 'POST', body: {} });
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  }
  if (token) return <Finder token={token} />;
  if (loading)
    return (
      <div className="app-loading" role="status">
        <img
          className="loading-mark"
          src="/brand/boomerang-symbol.png"
          alt=""
          width="65"
          height="76"
        />
        Đang mở góc an tâm của bạn…
      </div>
    );
  const unread = events.filter((e) => !e.isRead).length;
  return (
    <>
      {!user ? (
        <>
          <Landing onAuth={setAuth} />
          {error && (
            <div className="connection-error" role="alert">
              {error}
              <button className="text-button" onClick={() => window.location.reload()}>
                Thử lại
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="app-shell">
          <Sidebar
            {...{ user, page, unread }}
            onPage={setPage}
            onAdd={() => setAdding(true)}
            onLogout={logout}
          />
          <div className="main-shell">
            <header className="app-topbar">
              <div className="breadcrumb">
                Không gian cá nhân
                <ChevronRight size={14} />
                <strong>
                  {page === 'items'
                    ? 'Đồ vật của tôi'
                    : page === 'events'
                      ? 'Thông báo'
                      : 'Cách sử dụng'}
                </strong>
              </div>
              <div className="topbar-right">
                <span className="account-label">
                  <span className="live-dot" /> Tài khoản cá nhân
                </span>
                <button
                  className="icon-button notification-button"
                  aria-label={`Thông báo${unread ? `, ${unread} chưa đọc` : ''}`}
                  onClick={() => setPage('events')}
                >
                  <Bell size={19} />
                  {unread > 0 && <i />}
                </button>
                <span className="avatar small">{initials(user.name)}</span>
              </div>
            </header>
            <main className="dashboard-content">
              {error && (
                <div className="error-banner" role="alert">
                  {error}
                  <button
                    className="text-button"
                    onClick={() => refresh().catch((err) => setError(err.message))}
                  >
                    <RefreshCw size={15} />
                    Thử lại
                  </button>
                </div>
              )}
              {page === 'items' ? (
                <ItemsPage
                  {...{ user, items }}
                  onAdd={() => setAdding(true)}
                  onQR={setQrItem}
                  onStatus={status}
                  onDelete={remove}
                />
              ) : page === 'events' ? (
                <EventsPage events={events} onRead={read} />
              ) : (
                <GuidePage onAdd={() => setAdding(true)} />
              )}
            </main>
            <footer className="dashboard-footer">
              <span>
                Boomerang Lost &amp; Found <span>Mỗi món đồ, một đường về.</span>
              </span>
              <span>
                <ShieldCheck size={13} /> Dự án sinh viên · SS004
              </span>
            </footer>
          </div>
        </div>
      )}
      {auth && (
        <AuthDialog
          mode={auth}
          onClose={() => setAuth(null)}
          onSuccess={(nextUser) => {
            setUser(nextUser);
            setAuth(null);
          }}
        />
      )}
      {adding && (
        <AddItemDialog
          onClose={() => setAdding(false)}
          onCreated={(item) => {
            setAdding(false);
            setQrItem(item);
            refresh().catch((err) => setError(err.message));
            setToast('Đã tạo nhãn QR. In và dán lên đồ vật nhé!');
          }}
        />
      )}
      {qrItem && (
        <QRDialog
          item={qrItem}
          onClose={() => setQrItem(null)}
          onSaved={(updated) =>
            setItems((current) =>
              current.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)),
            )
          }
        />
      )}
      {toast && (
        <div className="toast" role="status">
          <ShieldCheck size={18} />
          {toast}
          <button className="icon-button" aria-label="Ẩn thông báo" onClick={() => setToast('')}>
            <X size={16} />
          </button>
        </div>
      )}
    </>
  );
}
