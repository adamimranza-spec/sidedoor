# SIDEDOOR — PROJECT BRAIN

## What This Project Is
Sidedoor is a web app that helps job seekers bypass the ATS black hole by going directly to decision-makers. It has two modes:

- **Job mode** — the user pastes a job description + their background, and gets back a complete outreach kit: the right decision-maker titles to target, LinkedIn search instructions, real contacts (found automatically), email finder tool recommendations, and a 3-step cold email sequence.
- **Discover mode** — the user uploads just their CV, no job posting required. Sidedoor infers their professional persona, finds 2-3 real, fast-growing companies in a matching industry (using real growth/funding signals, not guesses), finds real contacts at each, and writes a pitch email sequence per company grounded in that company's actual signal.

The cold email system is based on a proven framework (200+ meetings booked, 50K+ emails sent, 6%+ reply rates). The output must sound human, specific, and intelligent — never like a template.

---

## Tech Stack
- Frontend: Single HTML file (`index.html` — HTML + CSS + JavaScript, no framework)
- Backend: `api/generate.js` — a Vercel serverless function. The frontend never talks to Claude or Prospeo directly; it only calls `/api/generate`.
- AI: Claude API (`claude-sonnet-4-5`), called server-side only
- Contact & company discovery: Prospeo (`search-company`, `search-person`, `enrich-person`) — one provider for the whole pipeline. No Tavily, no Serper, no other search provider.
- Hosting: Vercel (static frontend + one serverless function)
- No database. No login.

---

## File Structure
```
sidedoor/
├── index.html          # The entire frontend (UI + logic)
├── api/
│   └── generate.js     # Serverless function — Claude + Prospeo pipeline, both modes
├── vercel.json          # maxDuration config for the function
├── package.json          # Node engine version
├── CLAUDE.md            # This file
└── README.md            # Setup instructions
```

---

## What the App Does (User Flow)

### Job mode
1. User lands on the page and picks "I have a job in mind" (default)
2. User fills in 3 inputs:
   - Job Description (paste full text)
   - Their Background / Skills (paste CV or short bio, or upload a PDF/DOCX)
   - Company Name + Company Size (dropdown: <50, 50-200, 200+)
3. User clicks "Generate Outreach Kit"

### Discover mode
1. User picks "Show me who needs me"
2. User uploads or pastes just their background/CV — no job description, no target company
3. User clicks "Find My Opportunities"
4. Sidedoor returns a persona summary, 2-3 real target companies with real growth signals, contacts at each, and a pitch email sequence per company
4. App calls Claude API with a structured prompt
5. Output appears on the same page with 4 sections:
   - Decision-Maker Titles (who to target)
   - LinkedIn Instructions (how to find them)
   - Email Finder Tools (how to get their email)
   - 3-Step Cold Email Sequence (ready to send)

---

## CONTACT & COMPANY DISCOVERY PIPELINE (Prospeo)

Everything that isn't Claude's writing runs through Prospeo. There is no separate search provider.

**Job mode** — `search-person` filtered by `company.names` + `person_job_title` finds real people matching Claude's suggested decision-maker titles at the named company. `enrich-person` (given a `linkedin_url`) turns a match into a verified email. This replaced an earlier Tavily-based Google-scrape approach — `search-person` is a structured database query against Prospeo's own data, not a scrape, so match quality is higher.

**Discover mode** — two Claude calls sandwich the Prospeo calls, because Claude can't write a grounded pitch about a company it doesn't know about yet:
1. Claude call #1 reads the CV and returns a persona summary, 2-3 target industries (constrained to Prospeo's `company_industry` enum — see `INDUSTRY_ENUM` in `api/generate.js`), and target decision-maker titles.
2. `search-company` filters on those industries, a `company_headcount_range` cap of roughly 10-500 employees (`REALISTIC_HEADCOUNT_RANGES` in `api/generate.js`), plus a real growth signal — `company_headcount_growth` (% over 6 months) primarily, falling back to `company_funding` (raised within the last year) if the growth filter returns nothing. This is what finds "fast-growing companies," not model guesswork. The size cap exists because companies like Airbnb or DoorDash can still show headcount growth or funding news, but a cold pitch email realistically has no shot there — discover mode should only ever suggest companies small enough that a direct email might actually reach a hiring decision-maker.
3. `search-person` (batched across all discovered companies in one call) + `enrich-person` find real contacts at each company, capped at 2 per company to bound Prospeo credit spend.
4. Claude call #2 receives the real companies + their real growth/funding signal + real contacts, and writes a pitch email sequence per company. The signal fact becomes the email's opening observation (e.g. "grew headcount 40% in the last 6 months") instead of a generic hook — this is the whole point of running discovery before writing, not after.

**Cost guardrail**: discover mode is capped to 3 companies × 2 enriched contacts (~6 `enrich-person` calls), 1 `search-company` call, 1 batched `search-person` call, and 2 Claude calls per request — roughly the same order of magnitude as a single job-mode request.

**Known risk**: the exact filter payload shapes for `search-company`/`search-person` were built from Prospeo's documentation, not a live-tested integration. Both calls log raw response counts (`console.log('[Prospeo] search-company results:', ...)` etc.) to Vercel function logs — if either endpoint underperforms in production, check those logs first before assuming the industry/growth logic is wrong.

---

## THE COLD EMAIL SYSTEM (Core IP — Follow This Exactly)

### The Mindset
The user is NOT applying for a job. They are offering to solve a problem. The company posted a job because something isn't working. The email must show the user understands what's broken and can fix it.

### The 6 Principles (Never Violate These)

**1. Be Memorable, Not Professional**
Polished = forgettable. Specific = memorable.
- BAD: "I am writing to express my interest in the Marketing Manager position at your esteemed organization."
- GOOD: "Saw you're hiring a Marketing Manager while also launching in three new markets. That's a lot to coordinate without someone dedicated to it."

**2. Speak to Hidden Pains**
Every job posting is a symptom of a problem. Name the real problem, not the job description.
- BAD: "I have 3 years of experience in lead generation and am proficient in Salesforce."
- GOOD: "I noticed you're scaling the sales team fast. Usually that means pipeline pressure is real and you need qualified meetings, not just activity."

**3. Write at a 5th Grade Level**
Simple language is easier to process. Complex sentences and jargon get skipped.
- BAD: "I possess a comprehensive skill set encompassing strategic marketing initiatives."
- GOOD: "I run marketing campaigns and know how to read the data to figure out what's working."

**4. Break Patterns**
Hiring managers spot generic emails instantly. Never start with standard phrases.
- NEVER USE: "I hope this email finds you well" / "I am writing to express my interest" / "Please find attached" / "I am excited to apply" / "I would be a great fit" / "Proven track record" / "Results-driven professional" / "Leverage/synergy/passionate/dynamic"
- START WITH: "Reaching out about the [Role] position." or "Saw you're..." or "I noticed [Company] is..."

**5. Be Curious, Never Assume**
Observations, not assumptions.
- BAD: "I know you're struggling with lead quality."
- GOOD: "Usually when companies are hiring SDRs right after raising, it means pipeline pressure is real."

**6. Never Be Condescending**
Don't imply they're doing things wrong.
- BAD: "Most companies make the mistake of..."
- GOOD: "One thing I've seen work well is..."

---

### Email Structure (5-8 Lines, No More)

```
Line 1:     Context — clearly state you're reaching out about the role
Lines 2-3:  Observation — something specific about their company/situation
Lines 4-5:  What you bring — experience tied directly to what they need
Lines 6-7:  Proof — one concrete result, number, or specific example
Line 8:     CTA — simple, low-pressure ask for a conversation
```

Rules:
- Short paragraphs (1-2 sentences max)
- No bullet points or lists inside emails
- Easy to scan in 10 seconds
- Sounds like a human, not a template

---

### The 3-Email Sequence

**EMAIL 1 — The Direct Application**
Purpose: Introduce, show you understand their situation, prove you can help.
Use the full 5-8 line structure above.

Subject line format: [Job Title] role  OR  [Job Title] - quick note
(Simple. Clear. Not clever.)

Example:
> Reaching out about the GTM Engineer position.
>
> I saw you just raised Series A and are building outbound from scratch while also scaling the sales team. That's a lot of infrastructure to stand up at once, especially without someone dedicated to owning the GTM engine.
>
> I've spent the last year doing exactly this for B2B companies. Built Clay workflows for enrichment and lead scoring, ran cold email and LinkedIn outreach through Instantly and HeyReach, and handled the full cycle from ICP research to booked meetings.
>
> Most recent results: 33K prospects contacted, 2.5% reply rate, 840+ responses in 60 days.
>
> Would love to talk about how I could help you build this out. Open to a quick call?

---

**EMAIL 2 — The New Angle**
Purpose: Add new information. A different dimension of value. NOT "just following up."
Length: 3-5 lines only.
Must introduce something that wasn't in Email 1 (a different skill, insight, or relevant observation).

Subject line: Re: [same subject as Email 1]
Start with: "Following up on my note from earlier this week." or "Following up on my earlier note."

Example:
> Following up on my note from earlier this week.
>
> One thing I didn't mention — I've specifically helped companies during their first outbound build, not just running campaigns at scale. The tricky part at your stage isn't just the tooling. It's figuring out which ICP actually converts before you burn through your list testing the wrong audiences.
>
> I've built systems that test multiple ICPs simultaneously so you can find what works without wasting months. Happy to share what I've seen work if it's useful.

---

**EMAIL 3 — The Final Note**
Purpose: Last touchpoint. Add insight or value. Close with grace — no begging.
Length: 3-4 lines.
Tone: Confident. Respectful. Not desperate. Always end with "Either way, good luck with [something specific]."
Subject line: "last thought" or "one more thought" or "last note"

Example:
> Most companies hire for GTM before they've nailed their messaging. Then the new hire spends their first 3 months testing angles that could've been tested before they arrived.
>
> If you've already figured that out, ignore this. If not, might be worth a quick call to see if I can help shortcut that process.
>
> Either way, best of luck with the build.

---

### Cadence (Timing Between Emails)

| Email | Day | Wait Time |
|-------|-----|-----------|
| Email 1 | Day 1 | — |
| Email 2 | Day 3 | 2 days after Email 1 |
| Email 3 | Day 6 | 3 days after Email 2 |

Rules:
- If they respond at any point — stop the sequence, reply directly
- If they say no — stop immediately, thank them
- After Email 3 with no response — move on, no 4th email
- Don't send on weekends (emails get buried)
- Best send times: Tuesday–Thursday, 8–10am in their timezone

---

## DECISION-MAKER TITLES BY ROLE TYPE

### GTM / RevOps / Sales Ops
1. VP RevOps / Head of Revenue Operations
2. VP Sales or VP Marketing (whoever owns GTM)
3. CEO / COO (for startups under 50 people)

### Sales / SDR / BDR
1. VP Sales / Head of Sales
2. Director of Sales Development
3. Sales Manager / SDR Manager
4. CEO / Founder (early-stage startups)

### Marketing
1. VP Marketing / Head of Marketing / CMO
2. Director of Marketing / Director of Demand Gen
3. Marketing Manager (if senior enough to hire)
4. CEO / Founder (startups under 50 people)

### Engineering / Technical
1. VP Engineering / Head of Engineering
2. Engineering Manager (for the specific team)
3. CTO (smaller companies)
4. CEO / Founder (very early stage)

### Product
1. VP Product / Head of Product / CPO
2. Director of Product
3. Product Lead / Senior PM (for IC roles)
4. CEO / Founder (early-stage)

### Operations / Ops
1. VP Operations / Head of Ops / COO
2. Director of Operations
3. Operations Manager
4. CEO / Founder (startups)

### Customer Success / Support
1. VP Customer Success / Head of CS
2. Director of Customer Success
3. CS Manager / Support Manager
4. CEO / COO (smaller companies)

### Finance / Accounting
1. CFO / VP Finance
2. Controller / Finance Director
3. Finance Manager
4. CEO / COO (startups)

### HR / People
1. VP People / Head of People / CHRO
2. Director of HR / People Ops
3. HR Manager
4. CEO / COO (smaller companies)

### Design
1. VP Design / Head of Design / CDO
2. Design Director / Creative Director
3. Design Manager / Lead Designer
4. CEO / Founder (early-stage)

### Data / Analytics
1. VP Data / Head of Data
2. Director of Analytics / Data Science
3. Data Manager / Analytics Lead
4. CTO or CEO (smaller companies)

### Company Size Rules
- Under 50 people: Target CEO/Founder directly or most senior person in the function
- 50–200 people: Target VP or Director level
- 200+ people: Target Director or Senior Manager level (VPs are harder to reach)
- Always check LinkedIn to confirm who actually manages the team being hired into

---

## Email Finder Tool Recommendations (Always Include These)
When telling users how to find decision-maker emails, always recommend:
1. **Hunter.io** — best for finding emails by company domain (free tier available)
2. **Apollo.io** — great for finding and verifying emails + LinkedIn data (free tier available)
3. **RocketReach** — good backup option
4. **Snov.io** — another solid option with free credits

---

## LinkedIn Outreach Instructions (Always Include)
After listing decision-maker titles, always give these instructions:
1. Go to LinkedIn search
2. Type the job title in the search bar
3. Filter by "People" then filter by "Current Company" = [Company Name]
4. Find the person who matches the title
5. Send a connection request with a SHORT note that says "{First name}, saw you follow {content type} content on here, would be great to connect. ({content type} should be the most likely content they follow based on their job title. e.g marketing, cybersecurity, design, operation, leadership)
6. Once connected, send the cold email sequence as a LinkedIn DM OR find their email using Hunter/Apollo and send via email

---

## Output Format
The app output must be structured in 4 clear sections:

### Section 1: Decision-Maker Targets
- List 2-3 most relevant titles for this specific role
- Include company size guidance
- Clear instruction: "Search for these titles on LinkedIn at [Company]"

### Section 2: LinkedIn Search Instructions
- Step-by-step, simple language
- Tailored to the specific company and role

### Section 3: Email Finder Tools
- List Hunter.io, Apollo.io, RocketReach
- One line each explaining what it does
- Note which has the best free tier

### Section 4: Your 3-Email Sequence
- All 3 emails fully written
- Each with subject line
- Cadence clearly stated: "Send Email 1 today. Send Email 2 on Day 3. Send Email 3 on Day 6."
- Reminder: Don't send on weekends. Best times: Tue–Thu, 8–10am.

---

## Design Principles
- Visual direction: "Premium & cinematic" — dark, editorial, closer to MasterClass/Linear than a generic SaaS form. Evolve the existing dark/lime identity, don't replace it.
- Single page, no navigation. A mode toggle ("I have a job in mind" / "Show me who needs me") switches between job mode and discover mode without leaving the page.
- Mobile responsive
- Fast — output appears within a few seconds
- The brand name "Sidedoor" should be prominent
- Tagline: "Skip the line. Land the role." (works for both modes)
- Typography: Bebas Neue (display/headings) paired with JetBrains Mono (body/inputs), via Google Fonts CDN.
- Design tokens: `--bg:#060606`, `--accent:#c4ff40` (electric lime) — square corners throughout, no border-radius.

---

## Mistakes to Avoid
(Add to this list as they occur during development)
- Don't use Inter or Roboto fonts — pick something with character
- Don't make the UI look like a generic form — it should feel like a product
- Don't let the AI output bullet-pointed emails — emails must be plain paragraphs
- Don't let the AI use any of the banned phrases listed above
- Don't over-complicate v1 — ship the core loop first

---

## v1 Scope (What We Built First)
- [x] Job description input
- [x] User background input
- [x] Company name + size input
- [x] Decision-maker titles output
- [x] LinkedIn instructions output
- [x] Email finder tool recommendations
- [x] 3-email cold sequence output
- [x] Cadence instructions

## v2 Scope — Discover Mode + Redesign
- [x] Mode toggle (job mode / discover mode)
- [x] CV-only input flow (no job description or target company required)
- [x] Persona + target industry inference (Claude)
- [x] Real company discovery via growth/funding signals (Prospeo `search-company`)
- [x] Real contact discovery per company (Prospeo `search-person` + `enrich-person`, replacing Tavily)
- [x] Per-company pitch email sequence grounded in the real signal
- [x] Visual redesign — Premium & cinematic direction
- [ ] PDF export for discover mode (deferred — job mode only for now, since the variable number of companies needs its own PDF layout)

## Out of Scope
- User accounts / login
- Saved history
- Actual LinkedIn or email integration
- Payment / paywall
- Mobile app
