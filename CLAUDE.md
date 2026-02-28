# SIDEDOOR — PROJECT BRAIN

## What This Project Is
Sidedoor is a web app that helps job seekers bypass the ATS black hole by going directly to decision-makers. The user pastes a job description + their background, and gets back a complete outreach kit: the right decision-maker titles to target, LinkedIn search instructions, email finder tool recommendations, and a 3-step cold email sequence.

The cold email system is based on a proven framework (200+ meetings booked, 50K+ emails sent, 6%+ reply rates). The output must sound human, specific, and intelligent — never like a template.

---

## Tech Stack
- Frontend: Single HTML file (HTML + CSS + JavaScript)
- AI: Claude API (claude-sonnet-4-5 via fetch calls from the browser)
- Hosting: Vercel (static deploy)
- No backend. No database. No login required for v1.

---

## File Structure
```
sidedoor/
├── index.html          # The entire app (UI + logic)
├── CLAUDE.md           # This file
└── README.md           # Setup instructions
```

---

## What the App Does (User Flow)

1. User lands on the page — clean, single-screen interface
2. User fills in 3 inputs:
   - Job Description (paste full text)
   - Their Background / Skills (paste CV or short bio)
   - Company Name + Company Size (dropdown: <50, 50-200, 200+)
3. User clicks "Generate Outreach Kit"
4. App calls Claude API with a structured prompt
5. Output appears on the same page with 4 sections:
   - Decision-Maker Titles (who to target)
   - LinkedIn Instructions (how to find them)
   - Email Finder Tools (how to get their email)
   - 3-Step Cold Email Sequence (ready to send)

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
- Dark, modern, clean — feels premium not cheap
- Single page, no navigation
- Mobile responsive
- Fast — output appears within 3-5 seconds
- The brand name "Sidedoor" should be prominent
- Tagline: "Skip the line. Land the role."
- Typography: Use Google Fonts — pair 'Syne' (headings) with 'DM Mono' (body/inputs). 
  Import from Google Fonts CDN.

---

## Mistakes to Avoid
(Add to this list as they occur during development)
- Don't use Inter or Roboto fonts — pick something with character
- Don't make the UI look like a generic form — it should feel like a product
- Don't let the AI output bullet-pointed emails — emails must be plain paragraphs
- Don't let the AI use any of the banned phrases listed above
- Don't over-complicate v1 — ship the core loop first

---

## v1 Scope (What We Are Building Now)
- [x] Job description input
- [x] User background input
- [x] Company name + size input
- [x] Decision-maker titles output
- [x] LinkedIn instructions output
- [x] Email finder tool recommendations
- [x] 3-email cold sequence output
- [x] Cadence instructions

## Out of Scope for v1
- User accounts / login
- Saved history
- Actual LinkedIn or email integration
- Payment / paywall
- Mobile app
