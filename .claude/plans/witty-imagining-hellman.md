# Plan: Setup Gmail MCP Server

## Goal
Install and configure GongRzhe/Gmail-MCP-Server to give Claude Code access to Gmail for reading CAC Phase I email thread.

## Steps

### 1. Google Cloud Console Setup
- Go to https://console.cloud.google.com/
- Create new project (or use existing)
- Enable Gmail API
- Create OAuth 2.0 credentials (Desktop app)
- Download JSON → rename to `gcp-oauth.keys.json`

### 2. Install MCP Server (Per Account)

**CARRERA MEDIA:**
```bash
mkdir -p ~/.gmail-mcp/carrera-media
mv ~/Downloads/gcp-oauth.keys.json ~/.gmail-mcp/carrera-media/
GMAIL_OAUTH_PATH=~/.gmail-mcp/carrera-media/gcp-oauth.keys.json \
GMAIL_CREDENTIALS_PATH=~/.gmail-mcp/carrera-media/credentials.json \
npx @gongrzhe/server-gmail-autoauth-mcp auth
```

**AKLO STUDIO:**
```bash
mkdir -p ~/.gmail-mcp/aklo-studio
mv ~/Downloads/gcp-oauth.keys.json ~/.gmail-mcp/aklo-studio/
GMAIL_OAUTH_PATH=~/.gmail-mcp/aklo-studio/gcp-oauth.keys.json \
GMAIL_CREDENTIALS_PATH=~/.gmail-mcp/aklo-studio/credentials.json \
npx @gongrzhe/server-gmail-autoauth-mcp auth
```

(Repeat pattern for additional accounts)

### 3. Configure Claude Code (Multiple Accounts)
Add to `~/.claude/settings.json` (or project `.mcp.json`):
```json
{
  "mcpServers": {
    "gmail-carrera-media": {
      "command": "npx",
      "args": ["@gongrzhe/server-gmail-autoauth-mcp"],
      "env": {
        "GMAIL_CREDENTIALS_PATH": "~/.gmail-mcp/carrera-media/credentials.json",
        "GMAIL_OAUTH_PATH": "~/.gmail-mcp/carrera-media/gcp-oauth.keys.json"
      }
    },
    "gmail-aklo-studio": {
      "command": "npx",
      "args": ["@gongrzhe/server-gmail-autoauth-mcp"],
      "env": {
        "GMAIL_CREDENTIALS_PATH": "~/.gmail-mcp/aklo-studio/credentials.json",
        "GMAIL_OAUTH_PATH": "~/.gmail-mcp/aklo-studio/gcp-oauth.keys.json"
      }
    }
  }
}
```

### 4. Restart Claude Code
- Quit and reopen to load MCP
- Verify Gmail tools are available

### 5. Resume Questionnaire
- Read CAC Phase I email thread
- Update CAC.md with Phase I details
- Continue with remaining projects
