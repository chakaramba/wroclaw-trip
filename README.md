# Tuesday’s pick

A cinematic seven-film selector for Tuesday, 27 October 2026.

**Live page:** https://chakaramba.github.io/wroclaw-trip/

The introduction and seven films are slides in a vertical [Swiper](https://swiperjs.com/) carousel (14.3.0, MIT). Swiper handles swipes, mousewheel/trackpad navigation, keyboard navigation, snapping, deep links, and resize observation. The document does not scroll; the carousel fills the dynamic viewport. There is no custom inertia or snapping script.

Film cards feature original posters, three crossfading stills, and a spoiler-free question. Stills change every 2.5 seconds only on the active film, with manual selection and pause controls. Each film has a Google search link. Reduced-motion preferences are respected.

Choices stay in the visitor’s browser. The ticket’s copy button copies a selection without sending a message or collecting data.

## Hosting

GitHub Pages publishes the root of `main`. This is a static site with no build step. All asset paths are relative, so they work under the repository URL. `.nojekyll` disables Jekyll processing.

## Local preview

Run `python3 -m http.server 8765` in this directory, then visit http://localhost:8765/.

## Image credits

Image provenance is listed in `image-sources.json`. Film posters and stills remain the property of their respective rights holders. The display font is Cormorant Garamond, distributed under the SIL Open Font License; see `assets/OFL.txt`.

The previous trip page remains available in Git history.

## Carousel dependency

Swiper 14.3.0 is vendored under `assets/vendor/swiper-14.3.0/` with its MIT license. Files come from the official npm package; its SHA-512 integrity was checked before extraction. No CDN or package install is needed by visitors.
