const focusableSelector = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function initNavigation() {
  const header = document.querySelector('[data-header]');
  const toggle = document.querySelector('.menu-toggle');
  const menu = document.querySelector('.mobile-menu');
  const panel = document.querySelector('.contact-panel');
  const closePanel = document.querySelector('.panel-close');
  let lastFocused = null;

  const updateHeader = () => header.classList.toggle('is-scrolled', window.scrollY > 24);
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  const setMenu = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.setAttribute('aria-hidden', String(!open));
    menu.classList.toggle('is-open', open);
    document.body.classList.toggle('menu-open', open);
    if (open) menu.querySelector('a')?.focus();
  };

  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  menu.querySelectorAll('a, button').forEach((item) => item.addEventListener('click', () => setMenu(false)));

  const openContact = () => {
    lastFocused = document.activeElement;
    if (typeof panel.showModal === 'function') panel.showModal();
    else panel.setAttribute('open', '');
    requestAnimationFrame(() => panel.querySelector(focusableSelector)?.focus());
  };

  const closeContact = () => {
    panel.close();
    lastFocused?.focus();
  };

  document.querySelectorAll('.js-contact').forEach((button) => button.addEventListener('click', openContact));
  closePanel.addEventListener('click', closeContact);
  panel.addEventListener('click', (event) => {
    if (event.target === panel) closeContact();
  });
  panel.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeContact();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menu.classList.contains('is-open')) setMenu(false);
  });
}
