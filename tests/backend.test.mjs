import { describe, it, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const php = process.env.PHP_BINARY || (process.platform === 'win32' ? join(process.env.USERPROFILE, '.config/herd/bin/php84/php.exe') : 'php');
const origin = 'http://127.0.0.1:8081';
const password = readFileSync('.local/admin-credentials.txt', 'utf8').match(/Password: (.+)/)[1];
class Client {
  cookie = ''; csrf = '';
  async call(route, data, overrides = {}, port = 8081) {
    const response = await fetch(`http://127.0.0.1:${port}/api/index.php?route=${route}`, {
      method: data === undefined ? 'GET' : 'POST',
      headers: { Cookie: this.cookie, ...(data === undefined ? {} : { 'Content-Type': 'application/json', 'X-CSRF-Token': this.csrf, Origin: origin }), ...overrides },
      body: data === undefined ? undefined : JSON.stringify(data),
    });
    const cookies = response.headers.getSetCookie();
    if (cookies.length) this.cookie = cookies.at(-1).split(';')[0];
    const body = await response.json();
    if (body.csrf) this.csrf = body.csrf;
    return { status: response.status, body };
  }
  async init() { const result = await this.call('context'); assert.equal(result.status, 200); return this; }
  async login() { await this.init(); assert.equal((await this.call('login', { username: 'jake', password })).status, 200); return this; }
}
let visitor; let admin; let slots; let date; let reviewId; let bookingId;
const review = () => ({ client_name: 'Test Client', rating: 5, review_text: 'Development test review. Not a real testimonial.', website: '' });
const booking = (slot) => ({ id: slot.id, name: 'Test Client', email: 'client@example.invalid', phone: '', notes: 'Development test booking', booking_type: slot.booking_type, date: slot.date, time: slot.time, website: '' });

describe('Acerbox isolated PHP/MySQL integration', { concurrency: false }, () => {
  before(async () => {
    execFileSync(php, ['scripts/test-setup.php']);
    visitor = await new Client().init(); admin = await new Client().login();
    await new Promise((resolve) => setTimeout(resolve, 2100));
    const available = await visitor.call('availability'); assert.equal(available.status, 200);
    slots = available.body.slots; date = slots[0].date;
  });
  beforeEach(() => execFileSync(php, ['tests/db-tools.php', 'rates']));
  it('valid review is accepted and defaults to pending', async () => {
    assert.equal((await visitor.call('reviews', { ...review(), status: 'approved' })).status, 201);
    const rows = (await admin.call('admin/reviews')).body.reviews;
    assert.equal(rows[0].status, 'pending'); reviewId = Number(rows[0].id);
  });
  it('pending reviews are never returned publicly', async () => assert.deepEqual((await visitor.call('reviews')).body.reviews, []));
  for (const rating of [0, 6, 1.5, '5']) it(`rejects invalid rating ${JSON.stringify(rating)}`, async () => assert.equal((await visitor.call('reviews', { ...review(), rating })).status, 422));
  it('rejects empty review name', async () => assert.equal((await visitor.call('reviews', { ...review(), client_name: ' ' })).status, 422));
  it('rejects empty review text', async () => assert.equal((await visitor.call('reviews', { ...review(), review_text: '' })).status, 422));
  it('rejects review text over 2000 characters', async () => assert.equal((await visitor.call('reviews', { ...review(), review_text: 'x'.repeat(2001) })).status, 422));
  it('rejects a filled honeypot', async () => assert.equal((await visitor.call('reviews', { ...review(), website: 'spam' })).status, 422));
  it('rejects duplicate reviews', async () => assert.equal((await visitor.call('reviews', review())).status, 409));
  it('rejects oversized JSON bodies', async () => assert.equal((await visitor.call('reviews', { ...review(), review_text: 'x'.repeat(9000) })).status, 413));
  it('requires a CSRF token', async () => assert.equal((await visitor.call('reviews', review(), { 'X-CSRF-Token': '' })).status, 403));
  it('rejects foreign request origins', async () => assert.equal((await visitor.call('reviews', review(), { Origin: 'https://evil.invalid' })).status, 403));
  it('anonymous visitors cannot approve reviews', async () => assert.equal((await visitor.call('admin/reviews/approve', { id: reviewId })).status, 401));
  it('anonymous visitors cannot read management data', async () => assert.equal((await visitor.call('admin/reviews')).status, 401));
  it('anonymous visitors cannot delete reviews', async () => assert.equal((await visitor.call('admin/reviews/delete', { id: reviewId })).status, 401));
  it('Jake can approve a review', async () => assert.equal((await admin.call('admin/reviews/approve', { id: reviewId })).status, 200));
  it('only public approved review fields are returned', async () => {
    const rows = (await visitor.call('reviews')).body.reviews; assert.equal(rows.length, 1);
    assert.deepEqual(Object.keys(rows[0]).sort(), ['client_name','rating','review_text']);
  });
  it('XSS text remains inert data, including escaped JSON transport', async () => {
    const text = '<script>globalThis.xss=true</script> Development test only.';
    assert.equal((await visitor.call('reviews', { ...review(), client_name: 'XSS Test Client', review_text: text })).status, 201);
    const rows = (await admin.call('admin/reviews')).body.reviews;
    const id = Number(rows.find((row) => row.client_name === 'XSS Test Client').id);
    await admin.call('admin/reviews/approve', { id });
    assert.equal((await visitor.call('reviews')).body.reviews.find((row) => row.client_name === 'XSS Test Client').review_text, text);
  });
  it('Jake can unpublish a review', async () => {
    await admin.call('admin/reviews/unpublish', { id: reviewId });
    assert.ok(!(await visitor.call('reviews')).body.reviews.some((row) => row.client_name === 'Test Client'));
  });
  it('Jake can delete a review', async () => {
    assert.equal((await admin.call('admin/reviews/delete', { id: reviewId })).status, 200);
    assert.ok(!(await admin.call('admin/reviews')).body.reviews.some((row) => Number(row.id) === reviewId));
  });
  it('rejects invalid booking emails', async () => assert.equal((await visitor.call('bookings', { ...booking(slots[0]), email: 'invalid' })).status, 422));
  it('rejects empty booking names', async () => assert.equal((await visitor.call('bookings', { ...booking(slots[0]), name: '' })).status, 422));
  it('rejects impossible calendar dates', async () => assert.equal((await visitor.call('bookings', { ...booking(slots[0]), date: '2026-02-30' })).status, 422));
  it('rejects unsupported booking types', async () => assert.equal((await visitor.call('bookings', { ...booking(slots[0]), booking_type: 'fake' })).status, 422));
  it('rejects oversized optional booking notes', async () => assert.equal((await visitor.call('bookings', { ...booking(slots[0]), notes: 'x'.repeat(2001) })).status, 422));
  it('rejects invalid phone text', async () => assert.equal((await visitor.call('bookings', { ...booking(slots[0]), phone: '<script>' })).status, 422));
  it('rejects unavailable slot IDs', async () => assert.equal((await visitor.call('bookings', { ...booking(slots[0]), id: 99999999 })).status, 409));
  it('rejects forged slot dates and times', async () => assert.equal((await visitor.call('bookings', { ...booking(slots[0]), time: '23:00' })).status, 422));
  it('rejects past bookings', async () => {
    const past = JSON.parse(execFileSync(php, ['tests/db-tools.php', 'past'], { encoding: 'utf8' }));
    const yesterday = new Date(`${date}T12:00:00`); yesterday.setDate(yesterday.getDate() - 2);
    assert.equal((await visitor.call('bookings', { ...booking(slots[0]), id: Number(past.id), date: yesterday.toISOString().slice(0,10), time: '10:00' })).status, 422);
  });
  it('valid consultation booking defaults to pending despite a forged status', async () => {
    const slot = slots.find((row) => row.booking_type === 'consultation' && row.time === '10:00');
    assert.equal((await visitor.call('bookings', { ...booking(slot), status: 'confirmed' })).status, 201);
    const rows = (await admin.call('admin/bookings')).body.bookings;
    assert.equal(rows[0].status, 'pending'); bookingId = rows[0].id;
  });
  it('same slot cannot be booked twice', async () => {
    const slot = slots.find((row) => row.booking_type === 'consultation' && row.time === '10:00');
    assert.equal((await visitor.call('bookings', booking(slot))).status, 409);
  });
  it('overlapping shoot and consultation intervals conflict', async () => assert.equal((await visitor.call('bookings', booking(slots.find((row) => row.booking_type === 'shoot')))).status, 409));
  it('availability marks reservations booked and exposes no customer data', async () => {
    const result = (await visitor.call('availability')).body;
    assert.ok(result.slots.some((slot) => slot.status === 'booked'));
    const text = JSON.stringify(result); for (const value of ['client@example.invalid','Test Client','Development test booking']) assert.ok(!text.includes(value));
    for (const slot of result.slots) assert.deepEqual(Object.keys(slot).sort(), ['booking_type','date','end_time','id','status','time']);
  });
  it('anonymous visitors cannot read booking details', async () => assert.equal((await visitor.call('admin/bookings')).status, 401));
  it('anonymous visitors cannot confirm bookings', async () => assert.equal((await visitor.call('admin/bookings/confirm', { id: bookingId })).status, 401));
  it('anonymous visitors cannot cancel bookings', async () => assert.equal((await visitor.call('admin/bookings/cancel', { id: bookingId })).status, 401));
  it('Jake can confirm bookings', async () => {
    assert.equal((await admin.call('admin/bookings/confirm', { id: bookingId })).status, 200);
    assert.equal((await admin.call('admin/bookings')).body.bookings.find((row) => row.id === bookingId).status, 'confirmed');
  });
  it('Jake can cancel and release a booking', async () => {
    assert.equal((await admin.call('admin/bookings/cancel', { id: bookingId })).status, 200);
    const rows = (await visitor.call('availability')).body.slots;
    assert.equal(rows.find((row) => row.booking_type === 'shoot').status, 'available');
  });
  it('valid shoot-day request is accepted with a longer interval', async () => assert.equal((await visitor.call('bookings', booking(slots.find((row) => row.booking_type === 'shoot')))).status, 201));
  it('cancelled bookings cannot be silently reopened', async () => assert.equal((await admin.call('admin/bookings/confirm', { id: bookingId })).status, 409));
  it('rejects past admin availability', async () => assert.equal((await admin.call('admin/availability/add', { booking_type: 'consultation', date: '2020-01-01', time: '10:00' })).status, 422));
  it('rejects invalid shoot windows', async () => assert.equal((await admin.call('admin/availability/add', { booking_type: 'shoot', date, time: '14:00', end_time: '10:00' })).status, 422));
  it('Jake can create consultation availability', async () => assert.equal((await admin.call('admin/availability/add', { booking_type: 'consultation', date, time: '16:00' })).status, 200));
  it('Jake can remove an availability window', async () => {
    const slot = (await admin.call('admin/availability')).body.slots.find((row) => row.time === '16:00');
    assert.equal((await admin.call('admin/availability/remove', { id: slot.id })).status, 200);
    assert.ok(!(await visitor.call('availability')).body.slots.some((row) => row.id === slot.id));
  });
  it('anonymous visitors cannot change availability', async () => assert.equal((await visitor.call('admin/availability/block', { date })).status, 401));
  it('blocked dates reject reservations', async () => {
    await admin.call('admin/availability/block', { date });
    assert.equal((await visitor.call('bookings', booking(slots.find((row) => row.time === '15:00')))).status, 409);
    assert.ok((await visitor.call('availability')).body.slots.every((row) => row.status === 'blocked'));
    await admin.call('admin/availability/unblock', { date });
  });
  it('two independent API workers cannot reserve the same interval simultaneously', async () => {
    const one = await new Client().init(); const two = await new Client().init();
    await new Promise((resolve) => setTimeout(resolve, 2100));
    const slot = slots.find((row) => row.time === '15:00');
    const results = await Promise.all([one.call('bookings', booking(slot), {}, 8081),two.call('bookings', booking(slot), {}, 8082)]);
    assert.deepEqual(results.map((result) => result.status).sort(), [201,409]);
  });
  it('minimum submission time blocks instant submissions', async () => {
    const instant = await new Client().init(); assert.equal((await instant.call('reviews', { ...review(), client_name: 'Instant Client' })).status, 429);
  });
  it('review submission rate limiting is enforced', async () => {
    let result; for (let i = 0; i < 7; i++) result = await visitor.call('reviews', { ...review(), client_name: `Rate Test ${i}` });
    assert.equal(result.status, 429);
  });
  it('wrong admin credentials are rejected', async () => assert.equal((await visitor.call('login', { username: 'jake', password: 'wrong' })).status, 401));
  it('login attempts are rate limited', async () => { let result; for (let i=0;i<6;i++) result=await visitor.call('login',{username:'jake',password:'wrong'}); assert.equal(result.status,429); });
  it('logout removes admin authorization', async () => {
    assert.equal((await admin.call('logout', {})).status, 200);
    assert.equal((await admin.call('admin/bookings')).status, 401);
  });
});
