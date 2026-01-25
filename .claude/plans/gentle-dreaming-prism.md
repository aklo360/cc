# Plan: Master Dashboard (Native Obsidian Only)

## Goal
Transform Home.md into a master dashboard using only native Obsidian features — wikilinks, tags, and collapsible callouts.

---

## Approach

Since we're not using plugins:
- **No dynamic sorting** — tables are manually ordered
- **Collapsible sections** — use native callouts (`> [!info]-`)
- **Tags** — for quick filtering in Obsidian search
- **Wikilinks** — for navigation

---

## Phase 1: Clean Up & Add Inline Tags

1. **Remove YAML frontmatter** I added to the 5 parent projects
2. **Add inline tags** at bottom of each project file:

```markdown
---
#project #high-priority #aklo-studio
```

**Tag scheme:**
- `#project` or `#subproject`
- `#high-priority`, `#med-priority`, `#low-priority`
- Parent tag: `#aklo-studio`, `#carrera-media`, `#pixel-pushers`, `#vanityzo`, `#personal`

---

## Phase 2: Task Format

Keep tasks as simple checkbox lists:

```markdown
## Tasks
- [ ] Task name — Due: Jan 5 #high-priority
- [ ] Another task — Due: Jan 12 #med-priority
```

---

## Phase 3: Home.md Master Dashboard

Use **collapsible callouts** for each parent, with embedded task tables:

```markdown
# Home

## All Tasks by Priority

### High Priority
| Task | Project | Due |
|------|---------|-----|
| Batch 3v2s | [[CAC]] | Mon Jan 5 |
| Finish trailer | [[pinned.fun]] | Sun Jan 4 |
| Website | [[VanityZo]] | Mon Jan 5 |

### Med Priority
...

### Low Priority
...

---

## By Parent

> [!abstract]- AKLO STUDIO
> | Project | Priority | Status |
> |---------|----------|--------|
> | [[Sketchy Ass Foos]] | Med | Active |
> | [[MCLIV]] | Med | Active |
> | [[Mr Star City]] | Low | Active |

> [!abstract]- CARRERA MEDIA
> ...

(repeat for each parent)
```

---

## Phase 4: Execution Order

1. Remove YAML frontmatter from the 5 parent projects I already modified
2. Add inline tags to all 20 project files
3. Rewrite Home.md with:
   - All tasks table sorted by priority
   - Collapsible parent sections with sub-projects
4. Commit and push

---

## Trade-offs

**Pros:**
- No plugins needed
- Works on mobile Obsidian
- Simple and maintainable

**Cons:**
- Manual updates required (no auto-sorting)
- Need to update Home.md when tasks change
