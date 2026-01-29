# UI Styleguide

> **LOCKED IN - ALWAYS FOLLOW.** This is the official styleguide for claudecode.wtf.

---

## Background

- **ALL pages use the same background:** `#0d0d0d` (--bg-primary)
- NO gradients, NO `bg-black`, NO custom backgrounds
- Background is inherited from `body` in `globals.css`

---

## Page Layout Pattern

Every page follows this exact structure:

```tsx
<div className="min-h-screen w-full flex items-center justify-center py-4 sm:py-8 px-[5%]">
  <div className="max-w-[900px] w-[90%]">
    {/* Header */}
    {/* Content */}
    {/* Footer */}
  </div>
</div>
```

### Key Measurements

| Property | Value |
|----------|-------|
| Outer horizontal | `px-[5%]` |
| Inner width | `w-[90%]` with `max-w-[900px]` (or `max-w-[1200px]` for wide pages) |
| Vertical | `py-4 sm:py-8` responsive padding |

---

## Header Pattern (Traffic Lights)

Every page has the same header structure:

```tsx
<header className="flex items-center gap-3 py-3 mb-6">
  {/* Traffic lights - LINK TO HOMEPAGE */}
  <Link href="/" className="flex gap-2 hover:opacity-80 transition-opacity">
    <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
    <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
    <div className="w-3 h-3 rounded-full bg-[#28c840]" />
  </Link>

  {/* CC Icon - LINK TO HOMEPAGE */}
  <Link href="/" className="hover:opacity-80 transition-opacity">
    <img src="/cc.png" alt="$CC" width={24} height={24} />
  </Link>

  {/* Page Title - NOT A LINK, just text */}
  <span className="text-claude-orange font-semibold text-sm">Page Title</span>

  {/* Optional tagline - right aligned */}
  <span className="text-text-muted text-xs ml-auto">Optional tagline</span>
</header>
```

### Important

- Traffic lights and CC icon are LINKS to homepage
- Page title is NOT a link (just a `<span>`)
- No `border-b` on header (clean look)

---

## Footer Pattern

Every page has the same footer structure:

```tsx
<footer className="py-4 mt-6 text-center">
  <Link href="/" className="text-claude-orange hover:underline text-sm">
    ← back
  </Link>
  <p className="text-text-muted text-xs mt-2">
    claudecode.wtf · [page-specific tagline]
  </p>
</footer>
```

### Important

- Always include `← back` link to homepage
- No `border-t` on footer (clean look)
- Tagline is optional but recommended

---

## Homepage-Specific Layout

The homepage has a unique structure:

```tsx
{/* Terminal Header with border */}
<header className="flex items-center gap-3 py-3 border-b border-border">
  <div className="flex gap-2">
    {/* Traffic lights - NOT links on homepage */}
    <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
    <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
    <div className="w-3 h-3 rounded-full bg-[#28c840]" />
  </div>
  <span className="text-text-secondary text-sm ml-auto">
    claude-code-coin ~ zsh
  </span>
</header>

{/* Logo + Social Links Row */}
<div className="flex items-start justify-between -mt-6">
  <img src="/cc.png" alt="$CC" width={64} height={64} />
  <div className="flex items-center gap-4">
    {/* Social links: @ClaudeCodeWTF, @bcherny, Claude Code GitHub */}
  </div>
</div>
```

---

## Card/Section Pattern

```tsx
<div className="bg-bg-secondary border border-border rounded-lg p-4">
  {/* Card content */}
</div>
```

---

## Button Patterns

### Primary (orange fill)

```tsx
className="bg-claude-orange text-white font-semibold py-2 px-6 rounded-md text-sm hover:bg-claude-orange/80 transition-colors"
```

### Secondary (outline)

```tsx
className="bg-bg-secondary border border-border text-text-primary px-4 py-2 rounded-md text-sm hover:bg-bg-tertiary hover:border-claude-orange hover:text-claude-orange transition-colors"
```

### Feature buttons (colored borders)

```tsx
className="bg-bg-secondary border border-[color]-500 text-[color]-400 px-4 py-2 rounded-md text-sm font-semibold hover:bg-[color]-500 hover:text-white transition-colors"
```

Available colors: `cyan`, `fuchsia`, `green`, `yellow`, `orange`, `rose`, `indigo`

---

## Typography

| Element | Class |
|---------|-------|
| Page titles | `text-claude-orange font-semibold text-sm` |
| Section labels | `text-text-secondary text-xs uppercase tracking-wider` |
| Body text | `text-text-primary text-sm` |
| Muted text | `text-text-muted text-xs` |
| Links | `text-claude-orange hover:underline` |

---

## Form Elements

### Text input/textarea

```tsx
className="w-full bg-bg-primary border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-claude-orange transition-colors"
```

---

## Icons

- Use inline SVGs, not icon libraries
- Standard size: `width={16} height={16}` for buttons
- Social icons: `width={14} height={14}`

---

## Spacing

| Context | Value |
|---------|-------|
| Grid gaps | `gap-4` (16px) standard, `gap-2` (8px) tight |
| Section margins | `mb-6` or `mt-6` |
| Card padding | `p-4` |

---

## DO NOT

- ❌ Use `bg-black` - always inherit from body (#0d0d0d)
- ❌ Use gradients for backgrounds
- ❌ Make page titles clickable links
- ❌ Add borders to header/footer
- ❌ Forget the `← back` link in footer
- ❌ Use different padding/margin patterns per page
