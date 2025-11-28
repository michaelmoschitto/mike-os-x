# Mike's Blog

Jekyll-based blog deployed via GitHub Pages at blog.michaelmoschitto.com.

## Writing Posts

1. Create file: `_posts/YYYY-MM-DD-your-post-title.md`
2. Add markdown content (starts with `## Title`)
3. Commit and push - GitHub Actions will deploy automatically

## Local Development

### Option 1: Using Docker (Recommended - Fast, No Re-downloads)

```bash
cd blog
./test-local.sh
```

**Or using Docker Compose from the repo root:**

```bash
docker compose -f docker-compose.dev.yml up blog
```

The blog will be available at: **http://localhost:4000**

**Note:** The first run will download the Jekyll image (~800MB), but it's cached after that. Subsequent runs are instant - no re-downloading. Bundle dependencies are also cached in a Docker volume.

### Option 2: Using Ruby (if you have Ruby 2.7+)

If you have Ruby 2.7 or higher installed:

```bash
cd blog
bundle install
bundle exec jekyll serve
# Visit http://localhost:4000
```

**Note:** If you encounter OpenSSL or Ruby version issues, use the Docker method above. The GitHub Actions workflow will handle builds automatically on push.

## Pages

- `index.md` - Homepage
- `resume.md` - Professional resume
- `reading.md` - Curated reading list
- `archive.md` - Blog post archive

## Deployment

Automatic via GitHub Actions on push to main branch when files in `blog/` directory change.

Custom domain: blog.michaelmoschitto.com

## Structure

- `_config.yml` - Jekyll configuration
- `_includes/` - Reusable HTML partials
- `_layouts/` - Page templates
- `_posts/` - Blog post markdown files
- `css/` - Custom stylesheets
- `js/highlightjs/` - Syntax highlighting libraries

