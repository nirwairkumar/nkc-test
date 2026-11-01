#!/bin/sh
#
# H1 (SECURITY_THREAT_MODEL_AND_PLAN.md) — secret tooling for this repo.
#
#   ./scripts/scan-secrets.sh install    enable the pre-commit hook (one-off, per clone)
#   ./scripts/scan-secrets.sh history    scan every blob ever committed (slow, minutes)
#   ./scripts/scan-secrets.sh worktree   scan the current working tree (fast)
#
# Findings are printed REDACTED — the point is to tell you a key leaked and where,
# not to print it again.
#
# Context: four Google/Gemini API keys reached this repository's history through
# committed .env files, and the repo is public. Git history is permanent, so the
# real remedy for anything found here is ROTATION, not deletion.

set -e
cd "$(git rev-parse --show-toplevel)"

redact() {
    sed -E \
        -e 's/(AIza.{6})[0-9A-Za-z_-]+/\1...[REDACTED-GOOGLE-KEY]/g' \
        -e 's/(ghp_.{4})[A-Za-z0-9]+/\1...[REDACTED-GITHUB-PAT]/g' \
        -e 's/(sk-.{4})[A-Za-z0-9]+/\1...[REDACTED-SK]/g' \
        -e 's/(eyJ[A-Za-z0-9_-]{8})[A-Za-z0-9_.-]+/\1...[REDACTED-JWT]/g' \
        -e 's/(0x[0-9A-Fa-f]{6})[0-9A-Za-z_-]{8,}/\1...[REDACTED-TURNSTILE]/g'
}

PATTERN='AIza[0-9A-Za-z_-]{35}|ghp_[A-Za-z0-9]{36}|sk-[A-Za-z0-9]{20,}|xox[baprs]-[A-Za-z0-9-]{10,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|(rzp_live|sk_live|pk_live)_[A-Za-z0-9]{10,}'

case "${1:-}" in
install)
    git config core.hooksPath .githooks
    chmod +x .githooks/pre-commit 2>/dev/null || true
    echo "pre-commit hook enabled (core.hooksPath=.githooks)."
    echo "Optional, for deeper coverage: install gitleaks and the hook will use it too."
    ;;

history)
    echo "Scanning every blob in history — this takes a few minutes..."
    git rev-list --objects --all \
      | git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize)' \
      | awk '$1=="blob" && $3<2000000 {print $2}' \
      | git cat-file --batch \
      | grep -oaE "$PATTERN" \
      | sort -u > /tmp/.secret_scan_history || true

    count=$(wc -l < /tmp/.secret_scan_history | tr -d ' ')
    echo
    echo "distinct secrets found in history: $count"
    [ "$count" -gt 0 ] && redact < /tmp/.secret_scan_history | sed 's/^/  /'
    rm -f /tmp/.secret_scan_history
    echo
    echo "Anything listed above is PERMANENTLY public if this repo is public."
    echo "Rotate it. Removing the commit does not un-leak it."
    ;;

worktree|"")
    echo "Scanning tracked files in the working tree..."
    if git grep -nIE "$PATTERN" -- . > /tmp/.secret_scan_wt 2>/dev/null; then
        echo
        echo "POTENTIAL SECRETS IN TRACKED FILES:"
        redact < /tmp/.secret_scan_wt | sed 's/^/  /'
        rm -f /tmp/.secret_scan_wt
        exit 1
    fi
    rm -f /tmp/.secret_scan_wt
    echo "clean — no secret patterns in tracked files."
    ;;

*)
    echo "usage: $0 {install|history|worktree}" >&2
    exit 2
    ;;
esac
