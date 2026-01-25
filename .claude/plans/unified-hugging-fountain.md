# llphant Post-MVP Plan

## Phase 11: Obsidian-Like UI ✅ COMPLETE
(Markdown rendering, folder tree, mobile drawer - already implemented)

---

## Phase 12: Claude Code Agent Sidebar

### Overview
Integrate Claude Agent SDK to create an AI assistant sidebar that can:
- Read/write notes
- Read emails and draft responses
- Create/modify calendar events
- Search and analyze the knowledge base
- Execute multi-step workflows autonomously

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser (React)                          │
│  ┌──────────┐  ┌────────────────┐  ┌────────────────────────┐  │
│  │ Nav      │  │ Folder Tree    │  │ Main Content           │  │
│  │ Sidebar  │  │ Sidebar        │  │                        │  │
│  │          │  │                │  │                        │  │
│  └──────────┘  └────────────────┘  └────────────────────────┘  │
│                                     ┌────────────────────────┐  │
│                                     │ Claude Chat Sidebar    │  │
│                                     │ (streams from backend) │  │
│                                     └────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ (SSE/WebSocket streaming)
┌─────────────────────────────────────────────────────────────────┐
│                     VPS Backend (Next.js API)                    │
│                                                                  │
│  POST /api/agent/chat                                           │
│    ├─ Uses @anthropic-ai/claude-agent-sdk                       │
│    ├─ Configures MCP servers for tools                          │
│    └─ Streams responses via SSE                                 │
│                                                                  │
│  MCP Servers (stdio):                                           │
│    ├─ llphant-notes: CRUD, search, embed                        │
│    ├─ llphant-email: read emails, create drafts                 │
│    ├─ llphant-calendar: CRUD events                             │
│    └─ llphant-gmail-mcp (existing): send_email, draft_email     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   brain.db      │
                    │   Gmail API     │
                    │   GCal API      │
                    └─────────────────┘
```

### 12.1 Install Claude Agent SDK

```bash
cd /Users/aklo/dev/llphant/web
pnpm add @anthropic-ai/claude-agent-sdk
```

### 12.2 Create MCP Server for llphant

**File:** `web/src/lib/mcp-server.ts` (NEW)

Expose tools via MCP protocol:

| Tool Name | Description |
|-----------|-------------|
| `list_notes` | Query notes with filters (type, folder, search) |
| `get_note` | Read a specific note by ID |
| `create_note` | Create a new note with metadata |
| `update_note` | Update note title/content/metadata |
| `delete_note` | Delete a note |
| `search_notes` | Hybrid search (keyword + semantic) |
| `list_emails` | Query emails from brain.db |
| `get_email` | Read specific email content |
| `draft_email` | Create Gmail draft (via Gmail API) |
| `send_email` | Send email (via Gmail API) |
| `list_events` | Query calendar events |
| `create_event` | Create new calendar event |
| `update_event` | Modify existing event |
| `delete_event` | Remove event |

### 12.3 Create Agent API Route

**File:** `web/src/app/api/agent/chat/route.ts` (NEW)

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

export async function POST(req: Request) {
  const { prompt, sessionId } = await req.json();

  const stream = new ReadableStream({
    async start(controller) {
      for await (const message of query({
        prompt,
        options: {
          resume: sessionId,
          mcpServers: {
            llphant: {
              command: "node",
              args: ["./mcp-server.js"],
              env: { DATABASE_URL: process.env.DATABASE_URL }
            }
          },
          allowedTools: ["mcp__llphant__*"]
        }
      })) {
        controller.enqueue(JSON.stringify(message) + "\n");
      }
      controller.close();
    }
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson" }
  });
}
```

### 12.4 Create Chat Sidebar Component

**File:** `web/src/components/AgentChat.tsx` (NEW)

Features:
- Collapsible right sidebar (toggle button)
- Message history display
- Input box with send button
- Streaming response display
- Tool use visualization (show when Claude reads/writes)
- Session persistence (localStorage for sessionId)

### 12.5 Update Layout

**File:** `web/src/components/Layout.tsx` (MODIFY)

- Add right sidebar for AgentChat (desktop)
- Toggle button to show/hide
- Mobile: full-screen modal or bottom sheet

### 12.6 Wire Up Gmail Actions

Since you already have Gmail MCP server (`gmail-carrera-media`), we can leverage existing tools:
- `mcp__gmail-carrera-media__send_email`
- `mcp__gmail-carrera-media__draft_email`
- `mcp__gmail-carrera-media__read_email`
- `mcp__gmail-carrera-media__search_emails`

Similarly for Google Calendar (`gcal-carrera-media`):
- `mcp__gcal-carrera-media__create-event`
- `mcp__gcal-carrera-media__update-event`
- `mcp__gcal-carrera-media__list-events`

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `web/src/lib/mcp-server.ts` | NEW | MCP server for notes CRUD |
| `web/src/app/api/agent/chat/route.ts` | NEW | Streaming agent endpoint |
| `web/src/components/AgentChat.tsx` | NEW | Chat sidebar UI |
| `web/src/components/Layout.tsx` | MODIFY | Add right sidebar |
| `web/package.json` | MODIFY | Add claude-agent-sdk |
| `.mcp.json` | NEW | MCP server configuration |

---

## Updated TASKLIST.md Structure

```markdown
# llphant — Post-MVP Task List

## Phase 11: Obsidian-Like UI ✅ COMPLETE
[x] Markdown rendering with wiki-links
[x] Folder tree navigation
[x] Mobile slide-out drawer
[x] Expanded state persistence

### Remaining Polish
[ ] Add Edit/Preview toggle to NoteEditor
[ ] Folder picker in NoteEditor
[ ] "Move to folder" action
[ ] Breadcrumb display

---

## Phase 12: Claude Code Agent Sidebar

### 12.1 Backend Setup
[ ] Install @anthropic-ai/claude-agent-sdk
[ ] Create MCP server for notes CRUD (list, get, create, update, delete, search)
[ ] Create streaming agent API route (POST /api/agent/chat)
[ ] Wire up existing Gmail MCP tools
[ ] Wire up existing Calendar MCP tools

### 12.2 Frontend Chat UI
[ ] Create AgentChat component (message history, input, streaming)
[ ] Add collapsible right sidebar to Layout
[ ] Tool use visualization (show Claude's actions)
[ ] Session persistence (sessionId in localStorage)
[ ] Mobile: full-screen chat modal

### 12.3 Agent Capabilities
[ ] Read/search notes
[ ] Create/update/delete notes
[ ] Read emails
[ ] Draft/send emails
[ ] List/create/update calendar events
[ ] Multi-step autonomous workflows

---

## Parking Lot (Future)
[ ] Notion import
[ ] Custom note types UI
[ ] API key management
[ ] Desktop/mobile native apps
[ ] Cloud sync
[ ] Team features
```

---

## Design Decisions (Confirmed)

1. **Email Drafts**: Show in chat first for approval, then send
2. **Agent Autonomy**: Always confirm before creating/updating/deleting
3. **Session Persistence**: Both localStorage (quick) + brain.db (permanent as type: "conversation")

---

## Verification Plan

1. **Chat UI**: Open sidebar, send message, see streaming response
2. **Read notes**: Ask "what notes do I have about X?" → Claude searches and summarizes
3. **Create note**: Ask "create a note about Y" → Claude shows preview, user confirms, note created
4. **Read emails**: Ask "summarize my recent emails" → Claude reads from brain.db
5. **Draft email**: Ask "draft a reply to Z" → Claude shows draft in chat, user approves → sent
6. **Calendar**: Ask "schedule a meeting tomorrow at 2pm" → Claude shows event details, user confirms → created
7. **Multi-step**: Ask "find all emails from X, create a summary note, and schedule a follow-up" → Claude chains actions with confirmations
