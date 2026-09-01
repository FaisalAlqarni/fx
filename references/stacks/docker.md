# Docker

Ecosystem knowledge. True in any containerized repo — nothing here describes a
particular compose file.

**This file never names a service, an image, a port or a Makefile target.**
Those belong to `.fx.json` and `repo.md`.

---

## Before changing anything

**Find out whether the repo drives Docker through a wrapper.** A `Makefile`,
`bin/` script or `Taskfile` that fronts compose exists because the raw commands
need flags nobody wants to retype. Bypassing it with a bare `docker compose up`
skips those flags and produces a subtly different environment — a missing
override file, a missing profile, the wrong env file.

`.fx.json` carries the commands. Use them.

## The one that wastes the most time

**Editing a file and not seeing the change.** Whether a rebuild is needed
depends on how the file got into the container:

| The file arrived via | Change appears |
|---|---|
| bind mount (`./src:/app/src`) | immediately — restart at most |
| `COPY` in the Dockerfile | only after `build` |
| a dependency manifest | after `build`, and only if the cache broke |

Symptom of getting this wrong: the code is correct, the container disagrees,
and half an hour goes into debugging logic that was never running. Check the
mount before debugging the code.

The reverse also bites: a file mounted over a directory the image populated at
build time **hides** the built content. An empty host directory mounted at a
dependency path yields "module not found" for something the image definitely
installed.

## Layer caching

Order the Dockerfile from least to most frequently changed:

```dockerfile
COPY package.json package-lock.json ./     # rarely changes
RUN npm ci                                 # cached until the manifest does
COPY . .                                   # changes constantly
```

Reversed — `COPY . .` before installing dependencies — every source edit
invalidates the install layer and every build reinstalls everything. This is
the single largest cause of slow builds, and it looks harmless.

A dependency cache in a **named volume** survives rebuilds entirely. It also
means a manifest change may not take effect until the volume is refreshed —
know which of the two mechanisms the repo uses before diagnosing a stale
dependency.

## `.dockerignore`

Without it, the entire working directory is sent to the daemon as build
context — `node_modules`, `vendor`, `.git`, build output, logs, local
databases. Symptoms: slow builds with no obvious cause, and images far larger
than the source.

It also prevents a host `node_modules` (built for the host's architecture and
libc) from overwriting the container's.

## Multi-stage builds

Build in one stage, copy only the artifact into a minimal final stage. The
compiler, dev headers and package caches never reach the shipped image.

Two mistakes: copying the whole build stage forward (which defeats the point),
and `apt-get install` without `rm -rf /var/lib/apt/lists/*` in the same `RUN`
— a separate `RUN` leaves the cache in the earlier layer, where it still counts
against image size.

## Secrets

**`ARG` is not secret.** Build arguments are visible in image history. **`ENV`
is not secret.** Environment values are baked into the image and readable by
anyone who can pull it. A `COPY` of a credential file persists in that layer
even if a later layer deletes it.

Secrets arrive at **runtime** — an env file that is not committed, a mounted
file, or a secrets manager. If a credential appears in a `Dockerfile`, that is
a finding, not a style note.

## Compose

- **`docker-compose.override.yml` is loaded automatically** and merged over the
  base. A setting that "does not apply" is usually being overridden there. Any
  other file needs an explicit `-f`, and passing `-f` **replaces** the default
  set rather than adding to it — so `-f docker-compose.test.yml` alone drops
  the override that was previously implicit.
- **`depends_on` waits for start, not for readiness.** Without
  `condition: service_healthy` and a `healthcheck`, an app container races its
  database and fails on first connection. Retries in the app are the more
  robust fix; the healthcheck is the cheaper one.
- **Named volumes persist across `down`.** `down -v` removes them — that is
  data loss, and for a development database it is usually not what was wanted.
  `down` then `up` is almost always the intended pair.
- A volume declared but never mounted, or mounted at the wrong path, fails
  silently and looks like a permissions problem.

## Runtime

- **One concern per container.** Two processes means the container's health
  reflects only one of them, and a crash of the other is invisible.
- **Logs go to stdout/stderr.** A process writing to a file inside the
  container produces logs nobody can reach, and they vanish with the container.
- **PID 1 does not forward signals in shell form.** `CMD command` runs under a
  shell that ignores `SIGTERM`, so the container is killed after the timeout on
  every stop. Use exec form: `CMD ["command", "arg"]`, or an init.
- **Run as non-root.** A container running as root writes host-owned-by-root
  files through bind mounts, which then cannot be edited without `sudo`.
- **Match the platform.** An image built on arm64 fails on an amd64 host with
  `exec format error`. Build with `--platform` when they differ.

## Base images

`slim` variants use glibc; `alpine` uses musl. Musl breaks native extensions,
changes DNS resolution behaviour and produces different locale handling. A
switch to alpine for size is not a like-for-like substitution and should be
tested, not assumed.

Pin to a specific version, never `latest` — a rebuild months later silently
picks up a new major.

## Diagnosing

In order, cheapest first:

1. `ps` — is it running, or restart-looping?
2. `logs` — the error is usually there and usually at the top, not the bottom.
3. `exec` a shell — is the file present, at the expected path, with the
   expected content?
4. Only then read the application code.

A container that exits immediately with no logs has almost always failed at
`CMD`/`ENTRYPOINT` — wrong path, not executable, or wrong architecture.
