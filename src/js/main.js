import '../css/main.css';
import '../css/responsive.css';
import '../css/animations.css';
import { initNavigation } from './navigation.js';
import { initAnimations } from './animations.js';
import { initMedia } from './media.js';

export const siteConfig = {
  emailAddress: 'Acerbox27@gmail.com',
  instagramUrl: 'https://www.instagram.com/acerbox_/',
  trialShootUrl: '',
};

const setupLinks = () => {
  document.querySelectorAll('.js-email').forEach((link) => {
    link.href = `mailto:${siteConfig.emailAddress}?subject=Acerbox project inquiry`;
  });

  document.querySelectorAll('.js-instagram').forEach((link) => {
    link.href = siteConfig.instagramUrl;
  });

  document.querySelectorAll('.js-trial').forEach((link) => {
    link.href = siteConfig.trialShootUrl || '#contact';
    if (siteConfig.trialShootUrl) {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    }
  });
};

document.documentElement.classList.add('js');
document.querySelector('[data-year]').textContent = new Date().getFullYear();
setupLinks();
initNavigation();
initMedia();
initAnimations();
