# Community tier

What other people report: reviews, benchmarks they ran, experience reports, issue threads. It sits beside the primary sources and never replaces them: a fact the docs, the source or the spec can settle is settled there.

## The note gets its own section

Put community findings under a `## Community evidence` heading, after the primary-source findings. Facts from official docs, source code or specs stay in their own sections; a community item never backs a sentence there.

Each item carries:

| Field | What goes in it |
|---|---|
| Date | When it was posted or last updated |
| Source and link | The site, the author or thread, the URL |
| Rests on | A benchmark's setup, versions and sample size; a report's reproduction steps; or "none given" |
| Weight | `single-source` when one person makes the claim and nobody repeats it; otherwise the other items that agree |

Prefer recent items, and say how old the old ones are. When items disagree, say so and set them side by side; do not average them into one verdict.

## Sources

Queries go out in public terms, as for every other query in this lane. Send a descriptive User-Agent, for example `fx-research/1`.

| Source | How |
|---|---|
| Hacker News | `https://hn.algolia.com/api/v1/search?query=<terms>&tags=story` (comments: `tags=comment`; newest first: `search_by_date`) |
| Stack Exchange | `https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=relevance&q=<terms>&site=stackoverflow` (unauthenticated quota is per IP per day; stop when `quota_remaining` is low) |
| Lobsters | No JSON search. Find stories with web search `site:lobste.rs <terms>`, then read `https://lobste.rs/s/<short_id>.json`; tag listings are `https://lobste.rs/t/<tag>.json` |
| dev.to | `https://dev.to/api/articles?tag=<tag>` and `https://dev.to/api/articles/<id>`; for a text search use web search `site:dev.to <terms>` |
| GitHub issues, discussions, releases | `gh` when it is installed; otherwise the REST API unauthenticated (`https://api.github.com/search/issues?q=repo:<owner>/<repo>+<terms>`) or the public pages |
| YouTube talks and benchmarks | Subtitles with `yt-dlp` only when it is already on PATH, run with `HOME` and its cache in a scratch folder. When it is not on PATH, say so in the note and skip the source. Never install it |
| Reddit | Web search for threads, then the public RSS feeds below |
| X, LinkedIn | Login-walled: web search snippets only, each labelled `snippet only` |

## Reddit through public RSS

Unauthenticated Reddit JSON returns 403, and the API route is not used: it needs Reddit's approval under its Responsible Builder Policy. Reddit is read through its public RSS feeds, with no cookies and no login:

1. Find threads with web search: `site:reddit.com <terms>`.
2. Read a thread and its comments at `https://www.reddit.com/r/<sub>/comments/<id>/.rss`, or a subreddit's top posts at `https://www.reddit.com/r/<sub>/top/.rss?t=month`. Avoid `search.rss`: it is rate limited and unreliable.
3. Send a descriptive User-Agent, for example `fx-research/1 (public RSS reader)`. The budget is tiny (one request can leave `X-Ratelimit-Remaining` at 0), so wait at least `X-Ratelimit-Reset` seconds, and never less than a few seconds, between requests.
4. On a 429, stop reading Reddit and say in the note which threads went unread.
