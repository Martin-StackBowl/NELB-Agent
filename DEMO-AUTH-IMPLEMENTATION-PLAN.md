# Demo Authentication Implementation Plan

## Context & Problem Statement

**Original Issue:**
When using the NELB agent directly via "Talk to NELB", the agent asks for worker_id when handling memory recall queries:
```
User: "Who did I tile for last year?"
Agent: "Could you please provide your worker ID?"
User: "e71d43bb-77ba-42cf-a914-555d0ee70753"
Agent: Returns results...
```

**Why This Happens:**
The agent can't know who's asking without authentication context. Asking for worker_id is technically correct, but creates poor UX (typing UUIDs breaks immersion).

**The Solution:**
Implement demo authentication that provides user context to the system, making the agent context-aware without building production auth infrastructure.

---

## Requirements

### Functional Requirements
1. **Demo Login System**
   - Top-right dropdown with 3 pre-seeded worker accounts
   - One-click login (no password entry needed)
   - Persistent login state across page navigation
   - Logout functionality

2. **Profile Page**
   - Display authenticated worker's information
   - Show: name, email, location, skills, reliability score, job statistics
   - Protected route (only visible when logged in)

3. **Self-Exclusion Logic**
   - When logged-in worker posts a job, exclude them from allocation results
   - Prevents absurd scenario: "Thabo posts a job → Thabo appears in recommendations"
   - Add reasoning trace step explaining self-exclusion

4. **Context-Aware Navigation**
   - Update UI based on login state
   - Logged out: Show "I need work done" / "I'm looking for work"
   - Logged in: Show "Find Workers" / "My Memory" / "Profile"
   - All logged-in users can both post jobs AND query their history

5. **Agent Context Propagation**
   - Memory recall queries automatically use authenticated worker_id
   - Agent never asks for worker_id when user is logged in
   - Allocation calls include exclude_worker_id parameter

### Non-Functional Requirements
1. **No Real Auth System** - No Supabase, no JWT, no backend auth endpoints
2. **Frontend-Only** - State management in client (Zustand/React Context)
3. **Demo-Obvious** - Should be clear this is demo scaffolding, not production
4. **Fast Implementation** - Target: 45-60 minutes total
5. **Hackathon-Appropriate** - Focus stays on reasoning capabilities, not auth complexity

---

## Architecture

### State Management

**New Auth Store (Zustand):**
```typescript
interface Worker {
  worker_id: string;
  name: string;
  email: string;
  skills: string[];
  latitude: number;
  longitude: number;
  address: string;
  reliability_score: number;
  is_available: boolean;
}

interface AuthState {
  currentUser: Worker | null;
  isLoggedIn: boolean;
  login: (worker: Worker) => void;
  logout: () => void;
}
```

**Hardcoded Demo Workers:**
```typescript
const DEMO_WORKERS: Worker[] = [
  {
    worker_id: "e71d43bb-77ba-42cf-a914-555d0ee70753",
    name: "Thabo Mabena",
    email: "thabo@nelb.demo",
    skills: ["tiling", "painting", "general repair"],
    latitude: -25.7545,
    longitude: 28.1878,
    address: "Centurion, Pretoria",
    reliability_score: 85,
    is_available: true,
  },
  {
    worker_id: "c4e89f23-9b1a-4d5e-8f6c-3a7b9d2e1f4a",
    name: "Sarah Nkosi",
    email: "sarah@nelb.demo",
    skills: ["cleaning", "gardening"],
    latitude: -25.7461,
    longitude: 28.1881,
    address: "Hatfield, Pretoria",
    reliability_score: 92,
    is_available: true,
  },
  {
    worker_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    name: "James Molefe",
    email: "james@nelb.demo",
    skills: ["painting", "carpentry"],
    latitude: -25.7709,
    longitude: 28.2293,
    address: "Brooklyn, Pretoria",
    reliability_score: 78,
    is_available: true,
  },
];
```

### UI Components

#### 1. Header Auth Widget
**Location:** Top-right corner of all pages

**Logged Out State:**
```
┌─────────────────┐
│  🔐 Login  ▼   │
└─────────────────┘
```

**Dropdown Open:**
```
┌──────────────────────────────────┐
│ 👷 Thabo Mabena (Tiler, 5 jobs) │
│ 🧹 Sarah Nkosi (Cleaner, 2 jobs)│
│ 🎨 James Molefe (Painter, 1 job)│
└──────────────────────────────────┘
```

**Logged In State:**
```
┌─────────────────────────────────┐
│ Logged in as: Thabo Mabena     │
│ [Profile] [Logout]             │
└─────────────────────────────────┘
```

#### 2. Profile Page
**Route:** `/profile` (create new page)

**Layout:**
```
Profile
─────────────────────────────────
👤 Thabo Mabena
📧 thabo@nelb.demo
📍 Centurion, Pretoria

Skills:
• Tiling
• Painting  
• General repair

Statistics:
Reliability Score: 85%
Jobs Completed (Last 7 days): 0
Total Jobs in History: 5
Available for Work: Yes
```

**Data Source:** Display from `currentUser` object in auth store

#### 3. Context-Aware Navigation

**Landing Page - Logged Out:**
- "Talk to NELB" → `/agent`
- "I need work done" → `/employer`
- "I'm looking for work" → Shows login dropdown

**Landing Page - Logged In:**
- "Talk to NELB" → `/agent`
- "Find Workers" → `/employer` (with self-exclusion)
- "My Memory" → `/worker` (memory recall pre-loaded with user context)
- "Work Assistant" → `/worker` (assistant tab)

---

## Implementation Steps

### Step 1: Create Auth Store (15 min)
**File:** `frontend/src/lib/auth.ts`

- Define Worker interface
- Define AuthState interface
- Create Zustand store with login/logout actions
- Export DEMO_WORKERS constant
- Add localStorage persistence (optional but nice)

### Step 2: Update Header Component (15 min)
**File:** `frontend/src/components/Header.tsx` (create if doesn't exist)

- Import auth store
- Render login dropdown when logged out
- Render user info + logout button when logged in
- Add dropdown toggle state
- Style with Tailwind (match existing design system)

### Step 3: Create Profile Page (10 min)
**File:** `frontend/src/app/profile/page.tsx`

- Check auth state, redirect if not logged in
- Fetch worker stats from API using currentUser.worker_id
- Display all profile information
- Add "Edit Profile" placeholder for future enhancement

### Step 4: Update API Client (5 min)
**File:** `frontend/src/lib/api.ts`

- Add `exclude_worker_id` parameter to AllocationRequest interface
- Pass it through in allocateJob() function
- Add `worker_id` to RunRequest (for agent /run endpoint)

### Step 5: Update Backend Allocation Engine (10 min)
**File:** `backend/app/services/allocation/engine.py`

- Add `exclude_worker_id: UUID | None = None` parameter to allocate_job()
- Filter out excluded worker from all_workers list
- Add Step 0 to reasoning trace: "Self-exclusion" (if applicable)
- Example: "Step 0: Self-exclusion — Removed 1 worker (posting user cannot hire themselves)"

**File:** `backend/app/routes/agent.py`

- Update /allocate endpoint to accept optional exclude_worker_id
- Update /run endpoint to extract worker_id from request and pass to allocation

### Step 6: Update Employer Page (5 min)
**File:** `frontend/src/app/employer/page.tsx`

- Import auth store
- Pass `currentUser?.worker_id` to allocateJob() call
- No UI changes needed (logic is transparent to user)

### Step 7: Update Worker Memory Page (5 min)
**File:** `frontend/src/app/worker/page.tsx`

- Import auth store
- Auto-populate worker_id from currentUser when logged in
- Show login prompt if not logged in
- Remove need for user to manually select/enter worker_id

### Step 8: Update Agent Page (5 min)
**File:** `frontend/src/app/agent/page.tsx`

- Import auth store
- Pass currentUser?.worker_id to runAgent() calls
- Agent now has automatic context for memory recall

### Step 9: Update Navigation/Landing Page (5 min)
**File:** `frontend/src/app/page.tsx`

- Show different CTAs based on auth state
- Logged out: "I need work done" / "I'm looking for work"
- Logged in: "Find Workers" / "My Memory" / "Work Assistant"

---

## Testing Checklist

### Login Flow
- [ ] Click "Login" dropdown shows 3 demo accounts
- [ ] Selecting account updates header to "Logged in as: [Name]"
- [ ] Login state persists across page navigation
- [ ] "Logout" button clears state and returns to logged-out UI
- [ ] Profile link appears when logged in

### Profile Page
- [ ] `/profile` redirects to home if not logged in
- [ ] Displays correct user information from auth store
- [ ] Shows all skills as bullet list
- [ ] Displays reliability score and job statistics

### Self-Exclusion
- [ ] Log in as Thabo
- [ ] Post a job in his skill category (tiling/painting)
- [ ] Verify Thabo does NOT appear in recommendations
- [ ] Reasoning trace shows "Step 0: Self-exclusion" (if added)
- [ ] Other workers still appear normally

### Memory Recall Context
- [ ] Log in as Thabo
- [ ] Go to "Talk to NELB" agent page
- [ ] Ask "Who did I paint for?"
- [ ] Agent responds immediately WITHOUT asking for worker_id
- [ ] Results show Thabo's actual job history

### Work Assistant Context
- [ ] Logged in user can ask work questions
- [ ] No worker_id prompt needed
- [ ] Assistant responses are contextual (if job_context is provided)

---

## Edge Cases & Considerations

### 1. No Job History
**Scenario:** Sarah Nkosi only has 2 jobs in seed data  
**Behavior:** Memory recall returns limited results (correct behavior)  
**Fix:** Acceptable — shows system handles empty/sparse data

### 2. Logged Out Memory Queries
**Scenario:** User not logged in, goes to /worker page  
**Behavior:** Show login prompt: "Please log in to view your job history"  
**Alternative:** Redirect to home with message

### 3. Agent Without Login
**Scenario:** User asks agent "Who did I work for?" without being logged in  
**Behavior:** Agent responds: "I don't have your identity context. Please log in to access your work history."  
**Implementation:** Check if worker_id is null in backend, return appropriate message

### 4. Multiple Browser Tabs
**Scenario:** User logs out in one tab, other tabs still show logged-in state  
**Behavior:** Expected (Zustand store is per-tab). Can fix with localStorage + event listeners if needed  
**Priority:** Low (not critical for demo)

### 5. Data Sync with Seed Script
**Scenario:** DEMO_WORKERS data might drift from actual seed.py data  
**Fix:** Document that DEMO_WORKERS should match seed.py worker UUIDs and details  
**Better:** Create shared JSON file that both seed.py and frontend read from

---

## README Documentation Updates

Add section to README:

```markdown
## Demo Authentication

For demonstration purposes, NELB uses a simplified login system with pre-seeded worker accounts. This allows judges to experience the system from different user perspectives without needing to create accounts.

### How to Use

1. Click the **"🔐 Login"** button in the top-right corner
2. Select one of three demo workers:
   - **Thabo Mabena** (Tiler, 5 jobs in history)
   - **Sarah Nkosi** (Cleaner, 2 jobs in history)  
   - **James Molefe** (Painter, 1 job in history)
3. Explore the system from that worker's perspective

### What Demo Login Enables

- **Context-Aware Agent**: Memory recall queries work without asking for IDs
- **Profile Page**: View worker details, skills, and statistics
- **Self-Exclusion**: Workers can post jobs without appearing in their own recommendations
- **Natural Conversations**: "Who did I paint for?" just works

### Production Implementation

In a production deployment, this would integrate with:
- Azure Active Directory (for enterprise)
- Auth0 / Okta (for multi-tenant SaaS)
- Supabase Auth (for rapid deployment)
- Custom SSO (for existing systems)

The authentication architecture is designed to accept any JWT-based identity provider.
```

---

## Future Enhancements (Post-Hackathon)

**Not needed for demo, but good to document:**

1. **Real Supabase Auth Integration**
   - Replace hardcoded login with actual Supabase signIn()
   - JWT token storage
   - Protected API routes with token verification

2. **Role-Based Access Control**
   - Separate "Employer" and "Worker" roles
   - Employers can't access memory recall
   - Workers can't access allocation (only view available jobs)

3. **Employer Account Type**
   - Non-worker users who only post jobs
   - Don't appear in allocation pool at all
   - Have separate dashboard for posted jobs

4. **Multi-Tab Sync**
   - Use localStorage events to sync auth state across tabs
   - Logout in one tab logs out all tabs

5. **Session Expiry**
   - Auto-logout after 24 hours
   - Refresh token handling

---

## Time Estimate

**Total: 45-60 minutes**

- Auth store setup: 15 min
- Header component: 15 min
- Profile page: 10 min
- API updates: 5 min
- Backend self-exclusion: 10 min
- Page updates (employer/worker/agent): 15 min
- Testing: 10 min (included in above estimates)

**Critical Path:** Auth store → Header → Backend changes → Page integrations

---

## Success Criteria

✅ **For Judges:**
- Login flow is obvious and frictionless
- Memory recall works without asking for IDs
- System feels context-aware
- Self-exclusion logic is transparent in reasoning trace
- Profile page shows rich worker information

✅ **For Developers:**
- Code is clean and maintainable
- Auth state is centralized (single source of truth)
- Easy to swap demo auth for real auth later
- No backend auth complexity

✅ **For Hackathon Scoring:**
- Demonstrates full-stack thinking
- Focuses on reasoning capabilities (not auth infrastructure)
- Shows understanding of real-world UX patterns
- Honest about demo vs. production approach

---

## Risk Mitigation

**Risk:** Judges might think the demo login is "cheating" or not real enough  
**Mitigation:** Explicitly document in README that this is demo scaffolding. Explain production auth approach.

**Risk:** Self-exclusion logic breaks allocation for single-worker scenarios  
**Mitigation:** Add check: if only 1 worker in database and they post a job, return friendly message: "No other workers available in your area."

**Risk:** Worker UUIDs in frontend don't match seed data  
**Mitigation:** Copy UUIDs directly from seed.py output or database. Test login immediately after seeding.

**Risk:** Time overrun during implementation  
**Mitigation:** Profile page is optional (nice-to-have). Core requirement is: login → context propagation → self-exclusion. If time is tight, skip profile page.

---

## Questions to Resolve Before Implementation

1. **Should login state persist across browser sessions?**
   - Option A: Use localStorage (persists after close)
   - Option B: Session-only (clears on close)
   - Recommendation: localStorage for better demo experience

2. **What happens if a logged-in worker is unavailable (is_available = false)?**
   - Option A: Still exclude from allocation (they posted the job)
   - Option B: Keep them in pool but flag as unavailable
   - Recommendation: Option A (self-exclusion regardless of availability)

3. **Should we add a "Switch Account" button for quick persona testing?**
   - Pro: Judges can rapidly test different scenarios
   - Con: Might confuse the UX (logout → login is clearer)
   - Recommendation: Keep it simple, logout → login

4. **Profile page: editable or read-only?**
   - Read-only is sufficient for demo
   - "Edit Profile" can be a disabled button with tooltip: "Production feature"
   - Recommendation: Read-only with placeholder edit button

---

## Appendix: Component File Structure

```
frontend/src/
├── lib/
│   ├── auth.ts                  # NEW: Auth store + DEMO_WORKERS
│   ├── api.ts                   # UPDATED: Add exclude_worker_id
│   └── store.ts                 # EXISTING: Job store
├── components/
│   ├── Header.tsx               # NEW: Auth widget
│   └── MapPicker.tsx            # EXISTING
├── app/
│   ├── page.tsx                 # UPDATED: Context-aware CTAs
│   ├── layout.tsx               # UPDATED: Include Header
│   ├── profile/
│   │   └── page.tsx             # NEW: Profile page
│   ├── employer/
│   │   └── page.tsx             # UPDATED: Pass exclude_worker_id
│   ├── worker/
│   │   └── page.tsx             # UPDATED: Auto-populate worker_id
│   └── agent/
│       └── page.tsx             # UPDATED: Pass worker_id to agent

backend/app/
├── routes/
│   └── agent.py                 # UPDATED: Accept exclude_worker_id
├── services/
│   └── allocation/
│       └── engine.py            # UPDATED: Self-exclusion logic
└── schemas/
    └── agent.py                 # UPDATED: Add exclude_worker_id field
```

---

**This plan balances hackathon pragmatism with production-quality thinking. Focus on the reasoning capabilities while providing enough auth scaffolding to make the demo feel real.**
