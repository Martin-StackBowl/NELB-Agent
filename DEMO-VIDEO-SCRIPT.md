# NELB — 2-Minute Demo Video Script

A shot-by-shot plan: what to show, the exact prompts to type, what to point out, and the narration for each beat. Total target: **≤ 120 seconds**.

**Before you record:**
- Re-seed the DB: `python seed.py` (so Thabo's history + Lerato exist).
- Backend running (`uvicorn`), frontend running (`npm run dev`).
- Pin at default **Pretoria CBD (-25.7463, 28.1885)**.
- Pick light or dark theme and stick with it.
- Log in as **Thabo Mabena** before recording (needed for the Memory beat).
- Have the prompts copy-pasteable so typing is instant — don't waste seconds typing.

---

## Beat 1 — The problem + hook (0:00–0:15)

**Screen:** NELB landing page (the hero with the four feature cards).

**Do:** Slowly scroll the landing page once, then stop on the "How NELB reasons" pipeline strip.

**Narration:**
> "In community gig economies, a well-connected few get most of the work, and everyone else is left behind. NELB is a reasoning agent that distributes work fairly — and explains every decision. Built on Azure AI Foundry, grounded by Foundry IQ."

---

## Beat 2 — Find Workers + the reasoning trace (0:15–0:45)

**Screen:** Go to **Find Workers**.

**Do:**
- Category: **painting**
- Description: "Repaint my lounge and two bedrooms"
- Budget: **5000**
- Leave the pin at Pretoria CBD.
- Click **Find workers**.

**Point out (as the trace animates):**
- The 6 steps narrowing the pool (e.g. 13 → … → shortlist).
- The confidence score.
- The top worker's five score bars (Skill, Reliability, Distance, Budget, Fairness).
- The cited "Why X over Y" explanation with the source chip.

**Narration:**
> "Post a job and NELB doesn't just return the nearest worker — it reasons. Six steps: skills, reliability, availability, distance, budget fit, and fairness. Every elimination is shown. This isn't a prompt — it's deterministic, testable logic, and every decision is explained with a cited source from Foundry IQ."

---

## Beat 3 — Budget reasoning, live (0:45–1:00)

**Screen:** Still on Find Workers (post another job, or reuse).

**Do:**
- Same painting job, but set budget to **500**.
- Click Find workers → **no workers** (budget eliminator message).
- Then change budget to **5000** again → full shortlist returns.

**Narration:**
> "Budget is real reasoning, grounded in each worker's actual earning history. At R500, painting is below market — NELB honestly returns no match. Raise it, and the shortlist comes back. No silent failures."

---

## Beat 4 — Talk to NELB: brain-switching (1:00–1:40)

**Screen:** Go to **Talk to NELB**. This is the centrepiece — three messages, three brains, one chat.

**Message 1 (Allocation):**
> `I need a cleaner for my house, budget R600`

Point out: the **Allocation Brain** badge, the reasoning trace streaming first, then the ranked answer.

**Message 2 (Memory — you're logged in as Thabo):**
> `Who did I paint for?`

Point out: the **Memory Brain** badge, real records pulled from Thabo's history (Mrs Van Wyk, Mr Molefe).

**Message 3 (Work Assistant — Foundry IQ):**
> `How many bags of cement for a 3m x 4m slab at 100mm?`

Point out: the **Assistant Brain** badge, the worked calculation, and the **citation chip** to the Cement guide.

**Narration:**
> "One chat, four brains. NELB reads your intent and routes to the right capability automatically. Find workers… recall your own job history… and get grounded, cited answers from the knowledge base — eight bags of cement, sourced, not guessed. The agent decides which brain you need."

---

## Beat 5 — Close (1:40–2:00)

**Screen:** Briefly show the architecture diagram (your SVG), then back to the NELB logo / landing.

**Narration:**
> "Fairness as code. Every decision explained. Grounded by Foundry IQ. That's NELB — no employee left behind."

---

## Quick reference — copy-paste prompts

| Beat | Where | Prompt |
|------|-------|--------|
| 2 | Find Workers | painting · "Repaint my lounge and two bedrooms" · R5000 |
| 3 | Find Workers | same job · R500, then R5000 |
| 4.1 | Talk to NELB | `I need a cleaner for my house, budget R600` |
| 4.2 | Talk to NELB | `Who did I paint for?` |
| 4.3 | Talk to NELB | `How many bags of cement for a 3m x 4m slab at 100mm?` |

## Timing discipline
- Keep narration tight — read it out loud once and trim any sentence that runs long.
- Pre-type/paste prompts; don't film yourself typing slowly.
- If you overrun, cut Beat 3 (budget) down to just the R500 "no match" shot — but it's a strong moment, keep it if you can.
- 2:00 is a hard cap. Aim for 1:50 to be safe.

## Recording tips
- 1080p, clean browser (no bookmarks bar clutter), system notifications off.
- Don't show the `.env` or any keys on screen.
- Upload to YouTube/Vimeo as **public** or **unlisted-with-link**, and paste the URL into the Innovation Studios description.
