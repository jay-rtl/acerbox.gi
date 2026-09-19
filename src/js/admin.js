import '../css/main.css';
import '../css/animations.css';
import '../css/features.css';
import '../css/admin.css';
import { api, refreshContext, setCsrf, feedback, busy, formError } from './api.js';

const login = document.querySelector('[data-login-form]');
const content = document.querySelector('[data-admin-content]');
const logout = document.querySelector('[data-logout]');
const notice = document.querySelector('[data-admin-feedback]');
const reviewList = document.querySelector('[data-admin-reviews]');
const bookingList = document.querySelector('[data-admin-bookings]');
const slotList = document.querySelector('[data-admin-slots]');
const blockList = document.querySelector('[data-admin-blocks]');
let reviews = []; let bookings = []; let timezone = 'America/New_York';
const node = (tag, text, className) => { const value = document.createElement(tag); value.textContent = text; if (className) value.className = className; return value; };
function view(authenticated) {
  login.hidden = authenticated; content.hidden = !authenticated; logout.hidden = !authenticated;
  if (!authenticated) { reviews = []; bookings = []; [reviewList, bookingList, slotList, blockList].forEach((list) => list.replaceChildren()); }
}
function errorMessage(error) {
  notice.textContent = error.message; notice.classList.add('is-error'); notice.setAttribute('role', 'alert');
  if (error.status === 401) { view(false); feedback(login, 'Your session expired. Please sign in again.', true); login.elements.username.focus(); }
}
function action(label, route, data, destructive = false) {
  const button = node('button', label); button.type = 'button';
  button.addEventListener('click', async () => {
    if (destructive && !window.confirm('Permanently delete this review?')) return;
    button.disabled = true;
    try { const result = await api(route, data); notice.textContent = result.message; notice.classList.remove('is-error'); await load(); }
    catch (error) { errorMessage(error); }
    finally { button.disabled = false; }
  });
  return button;
}
function actions(...buttons) { const row = node('div', '', 'admin-actions'); row.append(...buttons); return row; }
function renderReviews() {
  const filter = document.querySelector('[data-review-filter]').value;
  const rows = reviews.filter((review) => filter === 'all' || review.status === filter);
  reviewList.replaceChildren();
  if (!rows.length) reviewList.append(node('p', `No ${filter === 'all' ? '' : `${filter} `}reviews.`, 'feature-note'));
  rows.forEach((review) => {
    const item = node('article', '', 'admin-record');
    item.append(node('h3', review.client_name), node('p', `${review.status.toUpperCase()} / ${review.rating} stars / Submitted ${review.created_at} UTC`, 'admin-meta'), node('p', review.review_text));
    item.append(actions(action(review.status === 'pending' ? 'Approve' : 'Unpublish', `admin/reviews/${review.status === 'pending' ? 'approve' : 'unpublish'}`, { id: Number(review.id) }), action('Delete', 'admin/reviews/delete', { id: Number(review.id) }, true)));
    reviewList.append(item);
  });
}
function renderBookings() {
  const filter = document.querySelector('[data-booking-filter]').value;
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const rows = bookings.filter((booking) => filter === 'all' || (filter === 'upcoming' ? booking.date >= today && booking.status !== 'cancelled' : booking.status === filter));
  bookingList.replaceChildren();
  if (!rows.length) bookingList.append(node('p', 'No bookings match this view.', 'feature-note'));
  rows.forEach((booking) => {
    const item = node('article', '', 'admin-record');
    item.append(node('h3', `${booking.name} / ${booking.booking_type === 'shoot' ? 'Shoot Day' : 'Consultation Call'}`), node('p', `${booking.date} / ${booking.time}–${booking.end_time} / ${booking.status.toUpperCase()}`, 'admin-meta'));
    const details = node('details', ''); details.append(node('summary', 'Contact & project details'), node('p', `Email: ${booking.email}\nPhone: ${booking.phone || 'Not supplied'}\nSubmitted: ${booking.created_at} UTC\nNotes: ${booking.notes || 'None'}`)); item.append(details);
    const buttons = [];
    if (booking.status === 'pending') buttons.push(action('Confirm', 'admin/bookings/confirm', { id: booking.id }));
    if (booking.status !== 'cancelled') buttons.push(action('Cancel / reject', 'admin/bookings/cancel', { id: booking.id }));
    if (buttons.length) item.append(actions(...buttons));
    bookingList.append(item);
  });
}
async function load() {
  content.setAttribute('aria-busy', 'true');
  try {
    const [reviewData, bookingData, availability] = await Promise.all([api('admin/reviews'), api('admin/bookings'), api('admin/availability')]);
    reviews = reviewData.reviews; bookings = bookingData.bookings; renderReviews(); renderBookings();
    slotList.replaceChildren(); blockList.replaceChildren();
    availability.slots.forEach((slot) => {
      const item = node('article', '', 'admin-record');
      item.append(node('p', `${slot.date} / ${slot.time}–${slot.end_time} / ${slot.booking_type === 'shoot' ? 'Shoot Day' : 'Consultation Call'}`), actions(action('Remove window', 'admin/availability/remove', { id: slot.id })));
      slotList.append(item);
    });
    availability.blocked_dates.forEach((date) => {
      const item = node('article', '', 'admin-record'); item.append(node('p', date), actions(action('Unblock', 'admin/availability/unblock', { date }))); blockList.append(item);
    });
    if (!availability.slots.length) slotList.append(node('p', 'No availability configured. Add a time window above.', 'feature-note'));
    if (!availability.blocked_dates.length) blockList.append(node('p', 'No blocked dates.', 'feature-note'));
  } catch (error) { errorMessage(error); }
  finally { content.setAttribute('aria-busy', 'false'); }
}
login.addEventListener('submit', async (event) => {
  event.preventDefault(); if (login.getAttribute('aria-busy') === 'true') return;
  busy(login, true); feedback(login, 'Signing in…');
  try { const result = await api('login', Object.fromEntries(new FormData(login))); setCsrf(result.csrf); login.reset(); view(true); await load(); }
  catch (error) { formError(login, error); }
  finally { busy(login, false); }
});
logout.addEventListener('click', async () => {
  logout.disabled = true;
  try { await api('logout', {}); view(false); await refreshContext(); feedback(login, 'Signed out.'); }
  catch (error) { errorMessage(error); }
  finally { logout.disabled = false; }
});
document.querySelector('[data-review-filter]').addEventListener('change', renderReviews);
document.querySelector('[data-booking-filter]').addEventListener('change', renderBookings);
const slotForm = document.querySelector('[data-slot-form]');
slotForm.elements.booking_type.addEventListener('change', () => { const shoot = slotForm.elements.booking_type.value === 'shoot'; slotForm.elements.end_time.disabled = !shoot; slotForm.elements.end_time.required = shoot; });
for (const [selector, route] of [['[data-slot-form]', 'admin/availability/add'], ['[data-block-form]', 'admin/availability/block']]) {
  const form = document.querySelector(selector);
  form.addEventListener('submit', async (event) => {
    event.preventDefault(); if (form.getAttribute('aria-busy') === 'true') return;
    busy(form, true); feedback(form, 'Saving…');
    try { const result = await api(route, Object.fromEntries(new FormData(form))); feedback(form, result.message); await load(); }
    catch (error) { formError(form, error); if (error.status === 401) errorMessage(error); }
    finally { busy(form, false); }
  });
}
refreshContext().then(async (context) => { timezone = context.timezone; view(context.authenticated); if (context.authenticated) await load(); }).catch((error) => feedback(login, error.message, true));
