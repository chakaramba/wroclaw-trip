# Tuesday’s pick

A cinematic seven-film selector for Tuesday, 27 October 2026.

**Live page:** https://chakaramba.github.io/wroclaw-trip/

Full-screen film cards feature original posters, three crossfading stills, and a spoiler-free question. Stills change every 2.5 seconds, with manual selection and pause controls. The page settles onto the nearest film after scrolling and native momentum stop; a new gesture interrupts the animation. Reduced-motion preferences are respected.

Choices stay in the visitor’s browser. The ticket’s copy button copies a selection without sending a message or collecting data.

## Hosting

GitHub Pages publishes the root of `main`. This is a static site with no build step. All asset paths are relative, so they work under the repository URL. `.nojekyll` disables Jekyll processing.

## Local preview

Run `python3 -m http.server 8765` in this directory, then visit http://localhost:8765/.

## Image credits

Image provenance is listed in `image-sources.json`. Film posters and stills remain the property of their respective rights holders. The display font is Cormorant Garamond, distributed under the SIL Open Font License; see `assets/OFL.txt`.

The previous trip page remains available in Git history.
