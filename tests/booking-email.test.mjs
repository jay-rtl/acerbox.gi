import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBookingEmail } from '../src/js/booking-email.js';
const slot={booking_type:'consultation',date:'2026-12-01',time:'09:00',end_time:'09:30'};
const data={name:'Client & Partner',email:'client@example.invalid',phone:'+1 555 123 4567',notes:'Project with & ? # symbols'};
test('fixed recipient and encoded subject/body contain form and schedule',()=>{
  const draft=createBookingEmail(data,slot,'America/New_York');
  const url=new URL(draft.href);assert.equal(url.pathname,'Acerbox27@gmail.com');
  assert.ok(url.searchParams.get('subject').includes('Consultation Call'));
  for(const text of [data.name,data.email,data.phone,data.notes,slot.date,slot.time,'America/New_York','not a reserved'])assert.ok(url.searchParams.get('body').includes(text));
  assert.equal(draft.copyRequired,false);
});
test('optional details and shoot service are supported',()=>{const draft=createBookingEmail({name:'Client',email:'client@example.invalid'},{...slot,booking_type:'shoot'},'America/New_York');assert.ok(draft.body.includes('Shoot Day'));assert.ok(draft.body.includes('Not supplied'));});
test('long Unicode content remains complete in copy draft',()=>{const notes='🎥 Brand project '.repeat(100);const draft=createBookingEmail({...data,notes},slot,'America/New_York');assert.equal(draft.copyRequired,true);assert.ok(draft.body.includes(notes.trim()));assert.ok(!draft.href.includes('&body='));assert.ok(draft.href.length<1800);});
test('user-entered newlines cannot change mailto recipient or add headers',()=>{const draft=createBookingEmail({...data,name:'Client\nBcc: attacker@example.invalid'},slot,'America/New_York');const url=new URL(draft.href);assert.equal(url.pathname,'Acerbox27@gmail.com');assert.deepEqual([...url.searchParams.keys()],['subject','body']);});
