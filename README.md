# Acerbox website

A lightweight, one-page Vite website built with vanilla HTML, CSS, JavaScript, GSAP, and ScrollTrigger. The production build is static and can be uploaded directly to Hostinger.

## Local development

Requirements: Node.js 20.19+ (or 22.12+) and npm.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. To create and test the production build:

```bash
npm run build
npm run preview
```

## Replace the placeholder media

Keep the filenames below, or update the matching paths in `index.html`.

- Logo: `public/assets/logo/acerbox-logo-transparent.png`
- Hero video: `public/assets/video/hero.mp4`
- Featured client video: `public/assets/video/client-feature.mp4`
- Work videos: `public/assets/video/work-01.mp4` through `work-03.mp4`
- Work poster images: `public/assets/images/work-01.jpg` through `work-03.jpg`
- Founder/BTS image: `public/assets/images/founder.jpg`
- Social sharing image: `public/assets/images/og-image.png`
- Favicon: currently uses `public/assets/logo/acerbox-logo-transparent.png`

Missing files intentionally show clean, branded fallback states. The temporary ACERBOX text in the header disappears automatically when the real logo loads.

## Configure links

Edit the `siteConfig` object at the top of `src/js/main.js`:

```js
export const siteConfig = {
  emailAddress: 'Acerbox27@gmail.com',
  instagramUrl: 'https://www.instagram.com/acerbox_/',
  discordUrl: 'https://discord.com/invite/nRRkhPwBA',
  trialShootUrl: 'https://your-form-or-booking-link.com',
};
```

Leaving `trialShootUrl` empty sends the visitor to the contact area. If the site moves to a custom domain, replace the GitHub Pages URLs in `index.html`, `public/robots.txt`, and `public/sitemap.xml`.

## Hostinger deployment

Run `npm run build`, then upload **the contents inside `dist/`** to `public_html`. Node.js is not needed on the server. Vite uses relative asset paths so the static build works from standard shared hosting.

For the prepared upload package, extract `acerbox-hostinger.zip` and upload everything inside it directly into `public_html`. Confirm that `index.html` and `.htaccess` are at the root of `public_html`, not inside another folder. Enable “show hidden files” in Hostinger File Manager if `.htaccess` is not visible.

Before launching on the final domain, replace every `https://jay-rtl.github.io/acerbox.gi/` URL in `index.html`, `public/robots.txt`, and `public/sitemap.xml` with the production domain, then rebuild the package. This keeps canonical and social SEO signals pointed at the correct host.

## Recommended video exports

- MP4 using H.264, no audio for background/preview loops
- 1080p maximum for most website footage
- 24 or 30 fps
- Target 3–6 Mbps for hero video and 2–4 Mbps for previews
- Keep the hero loop roughly 6–15 seconds and ideally under 8 MB
- Enable fast start / web optimized metadata
- Export matching compressed JPG or WebP poster images (roughly 1600–2200px wide)
- Test all final media on iPhone Safari and Android Chrome

Only the hero video is requested immediately. Portfolio videos load near the viewport and play only on hover/focus or tap, then pause outside the viewport.
