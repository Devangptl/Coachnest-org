/**
 * Cybersecurity course seed — Chapters 5 through 10.
 *
 * Split from lib/cybersecurity-course-seed.ts to keep each file readable.
 * Imported and spread into the curriculum by the main seed module.
 */
import type { SeedModule } from "./cybersecurity-course-seed";

export function chaptersFiveToTen(): SeedModule[] {
  return [
    chapter5(),
    chapter6(),
    chapter7(),
    chapter8(),
    chapter9(),
    chapter10(),
  ];
}

// ───────────────────────────────────────────────────────────────────────────
// Chapter 5 — Web Application Security (OWASP Top 10)
// ───────────────────────────────────────────────────────────────────────────
function chapter5(): SeedModule {
  return {
    title: "Chapter 5 — Web Application Security (OWASP Top 10)",
    lessons: [
      {
        title: "How the Web Works & The HTTP Request Lifecycle",
        type: "TEXT",
        duration: 16,
        content: `# How the Web Works & The HTTP Request Lifecycle

Web apps are the single largest attack surface for most organizations. To secure them, master the request/response cycle first.

## Anatomy of an HTTP Request

\`\`\`http
POST /login HTTP/1.1
Host: app.example.com
Content-Type: application/json
Cookie: session=abc123

{"username":"alice","password":"hunter2"}
\`\`\`

| Part | Security relevance |
|------|--------------------|
| **Method** (GET/POST/...) | GET shouldn't change state; CSRF targets state-changing requests |
| **Headers** | Carry cookies, auth tokens, content type |
| **Cookies** | Session identity — a top theft target |
| **Body** | User input — the source of most injection attacks |

## The Response

\`\`\`http
HTTP/1.1 200 OK
Set-Cookie: session=abc123; HttpOnly; Secure; SameSite=Strict
Content-Security-Policy: default-src 'self'
\`\`\`

Security-relevant response headers are your friends (covered later in this chapter).

## Statelessness & Sessions

HTTP is stateless — each request is independent. Apps track identity via:

- **Session cookies** — a random ID mapping to server-side session state.
- **Tokens (JWT)** — self-contained, signed claims.

If an attacker steals the session ID or token, they **become** the user. Protecting these is central to web security.

## The Cardinal Rule of Web Security

> **Never trust input from the client.** Anything from the browser — form fields, headers, cookies, URL parameters — can be forged. Validate and encode everything on the **server**.

Client-side validation is for UX only. A determined attacker bypasses the browser entirely with tools like \`curl\` or an intercepting proxy.

## Same-Origin Policy & CORS

The browser's **Same-Origin Policy** prevents scripts on one origin from reading responses from another. **CORS** headers selectively relax this. Misconfigured CORS (\`Access-Control-Allow-Origin: *\` with credentials) is a common vulnerability that exposes APIs to any website.

## The OWASP Top 10

The **OWASP Top 10** is the industry-standard list of the most critical web app risks. The next lessons walk through the highest-impact ones — injection, broken access control, XSS, and authentication failures — which together account for the majority of real-world breaches.
`,
      },
      {
        title: "Injection Attacks: SQL Injection & Command Injection",
        type: "TEXT",
        duration: 18,
        content: `# Injection Attacks: SQL Injection & Command Injection

**Injection** happens when untrusted input is interpreted as code or commands. It remains one of the most damaging web vulnerabilities.

## SQL Injection (SQLi)

When user input is concatenated directly into a SQL query, an attacker can alter the query's logic.

### The Vulnerable Pattern

\`\`\`js
// ❌ NEVER do this — string concatenation
const q = "SELECT * FROM users WHERE email = '" + email + "'";
\`\`\`

If \`email\` is \`' OR '1'='1\`, the query becomes:

\`\`\`sql
SELECT * FROM users WHERE email = '' OR '1'='1'
\`\`\`

...which returns **every** user. Worse payloads can read other tables, dump password hashes, or (with stacked queries) modify data.

### The Fix: Parameterized Queries

\`\`\`js
// ✅ Parameterized / prepared statement
const user = await db.query(
  "SELECT * FROM users WHERE email = $1",
  [email]
);
\`\`\`

The database treats \`email\` strictly as **data**, never as SQL. This is the single most important defense. ORMs (Prisma, etc.) parameterize by default — but raw queries can still be vulnerable.

### Defense in Depth for SQLi

1. **Parameterized queries / prepared statements** (primary).
2. **Least-privilege DB accounts** — the web app's DB user shouldn't be able to drop tables.
3. **Input validation** — allow-list expected formats.
4. **WAF** — catches common patterns (secondary, not a substitute).

## Command Injection

When user input reaches a shell command:

\`\`\`js
// ❌ Vulnerable
exec("ping -c 1 " + userInput);
\`\`\`

Input like \`8.8.8.8; rm -rf /\` runs arbitrary commands. **Fix:** avoid shelling out; if you must, use APIs that pass arguments as an array (no shell), and strictly validate input.

\`\`\`js
// ✅ Safer — no shell interpretation, args array
execFile("ping", ["-c", "1", userInput]);
\`\`\`

## Other Injection Variants

- **LDAP injection**, **NoSQL injection**, **XML/XXE**, **template injection** — same root cause, different interpreter.
- The universal fix: **separate code from data**, validate input, and apply least privilege.

## Detection

Watch logs for SQL syntax in parameters, sudden errors, or unusual query volumes. Database activity monitoring and WAF logs are valuable detection sources.
`,
      },
      {
        title: "Broken Access Control & Authentication Failures",
        type: "TEXT",
        duration: 16,
        content: `# Broken Access Control & Authentication Failures

**Broken Access Control** is consistently the #1 web risk on the OWASP Top 10. It's about users doing things they shouldn't be allowed to do.

## What Access Control Failures Look Like

### Insecure Direct Object Reference (IDOR)

\`\`\`
GET /api/invoices/1001   ← your invoice
GET /api/invoices/1002   ← someone else's — and the server returns it!
\`\`\`

The app checks that you're logged in but **not** that the object belongs to you. Always verify **authorization on every request**, server-side, scoped to the current user.

### Missing Function-Level Authorization

A regular user calls an admin-only endpoint (\`POST /api/admin/deleteUser\`) directly. The UI hid the button, but the API didn't enforce the role. **The server must enforce authorization — never rely on a hidden UI.**

### Privilege Escalation

- **Horizontal:** accessing another user's data at the same privilege level (IDOR).
- **Vertical:** gaining higher privileges (user → admin).

## Defenses for Access Control

1. **Deny by default** — every resource requires explicit authorization.
2. **Enforce server-side** on every endpoint, checking *this user* may access *this resource*.
3. Use **centralized** authorization logic, not scattered ad-hoc checks.
4. Apply **RBAC/ABAC** consistently (see Chapter 6).
5. **Log** access-control failures and alert on spikes.

## Authentication Failures

Weak authentication lets attackers become legitimate users.

| Weakness | Fix |
|----------|-----|
| Weak/credential-stuffed passwords | Strong policy + breached-password check + **MFA** |
| Brute-force allowed | Rate limiting, account lockout, CAPTCHA |
| Session IDs in URL / no expiry | Secure cookies, short timeouts, rotation on login |
| No re-auth for sensitive actions | Step-up authentication |

### Session Management Essentials

- Set cookies \`HttpOnly\`, \`Secure\`, \`SameSite\`.
- Generate session IDs with a CSPRNG.
- **Rotate** the session ID on login (prevents session fixation).
- Invalidate sessions server-side on logout and after inactivity.

## Multi-Factor Authentication (MFA)

MFA combines factors from different categories:

| Factor | Example |
|--------|---------|
| Something you **know** | Password, PIN |
| Something you **have** | Phone, security key |
| Something you **are** | Fingerprint, face |

MFA stops the vast majority of account-takeover attacks even when passwords leak. Prefer **phishing-resistant** factors (FIDO2/WebAuthn hardware keys) over SMS, which is vulnerable to SIM-swapping.
`,
      },
      {
        title: "Cross-Site Scripting (XSS), CSRF & Security Headers",
        type: "TEXT",
        duration: 18,
        content: `# Cross-Site Scripting (XSS), CSRF & Security Headers

## Cross-Site Scripting (XSS)

XSS injects malicious JavaScript that runs in **other users'** browsers, in the context of your site — letting attackers steal sessions, log keystrokes, or rewrite the page.

### Three Types

| Type | How |
|------|-----|
| **Stored** | Malicious script saved in the DB (e.g., a comment), served to every viewer |
| **Reflected** | Script bounced off a URL parameter into the response |
| **DOM-based** | Client-side JS writes untrusted data into the DOM |

### The Vulnerable Pattern

\`\`\`js
// ❌ Untrusted input written as HTML
element.innerHTML = userComment;   // <script>steal()</script> executes
\`\`\`

### Defenses

1. **Output encoding** — encode data for the context (HTML, attribute, JS, URL). Frameworks like React auto-escape by default; the danger is escape hatches (\`dangerouslySetInnerHTML\`).
2. **Input validation** — allow-list where possible.
3. **Content Security Policy (CSP)** — restrict which scripts may run; blocks most injected scripts even if one slips through.
4. **\`HttpOnly\` cookies** — keep JS from reading session cookies.
5. **Sanitize HTML** with a vetted library (DOMPurify) when you must render user HTML.

## Cross-Site Request Forgery (CSRF)

CSRF tricks a logged-in user's browser into making an unwanted state-changing request to your site (the browser auto-sends their cookies).

\`\`\`html
<!-- On attacker's site; victim is logged into bank.com -->
<img src="https://bank.com/transfer?to=attacker&amount=10000">
\`\`\`

### Defenses

1. **Anti-CSRF tokens** — a secret per-session token the attacker can't know.
2. **\`SameSite\` cookies** (\`Lax\`/\`Strict\`) — browser won't send cookies on cross-site requests (strong modern default).
3. **Re-authentication** for sensitive operations.

## Security Headers — Cheap, High-Impact Wins

| Header | Protects against |
|--------|------------------|
| \`Content-Security-Policy\` | XSS, data injection |
| \`Strict-Transport-Security\` (HSTS) | Protocol downgrade, SSL strip |
| \`X-Content-Type-Options: nosniff\` | MIME sniffing |
| \`X-Frame-Options\` / \`frame-ancestors\` | Clickjacking |
| \`Referrer-Policy\` | Info leakage via Referer |
| \`Set-Cookie: HttpOnly; Secure; SameSite\` | Cookie theft, CSRF |

Test your headers with tools like **securityheaders.com** and Mozilla **Observatory**. Most are a one-line config change for an outsized security improvement.

## Secure Development Lifecycle

Bake security in: threat modeling at design, secure coding standards, **SAST/DAST** scanning in CI, dependency scanning (Chapter 9), and code review with a security lens.
`,
      },
      {
        title: "Finding Web Vulnerabilities Safely — Demo",
        type: "VIDEO",
        duration: 17,
        content: "https://www.youtube.com/embed/X4eRbHgRawI",
      },
      {
        title: "Chapter 5 — Web Security Quiz",
        type: "QUIZ",
        duration: 12,
        quiz: {
          title: "Web Application Security Quiz",
          passMark: 70,
          timeLimit: 12,
          questions: [
            {
              text: "What is the primary defense against SQL injection?",
              options: [
                { text: "Hiding the database server" },
                { text: "Parameterized queries / prepared statements", correct: true },
                { text: "Using GET instead of POST" },
                { text: "Client-side input validation only" },
              ],
            },
            {
              text: "An IDOR vulnerability is an example of which OWASP category?",
              options: [
                { text: "Cryptographic Failures" },
                { text: "Broken Access Control", correct: true },
                { text: "Security Misconfiguration" },
                { text: "Server-Side Request Forgery" },
              ],
            },
            {
              text: "Stored XSS is more dangerous than reflected XSS because…",
              options: [
                { text: "It only affects the attacker" },
                { text: "The malicious script is persisted and served to every viewer", correct: true },
                { text: "It cannot be blocked by CSP" },
                { text: "It requires no JavaScript" },
              ],
            },
            {
              text: "Which cookie attribute best mitigates CSRF in modern browsers?",
              options: [
                { text: "Path" },
                { text: "SameSite", correct: true },
                { text: "Max-Age" },
                { text: "Domain" },
              ],
            },
            {
              text: "Why must authorization checks be enforced on the server?",
              options: [
                { text: "Client-side checks are slower" },
                { text: "Attackers can bypass the UI and call the API directly", correct: true },
                { text: "Browsers don't support authorization" },
                { text: "Servers can't be hacked" },
              ],
            },
            {
              text: "Which HTTP response header most directly mitigates XSS?",
              options: [
                { text: "Content-Security-Policy", correct: true },
                { text: "Cache-Control" },
                { text: "Accept-Language" },
                { text: "X-Powered-By" },
              ],
            },
            {
              text: "The cardinal rule of web application security is to…",
              options: [
                { text: "Trust authenticated users completely" },
                { text: "Never trust client input; validate and encode on the server", correct: true },
                { text: "Use only client-side validation" },
                { text: "Avoid using HTTPS to reduce overhead" },
              ],
            },
          ],
        },
      },
    ],
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Chapter 6 — Identity, Authentication & Access Control
// ───────────────────────────────────────────────────────────────────────────
function chapter6(): SeedModule {
  return {
    title: "Chapter 6 — Identity, Authentication & Access Control",
    lessons: [
      {
        title: "Authentication Factors, MFA & Passwordless",
        type: "TEXT",
        duration: 16,
        content: `# Authentication Factors, MFA & Passwordless

Identity is the new perimeter. In a cloud, remote-work world, **who you are** matters more than **where you are**.

## The Three Authentication Factor Categories

| Category | Examples | Weakness |
|----------|----------|----------|
| **Knowledge** (know) | Password, PIN, security question | Phishable, guessable, reused |
| **Possession** (have) | Phone, TOTP app, hardware key | Can be lost/stolen |
| **Inherence** (are) | Fingerprint, face, iris | Can't be changed if compromised |

**True MFA** requires factors from **different** categories. A password + a security question is *not* MFA (both are "know").

## MFA Methods, Ranked by Strength

1. **FIDO2 / WebAuthn hardware keys & passkeys** — phishing-resistant, the gold standard.
2. **Authenticator apps (TOTP)** — good; codes rotate every 30s.
3. **Push notifications** — convenient but vulnerable to "MFA fatigue" (spamming approvals).
4. **SMS / email codes** — weakest; vulnerable to SIM-swap and interception. Better than nothing.

## MFA Fatigue Attacks

Attackers with a stolen password spam push prompts until a tired user taps "Approve." Defend with **number matching**, limited prompts, and user education.

## Passwordless & Passkeys

**Passkeys** (built on FIDO2/WebAuthn) replace passwords with a cryptographic key pair tied to your device and biometrics:

- Nothing to phish — there's no shared secret to steal.
- The private key never leaves your device.
- Resistant to credential stuffing and replay.

This is where the industry is heading. Understand it well.

## Password Policy — Modern Guidance (NIST)

Current best practice has shifted:

- **Length over complexity** — encourage long passphrases; drop forced symbol rules.
- **No periodic forced rotation** unless there's evidence of compromise (forced rotation leads to weak, predictable changes).
- **Check against breached-password lists** — block known-compromised passwords.
- **Encourage password managers** — unique, random passwords per site.

## Single Sign-On (SSO)

SSO lets users authenticate once and access many apps. Benefits: fewer passwords, centralized policy and MFA, faster de-provisioning. Risk: the identity provider becomes a high-value target — protect it accordingly. (Protocols in the next lesson.)
`,
      },
      {
        title: "OAuth 2.0, OpenID Connect, SAML & JWTs",
        type: "TEXT",
        duration: 18,
        content: `# OAuth 2.0, OpenID Connect, SAML & JWTs

These protocols power "Log in with Google," enterprise SSO, and API authorization. Know what each does.

## Authentication vs Authorization (again)

- **Authentication** = proving identity (OpenID Connect, SAML).
- **Authorization** = granting access to resources (OAuth 2.0).

## OAuth 2.0 — Delegated Authorization

OAuth lets an app access resources **on your behalf** without getting your password.

\`\`\`
You → "Let App X read my calendar"
  → Google issues App X an access token (scoped, time-limited)
  → App X uses the token to call the Calendar API
\`\`\`

Key terms: **resource owner** (you), **client** (App X), **authorization server** (Google), **access token**, **scope**.

> Use the **Authorization Code flow with PKCE** for web and mobile apps. Avoid the legacy Implicit flow.

## OpenID Connect (OIDC)

OIDC is a thin **authentication** layer on top of OAuth 2.0. It adds an **ID token** (a JWT) proving who the user is. "Log in with Google/Apple" is OIDC.

## SAML

The XML-based SSO standard common in **enterprises**. The Identity Provider (IdP) sends a signed **SAML assertion** to the Service Provider (SP). Functionally similar to OIDC, just older and XML-heavy.

## JSON Web Tokens (JWT)

A JWT is a compact, **signed** (not necessarily encrypted) token with three parts:

\`\`\`
header.payload.signature
eyJhbG..  .  eyJzdWI..  .  SflKxw...
\`\`\`

- **Header** — algorithm & type.
- **Payload** — claims (user id, roles, expiry). **Readable by anyone — never put secrets here.**
- **Signature** — verifies integrity using a secret or the issuer's private key.

### JWT Security Pitfalls

1. **\`alg: none\`** — reject unsigned tokens; pin the expected algorithm.
2. **Algorithm confusion** (RS256 → HS256) — validate the algorithm server-side.
3. **No expiry / long-lived tokens** — set short \`exp\`; use refresh tokens.
4. **Can't easily revoke** — maintain a denylist or keep access tokens short-lived.
5. **Storing JWTs in \`localStorage\`** — exposes them to XSS; prefer \`HttpOnly\` cookies for browser sessions.

## Choosing

| Need | Use |
|------|-----|
| Third-party API access | OAuth 2.0 |
| Modern app login | OpenID Connect |
| Enterprise SSO (legacy) | SAML |
| Stateless service tokens | JWT (carefully) |
`,
      },
      {
        title: "Access Control Models: RBAC, ABAC & Least Privilege",
        type: "TEXT",
        duration: 16,
        content: `# Access Control Models: RBAC, ABAC & Least Privilege

Once you know **who** a user is, you must decide **what** they can do. That's access control.

## The Models

### DAC — Discretionary Access Control
Resource owners grant access at their discretion (e.g., file permissions, sharing a doc). Flexible but error-prone at scale.

### MAC — Mandatory Access Control
The system enforces access based on **classification labels** (e.g., Secret, Top Secret) — users can't override. Used in military/SELinux contexts.

### RBAC — Role-Based Access Control
Permissions are assigned to **roles**; users get roles. The workhorse of enterprise apps.

\`\`\`
User → Role(s) → Permissions

Alice → "Editor" → [read, write articles]
Bob   → "Admin"  → [read, write, delete, manage users]
\`\`\`

Benefits: scalable, auditable, easy onboarding/offboarding by role.

### ABAC — Attribute-Based Access Control
Decisions use **attributes** (user dept, resource sensitivity, time, location, device posture). Most flexible; powers fine-grained and zero-trust policies.

\`\`\`
ALLOW if user.dept == resource.dept
       AND user.clearance >= resource.level
       AND request.time in businessHours
\`\`\`

## Least Privilege & Need-to-Know

- Grant the **minimum** access required, for the **shortest** time needed.
- **Just-in-Time (JIT)** access: elevate privileges temporarily, then auto-revoke.
- **Privileged Access Management (PAM):** vault, broker, and record admin sessions.

## Identity Governance

| Practice | Why |
|----------|-----|
| **Joiner-Mover-Leaver** | Provision/adjust/revoke access as roles change |
| **Access reviews / recertification** | Periodically confirm access is still needed |
| **Separation of duties** | No one person controls a whole critical flow |
| **Orphaned account cleanup** | Disable accounts of departed users promptly |

> **Privilege creep** — users accumulating access over years — is a major risk. Regular access reviews are the cure.

## Service & Machine Identities

It's not just humans. Services, containers, and CI pipelines need identities too:

- Use **short-lived credentials** and **workload identity** instead of long-lived static keys.
- Never embed long-lived secrets in code or images (Chapter 9).
- Rotate and monitor machine credentials like human ones.

## The Zero-Trust Tie-In

Zero Trust depends on strong identity + fine-grained authorization + continuous verification. RBAC gives you the baseline; ABAC and device posture checks give you the precision Zero Trust requires.
`,
      },
      {
        title: "Identity Threats: Phishing & Social Engineering",
        type: "TEXT",
        duration: 14,
        content: `# Identity Threats: Phishing & Social Engineering

Technology fails to a human who is tricked into handing over the keys. **Social engineering** is the #1 way attackers gain initial access.

## Why It Works

Social engineering exploits psychology, not code:

| Principle | Manipulation |
|-----------|--------------|
| **Authority** | "This is IT — I need your password." |
| **Urgency** | "Your account will be locked in 10 minutes!" |
| **Fear** | "Suspicious login detected — verify now." |
| **Trust/Familiarity** | Impersonating a colleague or vendor |
| **Greed/Curiosity** | "You won a prize," a tempting attachment |

## Common Techniques

- **Phishing** — mass deceptive emails luring clicks/credentials.
- **Spear phishing** — targeted, personalized (researched victim).
- **Whaling** — targeting executives.
- **Vishing** — voice/phone-based.
- **Smishing** — SMS-based.
- **Business Email Compromise (BEC)** — impersonating an exec to authorize fraudulent payments. Often the costliest attack of all.
- **Pretexting** — inventing a scenario to extract info.
- **Baiting** — dropping malicious USB drives.
- **Tailgating** — following someone through a secure door.

## Spotting a Phishing Email

🚩 Red flags:
- Mismatched/look-alike sender domain (\`micros0ft-support.com\`).
- Generic greeting, urgency, threats.
- Unexpected attachments or links (hover to inspect the real URL).
- Requests for credentials, MFA codes, or payment changes.
- Subtle grammar/branding errors.

## Defenses — Technical + Human

**Technical:**
- Email authentication: **SPF, DKIM, DMARC** to block spoofed senders.
- Link/attachment sandboxing and filtering.
- **Phishing-resistant MFA** (FIDO2) — even if creds are phished, the attacker can't log in.

**Human:**
- Regular **security awareness training** and simulated phishing.
- A **blameless, easy reporting** process ("Report Phish" button) — speed of reporting beats perfection.
- Verify sensitive requests (payments, credential changes) via a **second channel**.

## The Defender's Mindset

> Assume some users will click. Build controls so that one click doesn't equal a breach: MFA, least privilege, segmentation, and fast detection. Resilience over perfection.
`,
      },
      {
        title: "Setting Up MFA & SSO — Walkthrough",
        type: "VIDEO",
        duration: 14,
        content: "https://www.youtube.com/embed/0mvCeNsTa1g",
      },
      {
        title: "Chapter 6 — Identity & Access Quiz",
        type: "QUIZ",
        duration: 12,
        quiz: {
          title: "Identity & Access Control Quiz",
          passMark: 70,
          timeLimit: 12,
          questions: [
            {
              text: "Which combination represents TRUE multi-factor authentication?",
              options: [
                { text: "A password and a security question" },
                { text: "A password and a hardware security key", correct: true },
                { text: "Two different passwords" },
                { text: "A PIN and a memorized passphrase" },
              ],
            },
            {
              text: "What does OAuth 2.0 primarily provide?",
              options: [
                { text: "Authentication of a user's identity" },
                { text: "Delegated authorization to access resources on a user's behalf", correct: true },
                { text: "Disk encryption" },
                { text: "Network segmentation" },
              ],
            },
            {
              text: "Where should you NOT store sensitive data in a JWT?",
              options: [
                { text: "Nowhere — JWTs are encrypted" },
                { text: "In the payload, which is readable by anyone", correct: true },
                { text: "In the signature" },
                { text: "JWTs cannot hold data" },
              ],
            },
            {
              text: "In RBAC, permissions are assigned to…",
              options: [
                { text: "Individual users directly" },
                { text: "Roles, which are then assigned to users", correct: true },
                { text: "IP addresses" },
                { text: "Resource classification labels" },
              ],
            },
            {
              text: "'Privilege creep' refers to…",
              options: [
                { text: "Slow login performance" },
                { text: "Users accumulating excess access over time", correct: true },
                { text: "A type of malware" },
                { text: "Encrypting privileges" },
              ],
            },
            {
              text: "Business Email Compromise (BEC) typically works by…",
              options: [
                { text: "Exploiting a SQL injection flaw" },
                { text: "Impersonating an executive to authorize fraudulent payments", correct: true },
                { text: "Brute-forcing TLS certificates" },
                { text: "Flooding the network with traffic" },
              ],
            },
            {
              text: "Which MFA method is most phishing-resistant?",
              options: [
                { text: "SMS one-time codes" },
                { text: "Email codes" },
                { text: "FIDO2 / WebAuthn hardware keys", correct: true },
                { text: "Security questions" },
              ],
            },
          ],
        },
      },
    ],
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Chapter 7 — Threats, Malware & Attack Techniques
// ───────────────────────────────────────────────────────────────────────────
function chapter7(): SeedModule {
  return {
    title: "Chapter 7 — Threats, Malware & Attack Techniques",
    lessons: [
      {
        title: "Malware Taxonomy: Viruses, Worms, Trojans & Ransomware",
        type: "TEXT",
        duration: 16,
        content: `# Malware Taxonomy: Viruses, Worms, Trojans & Ransomware

**Malware** (malicious software) is any code designed to harm, exploit, or gain unauthorized access. Knowing the types helps you recognize behavior and choose defenses.

## The Major Families

| Type | Defining trait |
|------|----------------|
| **Virus** | Attaches to a file; spreads when that file runs |
| **Worm** | Self-propagates across networks with no user action |
| **Trojan** | Disguised as legitimate software |
| **Ransomware** | Encrypts data and demands payment |
| **Spyware** | Covertly gathers information |
| **Keylogger** | Records keystrokes |
| **Rootkit** | Hides deep in the OS to maintain stealthy access |
| **Bootkit** | Infects the boot process, below the OS |
| **Adware** | Forces unwanted ads (often bundled) |
| **Botnet agent** | Enrolls the host into an attacker-controlled network |
| **Fileless malware** | Lives in memory; leaves little on disk |
| **Logic bomb** | Triggers on a condition (date, event) |

## Ransomware — The Dominant Threat

Modern ransomware uses **double extortion**: encrypt the data **and** steal a copy, threatening to leak it if unpaid. Some add **triple extortion** (DDoS, contacting customers). Defenses tie back to Chapter 4: immutable backups, segmentation, EDR, MFA, and user training.

## Rootkits & Persistence

Once in, attackers want to **stay**. Persistence mechanisms include:

- Scheduled tasks / cron jobs
- Registry run keys (Windows)
- Malicious services or startup items
- Web shells on compromised servers
- Rootkits hooking OS functions to hide

Detection relies on **behavioral telemetry** (EDR, Sysmon) and **file integrity monitoring** — rootkits specifically try to defeat signature scanners.

## How Malware Gets In (Initial Access)

- Phishing attachments/links (most common)
- Exploiting unpatched vulnerabilities
- Malicious downloads / fake software
- Removable media (USB)
- Supply-chain compromise (trojaned updates)
- Stolen/weak credentials on exposed services

## Defender's Layered Response

\`\`\`
Prevent:  patching, email filtering, app control, MFA
Detect:   EDR, AV, anomaly detection, logging
Contain:  isolation, segmentation
Recover:  backups, rebuild from known-good
\`\`\`

No single layer is enough — defense in depth assumes some malware will get through and ensures you can catch and contain it.
`,
      },
      {
        title: "The Cyber Kill Chain & MITRE ATT&CK",
        type: "TEXT",
        duration: 16,
        content: `# The Cyber Kill Chain & MITRE ATT&CK

To defend systematically, you need a **map** of how attacks unfold. Two frameworks dominate.

## The Lockheed Martin Cyber Kill Chain

A linear model of an intrusion's phases:

1. **Reconnaissance** — research the target.
2. **Weaponization** — craft the payload.
3. **Delivery** — send it (email, web, USB).
4. **Exploitation** — trigger the vulnerability.
5. **Installation** — establish a foothold.
6. **Command & Control (C2)** — remote control.
7. **Actions on Objectives** — exfiltrate, encrypt, destroy.

**Defensive value:** break **any** link and the attack fails. Map your controls to each phase to find gaps.

## MITRE ATT&CK

A far more detailed, **continuously updated knowledge base** of real-world adversary **tactics** (the "why") and **techniques** (the "how"), based on observed campaigns.

### Tactics (the columns / goals)

\`\`\`
Reconnaissance → Resource Development → Initial Access →
Execution → Persistence → Privilege Escalation →
Defense Evasion → Credential Access → Discovery →
Lateral Movement → Collection → Command & Control →
Exfiltration → Impact
\`\`\`

### Techniques (the "how")

Each tactic has many techniques with IDs, e.g.:
- **T1566** Phishing (Initial Access)
- **T1059** Command and Scripting Interpreter (Execution)
- **T1003** OS Credential Dumping (Credential Access)
- **T1021** Remote Services (Lateral Movement)

## How Defenders Use ATT&CK

1. **Detection engineering** — write detections mapped to specific techniques.
2. **Coverage mapping** — visualize which techniques you can detect vs. blind spots (ATT&CK Navigator).
3. **Threat intel** — describe adversary behavior in a shared language ("this group uses T1566 then T1059").
4. **Purple teaming** — emulate techniques (Atomic Red Team, Caldera) and verify detections fire.

## Kill Chain vs ATT&CK

| | Kill Chain | ATT&CK |
|---|-----------|--------|
| Shape | Linear, 7 phases | Matrix, many techniques |
| Detail | High-level | Granular, real-world |
| Best for | Communicating strategy | Detection & gap analysis |

Use the kill chain to **explain** an attack's arc; use ATT&CK to **operationalize** detection and measure coverage.
`,
      },
      {
        title: "Network Attacks: DoS/DDoS, MITM & Sniffing",
        type: "TEXT",
        duration: 14,
        content: `# Network Attacks: DoS/DDoS, MITM & Sniffing

Attacks against availability and confidentiality at the network layer — and how to blunt them.

## Denial of Service (DoS / DDoS)

A **DoS** overwhelms a target so legitimate users can't reach it. A **DDoS** uses many distributed sources (a **botnet**), making it far harder to block.

### Categories

| Type | Mechanism | Example |
|------|-----------|---------|
| **Volumetric** | Saturate bandwidth | UDP/ICMP floods, amplification |
| **Protocol** | Exhaust connection state | SYN flood |
| **Application** | Exhaust app resources | HTTP request floods |

**Amplification** abuses services (DNS, NTP, memcached) that return large responses to small spoofed requests, multiplying the attack's volume.

### Defenses

- **Upstream DDoS mitigation / scrubbing** (Cloudflare, Akamai, AWS Shield).
- **Rate limiting** and connection limits.
- **Anycast** to distribute load geographically.
- **Over-provisioning** and autoscaling for surges.
- Disable/secure services prone to amplification.

## Man-in-the-Middle (MITM)

The attacker secretly positions between two parties to read or alter traffic.

Techniques: ARP spoofing (LAN), rogue Wi-Fi access points, DNS spoofing, BGP hijacking.

### Defenses

- **Encryption with authentication** (TLS) — MITM can intercept but not read or forge.
- **HSTS** and certificate validation to prevent downgrade/SSL-strip.
- **Certificate pinning** for high-value mobile apps.
- Avoid sensitive actions on untrusted Wi-Fi; use VPN.
- **Dynamic ARP inspection** and **DHCP snooping** on managed switches.

## Sniffing / Eavesdropping

Capturing network traffic. On a switched network, attackers may use ARP spoofing or port mirroring; on Wi-Fi, they capture radio frames. **Tools like Wireshark are legitimate for defenders** analyzing their own networks.

**Defense:** encrypt everything in transit. If traffic is TLS-protected, sniffing yields ciphertext, not secrets.

## Wireless-Specific Threats

- **Evil twin** — rogue AP mimicking a legit SSID.
- **WPA2 weaknesses** — use **WPA3**; strong, unique PSKs or 802.1X (enterprise).
- **Deauthentication** attacks to force reconnects to a rogue AP.

## The Common Thread

Most network attacks are defeated by two habits: **encrypt and authenticate all traffic**, and **monitor for anomalies**. Confidentiality and integrity come from crypto; availability comes from capacity, filtering, and upstream scrubbing.
`,
      },
      {
        title: "Vulnerability Management & Penetration Testing",
        type: "TEXT",
        duration: 16,
        content: `# Vulnerability Management & Penetration Testing

Proactively finding weaknesses before attackers do is core blue-team work.

## Vulnerabilities, Exploits & CVEs

- **Vulnerability** — a weakness (e.g., unpatched software).
- **Exploit** — code/technique that abuses it.
- **CVE** — a unique ID for a publicly known vulnerability (e.g., CVE-2021-44228, "Log4Shell").
- **CVSS** — a 0–10 severity score. Useful, but **prioritize by exploitability + exposure + business impact**, not score alone.
- **Zero-day** — a vulnerability with no patch available yet.

## The Vulnerability Management Lifecycle

\`\`\`
1. Discover (asset inventory)
2. Scan (Nessus, OpenVAS, Qualys)
3. Prioritize (severity + exposure + exploitability)
4. Remediate (patch, configure, or compensate)
5. Verify (rescan)
6. Report (track trends, SLAs)
   ↺ repeat continuously
\`\`\`

> You can't protect what you don't know you have. **Asset inventory** is the unglamorous foundation of everything.

### Prioritization Signals

- Is it **internet-facing**?
- Is there a **known exploit in the wild** (CISA KEV catalog)?
- Does it touch **sensitive data** or critical systems?
- What's the **compensating control** if you can't patch immediately?

## Penetration Testing

A **pentest** is an **authorized**, simulated attack to find exploitable weaknesses.

| Type | Tester knowledge |
|------|------------------|
| **Black box** | None (external attacker view) |
| **Grey box** | Partial (some access/info) |
| **White box** | Full (source, architecture) |

### Phases

1. **Scoping & Rules of Engagement** — written authorization, boundaries, timing. **Never skip this.**
2. **Reconnaissance** — passive and active info gathering.
3. **Scanning & enumeration** — map services and weaknesses.
4. **Exploitation** — safely prove impact.
5. **Post-exploitation** — assess reach (lateral movement, data access).
6. **Reporting** — findings, risk ratings, remediation guidance.

## Related Assessment Types

- **Vulnerability assessment** — breadth (find many issues), no exploitation.
- **Penetration test** — depth (prove exploitability) within scope.
- **Red team** — goal-oriented, stealthy, tests detection & response.
- **Bug bounty** — crowdsourced testing under a defined policy.
- **Responsible disclosure** — report found flaws to vendors, give time to fix.

## The Ethical & Legal Line (again)

Authorization is **everything**. A pentest without written permission is a crime, no matter how good the intentions. Scope, authorize, document — every time.
`,
      },
      {
        title: "Understanding the MITRE ATT&CK Framework — Overview",
        type: "VIDEO",
        duration: 15,
        content: "https://www.youtube.com/embed/Gicua6vmDHc",
      },
      {
        title: "Chapter 7 — Threats & Attacks Quiz",
        type: "QUIZ",
        duration: 12,
        quiz: {
          title: "Threats, Malware & Attacks Quiz",
          passMark: 70,
          timeLimit: 12,
          questions: [
            {
              text: "What distinguishes a worm from a virus?",
              options: [
                { text: "A worm self-propagates across networks without user action", correct: true },
                { text: "A worm requires a host file to spread" },
                { text: "A worm only affects mobile devices" },
                { text: "A worm cannot replicate" },
              ],
            },
            {
              text: "'Double extortion' ransomware adds which threat?",
              options: [
                { text: "Charging twice the ransom" },
                { text: "Stealing data and threatening to leak it in addition to encrypting", correct: true },
                { text: "Encrypting the data twice" },
                { text: "Targeting two companies at once" },
              ],
            },
            {
              text: "What is MITRE ATT&CK best used for?",
              options: [
                { text: "Encrypting network traffic" },
                { text: "A detailed knowledge base of adversary tactics and techniques for detection and gap analysis", correct: true },
                { text: "Managing firewall licenses" },
                { text: "Generating TLS certificates" },
              ],
            },
            {
              text: "A SYN flood is which category of DoS attack?",
              options: [
                { text: "Volumetric" },
                { text: "Protocol (state exhaustion)", correct: true },
                { text: "Application-layer" },
                { text: "Amplification only" },
              ],
            },
            {
              text: "The best defense that renders network sniffing of sensitive data useless is…",
              options: [
                { text: "Using a faster switch" },
                { text: "Encrypting traffic in transit with authenticated TLS", correct: true },
                { text: "Hiding the SSID" },
                { text: "Disabling logging" },
              ],
            },
            {
              text: "What is a 'zero-day' vulnerability?",
              options: [
                { text: "A vulnerability that is exactly zero days old" },
                { text: "A known vulnerability for which no patch is yet available", correct: true },
                { text: "A vulnerability with a CVSS score of zero" },
                { text: "A vulnerability only in test environments" },
              ],
            },
            {
              text: "What must ALWAYS precede a penetration test?",
              options: [
                { text: "Installing malware on the target" },
                { text: "Written authorization and agreed rules of engagement", correct: true },
                { text: "Disabling the target's backups" },
                { text: "Publicly announcing the test" },
              ],
            },
          ],
        },
      },
    ],
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Chapter 8 — Security Operations, Monitoring & Incident Response
// ───────────────────────────────────────────────────────────────────────────
function chapter8(): SeedModule {
  return {
    title: "Chapter 8 — Security Operations, Monitoring & Incident Response",
    lessons: [
      {
        title: "The SOC, SIEM & Log Management",
        type: "TEXT",
        duration: 16,
        content: `# The SOC, SIEM & Log Management

The **Security Operations Center (SOC)** is where detection and response happen. This is where most cybersecurity careers begin.

## What a SOC Does

- **Monitor** systems and networks 24/7.
- **Detect** suspicious activity from telemetry.
- **Triage & investigate** alerts.
- **Respond** to and contain incidents.
- **Improve** detections over time.

### SOC Analyst Tiers

| Tier | Role |
|------|------|
| **Tier 1** | Alert triage, initial investigation, escalation |
| **Tier 2** | Deeper investigation, incident handling |
| **Tier 3** | Threat hunting, advanced forensics, detection engineering |

## Logs — The Raw Material

You can only detect what you can see. Critical log sources:

- **Endpoint:** process creation, Sysmon, EDR telemetry.
- **Authentication:** logons, MFA events, failures.
- **Network:** firewall, DNS, proxy, NetFlow.
- **Application & cloud:** web server logs, cloud audit trails (CloudTrail).
- **Identity:** directory and SSO logs.

> **Logging hygiene:** ensure clocks are synced (NTP), logs are centralized, and they're **tamper-resistant** — attackers delete logs to hide. Forward logs off the host in real time.

## SIEM — Security Information & Event Management

A SIEM **centralizes, normalizes, and correlates** logs to surface threats.

\`\`\`
Sources → [ Collect ] → [ Normalize ] → [ Correlate / Rules ] → [ Alert ] → Analyst
\`\`\`

Capabilities: search, correlation rules, dashboards, alerting, retention. Examples: Splunk, Microsoft Sentinel, Elastic SIEM, Wazuh (open-source).

### Correlation Example

A single failed login is noise. But:

\`\`\`
50 failed logins → 1 success → privilege change → data download
\`\`\`

...correlated together is a likely account-takeover. The SIEM's job is to connect these dots across sources.

## Beyond SIEM: SOAR, UEBA, XDR

- **SOAR** — Security Orchestration, Automation & Response: automates repetitive response steps via **playbooks** (e.g., auto-isolate a host, enrich an IP).
- **UEBA** — User & Entity Behavior Analytics: ML baselining to flag anomalies (impossible travel, unusual data access).
- **XDR** — unifies detection/response across endpoint, network, identity, and cloud.

## Reducing Alert Fatigue

SOCs drown in alerts. Combat it with **tuning** (cut false positives), **prioritization** (risk-based), **enrichment** (auto-add context), and **automation** (SOAR) — so analysts focus on what matters.
`,
      },
      {
        title: "Detection, Threat Hunting & Threat Intelligence",
        type: "TEXT",
        duration: 16,
        content: `# Detection, Threat Hunting & Threat Intelligence

Detection is the art of finding attackers in the noise. It comes in reactive and proactive forms.

## Detection Approaches

| Approach | How |
|----------|-----|
| **Signature/IOC-based** | Match known-bad (hashes, IPs, domains) |
| **Anomaly-based** | Deviation from a learned baseline |
| **Behavior-based** | Patterns of malicious activity (mapped to ATT&CK) |
| **Heuristic** | Rules approximating bad behavior |

## Indicators of Compromise (IOCs) vs. Behaviors

- **IOCs** — atomic artifacts: a malicious file hash, IP, domain. Easy to share, but attackers change them cheaply.
- **TTPs (behaviors)** — tactics, techniques, procedures. Far harder for an attacker to change.

The **Pyramid of Pain**: blocking high-level TTPs hurts attackers far more than blocking individual hashes or IPs.

\`\`\`
        TTPs            ← hardest to change (most pain)
      Tools
    Network/Host Artifacts
   Domain Names
  IP Addresses
 Hash Values             ← trivial to change (least pain)
\`\`\`

## Threat Hunting

**Proactive** searching for threats that evaded automated detection — assuming a breach has already occurred.

### Hypothesis-Driven Hunting

\`\`\`
Hypothesis: "An attacker may be using PowerShell for C2."
   → Query logs for suspicious PowerShell (encoded commands, network calls)
   → Investigate anomalies
   → If found: respond. If not: turn the hunt into a new detection rule.
\`\`\`

Good hunts produce **new detections**, regardless of whether they find an active threat.

## Cyber Threat Intelligence (CTI)

Knowledge about adversaries that informs decisions.

| Level | Audience | Content |
|-------|----------|---------|
| **Strategic** | Executives | Trends, risk, who might target us |
| **Operational** | Defenders | Campaigns, adversary TTPs |
| **Tactical** | SOC/tools | IOCs, signatures to deploy |

**Sources:** ISACs, vendor reports, OSINT, CISA advisories, commercial feeds. Standards like **STIX/TAXII** let teams share intel in a structured way.

## Putting It Together

\`\`\`
Threat Intel → informs → Detection rules → produce → Alerts
   ↑                                                    │
   └────────── Threat Hunting ◀── Investigation ◀───────┘
\`\`\`

A mature SOC runs this loop continuously: intel sharpens detection, detection feeds investigation, hunting finds gaps and creates new detections, and findings feed back into intel.
`,
      },
      {
        title: "The Incident Response Lifecycle",
        type: "TEXT",
        duration: 18,
        content: `# The Incident Response Lifecycle

When detection fires, **incident response (IR)** kicks in. A calm, practiced process is the difference between a contained event and a catastrophe.

## The NIST IR Lifecycle

\`\`\`
1. Preparation
2. Detection & Analysis
3. Containment, Eradication & Recovery
4. Post-Incident Activity (Lessons Learned)
        ↺ feeds back into Preparation
\`\`\`

### 1. Preparation (before anything happens)

- An **IR plan** and **playbooks** for common scenarios.
- A defined **IR team** with roles and contacts.
- Tools, logging, and access ready in advance.
- **Training and tabletop exercises** — practice under calm conditions.

> The work you do *before* an incident determines how well you handle it. You can't write the plan during the fire.

### 2. Detection & Analysis

- Validate the alert: is it a real incident or a false positive?
- Determine **scope and severity** (what/who is affected).
- **Classify** and prioritize. Begin documenting a **timeline** immediately.

### 3. Containment, Eradication & Recovery

**Containment** — stop the bleeding:
- *Short-term:* isolate affected hosts, block C2, disable compromised accounts.
- *Long-term:* temporary fixes to keep operating while you clean up.

**Eradication** — remove the threat: delete malware, close the vulnerability, reset credentials.

**Recovery** — restore to normal: rebuild from known-good, restore data, monitor closely for recurrence before declaring "all clear."

### 4. Post-Incident (Lessons Learned)

- A **blameless post-mortem**: what happened, what worked, what didn't.
- Concrete improvements: new detections, control gaps, plan updates.
- **The goal is learning, not blame** — blame drives people to hide problems.

## Preserve Evidence

During containment, **preserve forensic evidence** — don't power off a machine (memory is lost); capture memory and disk images first if investigation/legal action is likely. Maintain **chain of custody**.

## Roles, Communication & Legal

- Designate an **incident commander** to coordinate.
- Plan **internal and external communications** in advance (legal, PR, customers).
- Know your **regulatory notification deadlines** (e.g., GDPR's 72-hour breach notification).
- Engage **legal/compliance** early for reportable incidents.

## Key Metrics

- **MTTD** — Mean Time to Detect.
- **MTTR** — Mean Time to Respond/Recover.

Driving these down is the SOC's north star — speed limits the damage an attacker can do.
`,
      },
      {
        title: "Digital Forensics Fundamentals",
        type: "TEXT",
        duration: 14,
        content: `# Digital Forensics Fundamentals

**Digital forensics** is the disciplined collection, preservation, and analysis of digital evidence — to understand an incident and, when needed, support legal action.

## The Core Principles

1. **Preserve, then analyze** — never work on original evidence; work on verified copies.
2. **Order of volatility** — collect the most fleeting data first:

\`\`\`
CPU registers / cache
RAM (memory)
Network state, running processes
Disk
Logs / archived data
Backups        ← least volatile
\`\`\`

3. **Integrity via hashing** — hash evidence (SHA-256) at acquisition; re-hash to prove it's unchanged.
4. **Chain of custody** — document who handled evidence, when, and why. A broken chain can make evidence inadmissible.

## Acquisition

- **Memory capture** — RAM holds running malware, keys, network connections, and fileless artifacts that vanish on shutdown. **Don't pull the plug** before capturing memory if feasible.
- **Disk imaging** — bit-for-bit forensic image (e.g., with a write-blocker to prevent altering the source).

## Analysis Areas

| Artifact | Reveals |
|----------|---------|
| File system & timelines | What ran, when; deleted files |
| Memory | Injected code, keys, processes, network |
| Logs | Authentication, execution, lateral movement |
| Registry (Windows) | Persistence, USB history, recent activity |
| Network captures | C2, exfiltration |
| Browser/email | Phishing, downloads |

## Common Tools (Awareness)

- **Autopsy / The Sleuth Kit** — disk forensics.
- **Volatility** — memory analysis.
- **Wireshark** — packet analysis.
- **FTK Imager** — acquisition/imaging.

## Forensics vs. Incident Response

IR aims to **contain and recover fast**; forensics aims to **understand deeply and preserve evidence**. They can conflict (wiping a box quickly destroys evidence), so coordinate: decide early whether legal action is likely, and preserve accordingly.

## Anti-Forensics

Attackers actively try to defeat forensics: clearing logs, timestomping (altering file times), encryption, and fileless techniques. This is why **off-host, tamper-resistant logging** (Chapter 8) is so valuable — it survives even when the endpoint is scrubbed.

## The Reporting Outcome

Forensic work culminates in a clear, factual report: a timeline of events, root cause, scope of impact, and recommendations — written so both technical teams and non-technical stakeholders can act on it.
`,
      },
      {
        title: "Inside a SOC: Analyst Workflow — Walkthrough",
        type: "VIDEO",
        duration: 16,
        content: "https://www.youtube.com/embed/qTfYBC2g0_o",
      },
      {
        title: "Chapter 8 — SecOps & IR Quiz",
        type: "QUIZ",
        duration: 12,
        quiz: {
          title: "Security Operations & Incident Response Quiz",
          passMark: 70,
          timeLimit: 12,
          questions: [
            {
              text: "What is the primary function of a SIEM?",
              options: [
                { text: "To encrypt all network traffic" },
                { text: "To centralize, correlate, and alert on logs from many sources", correct: true },
                { text: "To replace firewalls" },
                { text: "To manage user passwords" },
              ],
            },
            {
              text: "What are the four phases of the NIST incident response lifecycle?",
              options: [
                { text: "Scan, Exploit, Report, Patch" },
                { text: "Preparation; Detection & Analysis; Containment, Eradication & Recovery; Post-Incident", correct: true },
                { text: "Plan, Build, Run, Retire" },
                { text: "Detect, Encrypt, Backup, Restore" },
              ],
            },
            {
              text: "According to the order of volatility, which should you collect FIRST?",
              options: [
                { text: "Backups" },
                { text: "Disk image" },
                { text: "RAM / memory", correct: true },
                { text: "Archived logs" },
              ],
            },
            {
              text: "On the Pyramid of Pain, blocking which causes attackers the MOST difficulty?",
              options: [
                { text: "File hash values" },
                { text: "IP addresses" },
                { text: "Domain names" },
                { text: "TTPs (tactics, techniques, procedures)", correct: true },
              ],
            },
            {
              text: "Why is 'chain of custody' important in digital forensics?",
              options: [
                { text: "It speeds up data recovery" },
                { text: "It documents evidence handling so it remains trustworthy and admissible", correct: true },
                { text: "It encrypts the evidence" },
                { text: "It is only needed for network logs" },
              ],
            },
            {
              text: "Threat hunting is best described as…",
              options: [
                { text: "Waiting for automated alerts to fire" },
                { text: "Proactively searching for threats that evaded automated detection", correct: true },
                { text: "Buying threat intelligence feeds" },
                { text: "Blocking all inbound traffic" },
              ],
            },
            {
              text: "Why should a post-incident review be 'blameless'?",
              options: [
                { text: "To avoid documenting the incident" },
                { text: "So people share the truth and the team actually learns and improves", correct: true },
                { text: "Because incidents are never anyone's fault" },
                { text: "To skip the lessons-learned step" },
              ],
            },
          ],
        },
      },
    ],
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Chapter 9 — Cloud, Container & DevSecOps Security
// ───────────────────────────────────────────────────────────────────────────
function chapter9(): SeedModule {
  return {
    title: "Chapter 9 — Cloud, Container & DevSecOps Security",
    lessons: [
      {
        title: "Cloud Security & the Shared Responsibility Model",
        type: "TEXT",
        duration: 16,
        content: `# Cloud Security & the Shared Responsibility Model

The cloud doesn't remove security responsibility — it **splits** it. Misunderstanding the split causes most cloud breaches.

## The Shared Responsibility Model

\`\`\`
              │ IaaS │ PaaS │ SaaS │
Data          │ YOU  │ YOU  │ YOU  │  ← always yours
App / config  │ YOU  │ YOU  │ Prov │
Runtime / OS  │ YOU  │ Prov │ Prov │
Virtualization│ Prov │ Prov │ Prov │
Hardware/DC   │ Prov │ Prov │ Prov │
\`\`\`

> The provider secures the cloud (**"security OF the cloud"**); **you** secure what you put in it (**"security IN the cloud"**) — your data, identities, and configuration. Misconfiguration is **your** responsibility, and it's the #1 cause of cloud breaches.

## The #1 Cloud Risk: Misconfiguration

- **Public storage buckets** (S3, blobs) exposing sensitive data.
- Over-permissive **IAM** roles and policies.
- **Security groups** open to \`0.0.0.0/0\` on admin ports.
- Unencrypted volumes/databases.
- Disabled or unmonitored audit logging.

## Cloud IAM — Identity Is the Perimeter

In the cloud, **identity replaces the network boundary**:

- Enforce **least privilege** on every role and policy.
- **MFA** on all human accounts, especially root/admin.
- Avoid long-lived **access keys**; use roles and short-lived credentials.
- Never use the **root account** for daily work; lock it down.
- Regularly review permissions; remove unused ones.

## Key Cloud Controls

| Control | Purpose |
|---------|---------|
| **Encryption** (at rest & transit) | Protect data; provider KMS for keys |
| **Network:** VPCs, security groups, private subnets | Segment and limit exposure |
| **Logging:** CloudTrail / Activity Logs | Audit every API call |
| **CSPM** tools | Continuously detect misconfigurations |
| **CWPP** | Protect workloads (VMs, containers) |
| **CASB** | Govern SaaS usage and data |

## Cloud-Native Threats

- **Credential/key leakage** (in code, repos) → instant cloud compromise.
- **SSRF** abused to reach the **metadata service** and steal instance credentials (use IMDSv2).
- **Privilege escalation** via misconfigured IAM trust policies.
- **Account hijacking** of the management console.

## Practical Hardening Checklist

- [ ] MFA everywhere; root account locked away.
- [ ] Least-privilege IAM; no wildcard \`*:*\` policies.
- [ ] Block public access on storage by default.
- [ ] Encrypt all data at rest and in transit.
- [ ] Enable audit logging in every account/region; centralize it.
- [ ] Run a **CSPM** scan and fix critical misconfigurations.
- [ ] Use short-lived credentials and workload identity.
`,
      },
      {
        title: "Container & Kubernetes Security",
        type: "TEXT",
        duration: 16,
        content: `# Container & Kubernetes Security

Containers and Kubernetes power modern apps — and introduce new attack surface at every layer.

## The Container Threat Model (4 C's)

\`\`\`
Cloud  →  Cluster  →  Container  →  Code
\`\`\`

Security at each layer builds on the one outside it. A weakness in any layer can undermine the rest.

## Securing Container Images

1. **Minimal base images** — distroless/Alpine shrink attack surface.
2. **Scan images** for known vulnerabilities (Trivy, Grype) in CI.
3. **Pin versions & verify signatures** — avoid \`:latest\`; sign images (cosign/Sigstore).
4. **No secrets in images** — inject at runtime via a secrets manager.
5. **Run as non-root** — set a non-root \`USER\`; drop Linux capabilities.
6. **Read-only root filesystem** where possible.

## Runtime Container Security

- **Don't run privileged containers** — \`--privileged\` ≈ root on the host.
- Drop unneeded **capabilities**; use seccomp/AppArmor profiles.
- Set **resource limits** (prevent noisy-neighbor / DoS).
- **Runtime detection** (Falco) for anomalous container behavior.

## Kubernetes Security Essentials

| Area | Control |
|------|---------|
| **API server** | The crown jewel — lock down access, enable audit logs |
| **RBAC** | Least-privilege roles; avoid \`cluster-admin\` sprawl |
| **Network Policies** | Default-deny pod-to-pod traffic; segment namespaces |
| **Secrets** | Encrypt etcd at rest; use external secret stores |
| **Pod Security** | Pod Security Standards/admission control (no privileged pods) |
| **Admission control** | OPA/Gatekeeper or Kyverno to enforce policy |

> **etcd** stores all cluster state and secrets — encrypt it at rest and restrict access tightly. Compromising etcd compromises the whole cluster.

## Common Misconfigurations

- Overly permissive RBAC (\`cluster-admin\` for apps).
- Exposed dashboard or API server to the internet.
- No network policies → flat pod network, easy lateral movement.
- Secrets in environment variables or plain manifests.
- Containers running as root / privileged.

## Supply Chain for Containers

Your image is only as trustworthy as everything inside it. Scan, sign, and verify; generate an **SBOM** (next lesson) so you know exactly what's in each image when the next Log4Shell drops.
`,
      },
      {
        title: "DevSecOps: Shifting Security Left",
        type: "TEXT",
        duration: 16,
        content: `# DevSecOps: Shifting Security Left

**DevSecOps** integrates security into every stage of the software lifecycle — automated, continuous, and owned by everyone, not bolted on at the end.

## Shift Left

The earlier you catch a flaw, the cheaper it is to fix. A bug found in design costs a fraction of one found in production.

\`\`\`
Plan → Code → Build → Test → Deploy → Operate
  └──── security at EVERY stage, automated ────┘
\`\`\`

## Security in the CI/CD Pipeline

| Stage | Security activity | Tools |
|-------|-------------------|-------|
| **Code** | Pre-commit secret scanning, IDE linting | gitleaks, Semgrep |
| **Build** | **SAST** (static analysis), **SCA** (dependencies) | Semgrep, Snyk, Dependabot |
| **Test** | **DAST** (running-app scanning) | OWASP ZAP |
| **Container** | Image scanning, IaC scanning | Trivy, Checkov, tfsec |
| **Deploy** | Signing, policy gates | cosign, OPA |
| **Operate** | Runtime monitoring, posture mgmt | Falco, CSPM |

### SAST vs DAST vs SCA vs IAST

- **SAST** — analyzes **source code** for flaws (white-box, early).
- **DAST** — tests the **running app** from outside (black-box).
- **SCA** — finds vulnerable **third-party dependencies**.
- **IAST** — instruments the app during testing (hybrid).

Use them together — each catches what the others miss.

## Software Supply-Chain Security

Modern apps are mostly third-party code. Attacks like **SolarWinds**, **Log4Shell**, and malicious npm packages target the supply chain.

Defenses:
- **SCA / dependency scanning** + automated updates.
- **SBOM** (Software Bill of Materials) — an inventory of every component, so you can instantly answer "are we affected by CVE-X?"
- **Pin and verify** dependencies; use lockfiles.
- **Sign artifacts** (Sigstore) and verify provenance (SLSA framework).
- Beware **typosquatting** and **dependency confusion** in package registries.

## Secrets Management

- **Never** commit secrets — scan commits and history.
- Use a **secrets manager / vault** (HashiCorp Vault, cloud secret stores).
- Inject secrets at **runtime**, not build time.
- **Rotate** regularly and on exposure; use short-lived, dynamic secrets where possible.

## Infrastructure as Code (IaC) Security

When infra is code (Terraform, CloudFormation), it can be **scanned before deployment**:

- Scan with **Checkov / tfsec / Terrascan** in CI.
- Enforce policy as code (OPA) — block insecure configs from ever deploying.
- Get the security benefits of code review and version control for your infrastructure.

## Culture

DevSecOps is as much culture as tooling: shared ownership, fast blameless feedback, and security as an enabler — guardrails, not gates.
`,
      },
      {
        title: "Secure SDLC & Threat Modeling",
        type: "TEXT",
        duration: 14,
        content: `# Secure SDLC & Threat Modeling

Building secure software starts long before code — at **design**. The Secure Software Development Lifecycle (SSDLC) embeds security in every phase.

## The SSDLC Phases

| Phase | Security activity |
|-------|-------------------|
| **Requirements** | Security & privacy requirements; abuse cases |
| **Design** | **Threat modeling**, secure architecture review |
| **Implementation** | Secure coding standards, SAST, secret scanning |
| **Verification** | DAST, pentest, code review, fuzzing |
| **Release** | Final review, signing, hardening |
| **Maintenance** | Patching, monitoring, incident response |

## Threat Modeling

A structured exercise to find design flaws **before** they're built. Four guiding questions (Shostack):

1. **What are we building?** (diagram the system & data flows)
2. **What can go wrong?** (enumerate threats)
3. **What are we going to do about it?** (mitigations)
4. **Did we do a good job?** (validate)

### STRIDE — A Threat Taxonomy

| Letter | Threat | Violates |
|--------|--------|----------|
| **S** | Spoofing | Authentication |
| **T** | Tampering | Integrity |
| **R** | Repudiation | Non-repudiation |
| **I** | Information disclosure | Confidentiality |
| **D** | Denial of service | Availability |
| **E** | Elevation of privilege | Authorization |

Walk each component and data flow against STRIDE to surface threats systematically.

## Trust Boundaries

A **trust boundary** is where data crosses between zones of differing trust (internet → app, app → database, user → admin). These crossings are exactly where validation and authorization must happen. Mark them on your data-flow diagram — they're where most vulnerabilities live.

## Secure Coding Principles

- **Validate all input**, encode all output (Chapter 5).
- **Fail securely** — default to deny.
- **Least privilege** for every component and credential.
- **Don't trust the client**; enforce on the server.
- **Defense in depth** — never rely on a single control.
- **Keep it simple** — complexity hides bugs.
- **Use safe, vetted libraries** — don't reinvent crypto/auth.

## Risk-Based Prioritization

You can't fix everything at once. Rank findings by **likelihood × impact**, fix the highest-risk first, and track the rest. Document accepted risks and revisit them.

## The Payoff

Security built in from design is cheaper, stronger, and faster to ship than security bolted on after a breach. Threat modeling is the highest-leverage security activity most teams skip — don't.
`,
      },
      {
        title: "Securing a CI/CD Pipeline — Demo",
        type: "VIDEO",
        duration: 15,
        content: "https://www.youtube.com/embed/nrhxNNH5lt0",
      },
      {
        title: "Chapter 9 — Cloud & DevSecOps Quiz",
        type: "QUIZ",
        duration: 12,
        quiz: {
          title: "Cloud, Container & DevSecOps Quiz",
          passMark: 70,
          timeLimit: 12,
          questions: [
            {
              text: "Under the cloud shared responsibility model, who is responsible for securing customer data and configuration?",
              options: [
                { text: "Always the cloud provider" },
                { text: "The customer", correct: true },
                { text: "No one — the cloud is automatically secure" },
                { text: "A third-party auditor" },
              ],
            },
            {
              text: "What is the most common cause of cloud data breaches?",
              options: [
                { text: "Provider hardware failure" },
                { text: "Customer misconfiguration (e.g., public buckets, over-permissive IAM)", correct: true },
                { text: "Quantum computing attacks" },
                { text: "Physical theft of servers" },
              ],
            },
            {
              text: "Which practice improves container image security?",
              options: [
                { text: "Always using the `:latest` tag" },
                { text: "Running containers as root for convenience" },
                { text: "Using minimal base images and scanning for vulnerabilities", correct: true },
                { text: "Embedding secrets directly in the image" },
              ],
            },
            {
              text: "What does SAST analyze?",
              options: [
                { text: "A running application from the outside" },
                { text: "Source code for vulnerabilities (static analysis)", correct: true },
                { text: "Network packet captures" },
                { text: "Only third-party licenses" },
              ],
            },
            {
              text: "What is an SBOM used for?",
              options: [
                { text: "Encrypting backups" },
                { text: "Inventorying software components to quickly assess exposure to new CVEs", correct: true },
                { text: "Load balancing traffic" },
                { text: "Managing user roles" },
              ],
            },
            {
              text: "In Kubernetes, why must etcd be protected and encrypted?",
              options: [
                { text: "It only stores logs" },
                { text: "It stores all cluster state and secrets — compromising it compromises the cluster", correct: true },
                { text: "It handles DNS only" },
                { text: "It is the load balancer" },
              ],
            },
            {
              text: "'Shifting security left' means…",
              options: [
                { text: "Moving security to the end of the lifecycle" },
                { text: "Integrating security earlier in development, where fixes are cheaper", correct: true },
                { text: "Disabling security in development" },
                { text: "Outsourcing all security" },
              ],
            },
          ],
        },
      },
    ],
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Chapter 10 — Governance, Risk, Compliance & Careers
// ───────────────────────────────────────────────────────────────────────────
function chapter10(): SeedModule {
  return {
    title: "Chapter 10 — Governance, Risk, Compliance & Careers",
    lessons: [
      {
        title: "Risk Management Fundamentals",
        type: "TEXT",
        duration: 16,
        content: `# Risk Management Fundamentals

Security exists to **manage risk** to acceptable levels — not to eliminate it (impossible) or to chase perfection (wasteful). Everything you've learned serves this goal.

## Core Vocabulary

| Term | Definition |
|------|------------|
| **Asset** | Something of value (data, system, reputation) |
| **Threat** | A potential cause of harm |
| **Vulnerability** | A weakness a threat can exploit |
| **Risk** | Likelihood × impact of a threat exploiting a vulnerability |
| **Control** | A safeguard that reduces risk |
| **Exposure** | Extent of potential loss |

\`\`\`
Risk = Likelihood × Impact
\`\`\`

A vulnerability with no threat, or a threat with no vulnerability, is low risk. Risk needs all the pieces.

## The Risk Management Process

\`\`\`
1. Identify assets & their value
2. Identify threats & vulnerabilities
3. Assess risk (likelihood × impact)
4. Treat risk
5. Monitor & review (continuous)
\`\`\`

## The Four Risk Treatment Options

| Option | Meaning | Example |
|--------|---------|---------|
| **Mitigate** | Reduce likelihood/impact | Add MFA, patch, encrypt |
| **Transfer** | Shift to another party | Cyber insurance, outsourcing |
| **Avoid** | Don't do the risky activity | Discontinue a risky feature |
| **Accept** | Acknowledge and live with it | Low-impact risk, documented sign-off |

> You **cannot** reduce risk to zero. The goal is to bring it within the organization's **risk appetite** at reasonable cost.

## Qualitative vs Quantitative Assessment

- **Qualitative** — ratings (High/Medium/Low), risk matrices. Fast, subjective.
- **Quantitative** — dollar figures:
  - **SLE** (Single Loss Expectancy) = Asset Value × Exposure Factor
  - **ALE** (Annualized Loss Expectancy) = SLE × ARO (Annual Rate of Occurrence)
  - Compare ALE to control cost to justify spending.

\`\`\`
If ALE = $200k/yr and a control costs $50k/yr to cut it to $20k,
the control saves ~$130k/yr — an easy justification.
\`\`\`

## Types of Controls

| By function | By type |
|-------------|---------|
| **Preventive** (firewall) | **Technical** (encryption) |
| **Detective** (IDS, SIEM) | **Administrative** (policies, training) |
| **Corrective** (backups, IR) | **Physical** (locks, cameras) |
| **Deterrent / Compensating** | |

A balanced program uses all functions and types — defense in depth applied to risk.

## Third-Party / Supply-Chain Risk

Your risk includes your vendors'. Assess third parties (questionnaires, SOC 2 reports, right-to-audit clauses) — a breach at a supplier (Chapter 9) can become **your** breach.
`,
      },
      {
        title: "Security Frameworks, Standards & Compliance",
        type: "TEXT",
        duration: 16,
        content: `# Security Frameworks, Standards & Compliance

Frameworks give you a **structured, proven** way to build a security program — so you're not reinventing the wheel. Compliance ensures you meet legal and contractual obligations.

## Frameworks vs Regulations

- **Frameworks/standards** — *how* to do security well (often voluntary or contractual).
- **Regulations/laws** — *what* you're legally required to do.

## Key Frameworks & Standards

| Name | Focus |
|------|-------|
| **NIST Cybersecurity Framework (CSF)** | Govern, Identify, Protect, Detect, Respond, Recover |
| **ISO/IEC 27001** | International standard for an ISMS (certifiable) |
| **NIST 800-53** | Detailed control catalog (US federal) |
| **CIS Controls** | Prioritized, practical "top 18" safeguards |
| **SOC 2** | Trust criteria audit (common for SaaS vendors) |
| **PCI DSS** | Payment card data security (contractual) |
| **MITRE ATT&CK** | Adversary behavior (detection, not compliance) |

### The NIST CSF Functions (worth memorizing)

\`\`\`
GOVERN   — set strategy, roles, risk decisions (added in CSF 2.0)
IDENTIFY — know your assets and risks
PROTECT  — safeguards
DETECT   — find events
RESPOND  — act on incidents
RECOVER  — restore and learn
\`\`\`

## Major Regulations

| Regulation | Scope |
|------------|-------|
| **GDPR** (EU) | Personal data; 72-hour breach notice; heavy fines |
| **HIPAA** (US) | Healthcare data (PHI) |
| **CCPA/CPRA** (California) | Consumer privacy |
| **PCI DSS** | Cardholder data (industry-mandated) |
| **SOX** | Financial reporting controls |
| **DPDP Act** (India) | Personal data protection |

> Many overlap. A solid ISO 27001 / NIST CSF program satisfies large portions of multiple regulations at once.

## Policies, Standards, Procedures & Guidelines

| Document | Role | Example |
|----------|------|---------|
| **Policy** | High-level intent (mandatory) | "All data must be encrypted" |
| **Standard** | Specific mandatory rule | "Use AES-256" |
| **Procedure** | Step-by-step how-to | "How to rotate a key" |
| **Guideline** | Recommended (optional) | "Prefer passphrases" |

## Audits & Assessments

- **Internal audit** — self-check against policy/framework.
- **External audit** — independent (e.g., SOC 2, ISO certification).
- **Gap analysis** — current state vs. target framework.
- **Evidence & continuous compliance** — auditors want proof controls *operate*, not just exist.

## The Point of Compliance

Compliance is a **floor, not a ceiling**. "Compliant" ≠ "secure" — many breached companies were compliant. Use frameworks to build genuine security; treat compliance as the minimum bar, not the goal.
`,
      },
      {
        title: "Security Awareness, Policy & the Human Factor",
        type: "TEXT",
        duration: 14,
        content: `# Security Awareness, Policy & the Human Factor

Technology alone never secures an organization. The majority of incidents involve a **human element** — error, manipulation, or misuse. Building a security culture is as important as any tool.

## Why People Matter Most

- Most breaches start with **phishing** or **stolen credentials** (Chapter 6).
- A single misconfiguration or careless click can bypass millions in security spend.
- Conversely, an alert, trained workforce is a powerful **detection layer** ("human sensors").

## Security Awareness Training That Works

- **Continuous, not annual** — short, frequent, relevant.
- **Role-based** — developers, finance, and execs face different threats.
- **Simulated phishing** — practice + measure, paired with **just-in-time** coaching (not punishment).
- **Make reporting easy and blameless** — a fast "Report Phish" button beats perfect prevention.
- **Measure** behavior change (report rates, click rates), not just completion.

## Key Policies Everyone Should Know

| Policy | Purpose |
|--------|---------|
| **Acceptable Use (AUP)** | Rules for using company systems |
| **Access Control** | Who gets access to what |
| **Data Classification & Handling** | How to label and protect data |
| **Password / Authentication** | Credential & MFA requirements |
| **Incident Response** | What to do when something goes wrong |
| **BYOD / Remote Work** | Securing personal & remote devices |
| **Clean Desk / Physical** | Protecting physical information |

## Physical Security (Often Overlooked)

Digital security fails if someone can walk in:

- **Access control** — badges, mantraps, visitor logs.
- **Tailgating** prevention — don't hold the door for strangers.
- **Device security** — lock screens, cable locks, full-disk encryption.
- **Media disposal** — shred documents, wipe/destroy drives.
- **Beware shoulder surfing** and unattended workstations.

## Insider Threats

Not all threats come from outside:

- **Malicious insiders** — disgruntled or bribed employees.
- **Negligent insiders** — well-meaning but careless (the most common).
- **Compromised insiders** — accounts taken over by attackers.

Defenses: least privilege, separation of duties, monitoring/UEBA, robust **offboarding** (revoke access immediately), and a healthy culture where people report concerns.

## Building a Security Culture

> Make security **easy to do right** and **hard to do wrong**. Security that fights users gets bypassed. Guardrails, good defaults, and a blameless, supportive tone turn the workforce from the weakest link into the first line of defense.
`,
      },
      {
        title: "Cybersecurity Careers, Certifications & Next Steps",
        type: "TEXT",
        duration: 16,
        content: `# Cybersecurity Careers, Certifications & Next Steps

You've built a broad foundation. Here's how to turn it into a career — and keep growing.

## Major Career Domains

| Domain | What you do |
|--------|-------------|
| **SOC Analyst / Blue Team** | Monitor, detect, respond (great entry point) |
| **Incident Response / Forensics** | Investigate and recover from breaches |
| **Penetration Tester / Red Team** | Authorized offensive testing |
| **GRC** | Governance, risk, compliance, audit |
| **Security Engineer** | Build and operate security controls |
| **AppSec / Product Security** | Secure software & SDLC |
| **Cloud Security** | Secure cloud environments |
| **Threat Intel** | Track and analyze adversaries |
| **Security Architect** | Design secure systems (senior) |

## Certifications by Stage

**Entry-level / foundational:**
- **CompTIA Security+** — the classic starting cert (broad fundamentals).
- **CompTIA Network+ / A+** — supporting IT knowledge.
- (ISC)² **CC** — Certified in Cybersecurity (free-ish, entry).

**Intermediate:**
- **CySA+** (analyst), **PenTest+**, **GIAC** (GSEC, GCIH, GCIA).
- **eJPT / PNPT** — practical pentesting.
- Cloud: **AWS/Azure Security** specialties.

**Advanced / management:**
- **CISSP** — the gold-standard broad cert (needs experience).
- **OSCP** — respected hands-on offensive cert.
- **CISM / CISA** — management & audit focused.

> Certs open doors, but **hands-on skill** keeps you in the room. Pair study with labs.

## Build Real Experience

1. **Home lab** — break and defend (legally, Chapter 1).
2. **Capture the Flag (CTF)** — picoCTF, Hack The Box, TryHackMe.
3. **Practice platforms** — PortSwigger Academy (web), Blue Team Labs, LetsDefend.
4. **Contribute** — open-source security tools, write-ups, a blog.
5. **Bug bounties** — within program scope, legally.
6. **Network** — local DEF CON/BSides/OWASP chapters, communities.

## A Suggested Learning Path

\`\`\`
Fundamentals (this course) →
Security+ →
Hands-on labs + a specialty (blue team / cloud / web) →
First role (often SOC/IT) →
Intermediate cert + deeper specialization →
Senior / architect / leadership
\`\`\`

## Staying Current — A Career-Long Habit

The field changes constantly. Build a routine:

- Follow CISA alerts, vendor blogs, and reputable researchers.
- Read breach post-mortems — learn from others' incidents.
- Keep a home lab; keep practicing.
- Engage with the community; teach what you learn.

## Final Word

Cybersecurity is a mission: protecting people, data, and trust in a connected world. You now understand the threat landscape, the core defenses, and how to detect and respond when prevention fails. Stay curious, stay ethical, and keep learning. The defenders never stop — and now, you're one of them. 🛡️
`,
      },
      {
        title: "Cybersecurity Career Roadmap — Overview",
        type: "VIDEO",
        duration: 14,
        content: "https://www.youtube.com/embed/bPCm1-29NEc",
      },
      {
        title: "Chapter 10 — GRC & Careers Quiz",
        type: "QUIZ",
        duration: 12,
        quiz: {
          title: "Governance, Risk & Careers Quiz",
          passMark: 70,
          timeLimit: 12,
          questions: [
            {
              text: "Risk is most commonly expressed as…",
              options: [
                { text: "Threat minus control" },
                { text: "Likelihood × Impact", correct: true },
                { text: "Asset value × number of users" },
                { text: "Vulnerabilities × patches" },
              ],
            },
            {
              text: "Buying cyber insurance is an example of which risk treatment?",
              options: [
                { text: "Mitigate" },
                { text: "Transfer", correct: true },
                { text: "Avoid" },
                { text: "Accept" },
              ],
            },
            {
              text: "Which are the core functions of the NIST Cybersecurity Framework (CSF 2.0)?",
              options: [
                { text: "Plan, Build, Run, Retire" },
                { text: "Govern, Identify, Protect, Detect, Respond, Recover", correct: true },
                { text: "Scan, Patch, Audit, Report" },
                { text: "Encrypt, Backup, Monitor, Restore" },
              ],
            },
            {
              text: "Why is 'compliant' not the same as 'secure'?",
              options: [
                { text: "Compliance always exceeds security needs" },
                { text: "Compliance is a minimum baseline; many compliant organizations are still breached", correct: true },
                { text: "Security is optional once compliant" },
                { text: "They are actually identical" },
              ],
            },
            {
              text: "Which document is a high-level mandatory statement of intent?",
              options: [
                { text: "Guideline" },
                { text: "Procedure" },
                { text: "Policy", correct: true },
                { text: "Memo" },
              ],
            },
            {
              text: "Which certification is most commonly recommended as an entry-level foundation?",
              options: [
                { text: "CISSP" },
                { text: "OSCP" },
                { text: "CompTIA Security+", correct: true },
                { text: "CISM" },
              ],
            },
            {
              text: "The most common type of insider threat is…",
              options: [
                { text: "The malicious insider" },
                { text: "The negligent (careless but well-meaning) insider", correct: true },
                { text: "The nation-state insider" },
                { text: "There is no such thing as an insider threat" },
              ],
            },
          ],
        },
      },
    ],
  };
}
