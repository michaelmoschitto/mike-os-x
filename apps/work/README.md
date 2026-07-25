# Selected Work (`work.mikemoschitto.com`)

Public static HTML portfolio. No framework, build step, or password in this MVP.

## Local development

```bash
python3 -m http.server 4174 --directory apps/work
```

Open [http://localhost:4174](http://localhost:4174).

## Deploy (gitops)

Do not deploy manually from a laptop. After the PR merges to `main`:

1. Attach `work.mikemoschitto.com` to the existing Railway web service and add the CNAME/TXT records Railway provides.
2. The root Docker image serves both `os.mikemoschitto.com` and this site with hostname-based nginx routing.
3. Subsequent pushes that touch `apps/web/**` or `apps/work/**` deploy both sites together through the existing Railway git integration.

## Content

- `index.html` — homepage gallery
- `projects/<slug>/index.html` — project detail pages
- `styles.css` — shared Aqua Field Notes stylesheet

To add a project, copy `projects/northstar-console/`, replace images and copy, then link it from `index.html`.
