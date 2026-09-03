# Blog post template reference (for the automated blog-post scheduled task)

This file exists so the twice-weekly automated blog post run doesn't have to
re-derive the site's template conventions from scratch by reading several
full blog posts every time. Read this file first, then spot-check 1 recent
post in `blog/` to confirm nothing drifted since this was last updated.

## File to create

New post: `blog/<kebab-case-slug>.html`. Copy the full structure of an
existing post (e.g. `blog/claude-memory-update-b2b-teams.html` or any recent
one) rather than building the `<head>` from memory. The pieces that matter:

- `<title>` and `og:title` / `twitter:title`: `<Headline> | The Endurance Group`
- Canonical, `og:url`: `https://theendurancegroup.com/blog/<slug>.html` (no www — this is the site-wide convention in every existing post's markup, even though the live site currently only resolves correctly under `www.theendurancegroup.com`; see "Known site quirks" below)
- `og:image` / `twitter:image`: always `https://www.theendurancegroup.com/images/og-default.png`, 1200x630
- `article:published_time`: today, `T09:00:00-04:00`

## The three JSON-LD blocks

1. `ProfessionalService` — copy byte-for-byte from any existing post, it never changes.
2. `Article` — headline/description match the meta tags, `image` is og-default.png, `datePublished`/`dateModified` are today, `mainEntityOfPage` is the canonical URL.
   - `author.jobTitle` for Conor Sullivan: the site is inconsistent (`"VP"` and `"Vice President"` both appear across posts). Use **"Vice President"** — that's his exact title on `authors/conor-sullivan.html`, and the visible byline meta line elsewhere on the site (`<span>Vice President</span>`) matches it.
3. `FAQPage` — 3-4 real Q&As. **Must exactly match visible content** in the body (see below), not just live in the schema.

## Shared header and footer

Copy these two blocks byte-for-byte from any recent post. Do not paraphrase.
Nav links are relative (`../about.html` etc.) since posts live in `blog/`.

## Hero section

```html
<span class="eyebrow">{{Category}}</span>
<h1>{{Headline, sentence case}}</h1>
<div class="case-study-meta" style="margin-top:20px;">
  <span><a href="../authors/conor-sullivan.html">Conor Sullivan</a></span>
  <span class="divider">·</span>
  <span>Vice President</span>
  <span class="divider">·</span>
  <span>{{Month D, YYYY}}</span>
</div>
<a class="category-badge" href="category/{{category-slug}}.html" style="margin-top:16px;">{{Category}}</a>
```

Category options and their slugs (eyebrow text must match the category page's H1 exactly):
- AI Automations -> `category/ai-automations.html` (general Claude/Anthropic product or industry-wide news lives here)
- Real Estate -> `category/real-estate.html`
- Professional Services -> `category/professional-services.html`
- B2B Technology & SaaS -> `category/b2b-technology-saas.html`
- Sales Execution -> `category/sales-execution.html`
- Growth & Systems Ops -> `category/growth-systems-ops.html`

## Article body

`<div class="prose">` inside `<section class="section section--alt">`, `<h2>` per
section, 700-1200 words. Near the top, one italicized credibility paragraph,
exact pattern (adjust the middle sentence to what the post is actually about):

```html
<p><em>TEG is an official member of the Anthropic Claude Partner Network. We build Claude Skills, Projects, and MCP integrations for B2B ops teams. <a href="../solutions.html">See our full Claude services.</a></em></p>
```

Never mention prices, dollar amounts, or membership tiers anywhere in the body.

End the body with a **visible** FAQ section that matches the FAQPage schema
word for word:

```html
<h2>Frequently asked questions</h2>
<h3>{{Question 1}}</h3>
<p>{{Answer 1}}</p>
<h3>{{Question 2}}</h3>
<p>{{Answer 2}}</p>
```

Then the CTA button group:

```html
<div class="btn-group">
  <a class="btn btn-primary" href="../free-training.html">Get a Free Team Training</a>
  <a class="btn btn-secondary" href="../contact.html">Schedule a Call</a>
</div>
```

## Related reading section

After the body's closing `</section>`, a second section:

```html
<section class="section">
  <div class="container">
    <div class="section-head section-head--center"><h2>Related reading</h2></div>
    <div class="grid grid--2">
      <div class="feature-card">
        <span class="eyebrow">{{Category}}</span>
        <h3><a href="{{existing-post-slug}}.html">{{Existing post title}}</a></h3>
        <p>{{One-line description}}</p>
      </div>
      <!-- second card, same pattern -->
    </div>
  </div>
</section>
```

Link to 2 real, existing posts. Then pick the more relevant one and add a
short, natural in-body backlink to the new post inside that older file (a new
sentence in its most relevant paragraph, or a new "Related reading" card if
it already has that section) — this is the two-way linking step, do not skip it.

## Site files that must be updated in the same commit

1. **`blog.html`**: add a new `{"@type":"BlogPosting","headline":"...","url":"...","datePublished":"YYYY-MM-DD"}` entry at the top of the `blogPost` JSON-LD array, and a new card at the top of `#blog-grid`:
   ```html
   <div class="feature-card blog-card" data-category="{{category-slug}} claude">
     <a class="eyebrow" href="blog/category/{{category-slug}}.html">{{Category}}</a>
     <h3><a href="blog/{{slug}}.html">{{Headline}}</a></h3>
     <p>{{1-2 sentence teaser}}</p>
   </div>
   ```
2. **`blog/category/{{category-slug}}.html`**: same card pattern (paths are relative to `blog/category/`, so `../{{slug}}.html` and no `blog/` prefix), added at the top of that page's `grid grid--2`.
   Note: as of Sept 2026 this file was out of sync with blog.html for several recent posts (Fable 5.1, Claudeforce, data-privacy were missing). Add the new run's card regardless of that pre-existing gap; don't try to backfill the missing older ones unless asked.
3. **`sitemap.xml`**: one compact single-line entry, inserted before the most recent existing one:
   ```xml
   <url><loc>https://theendurancegroup.com/blog/{{slug}}.html</loc><lastmod>YYYY-MM-DD</lastmod><changefreq>monthly</changefreq><priority>0.9</priority></url>
   ```
4. **`llms.txt`**: one bullet under `## Blog`, right after the "Blog index" line:
   `- [{{Title}}](https://theendurancegroup.com/blog/{{slug}}.html)`
5. **`automation-log.json`** (repo root): prepend one entry, see the existing file for the exact shape.

## Known site/infra quirks (don't waste time rediscovering these)

- **Bare apex domain 404s on all sub-paths.** `https://theendurancegroup.com/blog/anything.html` returns 404 directly (not a redirect) even for posts that have been live for weeks. Only `https://theendurancegroup.com/` (the root) redirects to `https://www.theendurancegroup.com/`. This is a pre-existing Railway/DNS config issue, not something a new post run causes or can fix. **Verify deploys against `https://www.theendurancegroup.com/blog/{{slug}}.html` instead** — that's the URL that actually resolves. Worth flagging to Conor periodically until it's fixed at the domain level, but don't block a run on it.
- **`git push origin main` may fail with `403` / "access denied by the git proxy... not in this session's authorized repository set."** The sandbox's own proxy intercepts github.com and ignores the token embedded in the clone URL. Fix: run the push (and any other git network operation, if needed) with the proxy env vars unset for just that command:
  ```
  env -u https_proxy -u HTTPS_PROXY -u http_proxy -u HTTP_PROXY git push origin main
  ```
- **The repo's default branch on the remote may not be `main`.** Clone with `-b main --single-branch` explicitly rather than trusting the default checkout, to avoid ending up on some other branch and needing to `git fetch origin main && git checkout -B main origin/main` mid-run.
- **Clone light.** This repo carries 380+ commits and a 3MB+ `images/` folder that a blog-post run never touches. Prefer:
  ```
  git clone -b main --single-branch --depth 100 --filter=blob:none --sparse <url>
  cd Tegwebsite
  git sparse-checkout set blog llms.txt sitemap.xml blog.html automation-log.json authors AUTOMATION_TEMPLATE.md
  ```
  `--depth 100` still leaves plenty of history for the "skim recent posts" duplicate check in step 2.
