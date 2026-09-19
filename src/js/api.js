let csrfToken;
export async function refreshContext() {
  const context = await api('context');
  csrfToken = context.csrf;
  return context;
}
export function setCsrf(token) { csrfToken = token; }
export async function api(route, data) {
  if (data !== undefined && !csrfToken) await refreshContext();
  let response;
  try { response = await fetch(`${import.meta.env.BASE_URL}api/index.php?route=${encodeURIComponent(route)}`, {
    method: data === undefined ? 'GET' : 'POST', credentials: 'same-origin',
    headers: data === undefined ? {} : { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
    body: data === undefined ? undefined : JSON.stringify(data),
  }); } catch { throw new Error('Unable to reach Acerbox. Check your connection and try again.'); }
  let result;
  try { result = await response.json(); }
  catch { throw new Error('The server is unavailable. Please contact Acerbox directly or try again.'); }
  if (!response.ok) {
    const error = new Error(result.error || 'Unable to complete this request.');
    error.status = response.status;
    error.fields = result.fields || {};
    throw error;
  }
  return result;
}
export function feedback(form, message, failed = false) {
  const element = form.querySelector('[data-feedback]');
  element.textContent = message;
  element.classList.toggle('is-error', failed);
  element.setAttribute('role', failed ? 'alert' : 'status');
}
export function busy(form, active) {
  const button = form.querySelector('[type="submit"]');
  button.disabled = active;
  form.setAttribute('aria-busy', String(active));
}
export function formError(form, error) {
  const details = Object.values(error.fields || {}).join(' ');
  feedback(form, `${error.message}${details ? ` ${details}` : ''}`, true);
  const name = Object.keys(error.fields || {})[0];
  const field = name ? form.elements.namedItem(name) : null;
  (field instanceof RadioNodeList ? field[0] : field)?.focus();
}
