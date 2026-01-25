# Vibeo Free-Tier Stack Migration Plan

## Overview
Migrate Vibeo from paid Cloudflare infrastructure (Queues + Hyperdrive) to a completely free-tier stack using Upstash Redis + BullMQ for queueing and Neon serverless driver for database access. This is a system-wide architectural change affecting all documentation, configuration, and task planning.

## Context
- **Current State**: Phase 2 in progress with Cloudflare Queues/Hyperdrive documented but not yet deployed
- **Reason for Change**: Stay on free tier, avoid $5/month Workers Paid plan requirement
- **Impact**: Major architectural shift affecting 10+ files across PRD, tasks, docs, and config

## New Free-Tier Stack (Locked)

### Previous (Paid) Stack
- Queue: Cloudflare Queues (requires Workers Paid - $5/month)
- DB Access: Cloudflare Hyperdrive (requires Workers Paid - $5/month)

### New (Free) Stack
- **Queue**: Upstash Redis + BullMQ (free tier: 10,000 commands/day)
- **DB Access**: Neon serverless driver (@neondatabase/serverless) - direct connection, no pooling needed

### Unchanged Components
- Frontend: Cloudflare Pages (Next.js)
- API: Cloudflare Workers (free tier)
- Storage: Cloudflare R2
- Database: Neon Postgres
- ORM: Drizzle
- Media: FFMPEG, Nano Banana Pro, Veo3, ElevenLabs
- Auth: TBD / Stripe

## Critical Files Requiring Updates

Based on comprehensive codebase search, these files contain Cloudflare Queues/Hyperdrive references:

### 1. Core Documentation (Priority 1)
- **Vibeo_PRD.md** - Tech stack, architecture, pipeline sections
- **Vibeo_Task_List.md** - Phase 2 tasks, infrastructure setup tasks
- **CLAUDE.md** - Tech stack reference, Phase 2 status
- **README.md** - Tech stack, infrastructure setup section
- **CHANGELOG.md** - Add new entry for stack migration

### 2. Configuration Files (Priority 2)
- **api/wrangler.toml** - Remove queue producer bindings, add Upstash binding
- **worker/wrangler.toml** - Remove queue consumer bindings, add Upstash binding

### 3. Setup Documentation (Priority 3)
- **docs/setup/PHASE2_INFRASTRUCTURE.md** - Complete rewrite of Steps 4-5
- **docs/setup/PHASE2_CHECKLIST.md** - Update Hyperdrive/Queue checklist items
- **docs/setup/INFRASTRUCTURE_COMMANDS.md** - Replace Queues/Hyperdrive sections with Upstash/BullMQ

### 4. Worker Source Code (Priority 4)
- **worker/src/index.ts** - Update from queue consumer to BullMQ worker pattern

## Detailed Update Plan by File

### File 1: Vibeo_PRD.md

**Lines to Update**:
- Line 86: "Cloudflare Queues (job pipeline)" → "Upstash Redis + BullMQ (job queue)"
- Line 93: "Cloudflare Hyperdrive (connection pooling)" → "Neon serverless driver (direct DB access)"
- Lines 80-104: Rewrite Tech Stack section with new free-tier components

**New Content**:
```markdown
### Backend
- **Cloudflare Workers** (API + job orchestration)
- **Upstash Redis** (job queue backend, free tier: 10k commands/day)
- **BullMQ** (queue processing library)

### Storage & Database
- **Cloudflare R2** (asset + render storage)
- **Neon Postgres** (primary database, free tier: 0.5 GB)
- **Neon serverless driver** (@neondatabase/serverless - direct edge connection)
- **Drizzle ORM** (lightweight database access)
```

**Additional Updates**:
- Section 11 (Tech Stack): Update backend and database subsections
- Section 13 (Architecture): Update queue and database connection descriptions
- Any architectural diagrams or workflow descriptions referencing Queues/Hyperdrive

### File 2: Vibeo_Task_List.md

**Phase 2 Tasks to Update**:

Replace current Phase 2 tasks:
```
- [ ] Run setup script to create R2 buckets + Queues
- [ ] Create Neon Postgres project
- [ ] Configure Hyperdrive for Workers to Postgres
- [ ] Update wrangler.toml with resource IDs
```

With new tasks:
```
- [ ] Run setup script to create R2 buckets
- [ ] Create Upstash Redis database (free tier)
- [ ] Create Neon Postgres project
- [ ] Configure Upstash connection in Workers
- [ ] Update wrangler.toml with Upstash KV binding
- [ ] Install BullMQ in worker package
- [ ] Configure Neon serverless driver in API/worker
```

**Additional Phase Updates**:
- Phase 5 (Queue + Worker Pipeline): Update to reflect BullMQ implementation instead of Cloudflare Queue consumers
- Phase 6-14: Review for any queue/Hyperdrive references

### File 3: CLAUDE.md

**Lines to Update**:
- Line 23: "Cloudflare Queues (job pipeline/task queue)" → "Upstash Redis + BullMQ (job queue)"
- Line 29: "Cloudflare Hyperdrive (connection pooling)" → "Neon serverless driver (direct DB access)"

**New Phase 2 Status Section**:
```markdown
### Phase 2 Status

**STACK CHANGE**: Migrated to free-tier infrastructure (no Workers Paid plan needed)

New stack components:
- ✅ **Queue**: Upstash Redis + BullMQ (replacing Cloudflare Queues)
- ✅ **DB Access**: Neon serverless driver (replacing Hyperdrive)

Infrastructure documentation updated for free-tier stack.
```

### File 4: README.md

**Lines to Update**:
- Line 28: "Queue: Cloudflare Queues" → "Queue: Upstash Redis + BullMQ"
- Line 30: "Database: Neon Postgres + Cloudflare Hyperdrive" → "Database: Neon Postgres + Neon serverless driver"

**Infrastructure Setup Section (Lines 140-194)**:
Complete rewrite to remove:
- Cloudflare Queues creation steps
- Hyperdrive configuration steps
- wrangler.toml Hyperdrive ID updates

Add instead:
- Upstash Redis setup (signup, create database, get credentials)
- BullMQ installation and configuration
- Neon serverless driver setup

### File 5: api/wrangler.toml

**Remove** (Lines 29-35 commented sections):
```toml
# [[queues.producers]]
# binding = "QUEUE"
# queue = "vibeo-jobs"

# [[hyperdrive]]
# binding = "DB"
# id = "<hyperdrive-id>"
```

**Add**:
```toml
[[kv_namespaces]]
binding = "UPSTASH_REDIS"
id = "TBD"  # Will be populated during Phase 2 setup
```

Or use environment variables for Upstash connection:
```toml
[env.dev]
vars = {
  ENVIRONMENT = "dev",
  UPSTASH_REDIS_REST_URL = "https://...",
  UPSTASH_REDIS_REST_TOKEN = "..."
}
```

### File 6: worker/wrangler.toml

**Remove** (Lines 20-37 commented sections):
```toml
# [[queues.consumers]]
# queue = "vibeo-jobs"
# max_batch_size = 10
# max_batch_timeout = 30

# [[hyperdrive]]
# binding = "DB"
# id = "<hyperdrive-id>"
```

**Add**:
```toml
[[kv_namespaces]]
binding = "UPSTASH_REDIS"
id = "TBD"

# Or environment variables approach
[env.dev]
vars = {
  ENVIRONMENT = "dev",
  UPSTASH_REDIS_REST_URL = "https://...",
  UPSTASH_REDIS_REST_TOKEN = "..."
}
```

### File 7: worker/src/index.ts

**Current** (Lines 11-25):
```typescript
export default {
  async queue(batch: MessageBatch<unknown>, _env: Env): Promise<void> {
    // Queue consumer logic will be implemented in Phase 5
    // Process each message in the batch
    for (const message of batch.messages) {
      try {
        // Process message (implementation in Phase 5)
        message.ack();
      } catch (error) {
        console.error('Error processing message:', error);
        message.retry();
      }
    }
  },
};
```

**New**:
```typescript
import { Worker } from 'bullmq';
import { Redis } from '@upstash/redis';

export interface Env {
  // Bindings will be added in Phase 2
  // R2_ASSETS: R2Bucket;
  // R2_RENDERS: R2Bucket;
  UPSTASH_REDIS_REST_URL: string;
  UPSTASH_REDIS_REST_TOKEN: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // BullMQ worker will be initialized here in Phase 5
    // For now, return worker status
    return new Response(JSON.stringify({
      worker: 'vibeo-queue-consumer',
      status: 'ready',
      queue: 'upstash-redis-bullmq'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  },
};
```

### File 8: docs/setup/PHASE2_INFRASTRUCTURE.md

**Major Rewrite Required**:

**Remove Sections**:
- Step 4: Create Cloudflare Queues (Lines 154-178)
- Step 5: Configure Cloudflare Hyperdrive (Lines 181-219)
- All wrangler.toml queue/Hyperdrive binding examples
- Troubleshooting for Hyperdrive connectivity

**Add New Sections**:

**Step 4: Create Upstash Redis Database**
```markdown
## Step 4: Create Upstash Redis Database

Upstash provides serverless Redis with a generous free tier (10,000 commands/day).

### 4.1 Sign Up for Upstash

1. Go to https://console.upstash.com/login
2. Sign up (GitHub OAuth recommended)

### 4.2 Create Redis Database

1. Click "Create Database"
2. **Name**: `vibeo-queue-dev`
3. **Type**: Regional
4. **Region**: Select closest to your users
5. **TLS**: Enabled
6. Click "Create"

### 4.3 Get Connection Credentials

After creation, copy:
- REST URL: `https://your-db.upstash.io`
- REST Token: `AY...`

Repeat for staging and production:
- `vibeo-queue-staging`
- `vibeo-queue-production`
```

**Step 5: Configure Neon Serverless Driver**
```markdown
## Step 5: Configure Neon Serverless Driver

The Neon serverless driver connects directly from Cloudflare Workers without needing Hyperdrive.

### 5.1 Install Neon Driver

```bash
cd api
npm install @neondatabase/serverless

cd ../worker
npm install @neondatabase/serverless
```

### 5.2 Update Environment Variables

In both api and worker, use the Neon connection string directly:

```typescript
import { neon } from '@neondatabase/serverless';

const sql = neon(env.DATABASE_URL);
const result = await sql`SELECT NOW()`;
```
```

### File 9: docs/setup/PHASE2_CHECKLIST.md

**Update Checklist Items**:

Remove:
- [ ] Created Hyperdrive config: `vibeo-db-dev`
- [ ] Created Hyperdrive config: `vibeo-db-staging`
- [ ] Created Hyperdrive config: `vibeo-db-production`
- [ ] Noted Hyperdrive IDs
- [ ] Run setup script to create Queues

Add:
- [ ] Created Upstash Redis database: `vibeo-queue-dev`
- [ ] Created Upstash Redis database: `vibeo-queue-staging`
- [ ] Created Upstash Redis database: `vibeo-queue-production`
- [ ] Copied Upstash REST URLs and tokens
- [ ] Installed @neondatabase/serverless in api/
- [ ] Installed @neondatabase/serverless in worker/
- [ ] Installed bullmq in worker/

### File 10: docs/setup/INFRASTRUCTURE_COMMANDS.md

**Remove Sections** (Lines 37-75):
- Cloudflare Queues commands
- Hyperdrive commands

**Add New Sections**:

**Upstash Redis Commands**
```markdown
## Upstash Redis

```bash
# View databases in Upstash Console
# https://console.upstash.com/redis

# Test connection with curl
curl https://YOUR-DB.upstash.io/get/test \
  -H "Authorization: Bearer YOUR-TOKEN"

# Using Upstash CLI (optional)
npm install -g @upstash/cli
upstash auth login
upstash redis list
```

**BullMQ Queue Management**
```markdown
## BullMQ Queue Management

```bash
# Add job to queue (from API)
import { Queue } from 'bullmq';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN
});

const queue = new Queue('vibeo-jobs', { connection: redis });
await queue.add('generate-video', { jobId: '123' });

# Monitor queue in Upstash Console
# View: Keys, Memory usage, Command stats
```

### File 11: CHANGELOG.md

**Add New Entry** (at top, after Line 9):

```markdown
## 2026-01-08 (Latest)

### Stack Migration: Free-Tier Infrastructure

**Context**: Pivoted from paid Cloudflare infrastructure to completely free-tier stack to eliminate Workers Paid plan requirement ($5/month).

#### Changes Made

**Removed (Paid Services)**:
- ❌ Cloudflare Queues → Required Workers Paid plan
- ❌ Cloudflare Hyperdrive → Required Workers Paid plan

**Added (Free Services)**:
- ✅ Upstash Redis + BullMQ → Free tier: 10,000 commands/day
- ✅ Neon serverless driver → Direct edge connection, no pooling needed

#### Files Updated

**Core Documentation**:
1. **Vibeo_PRD.md**
   - Updated Tech Stack section (Backend, Database)
   - Removed all Cloudflare Queues/Hyperdrive references
   - Added Upstash Redis + BullMQ architecture details

2. **Vibeo_Task_List.md**
   - Updated Phase 2 tasks to reflect new stack
   - Replaced Hyperdrive setup with Neon driver setup
   - Replaced Queue setup with Upstash Redis setup

3. **CLAUDE.md**
   - Updated locked tech stack
   - Added Phase 2 stack change notice
   - Updated infrastructure component list

4. **README.md**
   - Updated Tech Stack section
   - Rewrote Infrastructure Setup (Phase 2) section
   - Removed Hyperdrive configuration steps
   - Added Upstash setup instructions

**Configuration Files**:
5. **api/wrangler.toml**
   - Removed queue producer bindings
   - Removed Hyperdrive bindings
   - Added Upstash environment variables

6. **worker/wrangler.toml**
   - Removed queue consumer bindings
   - Removed Hyperdrive bindings
   - Added Upstash environment variables

**Setup Documentation**:
7. **docs/setup/PHASE2_INFRASTRUCTURE.md**
   - Removed Step 4: Create Cloudflare Queues
   - Removed Step 5: Configure Hyperdrive
   - Added Step 4: Create Upstash Redis Database
   - Added Step 5: Configure Neon Serverless Driver
   - Updated all wrangler.toml examples

8. **docs/setup/PHASE2_CHECKLIST.md**
   - Replaced Hyperdrive checklist items with Upstash setup
   - Replaced Queue creation with Redis database creation
   - Removed Workers Paid plan requirement

9. **docs/setup/INFRASTRUCTURE_COMMANDS.md**
   - Removed Cloudflare Queues command reference
   - Removed Hyperdrive command reference
   - Added Upstash Redis commands
   - Added BullMQ queue management examples

**Source Code**:
10. **worker/src/index.ts**
    - Changed from Cloudflare Queue consumer to BullMQ worker pattern
    - Updated Env interface for Upstash bindings
    - Added Redis connection setup

#### Architectural Impact

**Queue Processing**:
- **Before**: Cloudflare Queues with native queue consumer workers
- **After**: Upstash Redis + BullMQ with HTTP-based job processing
- **Benefit**: No paid plan required, same reliability at scale

**Database Access**:
- **Before**: Hyperdrive connection pooling for Workers → Postgres
- **After**: Neon serverless driver with direct edge connection
- **Benefit**: Simpler setup, optimized for serverless/edge runtimes

**Cost Reduction**:
- Eliminated: $5/month Workers Paid plan requirement
- New cost: $0/month for Upstash free tier + Neon free tier
- **Total savings**: $60/year

#### Dependencies Added

**API Worker**:
- `@neondatabase/serverless` - Neon's serverless Postgres driver

**Queue Consumer Worker**:
- `@neondatabase/serverless` - Database access
- `bullmq` - Queue processing library
- `@upstash/redis` - Upstash Redis client

#### Next Steps

**Phase 2 Execution** (Updated for free tier):
1. Create Upstash Redis databases (dev/staging/production)
2. Install Neon serverless driver in api/ and worker/
3. Install BullMQ in worker/
4. Configure Upstash connection strings
5. Test queue job submission and processing
6. Deploy to Cloudflare Workers free tier

**Phase 3 - Data Model**: Unchanged, proceeds with Drizzle + Neon

Reference: [Vibeo_Task_List.md](Vibeo_Task_List.md) Phase 2

---
```

### File 12: scripts/setup-infrastructure.sh

**Update Script**:

Remove queue creation commands:
```bash
create_queue "vibeo-jobs-dev"
create_queue "vibeo-jobs-staging"
create_queue "vibeo-jobs-production"
```

Update completion message:
```bash
echo "📋 Next Steps:"
echo "============="
echo "1. Create Upstash Redis databases at https://console.upstash.com"
echo "2. Create Neon Postgres project at https://console.neon.tech"
echo "3. Install Neon serverless driver: npm install @neondatabase/serverless"
echo "4. Install BullMQ in worker: cd worker && npm install bullmq @upstash/redis"
echo "5. Update wrangler.toml with Upstash connection strings"
echo ""
echo "See docs/setup/PHASE2_INFRASTRUCTURE.md for detailed instructions."
```

## Package Dependencies to Add

### api/package.json
```json
{
  "dependencies": {
    "@neondatabase/serverless": "^0.9.0",
    "@upstash/redis": "^1.28.0",
    "bullmq": "^5.1.0"
  }
}
```

### worker/package.json
```json
{
  "dependencies": {
    "@neondatabase/serverless": "^0.9.0",
    "@upstash/redis": "^1.28.0",
    "bullmq": "^5.1.0"
  }
}
```

### shared/package.json
```json
{
  "dependencies": {
    "drizzle-orm": "^0.29.3"
  }
}
```

## Implementation Order

### Phase 1: Core Documentation (Must do first)
1. Update Vibeo_PRD.md - Tech stack and architecture sections
2. Update CLAUDE.md - Tech stack reference
3. Update README.md - Tech stack and setup instructions
4. Add CHANGELOG.md entry documenting the stack migration

### Phase 2: Task Planning
5. Update Vibeo_Task_List.md - Phase 2 and Phase 5 tasks

### Phase 3: Configuration Files
6. Update api/wrangler.toml - Remove queue/Hyperdrive, add Upstash
7. Update worker/wrangler.toml - Remove queue/Hyperdrive, add Upstash
8. Update worker/src/index.ts - BullMQ worker pattern

### Phase 4: Setup Documentation
9. Rewrite docs/setup/PHASE2_INFRASTRUCTURE.md
10. Update docs/setup/PHASE2_CHECKLIST.md
11. Update docs/setup/INFRASTRUCTURE_COMMANDS.md
12. Update scripts/setup-infrastructure.sh

### Phase 5: Package Dependencies
13. Update api/package.json
14. Update worker/package.json

## Verification Steps

After completing all updates:

1. **Documentation Consistency**:
   - [ ] Search codebase for "Cloudflare Queue" - should return 0 results
   - [ ] Search codebase for "Hyperdrive" - should return 0 results
   - [ ] Search codebase for "Upstash" - should find new references in all files
   - [ ] Search codebase for "BullMQ" - should find new references

2. **Configuration Validation**:
   - [ ] All wrangler.toml files have Upstash bindings instead of queue/Hyperdrive
   - [ ] All package.json files have correct new dependencies
   - [ ] Worker source code updated to BullMQ pattern

3. **Documentation Accuracy**:
   - [ ] PRD tech stack matches new free-tier stack
   - [ ] Task list has updated Phase 2 tasks
   - [ ] Setup guides reference Upstash/Neon driver only
   - [ ] CHANGELOG has comprehensive migration entry

4. **Git Commit**:
   - [ ] All changes committed with message: "Migrate to free-tier stack: Upstash Redis + Neon serverless driver"
   - [ ] Pushed to GitHub

## Key Architectural Changes

### Queue Processing Flow

**Before (Cloudflare Queues)**:
```
API Worker → Cloudflare Queue → Queue Consumer Worker → Process Job
```

**After (Upstash + BullMQ)**:
```
API Worker → Upstash Redis (via BullMQ) → Worker polls queue → Process Job
```

### Database Connection

**Before (Hyperdrive)**:
```
Worker → Hyperdrive (connection pool) → Neon Postgres
```

**After (Neon Serverless Driver)**:
```
Worker → Neon Serverless Driver (direct) → Neon Postgres
```

### Benefits of New Stack

1. **Zero infrastructure cost** - All services on free tier
2. **Simpler setup** - No Hyperdrive config, direct Neon connection
3. **Better for edge** - Neon serverless driver optimized for Workers
4. **Same reliability** - Upstash has 99.99% SLA even on free tier
5. **Easy scaling** - Can upgrade Upstash/Neon as needed without changing code

## Notes

- Build has already started (Phases 0-1 complete, Phase 2 in progress)
- Do NOT reset completed tasks
- Phase 2 infrastructure NOT yet deployed, so this is pure documentation update
- No breaking changes to deployed code (nothing deployed yet)
- All updates maintain backward compatibility with existing Phases 0-1 work
