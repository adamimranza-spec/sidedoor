// api/generate.js
// Vercel serverless function — calls Claude API and Prospeo API securely on the server.
// Required env vars: ANTHROPIC_API_KEY, PROSPEO_API_KEY

const ANTHROPIC_API    = 'https://api.anthropic.com/v1/messages';
const MODEL            = 'claude-sonnet-4-5';
const PROSPEO_SEARCH   = 'https://api.prospeo.io/search-person';
const PROSPEO_ENRICH   = 'https://api.prospeo.io/enrich-person';

// ─── System Prompt ───────────────────────────────────────────────────────────
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
  }
}`;

// ─── User Prompt Builder ─────────────────────────────────────────────────────
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

// ─── Claude JSON Parser (mirrors frontend fallback logic) ─────────────────────
function parseClaudeJSON(text) {
  const t = text.trim();
  try { return JSON.parse(t); } catch (_) {}
  const fenceMatch = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) { try { return JSON.parse(fenceMatch[1].trim()); } catch (_) {} }
  const braceMatch = t.match(/\{[\s\S]*\}/);
  if (braceMatch) { try { return JSON.parse(braceMatch[0]); } catch (_) {} }
  throw new Error('Could not parse Claude JSON');
}

// ─── Prospeo Helpers ──────────────────────────────────────────────────────────
function titleToSeniority(title) {
  const t = title.toLowerCase();
  if (/\b(ceo|coo|cto|cfo|cpo|cmo|chief)\b/.test(t))    return 'C-Level';
  if (/\b(founder|co-founder|owner)\b/.test(t))          return 'Founder/Owner';
  if (/\b(vp|vice president)\b/.test(t))                 return 'VP';
  if (/\b(director|head of)\b/.test(t))                  return 'Director';
  if (/\bmanager\b/.test(t))                             return 'Manager';
  return 'Director';
}

async function searchPerson(prospeoKey, companyName, jobTitle) {
  const headers = { 'Content-Type': 'application/json', 'X-KEY': prospeoKey };

  // Attempt 1: exact job title
  try {
    const res = await fetch(PROSPEO_SEARCH, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        page: 1,
        filters: {
          company: { names: { include: [companyName] } },
          person_job_title: { include: [jobTitle] },
        },
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (!data.error && data.results?.length > 0) return data.results[0];
    }
  } catch (_) {}

  // Attempt 2: seniority fallback
  try {
    const seniority = titleToSeniority(jobTitle);
    const res = await fetch(PROSPEO_SEARCH, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        page: 1,
        filters: {
          company: { names: { include: [companyName] } },
          person_seniority: { include: [seniority] },
        },
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (!data.error && data.results?.length > 0) return data.results[0];
    }
  } catch (_) {}

  return null;
}

async function enrichPerson(prospeoKey, linkedinUrl) {
  try {
    const res = await fetch(PROSPEO_ENRICH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-KEY': prospeoKey },
      body: JSON.stringify({
        data: { linkedin_url: linkedinUrl },
        only_verified_email: true,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.error) return null;
    return data;
  } catch (_) {
    return null;
  }
}

async function findContacts(prospeoKey, companyName, titles) {
  const topTitles = titles.slice(0, 2);

  // Search for a person for each title in parallel
  const searchResults = await Promise.all(
    topTitles.map(title => searchPerson(prospeoKey, companyName, title).catch(() => null))
  );

  // Deduplicate by LinkedIn URL before enriching
  const seen = new Set();
  const toEnrich = [];
  for (const result of searchResults) {
    if (!result) continue;
    const linkedinUrl = result.person?.linkedin_url;
    if (!linkedinUrl || seen.has(linkedinUrl)) continue;
    seen.add(linkedinUrl);
    toEnrich.push({ result, linkedinUrl });
  }

  // Enrich each unique person in parallel
  const enriched = await Promise.all(
    toEnrich.map(({ linkedinUrl }) => enrichPerson(prospeoKey, linkedinUrl).catch(() => null))
  );

  // Build final contacts array
  const contacts = [];
  for (const data of enriched) {
    if (!data) continue;
    const email = data.person?.email?.address;
    if (!email) continue;
    contacts.push({
      name:     data.person?.full_name    || '',
      title:    data.person?.job_title    || '',
      email,
      linkedin: data.person?.linkedin_url || '',
    });
  }

  return contacts;
}

// ─── Handler ─────────────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const { jobDesc, background, companyName, companySize } = req.body || {};
  if (!jobDesc || !background || !companyName || !companySize) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  const apiKey     = process.env.ANTHROPIC_API_KEY;
  const prospeoKey = process.env.PROSPEO_API_KEY;

  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY environment variable is not set.');
    return res.status(500).json({
      error: 'The app is not configured yet. The site owner needs to add the ANTHROPIC_API_KEY environment variable in Vercel.',
    });
  }

  // ── Step 1: Call Claude ───────────────────────────────────────────────────
  let claudeRes;
  try {
    claudeRes = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      MODEL,
        max_tokens: 4096,
        system:     SYSTEM_PROMPT,
        messages:   [{ role: 'user', content: buildUserPrompt(jobDesc, background, companyName, companySize) }],
      }),
    });
  } catch (networkErr) {
    console.error('Network error reaching Claude API:', networkErr);
    return res.status(502).json({ error: 'Could not reach the Claude API. Try again in a moment.' });
  }

  if (!claudeRes.ok) {
    let errBody = {};
    try { errBody = await claudeRes.json(); } catch (_) {}

    const statusMessages = {
      401: 'Invalid API key. Check the ANTHROPIC_API_KEY environment variable in Vercel.',
      403: 'API key does not have permission. Check your Anthropic account.',
      429: 'Rate limit reached. Please wait 30 seconds and try again.',
      400: 'Request error — the inputs may be too long. Try shortening the job description.',
      500: 'Claude is experiencing issues. Try again in a moment.',
      529: 'Claude is overloaded right now. Try again in a moment.',
    };

    const message = statusMessages[claudeRes.status]
      || errBody?.error?.message
      || `Unexpected error from Claude (${claudeRes.status}).`;

    const clientStatus = claudeRes.status === 429 ? 429
      : claudeRes.status >= 500 ? 502
      : claudeRes.status;

    console.error(`Claude API error ${claudeRes.status}:`, message);
    return res.status(clientStatus).json({ error: message });
  }

  let claudeData;
  try {
    claudeData = await claudeRes.json();
  } catch (parseErr) {
    console.error('Failed to parse Claude response:', parseErr);
    return res.status(502).json({ error: 'Received an unreadable response from Claude. Try again.' });
  }

  const rawResult = claudeData?.content?.[0]?.text;
  if (!rawResult) {
    return res.status(502).json({ error: 'Empty response from Claude. Try again.' });
  }

  // ── Step 2: Run Prospeo searches using the titles Claude returned ─────────
  let finalResult = rawResult;

  if (prospeoKey) {
    try {
      const parsed   = parseClaudeJSON(rawResult);
      const titles   = parsed?.decisionMakers?.titles || [];
      const contacts = titles.length > 0
        ? await findContacts(prospeoKey, companyName.trim(), titles)
        : [];

      parsed.foundContacts = contacts;
      finalResult = JSON.stringify(parsed);
    } catch (prospeoErr) {
      // Non-fatal — return Claude output as-is, frontend handles missing foundContacts
      console.error('Prospeo enrichment failed, returning kit without contacts:', prospeoErr.message);
    }
  }

  return res.status(200).json({ result: finalResult });
};
