#!/bin/sh
# with-key.sh <keyfile> <VAR>... -- <command> [args]: inside the jail, export each
# VAR from the key file and exec the command. The key is handed to a session as
# a file and read here, so it is never an argument of any process: bwrap's
# --setenv puts a value on the command line, where a process listing shows it.
f="$1"; shift
vars=""
while [ "$#" -gt 0 ] && [ "$1" != -- ]; do vars="$vars $1"; shift; done
[ "${1:-}" = -- ] || { echo "with-key.sh: no command" >&2; exit 97; }
shift
k="$(cat "$f")" && [ -n "$k" ] || { echo "with-key.sh: cannot read the key file" >&2; exit 97; }
for v in $vars; do export "$v=$k"; done
exec "$@"
