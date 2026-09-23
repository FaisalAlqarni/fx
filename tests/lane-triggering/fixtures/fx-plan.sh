#!/usr/bin/env bash
# fx-plan.txt refers to an approved design at this path; without the file the
# trigger has no subject to point at.
set -euo pipefail
mkdir -p docs/plans/2026-01-01-notes
cat > docs/plans/2026-01-01-notes/design.md <<'MD'
# Notes: add a note field to the user profile

**Status:** approved

## Problem

Users have no place to leave a short note on their own profile.

## Design

Add a `note` text column to the `users` table, nullable, max 280 characters.
Expose it on the profile edit form and the profile view.
MD
