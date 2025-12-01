# Blog Style + Process (Railway + EC2 post reference)

Purpose: Capture how we produced “2 Platforms: How We Unified Railway and EC2 Deployments,” so future posts match tone, structure, and formatting. Use this as a prompt/checklist when drafting technical posts.

---

## Audience and Voice

- Conversational, senior-engineer clarity; keep warmth without hype.
- Prefer neutral voice over first person. Some “I/we” is fine when it adds authenticity, but default to neutral phrasing.
- Avoid corporate jargon and buzzwords. Be direct and specific.
- “Show, not tell”: describe what the system does, the decisions taken, and why—don’t brag about being “honest” or “transparent.”
- No em dashes. Prefer periods, commas, or semicolons.
- Avoid “Here’s the thing” and “The real problem.” Use “The Problem.”
- If using a Buffett-style reflection, make it a natural closing section (“Closing thoughts”), not a literal “The Buffett Reflection.” No name drops unless essential.

Reference philosophy: Phil Eaton’s “What makes a great technical blog” emphasizes tackling hard topics, concrete examples, and honest trade-offs. Keep those principles front and center. See: [`What makes a great technical blog`](https://notes.eatonphil.com/2024-04-10-what-makes-a-great-tech-blog.html).

---

## Required Post Format

Front matter template (keep fields concise and accurate):

```yaml
---
layout: post
title: '2 Platforms: How We Unified Railway and EC2 Deployments'
date: YYYY-MM-DD
author: Michael Moschitto
tags: Infrastructure/DevOps
---
```

- Use `layout: post` to ensure the Jekyll theme (navbar, URL, archive) applies.
- Use a single tag value like `Infrastructure/DevOps` so the archive groups correctly.
- Title guidelines: short, concrete, and scannable. Avoid fluff words.

---

## Canonical Section Order

Keep sections short; each one should advance understanding. A good baseline:

1. Opening anecdote (one–two sentences, optional). Set context quickly.
2. The Problem
3. The Hybrid Solution (high-level architecture bullets)
4. How It Works (workflow triggers and what happens; keep it narrative)
5. Infrastructure as Code (what’s defined, not every line)
6. Building the Terminal Container (security model and reasoning)
7. Docker TLS (why mutual TLS, key details like SAN; narrative first)
8. The Monorepo Advantage (why this matters for leverage)
9. Before and After (quantified improvements)
10. What This Unlocks (operational leverage)
11. Lessons Learned (3–5 specific, human insights; at least one humble/funny)
12. Trade-offs (risks, complexity honestly stated)
13. Closing thoughts (concise, grounded reflection)

Notes:

- Keep headings literal and neutral; avoid gimmicks.
- Reflection should summarize the principle (e.g., “let each platform do what it does best”), not quote Buffett/Munger.

---

## Code Examples: “Tasteful and Minimal”

- Include code only if it clarifies the narrative (e.g., a tiny CI job, a minimal Pulumi snippet, the docker-compose security constraints).
- Keep snippets small (5–20 lines). Prefer “slices” that illustrate the point.
- Label snippets plainly; do not annotate with “(excerpt)”. Examples:
  - `# .github/workflows/ci.yml`
  - `// iac/index.ts`
  - `# apps/api/docker-compose.terminal.yml`
- Avoid large, copy-paste-able blocks for sensitive or mutable config (TLS, secrets). Focus on the “why” and the key fields.

---

## Style Rules (quick checklist)

- Avoid em dashes.
- Do not use “Here’s the thing” or “The real problem.”
- Prefer “The Problem” as the core problem heading.
- Keep “I/we” sparse; favor neutral constructions (e.g., “When the deployment workflow is updated, the blog post can be updated in the same commit.”).
- Talk about trade-offs and risks plainly.
- Prefer short sentences and tight paragraphs.
- Use lists for architecture and outcomes.
- Quantify improvements (time saved, steps removed) when possible.

---

## “Show, Not Tell” Heuristics

- Replace “we are honest about trade-offs” with the actual trade-offs.
- Replace “this is robust” with what makes it robust (e.g., mutual TLS, read-only FS, dropped capabilities).
- Replace “this is simple” with the two or three steps that prove it’s simple.

---

## Process for Drafting

1. Collect context to cite:
   - Workflows in `.github/workflows/` (CI, infrastructure, blog deploy).
   - Infra code in `iac/` (Pulumi stack).
   - Container and compose files in `apps/api/` (Dockerfile, docker-compose).
2. Draft structure first (headings + one-line bullets under each).
3. Write narrative pass; keep paragraphs short; avoid code.
4. Add only the minimal code slices that improve comprehension.
5. Quantify before/after with realistic, defensible numbers.
6. Add a “Lessons Learned” section with 3–5 specific insights (avoid generic advice).
7. Add closing thoughts that restate the core principle and leverage gained.
8. Final sweep for style rules (no em dashes; neutral voice; section names ok).
9. Save to `blog/_posts/YYYY-MM-DD-title.md` with correct front matter.

---

## Quality Bar / Acceptance Criteria

- Post renders with full theme (navbar, URL structure) via `layout: post`.
- Archive groups under `Infrastructure/DevOps`.
- Sections appear in the canonical order (minor deviations allowed if justified).
- At most 2–3 short code blocks, clearly labeled, no “excerpt” suffixes.
- Trade-offs are named plainly (added complexity, TLS management, etc.).
- Before/after includes at least one quantified improvement.
- “Lessons Learned” section includes 3–5 insights when applicable (specific, non-generic).
- Closing section is neutral and concise (no quotes, no name drops).

---

## Prompt Template (use when generating a new post)

You are a senior engineer writing a technical blog post for Mike’s Jekyll blog (minima theme). Write clearly, concretely, and concisely. Follow these rules:

- Voice: neutral, warm, no jargon. Limited “I/we”; prefer neutral phrasing.
- No em dashes. Do not use “Here’s the thing” or “The real problem.” Use “The Problem.”
- “Show, not tell”: explain decisions and consequences with specific details.
- Include 0–3 small code blocks only if they significantly improve clarity. Label them plainly (no “excerpt”).
- Required section order: Opening (optional, short) → The Problem → The Hybrid Solution → How It Works → Infrastructure as Code → Building the Terminal Container → Docker TLS → The Monorepo Advantage → Before and After → What This Unlocks → Lessons Learned → Trade-offs → Closing thoughts.
- Front matter:

```yaml
---
layout: post
title: '<concise, concrete title>'
date: YYYY-MM-DD
author: Michael Moschitto
tags: Infrastructure/DevOps
---
```

- Cite ideas that informed the writing style (e.g., Phil Eaton’s post on great tech blogs: https://notes.eatonphil.com/2024-04-10-what-makes-a-great-tech-blog.html).
- Quantify improvements where possible.
- End with a grounded reflection that reinforces the main principle (no quotes, no name drops).

Inputs you will receive:

- Topic and goal
- Relevant repo files/paths
- Any platform constraints or decisions

Output:

- A single Markdown post that adheres to all rules and passes the quality bar.

---

## Post-Publish Checklist

- Builds locally (or CI) without warnings.
- Appears under the correct archive category.
- Links and citations resolve.
- Code blocks render properly and are as small as possible.
- Commit includes both post content and any referenced workflow/infra changes when relevant (keep content and configuration in sync).
