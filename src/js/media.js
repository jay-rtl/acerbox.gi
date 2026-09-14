export function initMedia() {
  const logo = document.querySelector('[data-logo]');
  const backgroundVideo = document.querySelector('[data-background-video]');
  const projects = [...document.querySelectorAll('[data-project-media]')];
  const founderImage = document.querySelector('.about-media img');
  const canHover = matchMedia('(hover: hover) and (pointer: fine)').matches;

  const markMissing = (element) => element?.classList.add('is-missing');
  logo?.addEventListener('error', () => markMissing(logo));
  founderImage?.addEventListener('error', () => markMissing(founderImage));
  backgroundVideo?.addEventListener('error', () => markMissing(backgroundVideo));
  backgroundVideo?.querySelector('source')?.addEventListener('error', () => markMissing(backgroundVideo));

  const loadVideo = (video) => {
    if (video.src || !video.dataset.src) return;
    video.src = video.dataset.src;
    video.load();
  };

  const setLabel = (media, playing) => {
    const label = media.querySelector('.play-label');
    if (label) label.textContent = playing ? 'Pause preview' : 'Play preview';
  };

  projects.forEach((media) => {
    const video = media.querySelector('video');
    video.addEventListener('error', () => markMissing(video));

    const play = () => {
      loadVideo(video);
      video.play().then(() => setLabel(media, true)).catch(() => setLabel(media, false));
    };
    const pause = () => { video.pause(); setLabel(media, false); };

    if (canHover) {
      media.addEventListener('mouseenter', play);
      media.addEventListener('mouseleave', pause);
      media.addEventListener('focusin', play);
      media.addEventListener('focusout', pause);
    } else {
      media.addEventListener('click', () => video.paused ? play() : pause());
    }
  });

  const videoObserver = new IntersectionObserver((entries) => {
    entries.forEach(({ target, isIntersecting }) => {
      const video = target.querySelector('video');
      if (isIntersecting) loadVideo(video);
      else { video.pause(); setLabel(target, false); }
    });
  }, { rootMargin: '200px 0px', threshold: .05 });
  projects.forEach((project) => videoObserver.observe(project));
}
