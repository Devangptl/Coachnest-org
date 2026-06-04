/**
 * Cybersecurity course seed data.
 *
 * Self-contained definition of the "Complete Cybersecurity Bootcamp"
 * course — chapters (sections), lessons with rich markdown content, and
 * end-of-chapter quizzes. Consumed by:
 *   - POST /api/admin/courses/seed-cybersecurity (admin button)
 *   - prisma/seed-cybersecurity-course.ts        (CLI: npm run db:seed:cybersecurity)
 *
 * Shape mirrors lib/nextjs-course-seed.ts for consistency.
 *
 * All content is defensive / educational: the goal is to teach engineers and
 * analysts how attacks work so they can build, detect, and defend — not to
 * provide operational offensive tooling.
 */

import { chaptersFiveToTen } from "./cybersecurity-course-seed-extra";

export interface SeedQuizQuestion {
  text: string;
  points?: number;
  options: { text: string; correct?: boolean }[];
}

export interface SeedQuiz {
  title: string;
  passMark?: number;
  timeLimit?: number;
  questions: SeedQuizQuestion[];
}

export interface SeedLesson {
  title: string;
  type: "TEXT" | "VIDEO" | "QUIZ";
  isFree?: boolean;
  duration?: number;
  description?: string;
  /** Markdown for TEXT lessons, embed URL for VIDEO lessons. */
  content?: string;
  quiz?: SeedQuiz;
}

export interface SeedModule {
  title: string;
  lessons: SeedLesson[];
}

export interface CybersecurityCourseSeed {
  course: {
    title: string;
    slug: string;
    description: string;
    shortDesc: string;
    thumbnail: string;
    previewVideo: string;
    level: string;
    language: string;
    price: number;
    discountPrice: number;
    isFree: boolean;
  };
  category: { name: string; slug: string; icon: string; color: string };
  tags: { name: string; slug: string }[];
  modules: SeedModule[];
}

export function buildOptions(items: Array<{ text: string; correct?: boolean }>) {
  return items.map((item, i) => ({
    id: String.fromCharCode(97 + i),
    text: item.text,
    isCorrect: item.correct ?? false,
  }));
}

const COURSE_META = {
  title: "Complete Cybersecurity Bootcamp: Defend, Detect & Respond",
  slug: "complete-cybersecurity-bootcamp",
  description:
    "A comprehensive, hands-on cybersecurity program that takes you from absolute fundamentals to job-ready blue-team skills. Master the CIA triad, networking and protocol security, applied cryptography, operating-system and endpoint hardening, web application security (OWASP Top 10), identity and access management, the modern threat landscape, security operations and incident response, cloud and DevSecOps security, and the governance, risk, and compliance frameworks that tie it all together. Built around real-world scenarios, defensive labs, and the SOC analyst workflow used in 2026.",
  shortDesc:
    "Go from zero to job-ready in cybersecurity: networks, crypto, web security, threat detection, incident response, cloud security, and GRC.",
  thumbnail:
    "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1200&auto=format",
  previewVideo: "https://www.youtube.com/embed/inWWhr5tnEA",
  level: "beginner",
  language: "English",
  price: 6999,
  discountPrice: 3999,
  isFree: false,
};

const COURSE_CATEGORY = {
  name: "Cybersecurity",
  slug: "cybersecurity",
  icon: "🛡️",
  color: "#16a34a",
};

const COURSE_TAGS = [
  { name: "Cybersecurity", slug: "cybersecurity" },
  { name: "Network Security", slug: "network-security" },
  { name: "Cryptography", slug: "cryptography" },
  { name: "Web Security", slug: "web-security" },
  { name: "Incident Response", slug: "incident-response" },
  { name: "Cloud Security", slug: "cloud-security" },
  { name: "Ethical Hacking", slug: "ethical-hacking" },
];

export function getCybersecurityCourseSeed(): CybersecurityCourseSeed {
  return {
    course: COURSE_META,
    category: COURSE_CATEGORY,
    tags: COURSE_TAGS,
    modules: buildCurriculum(),
  };
}

function buildCurriculum(): SeedModule[] {
  return [
    chapter1(),
    chapter2(),
    chapter3(),
    chapter4(),
    ...chaptersFiveToTen(),
  ];
}

// ───────────────────────────────────────────────────────────────────────────
// Chapter 1 — Foundations of Cybersecurity
// ───────────────────────────────────────────────────────────────────────────
function chapter1(): SeedModule {
  return {
    title: "Chapter 1 — Foundations of Cybersecurity",
    lessons: [
      {
        title: "What Is Cybersecurity & Why It Matters",
        type: "TEXT",
        duration: 14,
        isFree: true,
        description: "The mission of cybersecurity, the threat landscape, and the cost of getting it wrong.",
        content: `# What Is Cybersecurity & Why It Matters

Cybersecurity is the practice of protecting systems, networks, data, and people from digital attacks, unauthorized access, and disruption. It is equal parts **technology**, **process**, and **human behavior** — the strongest firewall in the world is undone by one employee clicking a malicious link.

## Why It Matters Now More Than Ever

- **Everything is connected.** Phones, cars, hospitals, power grids, and payment systems all run on software that can be attacked.
- **Attacks are industrialized.** Ransomware-as-a-service, phishing kits, and stolen-credential marketplaces mean attackers no longer need elite skills.
- **The cost is enormous.** The global average cost of a single data breach now exceeds **$4.8M**, and that excludes reputational damage and regulatory fines.

## The Three Goals: Confidentiality, Integrity, Availability

Every security control ultimately serves one of three goals — the **CIA triad** (covered in depth next lesson):

| Goal | Question it answers |
|------|---------------------|
| **Confidentiality** | Can only authorized people see this data? |
| **Integrity** | Has this data been tampered with? |
| **Availability** | Can authorized users access it when needed? |

## Offense vs. Defense

| Team | Color | Role |
|------|-------|------|
| Attackers / pentesters | 🔴 Red | Find and exploit weaknesses |
| Defenders / SOC analysts | 🔵 Blue | Detect, prevent, and respond |
| Collaboration of both | 🟣 Purple | Improve defenses using offensive insight |

This course is **blue-team focused** — you'll learn how attacks work *so you can defend against them*. Understanding offense is essential to good defense, but our objective is always protection.

## A Quick Reality Check

You don't need to be a math genius or a coding prodigy to start. You need:

1. Curiosity about how things work (and break).
2. Methodical, evidence-based thinking.
3. A willingness to keep learning — the field changes weekly.

## What You'll Build In This Course

By the end you'll be able to:

- Read and reason about network traffic and logs
- Harden a Linux and Windows endpoint
- Identify and remediate the OWASP Top 10 web vulnerabilities
- Triage a security alert and run an incident-response playbook
- Speak fluently about risk, compliance, and security architecture

Welcome to the field. Let's begin. 🛡️
`,
      },
      {
        title: "The CIA Triad & Core Security Principles",
        type: "TEXT",
        duration: 16,
        isFree: true,
        content: `# The CIA Triad & Core Security Principles

The **CIA triad** is the foundational model for thinking about security. Memorize it — every control you ever design maps back to it.

## Confidentiality

Keeping data secret from those who shouldn't see it.

- **Controls:** encryption, access control, data classification, MFA.
- **Threats:** eavesdropping, credential theft, insider leaks.

## Integrity

Ensuring data is accurate and unaltered.

- **Controls:** hashing, digital signatures, checksums, version control, immutable logs.
- **Threats:** tampering, man-in-the-middle modification, corrupted backups.

## Availability

Ensuring systems and data are accessible when needed.

- **Controls:** redundancy, backups, DDoS protection, load balancing, patching.
- **Threats:** ransomware, DDoS, hardware failure, misconfiguration.

> Often a fourth idea is added: **non-repudiation** — proof that an action genuinely came from a specific actor (via digital signatures and audit logs).

## Beyond the Triad: Principles That Guide Every Decision

### Defense in Depth
Layer controls so that a single failure doesn't lead to compromise. Network firewall + host firewall + endpoint detection + least privilege + monitoring — each layer buys time and visibility.

### Least Privilege
Give every user, process, and service the **minimum** access required to do its job — nothing more. The most over-granted permission is the one an attacker will abuse.

### Zero Trust
"Never trust, always verify." Assume the network is already breached. Authenticate and authorize **every** request, regardless of where it originates.

### Fail Securely
When a system errors, it should default to **denying** access, not granting it. A crashed auth service must not "fail open."

### Separation of Duties
No single person should control an entire critical process end-to-end. The developer who writes code shouldn't be the only one who approves and deploys it.

### Keep It Simple (Economy of Mechanism)
Complexity is the enemy of security. Every extra feature, port, and integration is more attack surface to defend.

## The AAA Model

| A | Meaning |
|---|---------|
| **Authentication** | Who are you? (prove identity) |
| **Authorization** | What are you allowed to do? |
| **Accounting** | What did you actually do? (logging/audit) |

Keep the triad and these principles in your head as a checklist. When evaluating any system, ask: *Which CIA goal does this protect, and which principle does it uphold?*
`,
      },
      {
        title: "Threat Actors, Motivations & the Attack Surface",
        type: "TEXT",
        duration: 14,
        content: `# Threat Actors, Motivations & the Attack Surface

To defend effectively, you must understand **who** is attacking and **why**.

## Categories of Threat Actors

| Actor | Motivation | Skill | Example |
|-------|-----------|-------|---------|
| **Script kiddies** | Curiosity, ego | Low | Running downloaded exploit tools |
| **Hacktivists** | Ideology, protest | Medium | Defacing a website, leaking data |
| **Cybercriminals** | Money | Medium–High | Ransomware, banking trojans, fraud |
| **Insiders** | Revenge, greed, negligence | Varies | Stealing data before quitting |
| **Nation-state / APTs** | Espionage, sabotage | Very High | Long-term stealthy intrusions |
| **Competitors** | Trade secrets | Varies | Industrial espionage |

## Advanced Persistent Threats (APTs)

APTs are well-funded, patient, and stealthy. They establish long-term footholds, move laterally, and exfiltrate data slowly to avoid detection. Defending against them requires **detection and response**, not just prevention.

## Understanding Attack Surface

Your **attack surface** is the sum of all points where an attacker could try to enter or extract data:

- **Digital:** open ports, web apps, APIs, cloud buckets, exposed credentials.
- **Physical:** unlocked server rooms, USB ports, lost laptops.
- **Human:** employees susceptible to phishing or pretexting (**social engineering**).

### Reducing Attack Surface

1. **Disable** unused services and close unused ports.
2. **Patch** known vulnerabilities promptly.
3. **Segment** networks so a breach in one zone doesn't reach another.
4. **Remove** default accounts and credentials.
5. **Train** people — the human layer is often the easiest target.

## The Attacker's Playbook (Cyber Kill Chain)

A classic model of how intrusions unfold:

1. **Reconnaissance** — gather info on the target.
2. **Weaponization** — build the malicious payload.
3. **Delivery** — email, USB, watering-hole site.
4. **Exploitation** — trigger the vulnerability.
5. **Installation** — establish persistence.
6. **Command & Control (C2)** — remote control channel.
7. **Actions on Objectives** — steal, encrypt, destroy.

Breaking **any** link in the chain stops the attack. As defenders, our job is to create detection and prevention opportunities at every stage.
`,
      },
      {
        title: "Setting Up a Safe, Legal Practice Lab",
        type: "TEXT",
        duration: 12,
        content: `# Setting Up a Safe, Legal Practice Lab

You must **never** practice security techniques against systems you don't own or have explicit written permission to test. Doing so is illegal in most jurisdictions. Instead, build an isolated home lab.

## The Golden Rule

> Only attack machines you own or are **explicitly authorized** to test (e.g., dedicated practice platforms). Unauthorized access is a crime under laws like the US **CFAA**, the UK **Computer Misuse Act**, and India's **IT Act**.

## A Minimal Home Lab

| Component | Purpose | Free option |
|-----------|---------|-------------|
| Hypervisor | Run isolated VMs | VirtualBox, VMware Player |
| Attacker VM | Tooling | Kali Linux, Parrot OS |
| Target VMs | Practice | Metasploitable, OWASP Juice Shop, DVWA |
| Host-only network | Keep traffic isolated | Built into hypervisor |

### Network Isolation Is Critical

Configure your lab on a **host-only** or **internal** network so vulnerable practice machines are never exposed to your real network or the internet. A deliberately vulnerable VM on your home Wi-Fi is an open door.

## Legal & Ethical Practice Platforms

These are designed and authorized for hands-on learning:

- **TryHackMe** and **Hack The Box** — guided, gamified labs.
- **OWASP Juice Shop / WebGoat** — intentionally vulnerable web apps.
- **PortSwigger Web Security Academy** — free, world-class web labs.
- **CTF competitions** (picoCTF, etc.) — capture-the-flag challenges.

## Snapshot Everything

Before each experiment, take a **VM snapshot**. If you break something or detonate malware, roll back in seconds. Never analyze live malware on your host OS.

## A Note on Mindset

Ethics is not optional in this field. The same knowledge that defends a hospital can harm one. Throughout this course we study offensive techniques **only** to build better defenses. Stay on the right side of the line — your career depends on it.
`,
      },
      {
        title: "Security Domains & Career Paths Overview",
        type: "VIDEO",
        duration: 15,
        content: "https://www.youtube.com/embed/inWWhr5tnEA",
      },
      {
        title: "Chapter 1 — Quiz",
        type: "QUIZ",
        duration: 10,
        quiz: {
          title: "Foundations Quiz",
          passMark: 70,
          timeLimit: 10,
          questions: [
            {
              text: "Which of these is NOT part of the CIA triad?",
              options: [
                { text: "Confidentiality" },
                { text: "Integrity" },
                { text: "Authentication", correct: true },
                { text: "Availability" },
              ],
            },
            {
              text: "What does the principle of 'least privilege' state?",
              options: [
                { text: "Give every user admin rights for convenience" },
                { text: "Grant the minimum access required to perform a job", correct: true },
                { text: "Privilege the least experienced employees first" },
                { text: "Disable all privileges by default for everyone" },
              ],
            },
            {
              text: "A ransomware attack that encrypts files and blocks access primarily violates which CIA goal?",
              options: [
                { text: "Confidentiality" },
                { text: "Integrity" },
                { text: "Availability", correct: true },
                { text: "Non-repudiation" },
              ],
            },
            {
              text: "Which threat actor type is best described as well-funded, patient, and stealthy?",
              options: [
                { text: "Script kiddie" },
                { text: "Advanced Persistent Threat (APT)", correct: true },
                { text: "Hacktivist" },
                { text: "Insider (negligent)" },
              ],
            },
            {
              text: "Why should you build your practice lab on a host-only/internal network?",
              options: [
                { text: "To make the VMs run faster" },
                { text: "To isolate vulnerable machines from your real network and the internet", correct: true },
                { text: "To bypass licensing restrictions" },
                { text: "It is required to install Kali Linux" },
              ],
            },
            {
              text: "'Never trust, always verify' is the core idea behind which model?",
              options: [
                { text: "Defense in depth" },
                { text: "Zero Trust", correct: true },
                { text: "Separation of duties" },
                { text: "Fail securely" },
              ],
            },
          ],
        },
      },
    ],
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Chapter 2 — Networking & Protocol Security
// ───────────────────────────────────────────────────────────────────────────
function chapter2(): SeedModule {
  return {
    title: "Chapter 2 — Networking & Protocol Security",
    lessons: [
      {
        title: "TCP/IP, the OSI Model & How Data Travels",
        type: "TEXT",
        duration: 18,
        content: `# TCP/IP, the OSI Model & How Data Travels

You cannot secure a network you don't understand. This lesson builds the mental model every defender relies on.

## The OSI Model (7 Layers)

| # | Layer | Job | Example |
|---|-------|-----|---------|
| 7 | Application | User-facing protocols | HTTP, DNS, SMTP |
| 6 | Presentation | Encoding, encryption | TLS, JPEG |
| 5 | Session | Connection management | RPC, sockets |
| 4 | Transport | End-to-end delivery | TCP, UDP |
| 3 | Network | Routing between networks | IP, ICMP |
| 2 | Data Link | Local delivery (MAC) | Ethernet, ARP |
| 1 | Physical | Bits on the wire | Cables, Wi-Fi radio |

> Mnemonic (top→bottom): **A**ll **P**eople **S**eem **T**o **N**eed **D**ata **P**rocessing.

Attacks happen at every layer — ARP spoofing (L2), IP spoofing (L3), SYN floods (L4), HTTP injection (L7). Knowing the layer tells you where to put the control.

## The TCP/IP Model (the practical one)

Real networks use the 4-layer TCP/IP model: **Link → Internet → Transport → Application**.

## TCP vs UDP

| | TCP | UDP |
|---|-----|-----|
| Connection | Connection-oriented (handshake) | Connectionless |
| Reliability | Guaranteed, ordered delivery | Best-effort |
| Speed | Slower (overhead) | Faster |
| Use | Web, email, file transfer | DNS, VoIP, gaming, streaming |

### The TCP Three-Way Handshake

\`\`\`
Client ──SYN──▶ Server
Client ◀─SYN/ACK── Server
Client ──ACK──▶ Server   (connection established)
\`\`\`

Attackers abuse this: a **SYN flood** sends thousands of SYNs without completing the handshake, exhausting server resources (a DoS technique).

## IP Addressing & Ports

- **IPv4:** \`192.168.1.10\` (32-bit). **IPv6:** \`2001:db8::1\` (128-bit).
- **Private ranges** (RFC 1918): \`10.0.0.0/8\`, \`172.16.0.0/12\`, \`192.168.0.0/16\`.
- **Ports** (0–65535) identify services. Well-known: 22 SSH, 53 DNS, 80 HTTP, 443 HTTPS, 3389 RDP.

## Why This Matters For Security

When you read a firewall rule, a packet capture, or an IDS alert, you're navigating these layers and fields. A log line like \`SRC=203.0.113.5 DST=10.0.0.20 PROTO=TCP DPT=22\` tells you someone from the internet is hitting your SSH port — and now you know exactly what to investigate.
`,
      },
      {
        title: "Common Protocols & Their Weaknesses",
        type: "TEXT",
        duration: 16,
        content: `# Common Protocols & Their Weaknesses

Many foundational internet protocols were designed in an era of implicit trust. Knowing their weaknesses tells you what to monitor and where to add encryption.

## Cleartext vs. Encrypted Equivalents

| Insecure | Port | Problem | Secure replacement | Port |
|----------|------|---------|--------------------|------|
| HTTP | 80 | Cleartext | HTTPS (TLS) | 443 |
| FTP | 21 | Cleartext creds | SFTP / FTPS | 22 / 990 |
| Telnet | 23 | Cleartext | SSH | 22 |
| SMTP | 25 | Cleartext | SMTP + STARTTLS | 587 |
| LDAP | 389 | Cleartext | LDAPS | 636 |
| SNMP v1/v2 | 161 | Weak community strings | SNMP v3 | 161 |

**Rule of thumb:** if a protocol sends credentials or data in cleartext, anyone on the path (a malicious Wi-Fi hotspot, a compromised router) can read it.

## DNS — The Internet's Phone Book

DNS resolves names (\`example.com\`) to IPs. Because classic DNS is unauthenticated and unencrypted, it's a frequent target:

- **DNS spoofing / cache poisoning** — forge responses to redirect victims.
- **DNS tunneling** — smuggle data out through DNS queries (a stealthy exfil channel).
- **Defenses:** DNSSEC (authenticity), DNS over HTTPS/TLS (DoH/DoT), and monitoring for abnormal query volumes.

## ARP — Trust on the Local Network

ARP maps IP addresses to MAC addresses on a LAN. It has **no authentication**, enabling **ARP spoofing**: an attacker claims to be the gateway and intercepts local traffic (a man-in-the-middle position). Defenses include **dynamic ARP inspection** and **static ARP entries** on critical hosts.

## DHCP

Hands out IP configuration. A **rogue DHCP server** can point victims at a malicious DNS or gateway. Defend with **DHCP snooping** on managed switches.

## ICMP

The protocol behind \`ping\` and \`traceroute\`. Useful for diagnostics, but also for reconnaissance (host discovery) and covert channels. Rate-limit and monitor rather than blanket-block — total ICMP blocking breaks legitimate troubleshooting.

## Takeaway

For every protocol on your network, ask:

1. Does it encrypt data in transit?
2. Does it authenticate both parties?
3. Is there a secure alternative I should mandate?

Most "easy wins" in network security come from retiring cleartext protocols.
`,
      },
      {
        title: "Firewalls, IDS/IPS & Network Segmentation",
        type: "TEXT",
        duration: 16,
        content: `# Firewalls, IDS/IPS & Network Segmentation

These are the workhorses of network defense. Each addresses a different question.

## Firewalls — Controlling What Connects

A firewall enforces rules about which traffic may pass.

| Type | Operates at | Inspects |
|------|-------------|----------|
| **Packet filter** | L3/L4 | IPs, ports, protocol |
| **Stateful** | L3/L4 | Tracks connection state |
| **Next-Gen (NGFW)** | L3–L7 | App awareness, IPS, TLS inspection |
| **WAF** | L7 | HTTP requests (web-specific) |

### Default-Deny

The single most important firewall principle: **deny everything, then explicitly allow only what's needed.** A default-allow posture means every new threat is permitted until you notice it.

\`\`\`
# Conceptual ruleset
ALLOW tcp any -> web-server:443
ALLOW tcp web-server -> db-server:5432
DENY  all                       # implicit final rule
\`\`\`

## IDS vs IPS

| | IDS (Detection) | IPS (Prevention) |
|---|-----------------|------------------|
| Action | Alerts | Alerts **and blocks** |
| Placement | Out-of-band (tap) | Inline |
| Risk | Misses fast attacks | False positive can block legit traffic |

### Detection Methods

- **Signature-based** — matches known attack patterns. Great for known threats, blind to novel ones.
- **Anomaly-based** — flags deviations from a learned baseline. Catches unknowns, but noisier.

Popular tools: **Snort**, **Suricata**, **Zeek**.

## Network Segmentation

Divide the network into zones so a breach in one can't freely reach others.

\`\`\`
   Internet
      │
   [ Firewall ]
      │
 ┌────┴─────┐
 │   DMZ    │  ← public web/email servers
 └────┬─────┘
   [ Firewall ]
      │
 ┌────┴─────────┐
 │ Internal LAN │  ← workstations
 └────┬─────────┘
   [ Firewall ]
      │
 ┌────┴───────┐
 │  Database  │  ← most sensitive, most isolated
 └────────────┘
\`\`\`

- **DMZ (demilitarized zone):** hosts that must be reachable from the internet, isolated from the internal network.
- **Microsegmentation:** fine-grained, per-workload policies (common in cloud and zero-trust designs).
- **VLANs:** logical segmentation at L2.

### Why It Works

Segmentation limits **blast radius** and **lateral movement**. When an attacker compromises a workstation, segmentation forces them to cross another guarded boundary to reach the crown jewels — creating detection opportunities along the way.
`,
      },
      {
        title: "VPNs, TLS in Transit & Secure Remote Access",
        type: "TEXT",
        duration: 14,
        content: `# VPNs, TLS in Transit & Secure Remote Access

Protecting data **in transit** is non-negotiable on untrusted networks (the internet, public Wi-Fi).

## TLS — Transport Layer Security

TLS (the "S" in HTTPS) provides:

1. **Confidentiality** — traffic is encrypted.
2. **Integrity** — tampering is detected.
3. **Authentication** — the server proves its identity via a certificate.

### The TLS Handshake (simplified)

1. Client says hello, lists supported ciphers.
2. Server presents its **certificate** (signed by a trusted CA).
3. Client verifies the cert chain.
4. Both derive a shared **session key** (using ephemeral Diffie-Hellman for forward secrecy).
5. Encrypted communication begins.

> Always prefer **TLS 1.3**. Disable SSLv3, TLS 1.0/1.1 — they have known weaknesses.

## VPNs — Virtual Private Networks

A VPN creates an encrypted tunnel across an untrusted network.

| Type | Use case |
|------|----------|
| **Remote-access VPN** | Employee → corporate network |
| **Site-to-site VPN** | Branch office → HQ |

Common protocols: **IPsec** (network-layer) and **WireGuard** / **OpenVPN** (modern, fast).

### VPN ≠ Anonymity

A VPN protects data in transit and hides traffic from local eavesdroppers, but the VPN provider can see your traffic. It is a confidentiality tool, not an invisibility cloak.

## The Shift Toward Zero Trust Network Access (ZTNA)

Traditional VPNs grant broad network access once connected — a flat, over-trusting model. **ZTNA** instead grants access to **specific applications**, re-verifying identity and device posture on every request. This drastically limits what a stolen VPN credential can reach.

## Practical Checklist

- [ ] Enforce HTTPS everywhere (HSTS header, redirect HTTP→HTTPS).
- [ ] Use TLS 1.3; disable legacy versions and weak ciphers.
- [ ] Require VPN or ZTNA for all remote administrative access.
- [ ] Never expose RDP (3389) or SSH (22) directly to the internet — gate behind a VPN/bastion.
- [ ] Rotate and protect certificates; monitor expiry.
`,
      },
      {
        title: "Reading Network Traffic with Wireshark",
        type: "VIDEO",
        duration: 17,
        content: "https://www.youtube.com/embed/TkCSr30UojM",
      },
      {
        title: "Chapter 2 — Networking Quiz",
        type: "QUIZ",
        duration: 12,
        quiz: {
          title: "Networking & Protocol Security Quiz",
          passMark: 70,
          timeLimit: 12,
          questions: [
            {
              text: "Which transport protocol uses a three-way handshake to establish a connection?",
              options: [
                { text: "UDP" },
                { text: "TCP", correct: true },
                { text: "ICMP" },
                { text: "ARP" },
              ],
            },
            {
              text: "Telnet's biggest security weakness is that it…",
              options: [
                { text: "Uses too much bandwidth" },
                { text: "Transmits credentials and data in cleartext", correct: true },
                { text: "Requires a certificate authority" },
                { text: "Only works over IPv6" },
              ],
            },
            {
              text: "What is the most important default posture for a firewall ruleset?",
              options: [
                { text: "Default-allow, then block known threats" },
                { text: "Default-deny, then explicitly allow needed traffic", correct: true },
                { text: "Allow all internal traffic unconditionally" },
                { text: "Block all traffic including return packets" },
              ],
            },
            {
              text: "What is the key difference between an IDS and an IPS?",
              options: [
                { text: "An IDS encrypts traffic; an IPS does not" },
                { text: "An IPS can actively block traffic, while an IDS only alerts", correct: true },
                { text: "An IDS works at L7; an IPS only at L3" },
                { text: "There is no difference" },
              ],
            },
            {
              text: "ARP spoofing is possible primarily because ARP…",
              options: [
                { text: "Is encrypted by default" },
                { text: "Has no authentication of responses", correct: true },
                { text: "Only runs over TCP" },
                { text: "Requires DNSSEC" },
              ],
            },
            {
              text: "Why place public-facing web servers in a DMZ?",
              options: [
                { text: "To give them faster internet speeds" },
                { text: "To isolate them from the internal network, limiting breach impact", correct: true },
                { text: "Because DMZ servers don't need patching" },
                { text: "To avoid using TLS certificates" },
              ],
            },
            {
              text: "Which TLS version should be preferred for new deployments?",
              options: [
                { text: "SSL 3.0" },
                { text: "TLS 1.0" },
                { text: "TLS 1.1" },
                { text: "TLS 1.3", correct: true },
              ],
            },
          ],
        },
      },
    ],
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Chapter 3 — Cryptography Essentials
// ───────────────────────────────────────────────────────────────────────────
function chapter3(): SeedModule {
  return {
    title: "Chapter 3 — Cryptography Essentials",
    lessons: [
      {
        title: "Symmetric vs Asymmetric Encryption",
        type: "TEXT",
        duration: 16,
        content: `# Symmetric vs Asymmetric Encryption

Cryptography is the mathematical foundation of confidentiality and integrity. You don't need to invent algorithms — you need to know **which tool to use and how to use it correctly**.

## Symmetric Encryption — One Shared Key

The same key encrypts and decrypts.

- **Fast** — ideal for bulk data.
- **Challenge:** securely sharing the key with the other party.
- **Algorithm to know:** **AES** (Advanced Encryption Standard), typically AES-256.

\`\`\`
Plaintext ──[ AES + key K ]──▶ Ciphertext
Ciphertext ──[ AES + key K ]──▶ Plaintext
\`\`\`

> Avoid **DES** and **3DES** (too weak/slow) and never use **ECB mode** — it leaks patterns. Prefer authenticated modes like **AES-GCM**.

## Asymmetric Encryption — A Key Pair

Each party has a **public key** (shareable) and a **private key** (secret).

- Encrypt with the **public** key → only the matching **private** key can decrypt.
- Sign with the **private** key → anyone can verify with the **public** key.
- **Slower** — used for small data and key exchange, not bulk encryption.
- **Algorithms to know:** **RSA**, **ECC** (elliptic curve — smaller keys, same strength).

## The Best of Both: Hybrid Encryption

This is how HTTPS actually works:

1. Use **asymmetric** crypto to securely exchange a random **session key**.
2. Use that **symmetric** session key (fast) to encrypt the actual data.

You get the key-distribution benefit of asymmetric crypto and the speed of symmetric crypto.

## Key Length & Strength

| Algorithm | Recommended minimum |
|-----------|---------------------|
| AES | 256-bit |
| RSA | 3072-bit (2048 acceptable short-term) |
| ECC | 256-bit (≈ RSA 3072) |

## The Cardinal Rule

> **Don't roll your own crypto.** Use well-reviewed libraries (libsodium, the platform's crypto API) and vetted standards. Homegrown encryption is almost always broken — the failures are subtle and catastrophic.

## Looking Ahead: Post-Quantum

Large quantum computers could one day break RSA and ECC. **Post-quantum cryptography** (e.g., NIST's ML-KEM / Kyber) is being standardized now. You don't need to deploy it today, but know the term — "crypto-agility" (the ability to swap algorithms) is becoming a design requirement.
`,
      },
      {
        title: "Hashing, Salting & Password Storage",
        type: "TEXT",
        duration: 16,
        content: `# Hashing, Salting & Password Storage

Hashing is **one-way**: easy to compute, infeasible to reverse. It powers integrity checks and password storage.

## What Makes a Good Hash Function

- **Deterministic** — same input → same output.
- **Fast to compute** (for integrity) but **one-way**.
- **Avalanche effect** — a 1-bit change flips ~half the output.
- **Collision-resistant** — hard to find two inputs with the same hash.

| Algorithm | Status |
|-----------|--------|
| MD5 | ❌ Broken — collisions trivial |
| SHA-1 | ❌ Broken — deprecated |
| SHA-256 / SHA-3 | ✅ Use for integrity |

## Hashing for Integrity

Publish a file's SHA-256 hash; recipients recompute it to verify the download wasn't tampered with.

\`\`\`bash
sha256sum installer.iso
# compare against the vendor's published hash
\`\`\`

## Password Storage — The Right Way

**Never** store passwords in plaintext, and **never** use a fast hash (SHA-256) alone for passwords — attackers can compute billions per second.

### Use a Slow, Salted Password Hash

| Function | Notes |
|----------|-------|
| **bcrypt** | Battle-tested, tunable cost |
| **scrypt** | Memory-hard |
| **Argon2id** | Modern winner — memory + time hard |

These are **deliberately slow** and **memory-intensive** to thwart brute force.

### Salt

A **salt** is a unique random value added to each password before hashing.

\`\`\`
hash = Argon2id(password + unique_salt)
\`\`\`

- Defeats **rainbow tables** (precomputed hash lookups).
- Ensures two users with the same password get **different** hashes.
- The salt is stored alongside the hash (it need not be secret).

### Pepper (optional extra)

A **pepper** is a secret value (stored separately, e.g., in an HSM/env var) added to all passwords — so a database-only leak still can't be cracked offline.

## Comparing Securely

When verifying, use **constant-time comparison** to avoid timing attacks. Most password libraries handle this for you — another reason not to roll your own.

## HMAC — Keyed Hashing for Authenticity

An **HMAC** combines a hash with a secret key to verify both **integrity and authenticity** of a message (e.g., webhook signature verification):

\`\`\`
HMAC-SHA256(key, message) → signature
\`\`\`

The receiver recomputes the HMAC with the shared key; a match proves the message is authentic and unaltered.
`,
      },
      {
        title: "Digital Signatures, Certificates & PKI",
        type: "TEXT",
        duration: 16,
        content: `# Digital Signatures, Certificates & PKI

How do you trust that a public key really belongs to who it claims? Enter **PKI** — Public Key Infrastructure.

## Digital Signatures

A digital signature provides **authentication**, **integrity**, and **non-repudiation**.

\`\`\`
Sign:   signature = encrypt(hash(message), PRIVATE key)
Verify: hash(message) == decrypt(signature, PUBLIC key)
\`\`\`

- Only the holder of the private key could have produced the signature.
- Any change to the message breaks verification.
- The signer cannot later deny signing (**non-repudiation**).

## Certificates

A **digital certificate** (X.509) binds a public key to an identity (e.g., a domain name) and is signed by a trusted **Certificate Authority (CA)**.

A certificate contains:
- Subject (who it's for, e.g., \`example.com\`)
- Public key
- Issuer (the CA)
- Validity period
- The CA's digital signature

## The Chain of Trust

\`\`\`
Root CA  (self-signed, in your OS/browser trust store)
   │ signs
Intermediate CA
   │ signs
Server certificate  (example.com)
\`\`\`

Your browser trusts the root CA out of the box. Because trust flows down the chain, it can verify \`example.com\` without ever having seen it before. If any link fails verification, you get a certificate warning.

## Certificate Lifecycle

| Stage | What happens |
|-------|--------------|
| **CSR** | You generate a key pair and a Certificate Signing Request |
| **Validation** | CA verifies you control the domain |
| **Issuance** | CA signs and issues the cert |
| **Renewal** | Certs expire (often 90 days); automate renewal |
| **Revocation** | Compromised certs revoked via CRL / OCSP |

> **Let's Encrypt** + tools like **certbot** make TLS certificates free and automatable. There's no excuse for plain HTTP today.

## Common Real-World Failures

1. **Expired certificates** — causes outages; monitor expiry.
2. **Self-signed certs in production** — users get trained to click through warnings (dangerous).
3. **Weak key storage** — a leaked private key compromises everything it protects.
4. **Mixed content** — HTTPS page loading HTTP resources breaks the security guarantee.

## Mutual TLS (mTLS)

In high-security and zero-trust environments, **both** client and server present certificates — strong, mutual authentication used heavily between microservices.
`,
      },
      {
        title: "Crypto in Practice & Common Mistakes",
        type: "TEXT",
        duration: 14,
        content: `# Crypto in Practice & Common Mistakes

Most cryptographic failures aren't broken algorithms — they're **misuse**. Here are the mistakes you'll actually encounter.

## Top Cryptographic Mistakes

### 1. Rolling Your Own
Custom encryption schemes are nearly always broken. Use vetted libraries.

### 2. Hardcoded / Committed Secrets
API keys and private keys in source code or Git history are a leading breach cause.

\`\`\`bash
# Scan your repo and history for secrets
git log -p | grep -i "api_key\\|secret\\|password"   # quick smell test
# Better: use automated scanners (gitleaks, trufflehog) in CI
\`\`\`

> If a secret is ever committed, **rotate it** — removing it from history isn't enough; assume it's compromised.

### 3. Weak Randomness
Using \`Math.random()\` or a predictable seed for keys, tokens, or IVs. Always use a **cryptographically secure** RNG (\`crypto.randomBytes\`, \`/dev/urandom\`, \`secrets\` module).

### 4. Reusing IVs / Nonces
In modes like AES-GCM, reusing a nonce with the same key is catastrophic — it can leak the key stream. Generate a fresh random nonce per message.

### 5. ECB Mode
Encrypts identical plaintext blocks to identical ciphertext — patterns leak. Use authenticated modes (GCM, ChaCha20-Poly1305).

### 6. Not Authenticating Ciphertext
Encryption alone doesn't prevent tampering. Use **authenticated encryption (AEAD)** so modified ciphertext is rejected.

## Data States — Encrypt All Three

| State | Protection |
|-------|------------|
| **In transit** | TLS 1.3 |
| **At rest** | Disk/database encryption (AES-256), KMS-managed keys |
| **In use** | Hardest; emerging confidential-computing / enclaves |

## Key Management Is Everything

The hardest part of crypto isn't encrypting — it's **managing keys**:

- Store keys in a **KMS** or **HSM**, never next to the data they protect.
- Enforce **least privilege** on key access and log every use.
- **Rotate** keys on a schedule and after any suspected exposure.
- Separate **key-encryption keys** from **data-encryption keys** (envelope encryption).

## Practical Checklist

- [ ] TLS 1.3 in transit, AES-256 at rest.
- [ ] Passwords hashed with Argon2id/bcrypt + unique salt.
- [ ] Secrets in a vault/KMS, never in code.
- [ ] CSPRNG for all keys, tokens, IVs.
- [ ] Authenticated encryption (AEAD) everywhere.
- [ ] Automated cert renewal and secret scanning in CI.
`,
      },
      {
        title: "How HTTPS & TLS Work — Visual Walkthrough",
        type: "VIDEO",
        duration: 15,
        content: "https://www.youtube.com/embed/0TLDTodL7Lc",
      },
      {
        title: "Chapter 3 — Cryptography Quiz",
        type: "QUIZ",
        duration: 12,
        quiz: {
          title: "Cryptography Essentials Quiz",
          passMark: 70,
          timeLimit: 12,
          questions: [
            {
              text: "In asymmetric encryption, which key do you use to encrypt a message so only the recipient can read it?",
              options: [
                { text: "The recipient's public key", correct: true },
                { text: "The recipient's private key" },
                { text: "Your own private key" },
                { text: "A shared symmetric key" },
              ],
            },
            {
              text: "Why is a unique salt added before hashing passwords?",
              options: [
                { text: "To make hashing faster" },
                { text: "To defeat rainbow tables and ensure identical passwords get different hashes", correct: true },
                { text: "To encrypt the password reversibly" },
                { text: "To compress the password" },
              ],
            },
            {
              text: "Which function is appropriate for storing user passwords?",
              options: [
                { text: "MD5" },
                { text: "SHA-256 (single pass)" },
                { text: "Argon2id", correct: true },
                { text: "Base64 encoding" },
              ],
            },
            {
              text: "What does a digital signature provide that plain encryption does not?",
              options: [
                { text: "Faster performance" },
                { text: "Non-repudiation and authentication of the sender", correct: true },
                { text: "Smaller ciphertext" },
                { text: "Key exchange" },
              ],
            },
            {
              text: "In a PKI chain of trust, what does a browser ultimately rely on to trust a server certificate?",
              options: [
                { text: "The server's IP address" },
                { text: "A trusted Root CA in its trust store", correct: true },
                { text: "The certificate's expiry date alone" },
                { text: "The DNS record" },
              ],
            },
            {
              text: "Which is a common, dangerous cryptographic mistake?",
              options: [
                { text: "Using AES-256 in GCM mode" },
                { text: "Reusing a nonce/IV with the same key", correct: true },
                { text: "Using a CSPRNG to generate keys" },
                { text: "Storing keys in a KMS" },
              ],
            },
            {
              text: "HTTPS achieves both speed and secure key distribution by using…",
              options: [
                { text: "Only symmetric encryption" },
                { text: "Only asymmetric encryption" },
                { text: "Hybrid encryption: asymmetric to exchange a symmetric session key", correct: true },
                { text: "Plaintext with a checksum" },
              ],
            },
          ],
        },
      },
    ],
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Chapter 4 — Operating System & Endpoint Security
// ───────────────────────────────────────────────────────────────────────────
function chapter4(): SeedModule {
  return {
    title: "Chapter 4 — Operating System & Endpoint Security",
    lessons: [
      {
        title: "Linux Security Fundamentals & Hardening",
        type: "TEXT",
        duration: 18,
        content: `# Linux Security Fundamentals & Hardening

Most servers run Linux. Securing them is a core blue-team skill.

## The Permission Model

Linux permissions are **user / group / other**, each with **read (r) / write (w) / execute (x)**:

\`\`\`bash
$ ls -l secret.txt
-rw-r----- 1 alice finance 1024 Jun 4 10:00 secret.txt
#  └┬┘└┬┘└┬┘
#  user grp other
\`\`\`

- \`chmod 640 secret.txt\` → owner rw, group r, others nothing.
- \`chown alice:finance secret.txt\` → set owner/group.

### The Danger of 777

\`chmod 777\` grants everyone full control — a frequent and serious misconfiguration. Grant the **least** permission that works.

## Users, sudo & Root

- The **root** account (UID 0) is all-powerful — don't log in as root directly.
- Use **sudo** for privilege escalation with an audit trail (\`/var/log/auth.log\`).
- Follow least privilege: scope sudo rules in \`/etc/sudoers\` to specific commands.

## Hardening Checklist

1. **Patch regularly** — \`apt upgrade\` / \`dnf update\`; automate security updates.
2. **Disable unused services** — \`systemctl disable --now <svc>\`; smaller attack surface.
3. **SSH hardening:**
   - Disable root login (\`PermitRootLogin no\`).
   - **Key-based auth only** (\`PasswordAuthentication no\`).
   - Change/limit access; use \`fail2ban\` to throttle brute force.
4. **Host firewall** — \`ufw\` / \`firewalld\` with default-deny inbound.
5. **Mandatory Access Control** — enable **SELinux** or **AppArmor** to confine processes beyond standard permissions.
6. **File integrity monitoring** — **AIDE** or **Tripwire** to detect unexpected changes.
7. **Auditing** — enable \`auditd\` to log security-relevant events.

## Key Files to Know

| File | Purpose |
|------|---------|
| \`/etc/passwd\` | User accounts (no passwords here) |
| \`/etc/shadow\` | Hashed passwords (root-only) |
| \`/etc/sudoers\` | Who can sudo what |
| \`/var/log/auth.log\` | Authentication events |
| \`~/.ssh/authorized_keys\` | Permitted SSH public keys |

## SUID/SGID — A Privilege-Escalation Hotspot

Files with the **SUID** bit run with the file owner's privileges. A misconfigured SUID-root binary is a classic local privilege-escalation path. Audit them:

\`\`\`bash
find / -perm -4000 -type f 2>/dev/null   # list SUID binaries
\`\`\`

## The Principle in Action

A hardened Linux box does the minimum: minimal packages, minimal open ports, minimal privileges, maximal logging. Every service you don't run is a vulnerability you don't have.
`,
      },
      {
        title: "Windows Security & Active Directory Basics",
        type: "TEXT",
        duration: 16,
        content: `# Windows Security & Active Directory Basics

Enterprises run on Windows and **Active Directory (AD)** — and attackers know it. AD is the most common target for lateral movement and privilege escalation.

## Windows Accounts & Privileges

- **Local accounts** vs **domain accounts**.
- **Administrator** group = full control. Limit membership.
- **UAC (User Account Control)** prompts for elevation — don't disable it.
- Run daily work as a **standard user**, elevate only when needed.

## Active Directory Essentials

AD is a centralized directory for authentication and authorization across a Windows **domain**.

| Term | Meaning |
|------|---------|
| **Domain Controller (DC)** | Server hosting AD; authenticates users |
| **Domain** | Administrative boundary |
| **OU (Organizational Unit)** | Container for grouping objects |
| **GPO (Group Policy Object)** | Centrally enforce settings/security |
| **Kerberos** | Default authentication protocol |

## Group Policy — Security at Scale

GPOs let you enforce, across thousands of machines:

- Password and lockout policies
- Disable legacy protocols (SMBv1, NTLMv1)
- Application allow-listing (AppLocker / WDAC)
- Audit logging configuration

## Common AD Attack Concepts (Defensive Awareness)

Understanding these helps you detect and prevent them:

- **Pass-the-Hash** — reusing a stolen NTLM hash without the password. Mitigate with Credential Guard, LAPS, and limiting admin logons.
- **Kerberoasting** — requesting service tickets to crack service-account passwords offline. Mitigate with long, random service-account passwords and gMSAs.
- **Golden Ticket** — forging Kerberos tickets after compromising the \`krbtgt\` account. Mitigate by protecting DCs and rotating \`krbtgt\`.
- **Lateral movement** via admin shares and RDP. Mitigate with network segmentation and tiered admin models.

## Tiered Administration Model

A best practice: separate admin accounts into **tiers** so a compromised workstation admin can't reach domain controllers:

\`\`\`
Tier 0 — Domain Controllers, identity systems  (most protected)
Tier 1 — Servers, applications
Tier 2 — Workstations
\`\`\`

Admins never use Tier 0 credentials on Tier 2 machines, breaking the lateral-movement path.

## Endpoint Logging

Key Windows logs for defenders:

- **Security log** — logons (Event ID 4624/4625), privilege use.
- **Sysmon** — rich process/network/registry telemetry (install it everywhere).
- Forward logs to a **SIEM** (Chapter 8) for correlation.
`,
      },
      {
        title: "Endpoint Protection: Antivirus, EDR & Application Control",
        type: "TEXT",
        duration: 14,
        content: `# Endpoint Protection: Antivirus, EDR & Application Control

Endpoints (laptops, servers, phones) are where users — and attackers — operate. Modern endpoint defense goes far beyond classic antivirus.

## The Evolution

| Generation | Tech | Detects |
|------------|------|---------|
| 1 | Signature antivirus | Known malware (by hash/pattern) |
| 2 | Next-gen AV (NGAV) | Behavior, heuristics, ML |
| 3 | **EDR** | Behavior + records telemetry for investigation & response |
| 4 | **XDR** | Correlates across endpoint, network, cloud, identity |

## Antivirus / NGAV

- **Signature-based:** matches known-bad. Fast but blind to new malware.
- **Heuristic/behavioral:** flags suspicious actions (e.g., a Word doc spawning PowerShell).
- Keep definitions and the engine updated.

## EDR — Endpoint Detection & Response

EDR continuously records endpoint activity (processes, network, file, registry) and enables:

- **Detection** of suspicious behavior chains.
- **Investigation** — analysts can trace exactly what happened.
- **Response** — isolate a host, kill a process, roll back changes remotely.

EDR is the backbone of modern incident response. Examples: Microsoft Defender for Endpoint, CrowdStrike, SentinelOne.

## Application Control / Allow-Listing

Instead of blocking known-bad, **only allow known-good** software to run.

- **AppLocker / WDAC** (Windows), **fapolicyd** (Linux).
- Extremely effective against unknown malware and "living off the land."
- Harder to maintain — requires cataloging legitimate apps.

## Living Off the Land (LOLBins)

Attackers increasingly use **built-in, trusted tools** — PowerShell, \`certutil\`, \`wmic\`, \`mshta\` — to avoid dropping detectable malware. Defenses:

- Constrained-language mode and script-block logging for PowerShell.
- Behavioral detection (why is \`certutil\` downloading a file?).
- Application control to restrict abused binaries.

## Patch & Configuration Management

Most breaches exploit **known** vulnerabilities with available patches:

- Maintain an **asset inventory** — you can't protect what you don't know exists.
- **Vulnerability scanning** (Nessus, OpenVAS, Qualys) on a schedule.
- **Prioritize** by exploitability and exposure, not just CVSS score.
- Test patches, then deploy promptly — especially internet-facing systems.

## Defense-in-Depth on the Endpoint

\`\`\`
Patched OS + least privilege
  + host firewall
  + NGAV/EDR
  + application allow-listing
  + full-disk encryption
  + centralized logging
\`\`\`

No single control is sufficient; together they make compromise expensive and noisy.
`,
      },
      {
        title: "Data Protection, Backups & Ransomware Resilience",
        type: "TEXT",
        duration: 14,
        content: `# Data Protection, Backups & Ransomware Resilience

When prevention fails, **backups** are what get you back online. Ransomware has made backup strategy a board-level concern.

## The 3-2-1 Backup Rule

\`\`\`
3  copies of your data
2  different media types
1  copy offsite (and ideally offline/immutable)
\`\`\`

Modern extension — **3-2-1-1-0**: add **1 immutable/air-gapped** copy and verify **0 errors** through regular restore testing.

## Why Ransomware Targets Backups

Sophisticated ransomware **deletes or encrypts backups first**, then the production data — so the victim has no choice but to pay. Defenses:

- **Immutable backups** (WORM storage) that can't be altered or deleted for a retention window.
- **Air-gapped / offline** copies disconnected from the network.
- Separate backup credentials from production admin accounts.

## Test Your Restores

> An untested backup is not a backup — it's a hope.

Schedule regular restore drills. Measure your **RTO** (Recovery Time Objective — how fast you recover) and **RPO** (Recovery Point Objective — how much data you can afford to lose).

## Data at Rest Protection

- **Full-disk encryption** — BitLocker (Windows), LUKS (Linux), FileVault (macOS). Protects data on lost/stolen devices.
- **Database/field-level encryption** for sensitive columns (PII, payment data).
- **Key management** via KMS/HSM — never store keys with the data.

## Data Loss Prevention (DLP)

DLP tools detect and block sensitive data (credit cards, PII, source code) from leaving the organization via email, uploads, or USB. Combine with **data classification** so the system knows what's sensitive.

## Defending Against the Full Ransomware Lifecycle

| Stage | Defense |
|-------|---------|
| Initial access (phishing) | Email filtering, user training, MFA |
| Execution | EDR, application control |
| Spread (lateral movement) | Segmentation, least privilege |
| Backup destruction | Immutable/offline backups |
| Encryption | EDR rollback, rapid isolation |
| Extortion (data leak) | Encryption at rest, DLP, monitoring |

The goal is **resilience**: assume an attack will eventually succeed, and ensure you can detect, contain, and recover without paying.
`,
      },
      {
        title: "Hardening a Linux Server — Demo",
        type: "VIDEO",
        duration: 16,
        content: "https://www.youtube.com/embed/2I764P1q5cI",
      },
      {
        title: "Chapter 4 — Endpoint Security Quiz",
        type: "QUIZ",
        duration: 12,
        quiz: {
          title: "OS & Endpoint Security Quiz",
          passMark: 70,
          timeLimit: 12,
          questions: [
            {
              text: "Why is `chmod 777` on a sensitive file dangerous?",
              options: [
                { text: "It encrypts the file with a weak key" },
                { text: "It grants read, write, and execute to everyone", correct: true },
                { text: "It deletes the file's owner" },
                { text: "It makes the file invisible" },
              ],
            },
            {
              text: "Which SSH setting most improves server security?",
              options: [
                { text: "Enabling root login" },
                { text: "Allowing password authentication only" },
                { text: "Disabling passwords and using key-based authentication", correct: true },
                { text: "Running SSH on port 80" },
              ],
            },
            {
              text: "What does EDR provide beyond traditional antivirus?",
              options: [
                { text: "Only faster signature updates" },
                { text: "Continuous telemetry for detection, investigation, and response", correct: true },
                { text: "Disk defragmentation" },
                { text: "Network cabling diagrams" },
              ],
            },
            {
              text: "In Active Directory, 'Pass-the-Hash' refers to…",
              options: [
                { text: "Sharing password hashes between admins safely" },
                { text: "Reusing a stolen NTLM hash to authenticate without the plaintext password", correct: true },
                { text: "Hashing the domain controller's disk" },
                { text: "A backup verification technique" },
              ],
            },
            {
              text: "What does the 3-2-1 backup rule recommend?",
              options: [
                { text: "3 passwords, 2 admins, 1 firewall" },
                { text: "3 copies, on 2 media types, with 1 offsite", correct: true },
                { text: "Back up 3 times per day" },
                { text: "Keep backups for 321 days" },
              ],
            },
            {
              text: "'Living off the land' attacks are dangerous because they…",
              options: [
                { text: "Require expensive custom malware" },
                { text: "Use legitimate built-in tools (e.g., PowerShell) to evade detection", correct: true },
                { text: "Only work on air-gapped systems" },
                { text: "Cannot be logged" },
              ],
            },
            {
              text: "Why are immutable or air-gapped backups important against ransomware?",
              options: [
                { text: "They restore faster than normal backups always" },
                { text: "They cannot be encrypted or deleted by the attacker", correct: true },
                { text: "They don't need encryption" },
                { text: "They eliminate the need for patching" },
              ],
            },
          ],
        },
      },
    ],
  };
}

