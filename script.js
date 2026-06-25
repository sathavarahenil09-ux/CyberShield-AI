const historyKey = "cybershield-static-history";

let latestReportMarkdown = "";
let selectedQuizAnswer = null;
let quizIndex = 0;
let quizScore = 0;

const commonPasswords = new Set([
  "password",
  "password123",
  "admin",
  "admin123",
  "qwerty",
  "qwerty123",
  "letmein",
  "welcome",
  "iloveyou",
  "123456",
  "12345678",
  "123456789"
]);

const suspiciousTlds = new Set(["zip", "mov", "click", "country", "gq", "tk", "ml", "cf", "top", "xyz", "quest"]);
const shorteners = new Set(["bit.ly", "tinyurl.com", "t.co", "goo.gl", "is.gd", "cutt.ly", "rebrand.ly", "ow.ly", "buff.ly", "lnkd.in"]);

const suspiciousWords = [
  "login",
  "verify",
  "update",
  "secure",
  "account",
  "banking",
  "free",
  "bonus",
  "gift",
  "reset",
  "wallet",
  "claim",
  "unlock",
  "invoice",
  "payment"
];

const urgencyWords = [
  "urgent",
  "immediately",
  "verify now",
  "final warning",
  "account suspended",
  "limited time",
  "action required",
  "within 24 hours",
  "last chance",
  "expires today"
];

const credentialWords = ["password", "otp", "login", "sign in", "credential", "security code", "confirm your identity", "2fa", "mfa"];
const moneyWords = ["refund", "invoice", "payment", "bank", "lottery", "prize", "gift card", "crypto", "wire transfer", "payroll"];
const knownBrands = ["amazon", "apple", "google", "microsoft", "netflix", "paypal", "meta", "instagram", "facebook", "whatsapp", "sbi", "hdfc", "icici", "axis"];

const mitreItems = [
  {
    tactic: "Initial Access",
    technique: "T1566 - Phishing",
    summary: "Adversaries send malicious links or attachments to gain entry.",
    defense: "Use email filtering, user reporting, and link verification."
  },
  {
    tactic: "Initial Access",
    technique: "T1078 - Valid Accounts",
    summary: "Attackers use stolen credentials to log in like real users.",
    defense: "Use MFA, disable stale accounts, and monitor impossible travel."
  },
  {
    tactic: "Credential Access",
    technique: "T1110 - Brute Force",
    summary: "Attackers try many passwords against accounts or services.",
    defense: "Use rate limits, lockouts, MFA, and strong passwords."
  },
  {
    tactic: "Credential Access",
    technique: "T1056 - Input Capture",
    summary: "Malware or fake pages capture keystrokes and submitted data.",
    defense: "Use endpoint protection and avoid unknown downloads."
  },
  {
    tactic: "Defense Evasion",
    technique: "T1027 - Obfuscated Files",
    summary: "Payloads are disguised to avoid detection.",
    defense: "Inspect scripts, block risky file types, and use scanning tools."
  },
  {
    tactic: "Exfiltration",
    technique: "T1041 - Exfiltration Over C2",
    summary: "Data is sent out through an attacker-controlled channel.",
    defense: "Monitor unusual outbound traffic and data transfer spikes."
  }
];

const quizQuestions = [
  {
    question: "Which email sign is most suspicious?",
    options: ["Urgent request for OTP", "A newsletter from a known source", "A meeting invite from your teacher"],
    answer: 0,
    explain: "Attackers often use urgency and OTP requests to steal accounts."
  },
  {
    question: "Which URL is safer to trust?",
    options: ["http://bank-login-update.click", "https://www.examplebank.com", "https://bit.ly/free-prize"],
    answer: 1,
    explain: "A real HTTPS domain you typed or verified is safer than short links or look-alike domains."
  },
  {
    question: "What does MFA protect against?",
    options: ["Only viruses", "Some stolen-password attacks", "All phishing attacks forever"],
    answer: 1,
    explain: "MFA reduces risk when passwords are stolen, though phishing-resistant MFA is strongest."
  },
  {
    question: "Which password is strongest?",
    options: ["P@ssw0rd", "Satha@123", "River-Cloud-Planet-84"],
    answer: 2,
    explain: "Long passphrases are easier to remember and harder to crack."
  },
  {
    question: "What is the best first action after receiving a suspicious link?",
    options: ["Click quickly before it expires", "Verify sender and domain first", "Forward it to all friends"],
    answer: 1,
    explain: "Verification before clicking is one of the best phishing defenses."
  }
];

const tips = [
  "Use a password manager and keep every important password unique.",
  "Check the domain carefully before entering login details.",
  "Turn on MFA for email, banking, GitHub, and cloud accounts.",
  "Never share OTPs, recovery codes, or reset links with anyone.",
  "Download software only from official sources.",
  "Report suspicious emails instead of replying to them.",
  "Keep your browser, phone, and operating system updated."
];

const newsItems = [
  {
    title: "Phishing remains a top initial access risk",
    source: "CyberShield Static Feed",
    summary: "Credential theft is still one of the easiest ways attackers enter accounts."
  },
  {
    title: "Password reuse increases account takeover risk",
    source: "CyberShield Static Feed",
    summary: "Unique passphrases and MFA make stolen-password attacks harder."
  },
  {
    title: "Security awareness helps stop social engineering",
    source: "CyberShield Static Feed",
    summary: "Small habits like checking links and sender domains prevent real incidents."
  }
];

function byId(id) {
  return document.getElementById(id);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function chip(label, tone = "info") {
  return `<span class="chip ${tone}">${escapeHtml(label)}</span>`;
}

function renderList(items) {
  if (!items || !items.length) return "";
  return `<ul class="mini-list">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function renderChecks(checks) {
  return `<ul class="check-grid">${checks.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function clampScore(score) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function gradeRisk(score) {
  if (score >= 80) return { verdict: "Critical Risk", tone: "danger", severity: "Critical" };
  if (score >= 60) return { verdict: "High Risk", tone: "danger", severity: "High" };
  if (score >= 35) return { verdict: "Suspicious", tone: "warn", severity: "Medium" };
  return { verdict: "Low Risk", tone: "safe", severity: "Low" };
}

function updateCaseScore(score, verdict, tone, copy) {
  const safeScore = clampScore(score);
  const ring = byId("caseScoreRing");
  ring.style.setProperty("--score", safeScore);
  ring.dataset.tone = tone || "info";
  ring.querySelector("span").textContent = safeScore;
  byId("caseScoreValue").textContent = verdict || "Analysis complete";
  byId("caseScoreCopy").textContent = copy || "Latest result is active.";
}

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(historyKey)) || [];
  } catch (error) {
    return [];
  }
}

function saveHistory(items) {
  localStorage.setItem(historyKey, JSON.stringify(items.slice(0, 10)));
}

function addHistory(entry) {
  saveHistory([{ ...entry, createdAt: new Date().toISOString() }, ...loadHistory()]);
  renderHistory();
}

function renderHistory() {
  const list = byId("historyList");
  const items = loadHistory();

  if (!items.length) {
    list.textContent = "No local scans yet.";
    return;
  }

  list.innerHTML = items
    .map((item) => {
      const time = new Date(item.createdAt).toLocaleString();
      return `
        <article class="history-item">
          <div>
            <strong>${escapeHtml(item.title)}</strong>
            <p>${escapeHtml(item.type)} - ${escapeHtml(time)}</p>
          </div>
          <div class="history-score">
            ${chip(item.verdict || "Done", item.tone || "info")}
            <span>${Number.isFinite(item.score) ? `${item.score}/100` : "OK"}</span>
          </div>
        </article>
      `;
    })
    .join("");
}

function estimateEntropy(password) {
  let pool = 0;
  if (/[a-z]/.test(password)) pool += 26;
  if (/[A-Z]/.test(password)) pool += 26;
  if (/[0-9]/.test(password)) pool += 10;
  if (/[^A-Za-z0-9]/.test(password)) pool += 32;
  if (!pool) return 0;
  return Math.round(password.length * Math.log2(pool));
}

function formatCrackTime(entropy) {
  if (entropy <= 0) return "Instant";
  const guessesPerSecond = 1000000000;
  const seconds = Math.pow(2, entropy) / guessesPerSecond;
  if (seconds < 60) return "Under 1 minute";
  if (seconds < 3600) return `${Math.round(seconds / 60)} minutes`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} hours`;
  if (seconds < 31536000) return `${Math.round(seconds / 86400)} days`;
  if (seconds < 3153600000) return `${Math.round(seconds / 31536000)} years`;
  return "Centuries";
}

function analyzePassword(password) {
  const normalized = password.toLowerCase();
  const entropy = estimateEntropy(password);
  const checks = [
    { label: "At least 12 characters", passed: password.length >= 12 },
    { label: "Contains uppercase letters", passed: /[A-Z]/.test(password) },
    { label: "Contains lowercase letters", passed: /[a-z]/.test(password) },
    { label: "Contains numbers", passed: /[0-9]/.test(password) },
    { label: "Contains symbols", passed: /[^A-Za-z0-9]/.test(password) },
    { label: "Not a common password", passed: !commonPasswords.has(normalized) },
    { label: "Avoids long repeated patterns", passed: !/(.)\1{2,}/.test(password) }
  ];

  let score = 0;
  if (password.length >= 8) score += 15;
  if (password.length >= 12) score += 20;
  if (password.length >= 16) score += 10;
  if (/[a-z]/.test(password)) score += 10;
  if (/[A-Z]/.test(password)) score += 10;
  if (/[0-9]/.test(password)) score += 10;
  if (/[^A-Za-z0-9]/.test(password)) score += 15;
  if (entropy >= 60) score += 10;
  if (commonPasswords.has(normalized)) score -= 40;
  if (/(.)\1{2,}/.test(password)) score -= 10;

  score = clampScore(score);
  const label = score >= 80 ? "Strong" : score >= 55 ? "Moderate" : "Weak";
  const tone = score >= 80 ? "safe" : score >= 55 ? "warn" : "danger";
  const failed = checks.filter((item) => !item.passed).map((item) => item.label);

  return { score, label, tone, entropy, crackTime: formatCrackTime(entropy), checks, failed };
}

function updatePasswordMeter(score, tone) {
  const meter = byId("passwordMeter");
  meter.style.width = `${score}%`;
  meter.style.background = tone === "safe" ? "var(--safe)" : tone === "warn" ? "var(--warn)" : "var(--danger)";
}

function handlePassword(event) {
  event.preventDefault();
  const password = byId("passwordInput").value;
  const result = analyzePassword(password);

  updatePasswordMeter(result.score, result.tone);
  updateCaseScore(result.score, result.label, result.tone, "Password strength score updated.");
  addHistory({ type: "Password", title: "Credential strength check", score: result.score, verdict: result.label, tone: result.tone });

  byId("passwordResult").innerHTML = `
    <div class="result-title">
      <strong>${result.score}/100 - ${escapeHtml(result.label)}</strong>
      ${chip(result.label, result.tone)}
    </div>
    <p>Entropy estimate: ${result.entropy} bits. Offline crack estimate: ${escapeHtml(result.crackTime)}.</p>
    ${renderChecks(result.checks.map((item) => `${item.passed ? "Pass" : "Fix"}: ${item.label}`))}
    ${renderList(result.failed.length ? result.failed : ["This password meets the core strength checks."])}
  `;
}

function generatePassword() {
  const length = Number(byId("passwordLength").value) || 18;
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*-_=+?";
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  const password = Array.from(bytes, (byte) => chars[byte % chars.length]).join("");
  byId("generatedPassword").textContent = password;
  addHistory({ type: "Generator", title: `${length} character password`, verdict: "Generated", tone: "info" });
}

async function copyText(text, buttonId) {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    if (buttonId) {
      const button = byId(buttonId);
      const original = button.textContent;
      button.textContent = "Copied";
      setTimeout(() => {
        button.textContent = original;
      }, 1300);
    }
  } catch (error) {
    window.prompt("Copy this text:", text);
  }
}

function normalizeUrl(input) {
  const trimmed = String(input || "").trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function isIpHost(hostname) {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) || hostname.includes(":");
}

function findBrandSignals(hostname, fullUrl) {
  const compactHost = hostname.replace(/[-_.]/g, "");
  const compactUrl = fullUrl.toLowerCase().replace(/[-_.]/g, "");
  return knownBrands.filter((brand) => {
    const brandInPath = compactUrl.includes(brand) && !compactHost.includes(brand);
    const brandPlusSecurityTerm = compactHost.includes(brand) && /(verify|login|secure|support|account|update)/i.test(fullUrl);
    return brandInPath || brandPlusSecurityTerm;
  });
}

function analyzeUrl(inputUrl) {
  const normalized = normalizeUrl(inputUrl);
  const parsed = new URL(normalized);
  const hostname = parsed.hostname.toLowerCase();
  const labels = hostname.split(".").filter(Boolean);
  const tld = labels[labels.length - 1] || "";
  const rootDomain = labels.length >= 2 ? labels.slice(-2).join(".") : hostname;
  const checks = [];
  const factors = [];
  let score = 0;

  function addCheck(label, passed, points, detail) {
    checks.push(`${passed ? "Pass" : "Risk"}: ${label} - ${detail}`);
    if (!passed) score += points;
  }

  function addFactor(label, points, detail) {
    factors.push(`${label}: ${detail}`);
    score += points;
  }

  addCheck("Uses HTTPS", parsed.protocol === "https:", 18, "HTTP links can expose data.");
  addCheck("Domain is not an IP address", !isIpHost(hostname), 16, "IP links are harder to verify.");
  addCheck("Domain length is normal", hostname.length <= 45, 8, "Long domains are harder to inspect.");
  addCheck("Subdomain depth is normal", labels.length <= 4, 8, "Deep subdomains can hide the real site.");
  addCheck("No risky TLD signal", !suspiciousTlds.has(tld), 11, "Some low-cost TLDs are commonly abused.");
  addCheck("No encoded characters", !/%[0-9A-F]{2}/i.test(normalized), 7, "Encoded characters can hide intent.");
  addCheck("No punycode domain", !hostname.includes("xn--"), 13, "Punycode can create look-alike domains.");
  addCheck("Few hyphens in host", (hostname.match(/-/g) || []).length <= 2, 7, "Too many hyphens can signal imitation.");
  addCheck("No embedded credentials", !parsed.username && !parsed.password, 14, "Credentials in URLs are suspicious.");
  addCheck("No redirect parameter", !/[?&](url|u|redirect|return|next)=/i.test(parsed.search), 10, "Redirect parameters can bounce victims elsewhere.");
  addCheck("No risky file extension", !/\.(exe|scr|bat|cmd|js|vbs|zip|iso|msi)(\?|$)/i.test(parsed.pathname), 16, "Executables and archives need caution.");

  const keywordHits = suspiciousWords.filter((word) => normalized.toLowerCase().includes(word));
  if (keywordHits.length) addFactor("Security or reward keywords", Math.min(18, keywordHits.length * 5), keywordHits.slice(0, 5).join(", "));
  if (shorteners.has(rootDomain) || shorteners.has(hostname)) addFactor("Shortened URL", 14, "Short links hide the final destination.");

  const brandHits = findBrandSignals(hostname, normalized);
  if (brandHits.length) addFactor("Possible brand impersonation", 16, brandHits.slice(0, 4).join(", "));
  if (normalized.length > 120) addFactor("Very long URL", 7, "Long links can bury the destination.");

  score = clampScore(score);
  const risk = gradeRisk(score);
  return {
    url: normalized,
    hostname,
    score,
    ...risk,
    checks,
    factors,
    recommendations: [
      "Verify the destination domain manually.",
      "Avoid links from unexpected messages.",
      "Use official websites or apps for login pages."
    ]
  };
}

function handleUrl(event) {
  event.preventDefault();
  const result = byId("urlResult");

  try {
    const data = analyzeUrl(byId("urlInput").value);
    updateCaseScore(data.score, data.verdict, data.tone, `Latest URL analysis: ${data.hostname}`);
    addHistory({ type: "URL", title: data.hostname, score: data.score, verdict: data.verdict, tone: data.tone });
    result.innerHTML = `
      <div class="result-title">
        <strong>${data.score}/100 - ${escapeHtml(data.verdict)}</strong>
        ${chip(data.severity, data.tone)}
      </div>
      <p>Host: ${escapeHtml(data.hostname)}</p>
      ${renderChecks(data.checks)}
      ${renderList(data.factors.length ? data.factors : ["No major URL risk factors found."])}
      ${renderList(data.recommendations)}
    `;
  } catch (error) {
    result.innerHTML = `<div class="result-title"><strong>Invalid URL</strong>${chip("Error", "danger")}</div><p>Enter a valid URL or domain.</p>`;
  }
}

function extractUrls(text) {
  return String(text || "").match(/https?:\/\/[^\s<>"')\]]+/gi) || [];
}

function parseHeaderDomain(content, headerName) {
  const pattern = new RegExp(`^${headerName}:\\s*([^\\n]+)`, "im");
  const match = String(content || "").match(pattern);
  if (!match) return null;
  const email = match[1].match(/[A-Z0-9._%+-]+@([A-Z0-9.-]+\.[A-Z]{2,})/i);
  return email ? email[1].toLowerCase() : null;
}

function scoreWords(lowerText, words, weight, evidence, label) {
  const hits = words.filter((word) => lowerText.includes(word));
  if (!hits.length) return 0;
  evidence.push(`${label}: ${hits.slice(0, 6).join(", ")}`);
  return Math.min(hits.length * weight, weight * 4);
}

function analyzePhishing(content) {
  const text = String(content || "");
  const lower = text.toLowerCase();
  const urls = extractUrls(text);
  const evidence = [];
  let score = 0;

  score += scoreWords(lower, urgencyWords, 9, evidence, "Urgency language");
  score += scoreWords(lower, credentialWords, 9, evidence, "Credential request");
  score += scoreWords(lower, moneyWords, 6, evidence, "Financial lure");

  if (urls.length) {
    score += 10;
    evidence.push(`External links: ${urls.length} found`);
  }

  urls.slice(0, 5).forEach((url) => {
    try {
      const urlRisk = analyzeUrl(url);
      if (urlRisk.score >= 35) {
        score += Math.round(urlRisk.score * 0.28);
        evidence.push(`Risky linked domain: ${urlRisk.hostname} scored ${urlRisk.score}/100`);
      }
    } catch (error) {
      score += 6;
      evidence.push("Malformed link text");
    }
  });

  if (/[A-Z]{8,}/.test(text)) {
    score += 5;
    evidence.push("Excessive uppercase text");
  }
  if (/(dear user|dear customer|dear account holder|valued customer)/i.test(text)) {
    score += 6;
    evidence.push("Generic greeting");
  }
  if (/(\.zip|\.exe|\.scr|\.js|\.bat|\.vbs|\.iso|\.msi)\b/i.test(text)) {
    score += 16;
    evidence.push("Risky attachment reference");
  }
  if (/(qr code|scan the qr|scan qr)/i.test(text)) {
    score += 9;
    evidence.push("QR-code lure");
  }
  if (/(do not share|confidential|secret|keep this private)/i.test(text)) {
    score += 8;
    evidence.push("Secrecy pressure");
  }

  const fromDomain = parseHeaderDomain(text, "from");
  const replyToDomain = parseHeaderDomain(text, "reply-to");
  if (fromDomain && replyToDomain && fromDomain !== replyToDomain) {
    score += 16;
    evidence.push(`From and Reply-To mismatch: ${fromDomain} to ${replyToDomain}`);
  }

  score = clampScore(score);
  const risk = gradeRisk(score);
  const recommendations =
    score >= 35
      ? ["Do not click links until the sender is verified.", "Check sender, reply-to, domain spelling, and context.", "Report the sample for review."]
      : ["No major phishing indicators were found in this sample."];

  return { score, ...risk, urls, evidence, recommendations };
}

function handlePhishing(event) {
  event.preventDefault();
  const data = analyzePhishing(byId("emailInput").value);
  updateCaseScore(data.score, data.verdict, data.tone, `Email analysis found ${data.urls.length} link(s).`);
  addHistory({ type: "Email", title: "Phishing content analysis", score: data.score, verdict: data.verdict, tone: data.tone });

  byId("phishingResult").innerHTML = `
    <div class="result-title">
      <strong>${data.score}/100 - ${escapeHtml(data.verdict)}</strong>
      ${chip(data.severity, data.tone)}
    </div>
    <p>Links found: ${data.urls.length}</p>
    ${renderList(data.evidence.length ? data.evidence : ["No strong phishing signals found."])}
    ${renderList(data.recommendations)}
  `;
}

async function digestText(algorithm, text) {
  if (!crypto.subtle) throw new Error("Web Crypto is not available in this browser.");
  const encoded = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest(algorithm, encoded);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function handleHash(event) {
  event.preventDefault();
  const result = byId("hashResult");
  const text = byId("hashInput").value;
  result.textContent = "Generating hashes.";

  try {
    const [sha1, sha256, sha512] = await Promise.all([digestText("SHA-1", text), digestText("SHA-256", text), digestText("SHA-512", text)]);
    result.innerHTML = `
      <div class="hash-row"><span>SHA-1</span><code>${sha1}</code></div>
      <div class="hash-row"><span>SHA-256</span><code>${sha256}</code></div>
      <div class="hash-row"><span>SHA-512</span><code>${sha512}</code></div>
      <p>SHA-1 is included for learning. Prefer SHA-256 or SHA-512 for modern integrity checks.</p>
    `;
    addHistory({ type: "Hash", title: `${text.length} character input`, verdict: "Generated", tone: "info" });
  } catch (error) {
    result.innerHTML = `<div class="result-title"><strong>Hash failed</strong>${chip("Error", "danger")}</div><p>${escapeHtml(error.message)}</p>`;
  }
}

function renderMitre(filter = "All") {
  const tactics = ["All", ...Array.from(new Set(mitreItems.map((item) => item.tactic)))];
  byId("mitreFilters").innerHTML = tactics
    .map((tactic) => `<button class="segment-button ${tactic === filter ? "active" : ""}" type="button" data-tactic="${escapeHtml(tactic)}">${escapeHtml(tactic)}</button>`)
    .join("");

  const items = filter === "All" ? mitreItems : mitreItems.filter((item) => item.tactic === filter);
  byId("mitreList").innerHTML = items
    .map(
      (item) => `
        <article class="mitre-card">
          <h4>${escapeHtml(item.technique)}</h4>
          <p><strong>${escapeHtml(item.tactic)}</strong></p>
          <p>${escapeHtml(item.summary)}</p>
          <p>${escapeHtml(item.defense)}</p>
        </article>
      `
    )
    .join("");
}

function renderQuiz() {
  const question = quizQuestions[quizIndex];
  selectedQuizAnswer = null;
  byId("quizProgress").textContent = `Question ${quizIndex + 1} of ${quizQuestions.length}`;
  byId("quizQuestion").textContent = question.question;
  byId("quizOptions").innerHTML = question.options
    .map((option, index) => `<button class="quiz-option" type="button" data-answer="${index}">${escapeHtml(option)}</button>`)
    .join("");
  byId("quizResult").textContent = "Choose an answer.";
}

function selectQuizAnswer(button) {
  selectedQuizAnswer = Number(button.dataset.answer);
  document.querySelectorAll(".quiz-option").forEach((option) => option.classList.remove("selected"));
  button.classList.add("selected");
}

function nextQuiz() {
  const question = quizQuestions[quizIndex];
  if (selectedQuizAnswer === null) {
    byId("quizResult").textContent = "Select an option first.";
    return;
  }

  if (selectedQuizAnswer === question.answer) {
    quizScore += 1;
    byId("quizResult").innerHTML = `<strong>Correct.</strong> ${escapeHtml(question.explain)}`;
  } else {
    byId("quizResult").innerHTML = `<strong>Review.</strong> ${escapeHtml(question.explain)}`;
  }

  setTimeout(() => {
    quizIndex += 1;
    if (quizIndex >= quizQuestions.length) {
      byId("quizQuestion").textContent = `Final score: ${quizScore}/${quizQuestions.length}`;
      byId("quizOptions").innerHTML = "";
      byId("quizProgress").textContent = "Quiz complete";
      byId("quizResult").textContent = quizScore >= 4 ? "Strong awareness result." : "Review the phishing and URL modules again.";
      addHistory({ type: "Quiz", title: "Awareness quiz", score: Math.round((quizScore / quizQuestions.length) * 100), verdict: "Complete", tone: "info" });
      return;
    }
    renderQuiz();
  }, 850);
}

function restartQuiz() {
  quizIndex = 0;
  quizScore = 0;
  renderQuiz();
}

function renderDailyContent() {
  const day = Math.floor(Date.now() / 86400000);
  byId("tipText").textContent = tips[day % tips.length];
  byId("newsList").innerHTML = newsItems
    .map(
      (item) => `
        <article class="news-item">
          <div>
            <h4>${escapeHtml(item.title)}</h4>
            <p>${escapeHtml(item.source)}</p>
            <p>${escapeHtml(item.summary)}</p>
          </div>
        </article>
      `
    )
    .join("");
}

function buildReport(payload) {
  const urlResult = payload.url ? analyzeUrl(payload.url) : null;
  const emailResult = payload.evidence ? analyzePhishing(payload.evidence) : null;
  if (!urlResult && !emailResult) throw new Error("Add a URL or evidence sample.");

  const scores = [urlResult?.score, emailResult?.score].filter(Number.isFinite);
  const score = clampScore(scores.reduce((total, item) => total + item, 0) / scores.length + (scores.length > 1 ? 8 : 0));
  const risk = gradeRisk(score);
  const evidence = [
    ...(urlResult ? [`URL ${urlResult.hostname}: ${urlResult.verdict}`, ...urlResult.factors] : []),
    ...(emailResult ? [`Email sample: ${emailResult.verdict}`, ...emailResult.evidence] : [])
  ];
  const recommendations = Array.from(
    new Set([...(urlResult?.recommendations || []), ...(emailResult?.recommendations || []), "Document the final decision and preserve sample evidence."])
  );
  const attackStage = score >= 60 ? "Initial Access / Credential Theft" : "Awareness Review / Reconnaissance";
  const generatedAt = new Date().toISOString();
  const summary = `${payload.caseTitle} was assessed as ${risk.severity.toLowerCase()} risk with a score of ${score}/100.`;
  const markdown = [
    "# CyberShield AI Static Threat Report",
    "",
    `**Case:** ${payload.caseTitle}`,
    `**Analyst:** ${payload.analystName}`,
    `**Target asset:** ${payload.targetAsset}`,
    `**Generated:** ${generatedAt}`,
    `**Overall verdict:** ${risk.verdict} (${score}/100)`,
    `**Likely attack stage:** ${attackStage}`,
    "",
    "## Executive Summary",
    summary,
    "",
    "## Evidence",
    ...evidence.map((item) => `- ${item}`),
    "",
    "## Recommendations",
    ...recommendations.map((item) => `- ${item}`)
  ].join("\n");

  return { score, ...risk, evidence, recommendations, attackStage, summary, markdown };
}

function handleReport(event) {
  event.preventDefault();
  const result = byId("reportResult");
  const payload = {
    analystName: byId("analystName").value.trim(),
    caseTitle: byId("caseTitle").value.trim(),
    targetAsset: byId("targetAsset").value.trim(),
    url: byId("reportUrl").value.trim(),
    evidence: byId("reportEvidence").value.trim()
  };

  try {
    const report = buildReport(payload);
    latestReportMarkdown = report.markdown;
    byId("copyReport").disabled = false;
    byId("downloadReport").disabled = false;
    updateCaseScore(report.score, report.verdict, report.tone, report.attackStage);
    addHistory({ type: "Report", title: payload.caseTitle, score: report.score, verdict: report.verdict, tone: report.tone });
    result.innerHTML = `
      <div class="result-title">
        <strong>${report.score}/100 - ${escapeHtml(report.verdict)}</strong>
        ${chip(report.severity, report.tone)}
      </div>
      <p>${escapeHtml(report.summary)}</p>
      ${renderList(report.evidence.slice(0, 8))}
      ${renderList(report.recommendations)}
      <pre class="report-preview">${escapeHtml(report.markdown)}</pre>
    `;
  } catch (error) {
    result.innerHTML = `<div class="result-title"><strong>Report incomplete</strong>${chip("Error", "danger")}</div><p>${escapeHtml(error.message)}</p>`;
  }
}

function downloadReport() {
  if (!latestReportMarkdown) return;
  const blob = new Blob([latestReportMarkdown], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "cybershield-static-threat-report.md";
  link.click();
  URL.revokeObjectURL(url);
}

function loadSampleEmail() {
  byId("emailInput").value =
    "From: Security Team <support@paypa1-verify.example>\nReply-To: recovery@unknown-helpdesk.example\n\nDear customer, your account has been suspended. Verify your login immediately within 24 hours at http://secure-bank-update.example/login or your access will be blocked. Keep this confidential.";
}

function loadReportSample() {
  byId("analystName").value = "Student Analyst";
  byId("caseTitle").value = "Suspicious payroll verification email";
  byId("targetAsset").value = "Finance department mailbox";
  byId("reportUrl").value = "http://payroll-secure-update.click/login";
  byId("reportEvidence").value =
    "From: Payroll Helpdesk <payroll@company-example.com>\nReply-To: payroll-support@secure-update.click\n\nDear employee, your salary account will be suspended. Verify your login and OTP within 24 hours at http://payroll-secure-update.click/login.";
}

function setupEvents() {
  byId("themeToggle").addEventListener("click", () => {
    document.body.classList.toggle("light-theme");
    localStorage.setItem("cybershield-theme", document.body.classList.contains("light-theme") ? "light" : "dark");
  });

  byId("togglePassword").addEventListener("click", () => {
    const input = byId("passwordInput");
    input.type = input.type === "password" ? "text" : "password";
  });

  byId("passwordForm").addEventListener("submit", handlePassword);
  byId("urlForm").addEventListener("submit", handleUrl);
  byId("phishingForm").addEventListener("submit", handlePhishing);
  byId("hashForm").addEventListener("submit", handleHash);
  byId("reportForm").addEventListener("submit", handleReport);
  byId("generatePassword").addEventListener("click", generatePassword);
  byId("copyGeneratedPassword").addEventListener("click", () => copyText(byId("generatedPassword").textContent, "copyGeneratedPassword"));
  byId("loadSampleEmail").addEventListener("click", loadSampleEmail);
  byId("loadReportSample").addEventListener("click", loadReportSample);
  byId("copyReport").addEventListener("click", () => copyText(latestReportMarkdown, "copyReport"));
  byId("downloadReport").addEventListener("click", downloadReport);
  byId("clearHistory").addEventListener("click", () => {
    saveHistory([]);
    renderHistory();
  });
  byId("mitreFilters").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-tactic]");
    if (button) renderMitre(button.dataset.tactic);
  });
  byId("quizOptions").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-answer]");
    if (button) selectQuizAnswer(button);
  });
  byId("quizNext").addEventListener("click", nextQuiz);
  byId("quizRestart").addEventListener("click", restartQuiz);
}

document.addEventListener("DOMContentLoaded", () => {
  if (localStorage.getItem("cybershield-theme") === "light") {
    document.body.classList.add("light-theme");
  }

  setupEvents();
  renderMitre();
  renderQuiz();
  renderDailyContent();
  renderHistory();
});
