# Portfolio (`portfolio.mikemoschitto.com`)

Public static HTML case-study site. No framework, build step, or password in this MVP.

## Local development

```bash
python3 -m http.server 4174 --directory apps/work
```

Open [http://localhost:4174](http://localhost:4174).

## Deploy (gitops)

Do not deploy manually from a laptop. After the PR merges to `main`:

1. Attach `portfolio.mikemoschitto.com` to the existing Railway web service and add the CNAME/TXT records Railway provides.
2. The root Docker image serves both `os.mikemoschitto.com` and this site with hostname-based nginx routing.
3. Subsequent pushes that touch `apps/web/**` or `apps/work/**` deploy both sites together through the existing Railway git integration.

## Content

- `index.html` — homepage gallery
- `projects/<slug>/index.html` — project detail pages
- `styles.css` — shared Aqua Field Notes stylesheet
- `scrollbar.js` — accessible custom Aqua scrollbar for the home project pane and detail pages

## Adding a project

1. Copy `projects/northstar-console/` to `projects/<your-slug>/`.
2. Replace the title, narrative, image files, image `alt` text, and page metadata in the copied detail page.
3. Copy a project `<li>` in `index.html`, update its number, title, summary, pills, image, and links.
4. Open the homepage and detail page locally at desktop and mobile widths. Confirm the screenshot window, project link, and custom scrollbar work.

`Northstar 2` is a temporary second card that keeps the homepage scroll pane long enough to preview the Aqua scrollbar. Replace it with the next real project rather than removing it before another project is ready.
