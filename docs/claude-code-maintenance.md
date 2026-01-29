# Claude Code Maintenance

> Patterns and procedures for maintaining Claude Code sessions and project health

---

## Session Management

### How Sessions Are Stored

Claude Code stores conversation sessions in `~/.claude/projects/`:

```
~/.claude/projects/
├── -Users-claude/                    # Home directory sessions
├── -Users-claude-ccwtf/              # Project-specific sessions
└── [other-project-dirs]/
```

**Session files:** JSONL format with conversation history.

**Session naming:** `{uuid}.jsonl` (e.g., `f3a4305d-20cc-4184-8346-6996eaa00569.jsonl`)

---

## Duplicate Session Problem

### Root Cause
Sessions can become duplicated across directories when:
1. Working from home directory (`~`) then switching to project (`~/ccwtf`)
2. Claude Code copies sessions to maintain continuity
3. Both locations keep separate copies

### Symptoms
- Same sessions appear multiple times in `/resume` picker
- Storage bloat from duplicate session files

### Detection

```bash
# Find duplicates across all project directories
find ~/.claude/projects -name "*.jsonl" -exec basename {} \; | sort | uniq -c | sort -rn | head -10

# Compare specific directories
comm -12 \
  <(ls ~/.claude/projects/-Users-claude/*.jsonl | xargs -n1 basename | sort) \
  <(ls ~/.claude/projects/-Users-claude-ccwtf/*.jsonl | xargs -n1 basename | sort) | wc -l
```

### Cleanup Procedure

**Rule: Keep the PROJECT directory version, delete the HOME directory version.**

Project-specific sessions have the latest context and continuity.

```bash
# Delete duplicates from home directory (keep project versions)
for file in $(comm -12 \
  <(ls ~/.claude/projects/-Users-claude/*.jsonl | xargs -n1 basename | sort) \
  <(ls ~/.claude/projects/-Users-claude-ccwtf/*.jsonl | xargs -n1 basename | sort)); do
  rm ~/.claude/projects/-Users-claude/"$file"
done
```

### Verification

```bash
# Should show no duplicates (all counts = 1)
find ~/.claude/projects -name "*.jsonl" -exec basename {} \; | sort | uniq -c | sort -rn | head -5

# Home directory should have only unique sessions
ls ~/.claude/projects/-Users-claude/*.jsonl | wc -l
```

---

## Best Practices

### 1. Always Work From Project Directory

```bash
# Good: Start Claude Code from project root
cd ~/ccwtf && claude

# Avoid: Starting from home then cd'ing
cd ~ && claude  # Then cd ~/ccwtf
```

### 2. Use `/resume` From Project Directory

When resuming sessions, always be in the project directory so new sessions are created there.

### 3. Periodic Cleanup

Run the duplicate detection command weekly to catch accumulation:

```bash
find ~/.claude/projects -name "*.jsonl" -exec basename {} \; | sort | uniq -c | awk '$1 > 1' | wc -l
```

If > 0, run the cleanup procedure.

---

## Session File Structure

Each `.jsonl` file contains:

```jsonl
{"type": "system", "message": {...}}
{"type": "human", "message": {"content": [...]}}
{"type": "assistant", "message": {"content": [...]}}
{"type": "tool_use", "message": {...}}
{"type": "tool_result", "message": {...}}
...
{"summary": "Session summary text"}
```

**Key fields:**
- `type`: Message type (human, assistant, system, tool_use, tool_result)
- `message.content`: Array of content blocks
- `summary`: Auto-generated session summary (for `/resume` display)

---

## Storage Considerations

- Sessions can grow large (6MB+ for long sessions)
- Agent sessions (`agent-*.jsonl`) are subagent transcripts
- Main sessions are the primary conversation files
- Consider archiving old sessions if storage is limited

---

## Troubleshooting

### /resume shows no sessions
- Check `~/.claude/projects/` for JSONL files
- Verify file permissions
- Ensure you're in the correct directory

### Session won't resume
- File may be corrupted
- Try reading file with `jq` to validate JSON
- Last few lines may have incomplete entries

### Sessions appearing twice
- Run duplicate detection and cleanup
- Check if working from wrong directory
