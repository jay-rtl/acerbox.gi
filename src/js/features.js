import { api, refreshContext, feedback, busy, formError } from './api.js';

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

async function loadReviews() {
  const container = document.querySelector('[data-reviews]');
  try {
    const { reviews } = await api('reviews');
    container.replaceChildren();
    if (!reviews.length) {
      container.append(element('p', 'EVERY COLLABORATION STARTS WITH TRUST.', 'review-empty-title'), element('p', 'Share your experience with Acerbox. Approved client reviews will appear here.', 'feature-note'));
    }
    reviews.forEach((review) => {
      const quote = element('figure', undefined, 'client-quote');
      const stars = element('p', '★'.repeat(Number(review.rating)), 'review-stars');
      stars.setAttribute('aria-label', `${review.rating} out of 5 stars`);
      quote.append(stars, element('blockquote', review.review_text), element('figcaption', review.client_name));
      container.append(quote);
    });
  } catch {
    container.replaceChildren(element('p', 'Client reviews are temporarily unavailable. You can still reach Acerbox by email or social media.', 'feature-note'));
  }
}

function initReviews() {
  const form = document.querySelector('[data-review-form]');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (form.getAttribute('aria-busy') === 'true') return;
    busy(form, true); feedback(form, 'Submitting your review…');
    const data = Object.fromEntries(new FormData(form));
    data.rating = Number(data.rating);
    try {
      const result = await api('reviews', data);
      form.reset(); feedback(form, result.message);
    } catch (error) { formError(form, error); }
    finally { busy(form, false); }
  });
  loadReviews();
}

function initBooking() {
  const form = document.querySelector('[data-booking-form]');
  const type = form.elements.booking_type;
  const time = form.elements.slot;
  const calendar = form.querySelector('[data-calendar-dates]');
  const status = form.querySelector('[data-calendar-status]');
  const monthTitle = form.querySelector('[data-calendar-month]');
  const previous = form.querySelector('[data-calendar-prev]');
  const next = form.querySelector('[data-calendar-next]');
  previous.disabled = true; next.disabled = true;
  let availability = null;
  let month = null;
  let selectedDate = '';
  const iso = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const dateObject = (value) => new Date(`${value}T12:00:00`);
  const displayTime = (value) => new Date(`2000-01-01T${value}:00`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  function selectDate(date) {
    selectedDate = date;
    form.querySelector('[data-selected-date]').textContent = date ? dateObject(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : 'No date selected.';
    time.replaceChildren(new Option(date ? 'Choose an available time' : 'Choose an available date first', ''));
    const slots = (availability?.slots || []).filter((slot) => slot.date === date && slot.booking_type === type.value && slot.status === 'available');
    slots.forEach((slot) => time.add(new Option(`${displayTime(slot.time)}–${displayTime(slot.end_time)}`, String(slot.id))));
    time.disabled = !slots.length;
    render();
  }

  function render() {
    if (!availability || !month) return;
    const description = availability.types[type.value];
    form.querySelector('[data-booking-description]').textContent = type.value === 'consultation' ? `${description.minutes}-minute consultation. All dates and times are in ${availability.timezone} (South Florida).` : `Choose a dedicated shoot window. All dates and times are in ${availability.timezone} (South Florida).`;
    monthTitle.textContent = month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    calendar.replaceChildren();
    const first = new Date(month.getFullYear(), month.getMonth(), 1, 12);
    for (let i = 0; i < first.getDay(); i++) calendar.append(element('span'));
    const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    let availableCount = 0;
    for (let day = 1; day <= count; day++) {
      const date = iso(new Date(month.getFullYear(), month.getMonth(), day, 12));
      const slots = availability.slots.filter((slot) => slot.date === date && slot.booking_type === type.value);
      const past = date < availability.today;
      const blocked = availability.blocked_dates.includes(date);
      const available = !past && !blocked && date <= availability.last_date && slots.some((slot) => slot.status === 'available');
      const booked = !past && !blocked && !available && slots.some((slot) => slot.status === 'booked');
      const button = element('button', String(day), available ? 'date-available' : booked ? 'date-booked' : 'date-unavailable');
      button.type = 'button'; button.disabled = !available;
      button.setAttribute('aria-label', `${dateObject(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}: ${past ? 'past' : available ? 'available' : booked ? 'already booked' : blocked ? 'blocked' : 'unavailable'}`);
      button.setAttribute('aria-pressed', String(date === selectedDate));
      button.addEventListener('click', () => selectDate(date));
      calendar.append(button);
      if (available) availableCount++;
    }
    status.textContent = availableCount ? 'Select an available date to see time windows.' : 'No available dates this month. Try the next month or contact Acerbox directly.';
    const today = dateObject(availability.today);
    const end = dateObject(availability.last_date);
    previous.disabled = month.getFullYear() * 12 + month.getMonth() <= today.getFullYear() * 12 + today.getMonth();
    next.disabled = month.getFullYear() * 12 + month.getMonth() >= end.getFullYear() * 12 + end.getMonth();
  }

  async function load() {
    status.textContent = 'Loading availability…';
    calendar.setAttribute('aria-busy', 'true');
    time.disabled = true;
    try {
      availability = await api('availability');
      month ||= dateObject(availability.today);
      selectDate('');
    } catch (error) {
      availability = null; calendar.replaceChildren();
      status.textContent = `${error.message} Use “Refresh availability” to retry.`;
    } finally { calendar.setAttribute('aria-busy', 'false'); }
  }
  previous.addEventListener('click', () => { month = new Date(month.getFullYear(), month.getMonth() - 1, 1, 12); selectDate(''); });
  next.addEventListener('click', () => { month = new Date(month.getFullYear(), month.getMonth() + 1, 1, 12); selectDate(''); });
  type.addEventListener('change', () => selectDate(''));
  form.querySelector('[data-refresh-availability]').addEventListener('click', load);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (form.getAttribute('aria-busy') === 'true') return;
    const slot = availability?.slots.find((item) => item.id === Number(time.value) && item.status === 'available' && item.date === selectedDate && item.booking_type === type.value);
    if (!slot) { feedback(form, 'Choose an available date and time first.', true); return; }
    const data = Object.fromEntries(new FormData(form));
    data.id = slot.id; data.date = slot.date; data.time = slot.time;
    delete data.slot;
    busy(form, true); feedback(form, 'Sending your booking request…');
    try {
      const result = await api('bookings', data);
      form.reset(); await load(); feedback(form, result.message);
    } catch (error) {
      formError(form, error);
      if (error.status === 409) await load();
    } finally { busy(form, false); }
  });
  load();
}

export async function initClientFeatures() {
  await refreshContext().catch(() => {});
  initReviews(); initBooking();
}
