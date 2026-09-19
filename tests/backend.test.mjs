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
let visitor; let admin; let slots; let date; let reviewId;
const review = () => ({ client_name: 'Test Client', rating: 5, review_text: 'Development test review. Not a real testimonial.', website: '' });
const booking = (slot) => ({ id: slot.id, name: 'Test Client', email: 'client@example.invalid', phone: '', notes: 'Development test booking', booking_type: slot.booking_type, date: slot.date, time: slot.time, website: '' });

describe('Acerbox isolated PHP/MySQL integration', { concurrency: false }, () => {
  before(async () => {
    execFileSync(php, ['scripts/test-setup.php']);
    visitor = await new Client().init(); admin = await new Client().login();
    await new Promise((resolve) => setTimeout(resolve, 2100));
    const available = await visitor.call('availability'); assert.equal(available.status, 200);
    date = new Date(Date.now() + 86400000).toLocaleDateString('en-CA', { timeZone: available.body.timezone });
    slots = available.body.slots.filter((slot) => slot.date === date);
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
  it('retired booking endpoint never creates or queues an email-only request', async () => {
    assert.equal((await visitor.call('bookings', booking(slots[0]))).status, 410);
    assert.deepEqual((await admin.call('admin/bookings')).body.bookings, []);
    assert.equal(execFileSync(php, ['tests/db-tools.php', 'counts'], { encoding: 'utf8' }).trim(), '0,0');
  });
  it('public availability exposes no customer data', async () => {
    const result = (await visitor.call('availability')).body;
    const text = JSON.stringify(result); for (const value of ['client@example.invalid','Test Client','Development test booking']) assert.ok(!text.includes(value));
    for (const slot of result.slots) assert.deepEqual(Object.keys(slot).sort(), ['booking_type','date','end_time','id','status','time']);
  });
  it('anonymous visitors cannot read booking details', async () => assert.equal((await visitor.call('admin/bookings')).status, 401));
  it('anonymous visitors cannot confirm legacy bookings', async () => assert.equal((await visitor.call('admin/bookings/confirm', { id: 1 })).status, 401));
  it('anonymous visitors cannot cancel legacy bookings', async () => assert.equal((await visitor.call('admin/bookings/cancel', { id: 1 })).status, 401));
  it('rejects past admin availability', async () => assert.equal((await admin.call('admin/availability/add', { booking_type: 'consultation', date: '2020-01-01', time: '10:00' })).status, 422));
  it('rejects invalid shoot windows', async () => assert.equal((await admin.call('admin/availability/add', { booking_type: 'shoot', date, time: '14:00', end_time: '10:00' })).status, 422));
  it('Jake can create consultation availability', async () => assert.equal((await admin.call('admin/availability/add', { booking_type: 'consultation', date, time: '16:00' })).status, 200));
  it('Jake can remove an availability window', async () => {
    const slot = (await admin.call('admin/availability')).body.slots.find((row) => row.time === '16:00');
    assert.equal((await admin.call('admin/availability/remove', { id: slot.id })).status, 200);
    assert.ok(!(await visitor.call('availability')).body.slots.some((row) => row.id === slot.id));
  });
  it('anonymous visitors cannot change availability', async () => assert.equal((await visitor.call('admin/availability/block', { date })).status, 401));
  it('anonymous visitors cannot block a time range', async () => assert.equal((await visitor.call('admin/availability/block-window', { date, time: '15:00', end_time: '16:00' })).status, 401));
  it('Jake blocks and unblocks a time range through the API', async () => {
    assert.equal((await admin.call('admin/availability/block-window', { date, time: '15:00', end_time: '16:00' })).status, 200);
    assert.equal((await visitor.call('availability')).body.slots.find((row) => row.date === date && row.time === '15:00' && row.booking_type === 'consultation').status, 'blocked');
    const block = (await admin.call('admin/availability')).body.blocked_windows.find((row) => row.date === date);
    assert.equal((await admin.call('admin/availability/unblock-window', { id: block.id })).status, 200);
  });
  it('blocked dates are unavailable in the calendar', async () => {
    await admin.call('admin/availability/block', { date });
    assert.ok((await visitor.call('availability')).body.slots.filter((row) => row.date === date).every((row) => row.status === 'blocked'));
    await admin.call('admin/availability/unblock', { date });
  });
  it('neither API worker accepts retired booking submissions', async () => {
    const one = await new Client().init(); const two = await new Client().init();
    await new Promise((resolve) => setTimeout(resolve, 2100));
    const slot = slots.find((row) => row.time === '15:00');
    const results = await Promise.all([one.call('bookings', booking(slot), {}, 8081),two.call('bookings', booking(slot), {}, 8082)]);
    assert.deepEqual(results.map((result) => result.status).sort(), [410,410]);
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
