import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  Code2,
  FileCode2,
  GitBranch,
  Github,
  GitPullRequest,
  Menu,
  Play,
  RotateCcw,
  ShieldCheck,
  X,
  Zap,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { ReviewCore } from "./review-core";
import "./landing.css";

function Mark({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="30"
      height="30"
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 7h13a8 8 0 0 1 0 16H5V7Z"
        stroke="currentColor"
        strokeWidth="3.5"
      />
      <path
        d="m12 15 4 4L28 6M20 23l6 5"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="square"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: reduced ? 0 : 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

const samples = [
  {
    name: "Logic",
    icon: GitBranch,
    file: "src/lib/retry.ts",
    title: "One more attempt than you intended.",
    severity: "Medium",
    category: "Boundary condition",
    description:
      "The loop allows four attempts when maxAttempts is 3. Use a strict comparison to respect the configured limit.",
    code: [
      "export async function retry(fn, maxAttempts = 3) {",
      "  let lastError;",
      "  for (let attempt = 0; attempt <= maxAttempts; attempt++) {",
      "    try { return await fn(); }",
      "    catch (error) { lastError = error; }",
      "  }",
      "  throw lastError;",
      "}",
    ],
    line: 2,
    before: "attempt <= maxAttempts",
    after: "attempt < maxAttempts",
    summary: "Retry boundary checked",
  },
  {
    name: "Security",
    icon: ShieldCheck,
    file: "src/api/users.ts",
    title: "User input reaches the SQL query.",
    severity: "High",
    category: "SQL injection",
    description:
      "Interpolating a request parameter into SQL lets input change the query. Pass the email as a bound parameter instead.",
    code: [
      "export async function findUser(req, db) {",
      "  const email = req.query.email;",
      "",
      "  const user = await db.query(",
      "    `SELECT * FROM users WHERE email = '${email}'`",
      "  );",
      "",
      "  return user.rows[0];",
      "}",
    ],
    line: 4,
    before: "`SELECT * FROM users WHERE email = '${email}'`",
    after: "'SELECT * FROM users WHERE email = $1', [email]",
    summary: "Query input checked",
  },
  {
    name: "Performance",
    icon: Zap,
    file: "src/services/projects.ts",
    title: "One query quietly becomes many.",
    severity: "Medium",
    category: "N+1 query",
    description:
      "Every project triggers another database call. Replace the query and loop with a single relation query to fetch projects with their owners.",
    code: [
      "export async function getProjects(db) {",
      "  const projects = await db.project.findMany();",
      "",
      "  for (const project of projects) {",
      "    project.owner = await db.user.findUnique({",
      "      where: { id: project.ownerId }",
      "    });",
      "  }",
      "  return projects;",
      "}",
    ],
    line: 4,
    before: "findMany() + findUnique() for each project",
    after: "return db.project.findMany({ include: { owner: true } });",
    summary: "Database calls checked",
  },
];

function ReviewDemo() {
  const [selected, setSelected] = useState(0);
  const [running, setRunning] = useState(false);
  const [fixed, setFixed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const sample = samples[selected];
  const choose = (index: number) => {
    if (timer.current) clearTimeout(timer.current);
    setSelected(index);
    setRunning(false);
    setFixed(false);
  };
  const run = () => {
    setFixed(false);
    setRunning(true);
    timer.current = setTimeout(() => setRunning(false), 1900);
  };
  return (
    <div className="ri-review-demo" id="review-demo">
      <div className="ri-demo-top">
        <div className="ri-demo-repo">
          <Github size={18} />
          <span>
            acme / <strong>platform</strong>
          </span>
          <span className="ri-demo-pr">#128</span>
        </div>
        <span className="ri-example-label">INTERACTIVE EXAMPLE</span>
      </div>
      <div className="ri-demo-toolbar">
        <div
          className="ri-demo-tabs"
          role="tablist"
          aria-label="Review examples"
        >
          {samples.map((item, i) => (
            <button
              key={item.name}
              id={`review-tab-${i}`}
              role="tab"
              aria-selected={selected === i}
              aria-controls="review-panel"
              tabIndex={selected === i ? 0 : -1}
              onKeyDown={(event) => {
                if (
                  ["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
                ) {
                  event.preventDefault();
                  const next =
                    event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? samples.length - 1
                        : (selected +
                            (event.key === "ArrowRight" ? 1 : -1) +
                            samples.length) %
                          samples.length;
                  choose(next);
                  document.getElementById(`review-tab-${next}`)?.focus();
                }
              }}
              onClick={() => choose(i)}
            >
              <item.icon size={15} />
              {item.name}
            </button>
          ))}
        </div>
        <button className="ri-run-button" onClick={run} disabled={running}>
          {running ? (
            <span className="ri-spinner" />
          ) : (
            <Play size={12} fill="currentColor" />
          )}
          {running ? "Reviewing…" : "Run sample review"}
        </button>
      </div>
      <div
        className="ri-demo-body"
        id="review-panel"
        role="tabpanel"
        aria-labelledby={`review-tab-${selected}`}
      >
        <div className="ri-code-pane">
          <div className="ri-code-file">
            <FileCode2 size={14} />
            {sample.file}
            <span>+12 −4</span>
          </div>
          <div className="ri-code-lines">
            {sample.code.map((line, i) => (
              <div
                key={`${selected}-${i}`}
                className={`ri-code-line ${i === sample.line && !running ? "ri-line-issue" : ""}`}
              >
                <span className="ri-line-number">{i + 1}</span>
                <code>{line}</code>
                {i === sample.line && !running && (
                  <span className="ri-line-indicator" />
                )}
              </div>
            ))}
          </div>
          {running && <div className="ri-code-sweep" />}
          <div className="ri-code-bottom">
            <GitBranch size={13} /> feat/improve-api <span>TypeScript</span>
          </div>
        </div>
        <div className="ri-finding-pane" aria-live="polite" aria-atomic="true">
          <div className="ri-finding-heading">
            <span className="ri-bot-avatar">
              <Mark />
            </span>
            <strong>ReviewIQ</strong>
            <span className="ri-bot-tag">review</span>
            <span className="ri-finding-time">just now</span>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={`${selected}-${running}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
            >
              {running ? (
                <div className="ri-reviewing">
                  <span className="ri-spinner" />
                  <h3>Following the change.</h3>
                  <p>Reading the context and checking the edge cases.</p>
                  <div className="ri-progress-track">
                    <span />
                  </div>
                </div>
              ) : (
                <>
                  <div className="ri-finding-tags">
                    <span
                      className={`ri-severity ${sample.severity === "High" ? "ri-high" : ""}`}
                    >
                      {sample.severity} priority
                    </span>
                    <span>{sample.category}</span>
                  </div>
                  <h3>{sample.title}</h3>
                  <p>{sample.description}</p>
                  <div className="ri-diff">
                    <div>
                      <span>−</span>
                      <code>{sample.before}</code>
                    </div>
                    <div>
                      <span>+</span>
                      <code>{sample.after}</code>
                    </div>
                  </div>
                  <button
                    className={`ri-suggestion-button ${fixed ? "ri-suggestion-saved" : ""}`}
                    onClick={() => setFixed((value) => !value)}
                  >
                    {fixed ? <Check size={14} /> : <Code2 size={14} />}{" "}
                    {fixed
                      ? "Suggestion marked as reviewed"
                      : "Mark suggestion as reviewed"}
                  </button>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      <div className="ri-demo-bottom">
        <span>
          <span className={`ri-status-dot ${running ? "ri-dot-orange" : ""}`} />
          {running ? "Review in progress" : sample.summary}
        </span>
        <span>Sample code · no repository connected</span>
      </div>
    </div>
  );
}

function ContextDiagram({ variant }: { variant: number }) {
  return (
    <svg
      viewBox="0 0 320 150"
      fill="none"
      aria-hidden="true"
      className="ri-feature-art"
    >
      {variant === 0 ? (
        <>
          <path
            d="M55 76h72m66 0h72M160 34v27m0 30v27"
            stroke="#38403e"
            strokeDasharray="4 5"
          />
          <g className="ri-node-pulse">
            <rect
              x="128"
              y="47"
              width="64"
              height="58"
              rx="8"
              fill="#25180f"
              stroke="#c2663e"
            />
            <path
              d="m151 66-9 10 9 10m18-20 9 10-9 10"
              stroke="#ff8b55"
              strokeWidth="2"
            />
          </g>
          {[
            [30, 58],
            [244, 58],
            [144, 8],
            [144, 114],
          ].map(([x, y], i) => (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width="32"
                height="32"
                rx="5"
                fill="#101414"
                stroke="#39413e"
              />
              <path
                d={`M${x + 10} ${y + 10}h12m-12 6h8m-8 6h12`}
                stroke="#77837b"
              />
            </g>
          ))}
        </>
      ) : variant === 1 ? (
        <>
          <path d="M42 120h236M42 76h236M42 32h236" stroke="#252c28" />
          <path
            className="ri-chart-line"
            d="m42 101 35-18 33 10 36-50 32 27 35-45 31 24 34-35"
            stroke="#ff8656"
            strokeWidth="2.5"
          />
          <circle
            cx="146"
            cy="43"
            r="8"
            fill="#101414"
            stroke="#ff8656"
            strokeWidth="2"
          />
          <path d="M146 54v66" stroke="#ff8656" strokeDasharray="3 5" />
          <rect
            x="176"
            y="86"
            width="102"
            height="27"
            rx="4"
            fill="#25180f"
            stroke="#66412d"
          />
          <text
            x="190"
            y="103"
            fontSize="10"
            fill="#e9b18a"
            fontFamily="monospace"
          >
            HIGH PRIORITY
          </text>
        </>
      ) : (
        <>
          <rect
            x="48"
            y="22"
            width="224"
            height="106"
            rx="6"
            fill="#101414"
            stroke="#35413a"
          />
          <path d="M48 48h224" stroke="#35413a" />
          <circle cx="61" cy="35" r="3" fill="#ff8656" />
          <path d="M74 35h63" stroke="#65786a" />
          <rect x="62" y="60" width="196" height="22" rx="2" fill="#321d19" />
          <rect x="62" y="86" width="196" height="22" rx="2" fill="#1e2e23" />
          <path
            d="M72 71h7m10 0h120M72 97h7m-3-3v6m13-3h145"
            stroke="#8b9c85"
          />
          <path
            className="ri-check-draw"
            d="m222 32 5 5 9-10"
            stroke="#b2d895"
            strokeWidth="2"
          />
        </>
      )}
    </svg>
  );
}

function CommandPreview() {
  const [stage, setStage] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const play = () => {
    timers.current.forEach(clearTimeout);
    setStage(1);
    timers.current = [
      setTimeout(() => setStage(2), 950),
      setTimeout(() => setStage(3), 2350),
    ];
  };
  return (
    <div className="ri-command-window">
      <div className="ri-command-top">
        <GitPullRequest size={16} />
        <span>Pull request conversation</span>
        <span className="ri-concept-label">CONCEPT PREVIEW</span>
      </div>
      <div className="ri-command-thread">
        <div className="ri-thread-line" />
        <div className="ri-command-comment">
          <span className="ri-person-avatar">you</span>
          <div>
            <div className="ri-comment-meta">
              You <span>commented just now</span>
            </div>
            <code className={stage === 1 ? "ri-typing-command" : ""}>
              reviewiq run
              <span className="ri-caret" />
            </code>
          </div>
        </div>
        <div className="ri-command-reply" aria-live="polite">
          <span className="ri-bot-avatar">
            <Mark />
          </span>
          <div>
            <div className="ri-comment-meta">
              ReviewIQ <span>bot</span>
            </div>
            <AnimatePresence mode="wait">
              <motion.p
                key={stage}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {stage === 0
                  ? "Your next review could start right here."
                  : stage < 3
                    ? "Reading the diff. Checking the surrounding code…"
                    : "Review complete. Found one retry boundary worth a look."}
              </motion.p>
            </AnimatePresence>
            {stage === 3 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="ri-command-result"
              >
                <span className="ri-status-dot" /> 1 finding{" "}
                <span>src/lib/retry.ts:3</span>
              </motion.div>
            )}
          </div>
        </div>
      </div>
      <div className="ri-command-footer">
        <span>Planned GitHub comment workflow</span>
        <button onClick={play} disabled={stage === 1 || stage === 2}>
          {stage === 3 ? <RotateCcw size={13} /> : <Play size={12} />}{" "}
          {stage === 0
            ? "Play preview"
            : stage < 3
              ? "Running preview…"
              : "Replay"}
        </button>
      </div>
    </div>
  );
}

const faqs = [
  [
    "What does ReviewIQ look for?",
    "ReviewIQ analyzes pull requests for logic bugs, security concerns, performance issues, and refactoring opportunities. Findings include an explanation and, where available, a suggested code change.",
  ],
  [
    "How do I start a review?",
    "Sign in with GitHub, select a repository in Pull Requests, fetch its PRs, and choose Analyze. Your results are available in AI Analysis, with previous reviews in Stored Data.",
  ],
  [
    "Can I trigger a review from a GitHub comment?",
    "That’s the next step. We’re planning support for a reviewiq run comment on your pull request. The preview above shows the intended interaction; for now, start reviews from the ReviewIQ dashboard.",
  ],
  [
    "Does ReviewIQ change my code?",
    "The current review flow provides findings and suggested changes for you to inspect. You decide which changes to make and when to merge.",
  ],
];

export function LandingPage() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const heroRef = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const scrollProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
  });
  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const coreY = useTransform(heroProgress, [0, 1], [0, 90]);
  const primary = () =>
    isAuthenticated ? navigate({ to: "/dashboard" }) : login();
  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        document.getElementById("ri-menu-toggle")?.focus();
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [menuOpen]);
  return (
    <MotionConfig reducedMotion="user">
      <div
        className="landing"
        onPointerMove={(event) => {
          if (reducedMotion) return;
          const panel = (event.target as HTMLElement).closest<HTMLElement>(
            ".ri-feature, .ri-button, .ri-command-window, .ri-review-demo",
          );
          if (!panel) return;
          const bounds = panel.getBoundingClientRect();
          panel.style.setProperty(
            "--mouse-x",
            `${event.clientX - bounds.left}px`,
          );
          panel.style.setProperty(
            "--mouse-y",
            `${event.clientY - bounds.top}px`,
          );
          panel.style.setProperty(
            "--magnetic-x",
            `${(event.clientX - bounds.left - bounds.width / 2) * 0.07}px`,
          );
          panel.style.setProperty(
            "--magnetic-y",
            `${(event.clientY - bounds.top - bounds.height / 2) * 0.07}px`,
          );
        }}
      >
        <motion.div
          className="ri-scroll-progress"
          style={{ scaleX: reducedMotion ? scrollYProgress : scrollProgress }}
          aria-hidden="true"
        />
        <a className="ri-skip" href="#main">
          Skip to content
        </a>
        <header className="ri-nav">
          <div className="ri-container ri-nav-inner">
            <a href="#" className="ri-brand" aria-label="ReviewIQ home">
              <Mark />
              <span>
                review<span className="ri-brand-iq">iq</span>
              </span>
            </a>
            <nav
              className={`ri-nav-links ${menuOpen ? "ri-menu-open" : ""}`}
              id="ri-navigation"
              aria-label="Main navigation"
            >
              <a href="#why-reviewiq" onClick={() => setMenuOpen(false)}>
                Why ReviewIQ
              </a>
              <a href="#how-it-works" onClick={() => setMenuOpen(false)}>
                How it works
              </a>
              <a href="#whats-next" onClick={() => setMenuOpen(false)}>
                What’s next <span className="ri-nav-new">NEW</span>
              </a>
            </nav>
            <div className="ri-nav-actions">
              <button className="ri-nav-login" onClick={primary}>
                {isAuthenticated ? "Dashboard" : "Log in"}
                <ArrowUpRight size={14} />
              </button>
              <button className="ri-button ri-button-small" onClick={primary}>
                {isAuthenticated ? "Open app" : "Get started"}
                <ArrowRight size={15} />
              </button>
              <button
                className="ri-menu-toggle"
                id="ri-menu-toggle"
                aria-label={menuOpen ? "Close menu" : "Open menu"}
                aria-expanded={menuOpen}
                aria-controls="ri-navigation"
                onClick={() => setMenuOpen((value) => !value)}
              >
                {menuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>
        </header>
        <main id="main">
          <section className="ri-hero ri-container" ref={heroRef}>
            <div className="ri-hero-ambient" aria-hidden="true" />
            <span className="ri-hero-coordinate" aria-hidden="true">
              RQ—01 / THE REVIEW LAYER
            </span>
            <div className="ri-hero-copy">
              <Reveal>
                <div className="ri-eyebrow">
                  <span className="ri-status-dot ri-dot-orange" /> AI CODE
                  REVIEW. HUMAN PEACE OF MIND.
                </div>
              </Reveal>
              <Reveal delay={0.08}>
                <h1>
                  <span className="ri-heading-line">Write boldly.</span>
                  <span className="ri-heading-line ri-heading-outline">
                    Ship carefully.
                  </span>
                  <span className="ri-heading-line ri-heading-accent">
                    Stay in flow<span className="ri-heading-period">.</span>
                  </span>
                </h1>
              </Reveal>
              <Reveal delay={0.16}>
                <p className="ri-hero-description">
                  Your next bug is hiding in a change that looks fine.
                  <br className="ri-desktop-break" /> Give every pull request a
                  sharper second look.
                </p>
                <div className="ri-hero-actions">
                  <button className="ri-button" onClick={primary}>
                    <Github size={18} />
                    {isAuthenticated ? "Open dashboard" : "Start reviewing"}
                    <ArrowRight size={17} />
                  </button>
                  <a className="ri-text-link" href="#review-demo">
                    <span className="ri-play-circle">
                      <Play size={11} fill="currentColor" />
                    </span>{" "}
                    Watch it work
                  </a>
                </div>
                <div className="ri-hero-note">
                  <Github size={13} /> Built for your GitHub workflow{" "}
                  <span>·</span> You’re in control
                </div>
              </Reveal>
            </div>
            <motion.div
              className="ri-hero-art"
              style={{ y: reducedMotion ? 0 : coreY }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.3, delay: 0.3 }}
            >
              <ReviewCore />
            </motion.div>
            <div className="ri-hero-bottom">
              <span>
                <span className="ri-hero-status">
                  <span className="ri-status-dot" /> BUILT FOR THE PULL REQUEST
                </span>
              </span>
              <span>
                SCROLL TO LOOK CLOSER <ArrowDown size={12} />
              </span>
            </div>
          </section>
          <section
            className="ri-demo-section ri-container"
            aria-label="Interactive review demonstration"
          >
            <Reveal className="ri-demo-section-heading">
              <div className="ri-eyebrow">
                <span className="ri-section-slash">/</span> LESS GUESSWORK. MORE
                SIGNAL.
              </div>
              <h2>
                Small detail.
                <br className="ri-mobile-break" /> <span>Real difference.</span>
              </h2>
              <p>Pick a review. Look under the hood.</p>
            </Reveal>
            <Reveal>
              <ReviewDemo />
            </Reveal>
            <div className="ri-demo-caption">
              <span>
                <GitPullRequest size={14} /> From “looks good” to knowing why.
              </span>
              <span>CONTEXT → FINDING → FIX</span>
            </div>
          </section>
          <div className="ri-signal-strip" aria-hidden="true">
            <div className="ri-signal-track">
              {[0, 1].map((copy) => (
                <div key={copy}>
                  <span>READ THE CONTEXT</span>
                  <span className="ri-strip-star">✳</span>
                  <span>TRACE THE CHANGE</span>
                  <span className="ri-strip-star">✳</span>
                  <span>CATCH THE EDGE CASE</span>
                  <span className="ri-strip-star">✳</span>
                  <span>MAKE THE CALL</span>
                  <span className="ri-strip-star">✳</span>
                </div>
              ))}
            </div>
          </div>
          <section className="ri-benefits ri-container" id="why-reviewiq">
            <Reveal className="ri-section-heading">
              <div>
                <div className="ri-eyebrow">01 / THE SECOND LOOK</div>
                <h2>
                  The small things.
                  <br />
                  <span className="ri-muted">
                    Before they become big things.
                  </span>
                </h2>
              </div>
              <p>
                The missing check. The expensive query.
                <br />
                The edge case hiding in plain sight.
                <br />
                Make room for a more thoughtful review.
              </p>
            </Reveal>
            <div className="ri-features">
              {[
                {
                  title: "The context behind the diff.",
                  body: "Review full files and surrounding code, so a change makes sense beyond the lines in green.",
                  label: "UNDERSTAND THE CHANGE",
                },
                {
                  title: "Know what needs attention.",
                  body: "Findings include severity and a clear explanation. Start with the issues that deserve a closer look.",
                  label: "FIND THE RISK",
                },
                {
                  title: "A concrete next step.",
                  body: "See the original code alongside a suggested change. Understand the reasoning before you make the call.",
                  label: "MAKE THE FIX",
                },
              ].map((feature, i) => (
                <Reveal
                  className="ri-feature"
                  key={feature.title}
                  delay={i * 0.08}
                >
                  <ContextDiagram variant={i} />
                  <div className="ri-feature-label">
                    <span>0{i + 1}</span>
                    {feature.label}
                  </div>
                  <h3>{feature.title}</h3>
                  <p>{feature.body}</p>
                </Reveal>
              ))}
            </div>
          </section>
          <section className="ri-workflow-section" id="how-it-works">
            <div className="ri-container">
              <Reveal className="ri-section-heading">
                <div>
                  <div className="ri-eyebrow">
                    02 / YOUR WORKFLOW, WITH A LITTLE BACKUP
                  </div>
                  <h2>
                    A pull request.
                    <br />A clearer way forward.
                  </h2>
                </div>
                <button className="ri-text-link" onClick={primary}>
                  Take your first look <ArrowUpRight size={17} />
                </button>
              </Reveal>
              <div className="ri-workflow">
                {[
                  {
                    icon: Github,
                    title: "Bring your repository.",
                    body: "Sign in with GitHub and pick the repository you’re working on.",
                    detail: "01 — CONNECT",
                  },
                  {
                    icon: GitPullRequest,
                    title: "Choose a pull request.",
                    body: "Fetch your PRs and start an analysis. ReviewIQ reads the change in context.",
                    detail: "02 — REVIEW",
                  },
                  {
                    icon: Check,
                    title: "Make the call.",
                    body: "Explore findings, inspect suggested fixes, and decide what ships.",
                    detail: "03 — SHIP",
                  },
                ].map((step, i) => (
                  <Reveal key={step.title} className="ri-step" delay={i * 0.08}>
                    <div className="ri-step-path">
                      <span className="ri-step-icon">
                        <step.icon size={24} strokeWidth={1.5} />
                      </span>
                      {i < 2 && (
                        <span className="ri-step-connector">
                          <ChevronRight size={16} />
                        </span>
                      )}
                    </div>
                    <span className="ri-step-label">{step.detail}</span>
                    <h3>{step.title}</h3>
                    <p>{step.body}</p>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>
          <section className="ri-next-section ri-container" id="whats-next">
            <Reveal className="ri-next-copy">
              <div className="ri-eyebrow">
                <span className="ri-coming-dot" /> COMING NEXT
              </div>
              <h2>
                One comment.
                <br />
                <span className="ri-serif">Another perspective.</span>
              </h2>
              <p>
                We’re bringing the review to the conversation.
                <br />
                Soon, ask ReviewIQ to take a look without
                <br className="ri-desktop-break" /> leaving your pull request.
              </p>
              <div className="ri-command-chip">
                <span>⌘</span>
                <code>reviewiq run</code>
                <ArrowRight size={16} />
              </div>
              <span className="ri-next-note">
                In development. Today, reviews start in the dashboard.
              </span>
            </Reveal>
            <Reveal className="ri-next-demo" delay={0.1}>
              <CommandPreview />
            </Reveal>
          </section>
          <section className="ri-faq-section ri-container">
            <Reveal>
              <div className="ri-eyebrow">A FEW THINGS WORTH KNOWING</div>
              <h2>Good questions.</h2>
            </Reveal>
            <div className="ri-faq-list">
              {faqs.map(([question, answer]) => (
                <details key={question}>
                  <summary>
                    {question}
                    <span className="ri-faq-plus" />
                  </summary>
                  <p>{answer}</p>
                </details>
              ))}
            </div>
          </section>
          <section className="ri-final-section">
            <div className="ri-container">
              <Reveal>
                <div className="ri-eyebrow">
                  BUILD SOMETHING. WE’LL TAKE A LOOK.
                </div>
                <h2>
                  Your next merge,
                  <br />
                  <span className="ri-serif">
                    with a little more certainty.
                  </span>
                </h2>
                <button className="ri-button" onClick={primary}>
                  <Github size={18} />
                  {isAuthenticated ? "Open dashboard" : "Start with GitHub"}
                  <ArrowRight size={17} />
                </button>
                <p>Your code. Your call. A second pair of eyes.</p>
              </Reveal>
              <svg
                className="ri-final-orbit"
                viewBox="0 0 540 540"
                fill="none"
                aria-hidden="true"
              >
                <circle cx="270" cy="270" r="180" stroke="currentColor" />
                <circle
                  cx="270"
                  cy="270"
                  r="220"
                  stroke="currentColor"
                  strokeDasharray="3 8"
                />
                <circle cx="270" cy="270" r="260" stroke="currentColor" />
                <path
                  d="m230 270 29 30 62-67"
                  stroke="#e56a42"
                  strokeWidth="3"
                />
                <circle
                  className="ri-orbit-dot"
                  cx="450"
                  cy="270"
                  r="7"
                  fill="#e56a42"
                />
              </svg>
            </div>
          </section>
        </main>
        <footer className="ri-footer ri-container">
          <div className="ri-footer-wordmark" aria-hidden="true">
            review<span>iq</span>
            <span className="ri-wordmark-asterisk">✳</span>
          </div>
          <div className="ri-footer-top">
            <a href="#" className="ri-brand" aria-label="ReviewIQ home">
              <Mark />
              <span>
                review<span className="ri-brand-iq">iq</span>
              </span>
            </a>
            <span>A fresh perspective on your pull requests.</span>
            <a href="mailto:aditya.varshneymail@gmail.com">
              Say hello <ArrowUpRight size={14} />
            </a>
          </div>
          <div className="ri-footer-bottom">
            <span>© {new Date().getFullYear()} ReviewIQ</span>
            <div>
              <a
                href="https://github.com/adityaslyf"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub <ArrowUpRight size={12} />
              </a>
              <a
                href="https://x.com/adityaslyf"
                target="_blank"
                rel="noopener noreferrer"
              >
                X / Twitter <ArrowUpRight size={12} />
              </a>
              <a href="#main">Back to top ↑</a>
            </div>
            <span className="ri-footer-note">
              <span className="ri-status-dot" /> MADE FOR THE CRAFT
            </span>
          </div>
        </footer>
      </div>
    </MotionConfig>
  );
}
