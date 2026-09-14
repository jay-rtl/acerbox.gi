import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function initAnimations() {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const loader = document.querySelector('.page-loader');

  if (reducedMotion) {
    loader?.remove();
    return;
  }

  gsap.set('.hero-title span', { yPercent: 115 });
  gsap.set('.reveal-item', { y: 18, opacity: 0 });
  gsap.set('.hero-media', { scale: 1.05 });

  const intro = gsap.timeline({ defaults: { ease: 'power3.out' } });
  intro
    .to('.page-loader span', { opacity: 0, y: -12, duration: .5, delay: .5 })
    .to('.page-loader', { opacity: 0, duration: .6, onComplete: () => loader?.remove() }, '<.15')
    .to('.hero-media', { scale: 1, duration: 2.4 }, '<')
    .to('.hero-title span', { yPercent: 0, duration: 1.2 }, '<.5')
    .to('.reveal-item', { y: 0, opacity: 1, duration: .8, stagger: .16 }, '<.5');

  gsap.utils.toArray('.reveal').forEach((element) => {
    gsap.from(element, {
      y: 34,
      opacity: 0,
      duration: .85,
      ease: 'power3.out',
      scrollTrigger: { trigger: element, start: 'top 88%', once: true },
    });
  });

  gsap.utils.toArray('.line-reveal').forEach((wrap) => {
    const child = wrap.firstElementChild;
    gsap.from(child, {
      yPercent: 105,
      duration: 1,
      ease: 'power3.out',
      scrollTrigger: { trigger: wrap, start: 'top 86%', once: true },
    });
  });

  gsap.utils.toArray('.media-reveal').forEach((element) => {
    gsap.from(element, {
      clipPath: 'inset(12% 0 12% 0)',
      opacity: .5,
      duration: 1.15,
      ease: 'power3.inOut',
      scrollTrigger: { trigger: element, start: 'top 88%', once: true },
    });
  });

  gsap.to('.build-progress span', {
    scaleX: 1,
    ease: 'none',
    scrollTrigger: { trigger: document.documentElement, start: 'top top', end: 'bottom bottom', scrub: .15 },
  });

  gsap.to('.closing-orbit', {
    yPercent: -18,
    ease: 'none',
    scrollTrigger: { trigger: '.closing', start: 'top bottom', end: 'bottom top', scrub: 1 },
  });

  if (finePointer) {
    document.querySelectorAll('.magnetic').forEach((button) => {
      button.addEventListener('pointermove', (event) => {
        const rect = button.getBoundingClientRect();
        gsap.to(button, { x: (event.clientX - rect.left - rect.width / 2) * .12, y: (event.clientY - rect.top - rect.height / 2) * .12, duration: .25 });
      });
      button.addEventListener('pointerleave', () => gsap.to(button, { x: 0, y: 0, duration: .5, ease: 'elastic.out(1, .45)' }));
    });
  }
}
