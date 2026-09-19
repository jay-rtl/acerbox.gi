import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
const origin = 'http://127.0.0.1:8084';
async function status(url, method = 'GET') { const response = await fetch(url,{method}); await response.arrayBuffer(); return response.status; }
test('compiled public HTML and all linked JS/CSS load from relative paths',async()=>{
  const response = await fetch(`${origin}/`);assert.equal(response.status,200);
  const html = await response.text();assert.ok(html.includes('data-booking-form') && html.includes('data-review-form'));
  const assets = [...html.matchAll(/(?:src|href)="(\.\/assets\/[^" ]+\.(?:css|js))"/g)].map((match)=>match[1]);assert.ok(assets.length>=2);
  for(const asset of assets)assert.equal(await status(new URL(asset,`${origin}/`)),200);
});
test('compiled management HTML and its linked assets load',async()=>{
  const response = await fetch(`${origin}/admin.html`);assert.equal(response.status,200);const html=await response.text();
  assert.ok(html.includes('noindex,nofollow'));
  assert.ok(html.includes('data-admin-reviews') && !html.includes('data-admin-bookings') && !html.includes('id="admin-availability"'));
  for(const match of html.matchAll(/(?:src|href)="(\.\/assets\/[^" ]+\.(?:css|js))"/g))assert.equal(await status(new URL(match[1],`${origin}/`)),200);
});
test('compiled PHP entrypoint resolves the private local backend',async()=>{
  for(const route of ['context','reviews','availability'])assert.equal(await status(`${origin}/api/index.php?route=${route}`),200);
});
test('compiled admin endpoint remains unauthorized anonymously',async()=>assert.equal(await status(`${origin}/api/index.php?route=admin/bookings`),401));
test('private directories/configuration are absent from public build',async()=>{
  const files=readdirSync('dist');for(const name of ['backend','.local','config.local.php','tests','scripts'])assert.ok(!files.includes(name));
  for(const path of ['/backend/config.local.php','/.local/admin-credentials.txt'])assert.equal(await status(origin+path),404);
});
test('existing logo, portrait, and client video asset paths still load',async()=>{
  for(const path of ['assets/logo/acerbox-logo-transparent.png','assets/images/founder.jpg','assets/video/client-feature.mp4'])assert.equal(await status(`${origin}/${path}`,'HEAD'),200);
});
