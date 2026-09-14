export function initMedia() {
  const logo = document.querySelector('[data-logo]');
  const backgroundVideo = document.querySelector('[data-background-video]');
  const projects = [...document.querySelectorAll('[data-project-media]')];
  const featureFilm = document.querySelector('[data-feature-video]');
  const founderImage = document.querySelector('.about-media img');
  const canHover = matchMedia('(hover: hover) and (pointer: fine)').matches;

  const markMissing = (element) => element?.classList.add('is-missing');
  logo?.addEventListener('error', () => markMissing(logo));
  founderImage?.addEventListener('error', () => markMissing(founderImage));
  backgroundVideo?.addEventListener('error', () => markMissing(backgroundVideo));
  backgroundVideo?.querySelector('source')?.addEventListener('error', () => markMissing(backgroundVideo));

  if (featureFilm) {
    const video = featureFilm.querySelector('video');
    const toggles = [...featureFilm.querySelectorAll('[data-film-toggle]')];
    const sound = featureFilm.querySelector('[data-film-sound]');

    const updateState = () => {
      const playing = !video.paused && !video.ended;
      featureFilm.classList.toggle('is-playing', playing);
      toggles.forEach((button) => {
        button.setAttribute('aria-label', `${playing ? 'Pause' : 'Play'} featured film`);
      });
    };

    const togglePlayback = () => {
      if (video.paused || video.ended) {
        video.muted = false;
        video.play().catch(() => {
          video.muted = true;
          video.play().catch(() => updateState());
        });
      } else {
        video.pause();
      }
    };

    toggles.forEach((button) => button.addEventListener('click', (event) => {
      event.stopPropagation();
      togglePlayback();
    }));
    video.addEventListener('click', togglePlayback);
    video.addEventListener('play', updateState);
    video.addEventListener('pause', updateState);
    video.addEventListener('ended', updateState);
    video.addEventListener('timeupdate', () => {
      const progress = video.duration ? (video.currentTime / video.duration) * 100 : 0;
      featureFilm.style.setProperty('--film-progress', `${progress}%`);
    });
    sound?.addEventListener('click', (event) => {
      event.stopPropagation();
      video.muted = !video.muted;
      sound.textContent = video.muted ? 'Sound off' : 'Sound on';
      sound.setAttribute('aria-label', `${video.muted ? 'Unmute' : 'Mute'} featured film`);
    });
  }

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
