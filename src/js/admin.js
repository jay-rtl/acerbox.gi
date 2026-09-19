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
let reviews = [];
const node = (tag, text, className) => { const value = document.createElement(tag); value.textContent = text; if (className) value.className = className; return value; };
function view(authenticated) {
  login.hidden = authenticated; content.hidden = !authenticated; logout.hidden = !authenticated;
  if (!authenticated) { reviews = []; reviewList.replaceChildren(); notice.textContent = ''; }
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
function renderReviews() {
  const filter = document.querySelector('[data-review-filter]').value;
  const rows = reviews.filter((review) => filter === 'all' || review.status === filter);
  reviewList.replaceChildren();
  if (!rows.length) reviewList.append(node('p', `No ${filter === 'all' ? '' : `${filter} `}reviews.`, 'feature-note'));
  rows.forEach((review) => {
    const item = node('article', '', 'admin-record');
    item.append(node('h3', review.client_name), node('p', `${review.status.toUpperCase()} / ${review.rating} stars / Submitted ${review.created_at} UTC`, 'admin-meta'), node('p', review.review_text));
    const buttons = node('div', '', 'admin-actions');
    buttons.append(action(review.status === 'pending' ? 'Approve' : 'Unpublish', `admin/reviews/${review.status === 'pending' ? 'approve' : 'unpublish'}`, { id: Number(review.id) }), action('Delete', 'admin/reviews/delete', { id: Number(review.id) }, true));
    item.append(buttons); reviewList.append(item);
  });
}
async function load() {
  content.setAttribute('aria-busy', 'true');
  try { const data = await api('admin/reviews'); reviews = data.reviews; renderReviews(); }
  catch (error) { errorMessage(error); }
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
refreshContext().then(async (context) => { view(context.authenticated); if (context.authenticated) await load(); }).catch((error) => feedback(login, error.message, true));
