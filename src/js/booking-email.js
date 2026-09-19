export const bookingRecipient = 'Acerbox27@gmail.com';

export function createBookingEmail(data, slot, timezone) {
  const service = slot.booking_type === 'shoot' ? 'Shoot Day' : 'Consultation Call';
  const subject = `Acerbox ${service} request — ${slot.date}`;
  const body = [
    'Hello Jake,', '', `I would like to request a ${service}.`,
    `Date: ${slot.date}`, `Time: ${slot.time}–${slot.end_time} (${timezone})`, '',
    `Name: ${data.name.trim()}`, `Email: ${data.email.trim()}`,
    `Phone: ${data.phone?.trim() || 'Not supplied'}`, '',
    'Project details:', data.notes?.trim() || 'Not supplied', '',
    'Please reply to confirm availability and the details. This is a request, not a reserved or confirmed appointment.',
  ].join('\n');
  const base = `mailto:${bookingRecipient}?subject=${encodeURIComponent(subject)}`;
  const full = `${base}&body=${encodeURIComponent(body)}`;
  // Mail clients have differing URI limits. Preserve long drafts for copying instead of truncating.
  return { body, href: full.length <= 1800 ? full : base, copyRequired: full.length > 1800 };
}
