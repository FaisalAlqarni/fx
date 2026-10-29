# Final review: security lens (branch mode, 95ff86e..edc4970)

2 findings, both Minor. Recorded by the controller.

1. Minor. src/lib/sf-diagrams.ts:413 (called from :426; spec path from sf-build.ts:283): authorCanvas rewrites diagrams/src/<name>.json with plain fs.writeFileSync, skipping the writable() guard and running even after writeGenerated reported a collision for that file; a hand-written spec there is overwritten. Fix: route the spec path through w() and skip a collided spec.
2. Minor. scripts/check-prose:197: --diff <ref> reaches git diff without --end-of-options; a ref like --output=<path> writes a file. Fix: add --end-of-options before the ref.

Checked clean: every new model field escaped in HTML and attributes; term links; template slots; inline JSON; filter and menu built with createElement and textContent; player text via textContent; Markdown escaping and code spans; migrate writes through writable(); no repo content executed; no secrets.
