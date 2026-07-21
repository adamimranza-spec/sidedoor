// api/generate.js
// Vercel serverless function — calls Claude API and Prospeo (company/person search + email enrichment).
// Required env vars: ANTHROPIC_API_KEY, PROSPEO_API_KEY
// Optional env var: SERPER_API_KEY — fallback LinkedIn lookup for discover mode when Prospeo's own
// search-person index has nothing for a company (see searchPersonViaSerper). Without it, discover
// mode still works, just without that backfill.

const ANTHROPIC_API         = 'https://api.anthropic.com/v1/messages';
const MODEL                 = 'claude-sonnet-4-5';
const PROSPEO_SEARCH_COMPANY = 'https://api.prospeo.io/search-company';
const PROSPEO_SEARCH_PERSON  = 'https://api.prospeo.io/search-person';
const PROSPEO_ENRICH         = 'https://api.prospeo.io/enrich-person';
const SERPER_SEARCH           = 'https://google.serper.dev/search';

// Valid values for the company_industry filter (Prospeo Industries enum).
// Used to constrain Claude's industry picks in discover mode so they map to a real filter value.
const INDUSTRY_ENUM = [
  'Software Development', 'Technology, Information and Internet', 'IT Services and IT Consulting',
  'Business Consulting and Services', 'Financial Services', 'Advertising Services', 'Marketing Services',
  'Design Services', 'Professional Training and Coaching', 'Human Resources Services', 'Accounting',
  'Legal Services', 'Media Production and Publishing', 'Insurance', 'Real Estate', 'General Retail',
  'Retail Apparel and Fashion', 'Hospitality', 'Restaurants', 'Hospitals and Health Care',
  'Wellness and Fitness Services', 'Events Services', 'Travel Arrangements', 'Higher Education',
  'Education Administration Programs', 'Non-profit Organizations', 'Entertainment Providers',
  'Industrial Machinery Manufacturing', 'Machinery Manufacturing', 'General Manufacturing',
  'Motor Vehicle Manufacturing', 'Construction', 'Architecture and Planning', 'Consumer Services',
  'General Wholesale', 'Spectator Sports',
];

// Employee-count buckets used to keep discover-mode company suggestions realistic —
// roughly 10-500 people. Big companies (Airbnb, DoorDash, HPE, etc.) can still show
// headcount growth or funding news, but a cold pitch email is very unlikely to land
// a hire there. Values must match Prospeo's company_headcount_range enum exactly.
const REALISTIC_HEADCOUNT_RANGES = ['11-20', '21-50', '51-100', '101-200', '201-500'];

// ─── System Prompt — Job Description Mode ────────────────────────────────────
// This lives server-side only. Never exposed to the browser.
const SYSTEM_PROMPT = `You are an expert job outreach strategist. You have sent over 50,000 cold emails, booked 200+ meetings, and achieved 6%+ reply rates using a specific framework. Your job is to generate a complete, personalized outreach kit for a job seeker who wants to go directly to decision-makers instead of applying through an ATS.

You will receive a job description, the candidate's background, a company name, and a company size. You will return ONLY valid JSON. No markdown. No code fences. No prose outside the JSON. Just the raw JSON object.

---

THE COLD EMAIL FRAMEWORK — FOLLOW THIS EXACTLY

MINDSET:
The candidate is NOT applying for a job. They are offering to solve a problem. The company posted this role because something is not working. Every email must show the candidate understands what is broken and can fix it.

THE 6 PRINCIPLES — NEVER VIOLATE THESE:

1. BE MEMORABLE, NOT PROFESSIONAL
Specific beats polished. Generic is forgettable.
Bad: "I am writing to express my interest in the Marketing Manager position at your esteemed organization."
Good: "Saw you're hiring a Marketing Manager while also launching in three new markets. That's a lot to coordinate without someone dedicated to it."

2. SPEAK TO HIDDEN PAINS
Every job posting is a symptom of a problem. Name the real problem, not just the job description.
Bad: "I have 3 years of experience in lead generation and am proficient in Salesforce."
Good: "I noticed you're scaling the sales team fast. Usually that means pipeline pressure is real and you need qualified meetings, not just activity."

3. WRITE AT A 5TH GRADE LEVEL
Simple language is easier to process. Complex sentences and jargon get skipped.
Bad: "I possess a comprehensive skill set encompassing strategic marketing initiatives."
Good: "I run marketing campaigns and know how to read the data to figure out what's working."

4. BREAK PATTERNS — THESE PHRASES ARE BANNED. NEVER USE THEM IN ANY EMAIL:
- "I hope this email finds you well"
- "I am writing to express my interest"
- "Please find attached"
- "I am excited to apply"
- "I would be a great fit"
- "Proven track record"
- "Results-driven professional"
- "leverage" (used as corporate jargon)
- "synergy"
- "passionate"
- "dynamic"
- "translates directly"
- "turn X into Y" constructions (e.g. "turn visibility into revenue")
- "track and optimize"
- "passionate about"
- "I am well-versed"
- Any opening that sounds like a cover letter
- Any phrase that mirrors the job description back at them word for word

EM DASH RULE — CRITICAL:
Never use the em dash (—) anywhere inside the emails. Not once. If you need to connect two thoughts, use a period and start a new sentence instead.

START EMAILS WITH one of these patterns:
- "Reaching out about the [Role] position."
- "Saw you're..."
- "I noticed [Company] is..."
- A specific, concrete observation about the company or role

5. BE CURIOUS, NEVER ASSUME
Make observations, not accusations. Never say they are definitely struggling or that you know what their problem is.
Bad: "I know you're struggling with lead quality."
Good: "Usually when companies are hiring SDRs right after raising, it means pipeline pressure is real."

6. NEVER BE CONDESCENDING
Do not imply they are doing things wrong or that you have all the answers.
Bad: "Most companies make the mistake of..."
Good: "One thing I've seen work well is..."

---

EMAIL STRUCTURE (5 TO 8 SHORT LINES TOTAL — NEVER MORE):
Line 1: Context — clearly state you are reaching out about the role
Lines 2-3: Observation — something specific about their company or situation based on the job posting and company name/size
Lines 4-5: What you bring — the candidate's experience tied directly to their specific need, not generic skills
Lines 6-7: Proof — one concrete result, number, or specific example from the candidate's background
Line 8: CTA — simple, low-pressure ask for a conversation

RULES FOR ALL EMAILS:
- Short paragraphs, 1-2 sentences maximum per paragraph
- NO bullet points or lists inside emails — plain paragraphs only
- Easy to scan in 10 seconds
- Sounds like a human wrote it, not a template
- Each paragraph is separated by a blank line (\\n\\n in JSON)
- Use the candidate's actual background to write specific, real-sounding content

---

EMAIL 1 — THE DIRECT APPLICATION:
Purpose: Introduce, show you understand their situation, prove you can help.
Subject line format: "[Job Title] role" OR "[Job Title] - quick note" (simple and direct, never clever or clickbait)
Day: Day 1

EMAIL 1 STRICT RULES:
- Maximum 6 lines total. Not 7. Not 8. Six.
- Pick ONE achievement from the candidate's background. Not two, not three. One.
- That achievement MUST contain a specific number (e.g. "increased reply rates to 6%" not "improved reply rates significantly")
- No paragraph longer than 2 sentences
- Do NOT summarize the job description back to them — they wrote it, they know what it says
- Do NOT list multiple skills or experiences — pick the most relevant one and go deep on it

EMAIL 2 — THE NEW ANGLE:
Purpose: Add new information. A completely different dimension of value. NOT "just following up."
Subject line: Use the EXACT same subject as Email 1 but prefixed with "Re: "
MUST start with exactly: "Following up on my note from earlier this week."
Day: Day 3

EMAIL 2 STRICT RULES:
- Maximum 4 lines total
- Must introduce ONE new angle that was not mentioned anywhere in Email 1
- No recap of Email 1 — do not reference what you said before, just lead with the new angle
- One idea only. Do not try to squeeze in two new points.

EMAIL 3 — THE FINAL NOTE:
Purpose: Last touchpoint. Add a useful insight. Close with grace — no desperation.
Tone: Confident. Respectful. Not desperate.
Subject line: One of: "last thought - [Job Title]" OR "one more thought - [Job Title]" OR "last note - [Job Title]"
Day: Day 6

EMAIL 3 STRICT RULES:
- Maximum 3 lines total
- End with something specific and genuine about the company — reference something real about what they are building, their stage, their market, or their challenge
- NEVER say "best of luck" or "good luck with the build" — these are generic and lazy
- MUST end with: "Either way, [write a specific closing phrase tied to their actual situation — e.g. 'hope the Series A build goes smoothly' or 'hope the launch in Europe goes well' — never a generic phrase]."

---

COVER LETTER — RULES AND STRUCTURE:

The cover letter is NOT a formal HR document. It is a direct, specific letter written to a real person — the decision-maker.

COVER LETTER RULES:
- Under 250 words total
- Exactly 4 short paragraphs
- Same banned phrases as the emails — NONE of them appear here
- No bullet points or lists — plain paragraphs only
- No "Dear Hiring Manager" — start the letter directly with Paragraph 1
- No em dashes (—) — use a period and start a new sentence instead
- Same 5th-grade reading level as the emails
- Every sentence must earn its place — no filler, no padding

COVER LETTER STRUCTURE:
Paragraph 1 (2-3 sentences): What caught your attention about THIS role or company specifically. Reference something concrete from the job posting — the stage they are at, the challenge they are solving, the team they are building. Never write something that could apply to any company.

Paragraph 2 (2-3 sentences): Your most relevant experience, tied directly to their specific need. Pick ONE thread and go deep on it. Do not list multiple skills — focus on the single most valuable thing you bring for this role.

Paragraph 3 (2-3 sentences): Proof. One specific result, number, or concrete example from the candidate's background that directly supports what you said in Paragraph 2. Make it tangible — a number, a timeframe, a specific outcome.

Paragraph 4 (1-2 sentences): Low-pressure close. Invite a conversation. Confident, not desperate. Never beg.

End with:
Thanks,
[Candidate's first name, extracted from their background. If no name is found, use "[Your Name]"]

---

OVERALL TONE — NON-NEGOTIABLE:
Write like someone sending a message from their phone, not composing a document.
- Short sentences. Simple words. One idea per paragraph.
- If a sentence sounds impressive, cut it. Real emails do not try to impress.
- If a phrase could appear on a resume or LinkedIn summary, rewrite it or delete it.
- The goal is to sound like a smart person dashing off a quick note, not like a professional writing a formal communication.

---

DECISION-MAKER TARGETING BY COMPANY SIZE:
- Under 50 people: Target CEO/Founder directly OR the most senior person in the specific function
- 50-200 people: Target VP or Director level in the relevant function
- 200+ people: Target Director or Senior Manager level (VPs are harder to reach at this size)

Always recommend the candidate verify on LinkedIn who actually manages the team being hired into, since org charts change.

---

EMAIL FINDER TOOLS — ALWAYS INCLUDE ALL FOUR IN THIS ORDER:
1. Hunter.io — best for finding emails by company domain, free tier available
2. Apollo.io — great for finding and verifying emails plus LinkedIn data, free tier available
3. RocketReach — solid backup option especially for executives
4. Snov.io — another strong option with free credits on signup

---

LINKEDIN INSTRUCTIONS — ALWAYS INCLUDE ALL 7 STEPS:
1. Go to the LinkedIn search bar
2. Type the decision-maker job title
3. Click the "People" filter at the top
4. Use the "Current company" filter and enter the company name
5. Find the person who matches the target title
6. Send a connection request with a short personalized note
7. Once connected, send the cold email sequence as a LinkedIn DM — or find their email using Hunter.io or Apollo.io and send via email

For the connection request note, use this format: "[First name], saw you follow [relevant content type] content on here — would be great to connect." — where [relevant content type] is the most likely content they follow based on their job title (e.g. marketing, cybersecurity, design, operations, leadership, product, sales, data).

---

OUTPUT FORMAT:
Return ONLY this JSON structure. Nothing else. No text before or after. No markdown fences.

{
  "decisionMakers": {
    "titles": ["Title 1", "Title 2", "Title 3"],
    "guidance": "Specific reasoning based on company size and role type — explain why these titles were chosen and which one to prioritize"
  },
  "linkedInInstructions": {
    "steps": ["Step 1", "Step 2", "Step 3", "Step 4", "Step 5", "Step 6", "Step 7"],
    "connectionNote": "The full connection request note with [First name] placeholder and the specific content type filled in based on the role"
  },
  "emailFinderTools": [
    {"name": "Hunter.io", "description": "Best for finding emails by company domain. Enter the company website and get a verified list.", "note": "Best free tier — 25 free searches/month"},
    {"name": "Apollo.io", "description": "Find and verify emails plus see LinkedIn profile and company data in one place.", "note": "Free tier — 50 email credits/month"},
    {"name": "RocketReach", "description": "Strong backup, especially for executives and hard-to-find contacts.", "note": "5 free lookups/month"},
    {"name": "Snov.io", "description": "Email finder and verifier with a Chrome extension for LinkedIn prospecting.", "note": "50 free credits on signup"}
  ],
  "emailSequence": {
    "email1": {
      "subject": "subject line here",
      "body": "Full email body. Each paragraph separated by \\n\\n. No bullet points. Plain paragraphs only. 5-8 lines total.",
      "day": "Day 1"
    },
    "email2": {
      "subject": "Re: [exact same subject as email1]",
      "body": "Following up on my note from earlier this week.\\n\\n[Rest of the email — 3-5 lines total, new angle not mentioned in email 1]",
      "day": "Day 3"
    },
    "email3": {
      "subject": "last thought - [Job Title]",
      "body": "[3-4 line email ending with: Either way, [specific good luck phrase].]",
      "day": "Day 6"
    },
    "cadenceNote": "Send Email 1 today. Send Email 2 on Day 3. Send Email 3 on Day 6. Do not send on weekends — emails get buried. Best send times: Tuesday through Thursday, 8–10am in their timezone. If they reply at any point, stop the sequence and reply directly. If they say no, stop and thank them."
  },
  "coverLetter": {
    "body": "Full cover letter body. 4 paragraphs separated by \\n\\n. No bullet points. No salutation line. Under 250 words. Ends with: Thanks,\\n[Candidate first name or [Your Name]]"
  }
}`;

// ─── System Prompt — Discover Mode, Pass 1 (persona + target industries) ────
const SYSTEM_PROMPT_PERSONA = `You are an expert career strategist who helps people figure out which companies would actually want to hire them, before they've found a specific job posting.

You will receive a candidate's background/CV. You will return ONLY valid JSON. No markdown. No code fences. No prose outside the JSON.

Read the background and figure out:
1. Their core professional persona — what they actually do and who they do it for (e.g. "B2B demand generation marketer with a SaaS focus" not just "marketer").
2. 2-3 target industries where fast-growing companies would plausibly need exactly this skill set right now. You MUST choose industries ONLY from this exact list (copy the string exactly, case-sensitive):
${INDUSTRY_ENUM.map(i => `- ${i}`).join('\n')}
3. 2-3 decision-maker job titles this person should target once we find real companies — the person who would actually hire for this skill set. Prefer VP/Director/Head-of level titles in the relevant function, plus CEO/Founder as a fallback for smaller companies.

Return ONLY this JSON structure:
{
  "persona": {
    "summary": "One or two sentences describing this person's professional identity and who they're best positioned to help.",
    "industries": ["Industry from the list above", "Second industry from the list above"],
    "titles": ["Target title 1", "Target title 2", "Target title 3"]
  }
}`;

// ─── System Prompt — Discover Mode, Pass 2 (pitch emails per real company) ──
const SYSTEM_PROMPT_PITCH = `You are an expert outreach strategist. You have sent over 50,000 cold emails, booked 200+ meetings, and achieved 6%+ reply rates using a specific framework. Your job is to write a cold pitch email sequence for a job seeker reaching out to a company that has NOT posted a specific job opening — they are proactively offering to help based on a real, current signal about that company (recent growth, funding, or hiring activity).

You will receive the candidate's background and a list of companies. Each company has a SIGNAL and a SIGNAL STRENGTH, plus the decision-maker titles to target there. You will return ONLY valid JSON. No markdown. No code fences. No prose outside the JSON.

Follow the exact same 6 principles and email structure as a normal cold pitch:
1. Be memorable, not professional — specific beats polished.
2. Speak to hidden pains — a growth/funding signal is a symptom of a problem, not proof of one. Be curious about it, don't claim to know their problems for certain.
3. Write at a 5th grade level.
4. Break patterns — banned phrases: "I hope this email finds you well", "I am writing to express my interest", "Please find attached", "I am excited to apply", "I would be a great fit", "Proven track record", "Results-driven professional", "leverage", "synergy", "passionate", "dynamic", "translates directly", "turn X into Y" constructions, "track and optimize", "I am well-versed". Never use an em dash (—) anywhere. Never mirror the signal fact back word for word.
5. Be curious, never assume — frame a signal as "usually when a company is doing X, it means Y" rather than asserting Y as fact.
6. Never be condescending.
7. NEVER mention employee counts, headcount ranges, size brackets, or any internal-sounding data category (e.g. "the 201-500 range," "in your size bracket"). No real person talks like that. If size comes up at all, describe it the way a human would ("a team your size," "growing this fast").

SIGNAL STRENGTH tells you how to open Email 1:
- If SIGNAL STRENGTH is "specific" — open by referencing that signal directly. Good pattern: "Noticed [Company] [specific signal]. [why that usually creates a specific need]."
- If SIGNAL STRENGTH is "general" — do NOT state the signal as a confirmed fact or invent specifics that weren't given. Open instead with a curious, general observation tied to their industry or stage (e.g. "Companies at your stage in [industry] usually..."), then pivot to what the candidate brings. Still specific in tone, just not fabricating a stat you don't have.

EMAIL 1: Max 6 lines. One achievement from the candidate's background with a specific number. End with a low-pressure ask for a conversation.
EMAIL 2 (Day 3): Max 4 lines. Subject = "Re: " + Email 1 subject. MUST start with exactly "Following up on my note from earlier this week." Introduce ONE new angle not in Email 1.
EMAIL 3 (Day 6): Max 3 lines. Subject one of "last thought", "one more thought", "last note". End with "Either way, [specific closing phrase tied to their actual situation]." Never "best of luck" or "good luck with the build."

Return ONLY this JSON structure:
{
  "opportunities": [
    {
      "company": "Exact company name as given",
      "emailSequence": {
        "email1": {"subject": "...", "body": "Paragraphs separated by \\n\\n. 5-8 lines total.", "day": "Day 1"},
        "email2": {"subject": "Re: ...", "body": "Following up on my note from earlier this week.\\n\\n...", "day": "Day 3"},
        "email3": {"subject": "last thought - ...", "body": "...", "day": "Day 6"},
        "cadenceNote": "Send Email 1 today. Send Email 2 on Day 3. Send Email 3 on Day 6. Do not send on weekends. Best send times: Tuesday through Thursday, 8–10am in their timezone. If they reply, stop the sequence and reply directly."
      }
    }
  ]
}`;

// ─── User Prompt Builders ─────────────────────────────────────────────────────
function buildUserPrompt(jobDesc, background, companyName, companySize) {
  const sizeLabel = {
    under50:  'Under 50 people',
    '50to200':'50–200 people',
    '200plus':'200+ people',
  }[companySize] || companySize;

  return `Generate the complete outreach kit as JSON for this job application.

COMPANY NAME: ${companyName}
COMPANY SIZE: ${sizeLabel}

JOB DESCRIPTION:
${jobDesc}

CANDIDATE BACKGROUND AND SKILLS:
${background}

Return ONLY valid JSON. No markdown. No code fences. No text before or after the JSON.`;
}

function buildPersonaPrompt(background) {
  return `Analyze this candidate's background and return their persona, target industries, and target titles as JSON.

CANDIDATE BACKGROUND AND SKILLS:
${background}

Return ONLY valid JSON. No markdown. No code fences. No text before or after the JSON.`;
}

function buildPitchPrompt(background, opportunities) {
  const companyBlocks = opportunities.map(o => `
COMPANY: ${o.company}
SIGNAL (why now): ${o.whyThisCompany}
SIGNAL STRENGTH: ${o.hasStrongSignal ? 'specific' : 'general'}
TARGET TITLES: ${o.titles.join(', ')}`).join('\n');

  return `Write a pitch email sequence for each company below, using the candidate's background.

CANDIDATE BACKGROUND AND SKILLS:
${background}

COMPANIES:
${companyBlocks}

Return ONLY valid JSON with one entry per company, in the same order. No markdown. No code fences. No text before or after the JSON.`;
}

// ─── Claude Helpers ────────────────────────────────────────────────────────────
function parseClaudeJSON(text) {
  const t = text.trim();
  try { return JSON.parse(t); } catch (_) {}
  const fenceMatch = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) { try { return JSON.parse(fenceMatch[1].trim()); } catch (_) {} }
  const braceMatch = t.match(/\{[\s\S]*\}/);
  if (braceMatch) { try { return JSON.parse(braceMatch[0]); } catch (_) {} }
  throw new Error('Could not parse Claude JSON');
}

async function callClaude(apiKey, systemPrompt, userPrompt, maxTokens = 4096) {
  const res = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model:      MODEL,
      max_tokens: maxTokens,
      system:     systemPrompt,
      messages:   [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!res.ok) {
    let errBody = {};
    try { errBody = await res.json(); } catch (_) {}
    const err = new Error(errBody?.error?.message || `Claude API error (${res.status})`);
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  const rawResult = data?.content?.[0]?.text;
  if (!rawResult) throw new Error('Empty response from Claude.');
  return parseClaudeJSON(rawResult);
}

// ─── Prospeo: Company Search (discover mode — finds real, fast-growing companies) ──
async function searchGrowingCompanies(prospeoKey, industries, excludeNames = [], targetCountry = '', poolSize = 10) {
  async function runSearch(extraFilters) {
    const prospeoAbort = new AbortController();
    const prospeoTimeout = setTimeout(() => prospeoAbort.abort(), 10000);
    try {
      const res = await fetch(PROSPEO_SEARCH_COMPANY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-KEY': prospeoKey },
        signal: prospeoAbort.signal,
        body: JSON.stringify({
          page: 1,
          filters: {
            company_industry: { include: industries },
            company_headcount_range: REALISTIC_HEADCOUNT_RANGES,
            ...(targetCountry ? { company_location_search: { include: [targetCountry] } } : {}),
            ...extraFilters,
          },
        }),
      });
      clearTimeout(prospeoTimeout);
      if (!res.ok) {
        console.error('[Prospeo] search-company failed:', res.status, await res.text().catch(() => ''));
        return [];
      }
      const data = await res.json();
      console.log('[Prospeo] search-company results:', data?.results?.length || 0);
      if (data?.results?.[0]) {
        // Diagnostic — we're not 100% certain of Prospeo's exact response field names for
        // growth/funding stats yet. Remove once confirmed against real production traffic.
        console.log('[Prospeo] sample company object:', JSON.stringify(data.results[0]).slice(0, 1800));
      }
      return data?.results || [];
    } catch (err) {
      clearTimeout(prospeoTimeout);
      console.error('[Prospeo] search-company error:', err.message);
      return [];
    }
  }

  // Primary: filter on headcount growth over the last 6 months.
  let results = await runSearch({ company_headcount_growth: { min: 15, timeframe_months: 6 } });

  // Fallback: filter on recent funding if the growth filter comes up empty.
  if (results.length === 0) {
    results = await runSearch({ company_funding: { days_since_last_funding: { max: 365 } } });
  }

  const excluded = new Set(excludeNames.map(n => n.toLowerCase()));
  const companies = [];
  const seen = new Set();

  for (const r of results) {
    const c = r.company || r;
    const name = c.name || c.company_name;
    if (!name || excluded.has(name.toLowerCase()) || seen.has(name.toLowerCase())) continue;

    // Belt-and-suspenders size check — don't just trust the server-side
    // company_headcount_range filter matched the way we expect. If we can read a
    // headcount figure and it's clearly outside the realistic range, skip it here too.
    const employeeCount = c.employee_count ?? c.headcount ?? null;
    const employeeRange = c.employee_range ?? c.headcount_range ?? null;
    const rangeMatch = typeof employeeRange === 'string' ? employeeRange.match(/(\d+)/g) : null;
    const lowerBound = employeeCount ?? (rangeMatch ? parseInt(rangeMatch[0], 10) : null);
    if (typeof lowerBound === 'number' && lowerBound > 500) {
      console.log('[Prospeo] Skipping oversized company:', name, '— employee data:', employeeCount, employeeRange);
      continue;
    }

    seen.add(name.toLowerCase());

    const growth    = c.headcount_growth ?? c.company_headcount_growth ?? c.headcount_growth_percent ?? c.growth_percent;
    const funding    = c.funding || {};
    const stage      = funding.latest_funding_stage || funding.stage;
    const activeJobs = c.active_job_postings_count ?? c.job_posting_quantity ?? c.open_roles_count;

    let signal, hasStrongSignal;
    if (growth) {
      signal = `grew headcount roughly ${growth}% over the last 6 months`;
      hasStrongSignal = true;
    } else if (stage) {
      signal = `recently raised a ${stage} round`;
      hasStrongSignal = true;
    } else if (activeJobs) {
      signal = `currently has ${activeJobs} open roles`;
      hasStrongSignal = true;
    } else {
      // No confirmed stat from this result — keep it vague and human, never mention
      // internal data like employee-count buckets (see SYSTEM_PROMPT_PITCH rule 7).
      signal = `is a growing company in the ${c.industry || industries[0]} space`;
      hasStrongSignal = false;
    }

    companies.push({
      name,
      domain: c.website || c.domain || null,
      industry: c.industry || industries[0],
      signal,
      hasStrongSignal,
    });

    if (companies.length >= poolSize) break;
  }

  return companies;
}

// ─── Prospeo: Person Search (replaces the old Tavily LinkedIn-scrape step) ──
async function searchPersonAtCompany(prospeoKey, companyNames, titles) {
  const prospeoAbort = new AbortController();
  const prospeoTimeout = setTimeout(() => prospeoAbort.abort(), 10000);
  try {
    const res = await fetch(PROSPEO_SEARCH_PERSON, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-KEY': prospeoKey },
      signal: prospeoAbort.signal,
      body: JSON.stringify({
        page: 1,
        filters: {
          company: { names: { include: companyNames } },
          person_job_title: { include: titles },
        },
        max_person_per_company: 3,
      }),
    });
    clearTimeout(prospeoTimeout);
    if (!res.ok) {
      console.error('[Prospeo] search-person failed:', res.status, await res.text().catch(() => ''));
      return [];
    }
    const data = await res.json();
    console.log('[Prospeo] search-person results:', data?.results?.length || 0);
    return (data?.results || []).map(r => ({
      linkedinUrl: r.person?.linkedin_url || null,
      name:        r.person?.full_name || null,
      title:       r.person?.current_job_title || r.person?.headline || null,
      company:     r.company?.name || r.person?.job_history?.[0]?.company_name || null,
    })).filter(p => p.linkedinUrl);
  } catch (err) {
    clearTimeout(prospeoTimeout);
    console.error('[Prospeo] search-person error:', err.message);
    return [];
  }
}

// ─── Prospeo: Email Enrichment (unchanged) ───────────────────────────────────
async function enrichPerson(prospeoKey, linkedinUrl) {
  try {
    const prospeoAbort = new AbortController();
    const prospeoTimeout = setTimeout(() => prospeoAbort.abort(), 8000);
    const res = await fetch(PROSPEO_ENRICH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-KEY': prospeoKey },
      signal: prospeoAbort.signal,
      body: JSON.stringify({
        data: { linkedin_url: linkedinUrl },
        only_verified_email: true,
      }),
    });
    clearTimeout(prospeoTimeout);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.error) return null;
    return data;
  } catch (_) {
    return null;
  }
}

// Finds and enriches contacts for a single company + title list (job mode).
async function findContacts(prospeoKey, companyName, titles) {
  const rawCandidates = await searchPersonAtCompany(prospeoKey, [companyName], titles);

  const seen = new Set();
  const candidates = [];
  for (const c of rawCandidates) {
    if (!c.linkedinUrl || seen.has(c.linkedinUrl)) continue;
    seen.add(c.linkedinUrl);
    candidates.push(c);
    if (candidates.length >= 5) break;
  }

  const enriched = await Promise.all(
    candidates.map(c => enrichPerson(prospeoKey, c.linkedinUrl).catch(() => null))
  );

  return candidates.map((c, i) => {
    const d = enriched[i];
    return {
      name:             d?.person?.full_name      || c.name || '',
      title:            d?.person?.job_title      || c.title,
      email:            d?.person?.email?.address || null,
      linkedin:         d?.person?.linkedin_url   || c.linkedinUrl,
      linkedinIsSearch: false,
    };
  }).filter(c => c.name);
}

// ─── Serper.dev: LinkedIn fallback search ────────────────────────────────────
// Only used when Prospeo's own search-person index has nothing for a company —
// a targeted backfill, not a replacement for the Prospeo-first pipeline.
function extractLinkedInUrl(url) {
  const match = url?.match(/https?:\/\/(?:www\.)?linkedin\.com\/in\/[^/?#]+/);
  return match ? match[0] : null;
}

// Extracts a person's name from a LinkedIn page title, e.g.
// "John Smith - VP Marketing at Acme | LinkedIn" -> "John Smith"
function extractNameFromTitle(title) {
  if (!title) return null;
  const clean = title.replace(/\s*\|\s*LinkedIn\s*$/i, '').trim();
  const name = clean.split(/\s+[-–|]\s+/)[0].trim();
  if (name && /^[A-Za-z\s'.,-]{2,50}$/.test(name) && name.split(' ').length <= 5) return name;
  return null;
}

// Strips common legal suffixes so "Future AI Inc." matches a LinkedIn snippet
// that just says "Future AI" — those suffixes routinely get dropped in bios.
function normalizeCompanyName(name) {
  return (name || '')
    .toLowerCase()
    .replace(/[.,]/g, '')
    .replace(/\b(inc|llc|ltd|co|corp|corporation|company|group|holdings)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// A generic company name (e.g. "Future AI") makes a plain Google search unreliable —
// it can match a profile that just happens to mention similar words, not someone who
// actually works there. Require the company name to actually appear in the matched
// result before trusting it, instead of accepting whatever ranked first.
function resultMentionsCompany(result, companyName) {
  const haystack = normalizeCompanyName(`${result.title || ''} ${result.snippet || ''}`);
  const needle = normalizeCompanyName(companyName);
  return needle.length > 0 && haystack.includes(needle);
}

async function searchPersonViaSerper(serperKey, companyName, titles) {
  const found = [];
  for (const title of titles.slice(0, 2)) {
    try {
      const serperAbort = new AbortController();
      const serperTimeout = setTimeout(() => serperAbort.abort(), 8000);
      const res = await fetch(SERPER_SEARCH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-KEY': serperKey },
        signal: serperAbort.signal,
        body: JSON.stringify({ q: `site:linkedin.com/in "${title}" "${companyName}"` }),
      });
      clearTimeout(serperTimeout);
      if (!res.ok) {
        console.error('[Serper] search failed:', res.status, await res.text().catch(() => ''));
        continue;
      }
      const data = await res.json();
      for (const r of (data.organic || [])) {
        const linkedinUrl = extractLinkedInUrl(r.link);
        const name = linkedinUrl ? extractNameFromTitle(r.title) : null;
        if (!linkedinUrl || !name) continue;
        if (!resultMentionsCompany(r, companyName)) {
          console.log('[Serper] Skipping unverified match for', companyName, '—', r.title);
          continue;
        }
        found.push({ linkedinUrl, name, title, company: companyName });
        break; // one verified hit per title is enough
      }
    } catch (err) {
      console.error('[Serper] search error for', companyName, title, ':', err.message);
    }
  }
  return found;
}

// ─── Contact-aware company selection (discover mode) ─────────────────────────
// Picks `finalCount` companies from a larger candidate pool, preferring ones a
// real person can actually be found at — a company nobody can be found at isn't
// a usable suggestion. For each candidate, Serper (Google's live index of
// LinkedIn) runs first — it has proven more reliable than Prospeo's own
// aggregated search-person database, which was returning stale/mismatched
// people. Prospeo's search-person only runs as a batched fallback for whichever
// candidates Serper found nothing for. Either way, so at least min(2, finalCount)
// of the final picks come with a real contact whenever the data allows it.
async function selectCompaniesWithContacts(prospeoKey, serperKey, candidates, titles, finalCount = 3, perCompanyCap = 2) {
  const hitsByCompany = {};

  if (serperKey) {
    await Promise.all(candidates.map(async c => {
      hitsByCompany[c.name] = await searchPersonViaSerper(serperKey, c.name, titles);
    }));
  } else {
    for (const c of candidates) hitsByCompany[c.name] = [];
  }

  // Prospeo fallback, batched in one call, only for candidates Serper missed.
  const needsFallback = candidates.filter(c => hitsByCompany[c.name].length === 0);
  if (needsFallback.length > 0) {
    const fallbackNames = needsFallback.map(c => c.name);
    const prospeoHits = await searchPersonAtCompany(prospeoKey, fallbackNames, titles);
    for (const c of needsFallback) {
      hitsByCompany[c.name] = prospeoHits.filter(h => h.company && h.company.toLowerCase() === c.name.toLowerCase());
      if (hitsByCompany[c.name].length > 0) console.log('[Prospeo] Fallback contact found for', c.name);
    }
  }

  const withHits = candidates.filter(c => hitsByCompany[c.name].length > 0);
  let selected = withHits.slice(0, finalCount);

  // Fill any remaining slots with leftover candidates (still contact-less if we
  // truly couldn't find anyone — better than showing fewer than finalCount companies).
  for (const c of candidates) {
    if (selected.length >= finalCount) break;
    if (!selected.includes(c)) selected.push(c);
  }
  selected = selected.slice(0, finalCount);

  // Dedupe each company's hits by LinkedIn URL — the same profile can otherwise
  // show up twice if it matched more than one searched title.
  for (const c of selected) {
    const seen = new Set();
    hitsByCompany[c.name] = (hitsByCompany[c.name] || []).filter(h => {
      if (seen.has(h.linkedinUrl)) return false;
      seen.add(h.linkedinUrl);
      return true;
    });
  }

  // Enrich only the contacts belonging to the companies we actually kept.
  const seenUrl = new Set();
  const toEnrich = [];
  for (const c of selected) {
    for (const h of (hitsByCompany[c.name] || []).slice(0, perCompanyCap)) {
      if (seenUrl.has(h.linkedinUrl)) continue;
      seenUrl.add(h.linkedinUrl);
      toEnrich.push(h);
    }
  }

  const enriched = await Promise.all(
    toEnrich.map(h => enrichPerson(prospeoKey, h.linkedinUrl).catch(() => null))
  );
  const enrichedByUrl = new Map(toEnrich.map((h, i) => [h.linkedinUrl, enriched[i]]));

  const contactsByCompany = {};
  for (const c of selected) {
    contactsByCompany[c.name] = (hitsByCompany[c.name] || []).slice(0, perCompanyCap).map(h => {
      const d = enrichedByUrl.get(h.linkedinUrl);
      return {
        name:             d?.person?.full_name      || h.name || '',
        title:            d?.person?.job_title      || h.title,
        email:            d?.person?.email?.address || null,
        linkedin:         d?.person?.linkedin_url   || h.linkedinUrl,
        linkedinIsSearch: false,
      };
    }).filter(c => c.name);
  }

  return { selected, contactsByCompany };
}

// ─── Handler: Job Description Mode ──────────────────────────────────────────
async function handleJobMode(req, res, apiKey, prospeoKey) {
  const { jobDesc, background, companyName, companySize } = req.body || {};
  if (!jobDesc || !background || !companyName || !companySize) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  let parsed;
  try {
    parsed = await callClaude(apiKey, SYSTEM_PROMPT, buildUserPrompt(jobDesc, background, companyName, companySize));
  } catch (err) {
    console.error('Claude call failed (job mode):', err.message);
    const statusMessages = {
      401: 'Invalid API key. Check the ANTHROPIC_API_KEY environment variable in Vercel.',
      403: 'API key does not have permission. Check your Anthropic account.',
      429: 'Rate limit reached. Please wait 30 seconds and try again.',
      400: 'Request error — the inputs may be too long. Try shortening the job description.',
    };
    const message = statusMessages[err.status] || 'Claude is experiencing issues. Try again in a moment.';
    const clientStatus = err.status === 429 ? 429 : (err.status >= 500 || !err.status) ? 502 : err.status;
    return res.status(clientStatus).json({ error: message });
  }

  if (prospeoKey) {
    try {
      const titles = parsed?.decisionMakers?.titles || [];
      const contacts = titles.length > 0
        ? await findContacts(prospeoKey, companyName.trim(), titles)
        : [];
      console.log('[Contacts] Found:', contacts.length);
      parsed.foundContacts = contacts;
    } catch (contactErr) {
      console.error('[Contacts] Failed, returning kit without contacts:', contactErr.message);
    }
  } else {
    console.warn('[Contacts] PROSPEO_API_KEY not set — skipping contact search.');
  }

  return res.status(200).json({ result: JSON.stringify(parsed) });
}

// ─── Handler: Discover Mode (CV-only, no job posting) ───────────────────────
async function handleDiscoverMode(req, res, apiKey, prospeoKey, serperKey) {
  const { background, targetCountry } = req.body || {};
  if (!background) {
    return res.status(400).json({ error: 'Missing required field: background.' });
  }

  // Pass 1: persona + target industries + target titles
  let personaData;
  try {
    personaData = await callClaude(apiKey, SYSTEM_PROMPT_PERSONA, buildPersonaPrompt(background), 1024);
  } catch (err) {
    console.error('Claude call failed (persona pass):', err.message);
    const clientStatus = err.status === 429 ? 429 : (err.status >= 500 || !err.status) ? 502 : (err.status || 502);
    return res.status(clientStatus).json({ error: 'Could not analyze your background. Try again in a moment.' });
  }

  const persona = personaData?.persona;
  if (!persona || !Array.isArray(persona.industries) || !persona.industries.length) {
    return res.status(502).json({ error: 'Could not determine target industries. Click Regenerate.' });
  }

  const industries = persona.industries.filter(i => INDUSTRY_ENUM.includes(i));
  const titles = persona.titles || [];

  if (!prospeoKey) {
    return res.status(500).json({
      error: 'The app is not configured yet. The site owner needs to add the PROSPEO_API_KEY environment variable in Vercel.',
    });
  }

  // Find real, fast-growing companies in the target industries — pull a larger pool
  // than we need so contact-aware selection below has candidates to choose from.
  let candidates = [];
  try {
    candidates = await searchGrowingCompanies(prospeoKey, industries.length ? industries : persona.industries, [], targetCountry, 10);
  } catch (err) {
    console.error('[Prospeo] Company discovery failed:', err.message);
  }

  if (!candidates.length) {
    return res.status(200).json({
      result: JSON.stringify({ persona, opportunities: [] }),
    });
  }

  // Pick the final 3 companies, preferring ones Prospeo (or Serper, as a backfill)
  // can actually find a real person at — see selectCompaniesWithContacts for why.
  let companies = candidates.slice(0, 3);
  let contactsByCompany = {};
  try {
    const selection = await selectCompaniesWithContacts(prospeoKey, serperKey, candidates, titles, 3);
    companies = selection.selected;
    contactsByCompany = selection.contactsByCompany;
  } catch (err) {
    console.error('[Prospeo] Contact-aware company selection failed:', err.message);
  }

  const baseOpportunities = companies.map(c => ({
    company:        c.name,
    domain:         c.domain,
    whyThisCompany: c.hasStrongSignal
      ? `${c.name} ${c.signal}. Companies moving this fast usually need more hands than their current team has, before they've gotten around to posting a role for it.`
      : `${c.name} ${c.signal}. Worth a look even without a specific hiring signal — smaller, growing teams often need help before they've formalized a role for it.`,
    titles,
    contacts:        contactsByCompany[c.name] || [],
    hasStrongSignal: c.hasStrongSignal,
  }));

  // Pass 2: pitch email sequence per company, grounded in the real signal
  let pitchData = { opportunities: [] };
  try {
    pitchData = await callClaude(apiKey, SYSTEM_PROMPT_PITCH, buildPitchPrompt(background, baseOpportunities), 4096);
  } catch (err) {
    console.error('Claude call failed (pitch pass):', err.message);
  }

  const pitchByCompany = new Map((pitchData.opportunities || []).map(o => [o.company, o.emailSequence]));

  const opportunities = baseOpportunities.map(o => ({
    ...o,
    emailSequence: pitchByCompany.get(o.company) || null,
  }));

  return res.status(200).json({ result: JSON.stringify({ persona, opportunities }) });
}

// ─── Handler ─────────────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const apiKey     = process.env.ANTHROPIC_API_KEY;
  const prospeoKey = process.env.PROSPEO_API_KEY;
  const serperKey  = process.env.SERPER_API_KEY;

  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY environment variable is not set.');
    return res.status(500).json({
      error: 'The app is not configured yet. The site owner needs to add the ANTHROPIC_API_KEY environment variable in Vercel.',
    });
  }

  if (!serperKey) {
    console.warn('[Serper] SERPER_API_KEY not set — discover mode will skip the LinkedIn backfill for companies Prospeo has no contacts for.');
  }

  const mode = req.body?.mode === 'discover' ? 'discover' : 'job';

  try {
    if (mode === 'discover') {
      return await handleDiscoverMode(req, res, apiKey, prospeoKey, serperKey);
    }
    return await handleJobMode(req, res, apiKey, prospeoKey);
  } catch (networkErr) {
    console.error('Unexpected error:', networkErr);
    return res.status(502).json({ error: 'Something went wrong reaching our services. Try again in a moment.' });
  }
};
