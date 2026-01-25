# Claude Context Files

This directory contains Claude Code context files that are synced across machines.

## Contents

### `/plans/`
Plan files created during Claude Code sessions. These contain implementation plans, architectural decisions, and design notes for various features.

Notable plans:
- `noble-sprouting-shell.md` - VJ Agent implementation (64KB)
- `snazzy-wishing-comet.md` - Central Brain v4 autonomous loop (63KB)
- `enumerated-churning-yeti.md` - Trailer system + video generation (19KB)
- `dapper-yawning-key.md` - Feature verification system (12KB)

### Root `CLAUDE.md`
The main project context file lives at `/CLAUDE.md` (root of repo).
This is the primary source of truth for project documentation.

## Syncing

These files are committed to the repo and can be synced to the VPS:

```bash
# On VPS
cd /root/ccwtf
git pull

# Plans will be at /root/ccwtf/.claude/plans/
```

## Note

The `.jsonl` session transcripts are NOT synced as they are large (88MB+) and contain raw conversation history. Only the plan files (summaries) are synced.
