#!/usr/bin/env bash
# Deploy only the built static app, never a working tree or credentials.
set -euo pipefail
DEPLOY_TARGET="${1:?Usage: bash scripts/deploy.sh user@host [/opt/ponemnogu-todo]}"
DEPLOY_DIR="${2:-/opt/ponemnogu-todo}"
[[ "$DEPLOY_TARGET" =~ ^[a-zA-Z0-9_.-]+@[a-zA-Z0-9.-]+$ ]] || { echo 'Invalid SSH target'; exit 1; }
[[ "$DEPLOY_DIR" =~ ^/[a-zA-Z0-9_./-]+$ ]] || { echo 'Invalid deployment path'; exit 1; }
[[ -f dist/index.html ]] || { echo 'Run npm run build first.'; exit 1; }
RELEASE="$(git rev-parse --short=12 HEAD)-$(date +%Y%m%d%H%M%S)"
ARCHIVE="$(mktemp "${TMPDIR:-/tmp}/ponemnogu-release.XXXXXX.tar.gz")"
trap 'rm -f "$ARCHIVE"' EXIT
tar -czf "$ARCHIVE" dist infra/nginx.conf
ssh -o BatchMode=yes "$DEPLOY_TARGET" "mkdir -p '$DEPLOY_DIR/releases/$RELEASE'"
scp "$ARCHIVE" "$DEPLOY_TARGET:$DEPLOY_DIR/releases/$RELEASE/artifact.tar.gz"
ssh -o BatchMode=yes "$DEPLOY_TARGET" bash -s -- "$DEPLOY_DIR" "$RELEASE" <<'REMOTE'
set -euo pipefail
DEPLOY_DIR="$1"
RELEASE="$2"
cd "$DEPLOY_DIR/releases/$RELEASE"
tar -xzf artifact.tar.gz
rm artifact.tar.gz
cp infra/nginx.conf "$DEPLOY_DIR/nginx.conf"
PREVIOUS="$(readlink "$DEPLOY_DIR/current" || true)"
ln -s "releases/$RELEASE" "$DEPLOY_DIR/current.next"
mv -Tf "$DEPLOY_DIR/current.next" "$DEPLOY_DIR/current"
if ! docker inspect ponemnogu-todo >/dev/null 2>&1; then
  docker run -d --name ponemnogu-todo --label app=ponemnogu-todo \
    --restart unless-stopped --read-only --security-opt no-new-privileges:true \
    --tmpfs /var/cache/nginx --tmpfs /var/run --memory 64m --cpus 0.5 \
    -p 8092:80 -v "$DEPLOY_DIR:/srv/site:ro" \
    -v "$DEPLOY_DIR/nginx.conf:/etc/nginx/conf.d/default.conf:ro" \
    nginx:1.27-alpine
else
  docker exec ponemnogu-todo nginx -t
  docker exec ponemnogu-todo nginx -s reload
fi
HEALTHY=0
for ATTEMPT in 1 2 3 4 5; do
  if curl -fsS http://127.0.0.1:8092/ | grep -q 'Понемногу'; then HEALTHY=1; break; fi
  sleep 1
done
if [ "$HEALTHY" -ne 1 ]; then
  if [ -n "$PREVIOUS" ]; then
    ln -s "$PREVIOUS" "$DEPLOY_DIR/current.rollback"
    mv -Tf "$DEPLOY_DIR/current.rollback" "$DEPLOY_DIR/current"
  fi
  echo 'Health check failed; previous release restored when available.'
  exit 1
fi
printf 'Deployed release: %s\n' "$RELEASE"
REMOTE
