# Sidedoor

**Skip the line. Land the role.**

Sidedoor helps job seekers bypass the ATS black hole by going directly to decision-makers. Paste a job description and your background, and get back a complete outreach kit: the right people to target, how to find them on LinkedIn, which tools to use to get their email, and a 3-step cold email sequence ready to send.

---

## How to deploy (step by step, no coding experience needed)

You need three things before you start:

1. A free **GitHub** account — [github.com](https://github.com)
2. A free **Vercel** account — [vercel.com](https://vercel.com)
3. A **Claude API key** from Anthropic — [console.anthropic.com](https://console.anthropic.com)

This takes about 15 minutes total.

---

### Step 1 — Get your Claude API key

1. Go to [console.anthropic.com](https://console.anthropic.com) and sign up or log in
2. Click **API Keys** in the left sidebar
3. Click **Create Key**
4. Give it a name like `sidedoor`
5. Copy the key — it starts with `sk-ant-`
6. Save it somewhere safe (a notes app is fine). You'll need it in Step 4

> **Note:** The Claude API is paid, but very cheap. A $5 credit will handle hundreds of outreach kits. You won't be charged until you add a payment method and exceed the free tier.

---

### Step 2 — Upload the Sidedoor files to GitHub

1. Go to [github.com](https://github.com) and log in
2. Click the **+** icon in the top right corner → **New repository**
3. Name it `sidedoor` (or anything you like)
4. Make sure it's set to **Public**
5. Click **Create repository**
6. On the next screen, click **uploading an existing file** (the link in the middle of the page)
7. Drag and drop ALL of these files into the upload area:
   - `index.html`
   - `vercel.json`
   - `package.json`
   - The entire `api` folder (drag the folder itself)
8. Scroll down and click **Commit changes**

Your files are now on GitHub.

---

### Step 3 — Connect Vercel to GitHub and deploy

1. Go to [vercel.com](https://vercel.com) and sign up (use **Continue with GitHub** for easiest setup)
2. After logging in, click **Add New** → **Project**
3. You'll see a list of your GitHub repositories — find `sidedoor` and click **Import**
4. On the configuration screen, leave everything as default — **do not change anything**
5. Click **Deploy**

Vercel will build and deploy the project. This takes about 30 seconds.

> You'll see a success screen with a URL like `sidedoor-abc123.vercel.app`. **Don't use this URL yet** — the app won't work until you add the API key in the next step.

---

### Step 4 — Add your Claude API key

This is the most important step. The API key tells Vercel how to connect to Claude. It's stored securely on the server — users of your app will never see it.

1. In your Vercel project dashboard, click **Settings** (in the top navigation)
2. Click **Environment Variables** in the left sidebar
3. In the **Key** field, type exactly: `ANTHROPIC_API_KEY`
4. In the **Value** field, paste your API key (the one starting with `sk-ant-` from Step 1)
5. Make sure **Production**, **Preview**, and **Development** are all checked
6. Click **Save**

---

### Step 5 — Redeploy to activate the key

Vercel needs to redeploy so it picks up the new environment variable.

1. Click **Deployments** in the top navigation
2. Find the most recent deployment (the one at the top)
3. Click the **three dots** (...) on the right side of that row
4. Click **Redeploy**
5. Click **Redeploy** again on the confirmation dialog
6. Wait about 30 seconds for it to finish

---

### Step 6 — You're live!

Go back to **Overview** and click on your project URL (something like `sidedoor-abc123.vercel.app`).

Sidedoor is now running as a live web app. Paste a job description, your background, pick a company size, and click **Generate Outreach Kit**.

To share it with others, just send them the URL.

---

## Custom domain (optional)

If you want a custom URL like `sidedoor.yourdomain.com`:

1. In Vercel, go to **Settings** → **Domains**
2. Type your domain and click **Add**
3. Follow the DNS instructions Vercel gives you (you'll need to update your domain's DNS settings wherever you bought the domain)

---

## Troubleshooting

**"The app is not configured yet"**
The API key environment variable wasn't added. Go back to Step 4 and make sure you used the exact name `ANTHROPIC_API_KEY`.

**"Invalid API key"**
The key was entered incorrectly. Go to Vercel → Settings → Environment Variables, delete the existing `ANTHROPIC_API_KEY` entry, and re-add it by pasting the key again carefully.

**"Rate limit reached"**
You've hit Anthropic's rate limit. Wait 30–60 seconds and try again.

**The page loads but nothing happens when I click Generate**
Open your browser's developer console (press F12 → Console tab) and look for any red error messages. Share these if you need help debugging.

**I uploaded the files but Vercel says "No framework detected"**
That's fine — this is a plain HTML project, not a framework like React. Leave the settings as default and deploy anyway.

---

## File structure

```
sidedoor/
├── index.html        # The entire frontend UI
├── api/
│   └── generate.js   # Serverless function — calls Claude API securely
├── vercel.json       # Vercel configuration
├── package.json      # Node.js version spec
├── CLAUDE.md         # Project spec and cold email framework
└── README.md         # This file
```

---

## Security note

Your Claude API key is **never** exposed to users of the app. It lives only in Vercel's environment variables and is accessed server-side by `api/generate.js`. The frontend (`index.html`) only ever calls `/api/generate` — it has no knowledge of the key.
