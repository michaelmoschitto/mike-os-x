# Selected Work content

Create one folder per case study:

```text
projects/
  project-slug/
    index.md
    images/
      thumbnail.webp
      screenshot.webp
```

Use this frontmatter in `index.md`:

```yaml
---
app: projects
slug: projects/project-slug
title: Project title
summary: One sentence describing the outcome.
order: 1
role: Product Designer
team: Product and Engineering
timeline: "2025"
tags:
  - UI
thumbnail: images/thumbnail.webp
thumbnailAlt: Description of the thumbnail
---
```

Use standard Markdown image syntax. The image title becomes its visible caption:

```markdown
![Meaningful screenshot description](images/screenshot.webp "Short explanatory caption.")
```
