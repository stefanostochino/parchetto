# SCHEDONE

SCHEDONE is a mobile-first workout PWA.

It is a static web app: no build step and no server code. Serve the files as they are.

## Run locally

Any static file server works. From this folder, for example:

```
python -m http.server 8080
```

Then open <http://localhost:8080/>.

Service workers require `http://localhost` or HTTPS, so opening `index.html` directly from the file system will load the app but not enable offline mode.

## Host on GitHub Pages

1. Push the contents of this folder to a repository.
2. In the repository, open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, select the branch and the `/ (root)` folder, and save.
4. The app is served at `https://USERNAME.github.io/REPOSITORY/`.

All paths in the app are relative, so it works from a repository subfolder as well as from a domain root.

## Files

- `index.html`: the whole application
- `manifest.webmanifest`: PWA manifest
- `sw.js`: service worker (offline cache)
- `icons/`, `fonts/`: app icons and self-hosted fonts
