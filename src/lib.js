export async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Không thể kết nối. Vui lòng thử lại.');
  return data;
}
export const statuses = {
  safe: ['Đang giữ', 'safe'],
  lost: ['Thất lạc', 'lost'],
  returned: ['Đã nhận lại', 'returned'],
};
export const dateTime = (value) =>
  new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
export const initials = (name) =>
  name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((v) => v[0])
    .join('')
    .toUpperCase();
