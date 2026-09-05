"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  AnswerStatus,
  Finding,
  findings,
  questionnaire,
  seedAnswers,
  sourceGroups,
} from "./security-data";

type View = "investigation" | "profile" | "evidence" | "questionnaire";

type Message = {
  id: string;
  role: "analyst" | "user";
  text: string;
  time: string;
  evidenceKeys?: string[];
  kind?: "normal" | "conflict" | "success";
};

type Override = {
  status: AnswerStatus;
  answer: string;
  evidence: string;
  confidence: number;
  confirmedAt: string;
};

type SessionState = {
  messages: Message[];
  overrides: Record<string, Override>;
  pending: "access-details" | null;
};

const initialMessages: Message[] = [
  {
    id: "intro",
    role: "analyst",
    text: "I searched all 26 supplied files before opening this conversation. I can support 42 of 66 questionnaire answers from company information. I found four material contradictions and left the remaining answers unknown.",
    time: "11:42 AM",
  },
  {
    id: "access-conflict",
    role: "analyst",
    text: "The highest-priority conflict is production access. The policy limits standing access to the CTO, but the September 4 review lists several Admin or Editor users. Two are marked unjustified, including a contractor Admin account. Were those access-review actions completed?",
    time: "11:42 AM",
    evidenceKeys: ["production-access"],
    kind: "conflict",
  },
];

const LOCAL_STATE_KEY = "regodit-analyst-state-v1";
const LOCAL_SESSION_KEY = "regodit-analyst-session-v1";

function browserSessionId() {
  const existing = window.localStorage.getItem(LOCAL_SESSION_KEY);
  if (existing) return existing;
  const created = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `session-${Date.now()}`;
  window.localStorage.setItem(LOCAL_SESSION_KEY, created);
  return created;
}

const statusLabel: Record<AnswerStatus, string> = {
  verified: "Verified from files",
  confirmed: "Confirmed by user",
  conflict: "Conflict",
  unknown: "Unknown",
};

const navItems: Array<{ id: View; label: string; short: string }> = [
  { id: "investigation", label: "Investigation", short: "01" },
  { id: "profile", label: "Security profile", short: "02" },
  { id: "evidence", label: "Evidence library", short: "03" },
  { id: "questionnaire", label: "Questionnaire", short: "04" },
];

function nowLabel() {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date());
}

function makeMessage(
  role: Message["role"],
  text: string,
  extras: Pick<Message, "evidenceKeys" | "kind"> = {},
): Message {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    text,
    time: nowLabel(),
    ...extras,
  };
}

function quoteCsv(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

export default function Home() {
  const [view, setView] = useState<View>("investigation");
  const [selectedFinding, setSelectedFinding] = useState("production-access");
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [overrides, setOverrides] = useState<Record<string, Override>>({});
  const [pending, setPending] = useState<SessionState["pending"]>(null);
  const [draft, setDraft] = useState("");
  const [memoryReady, setMemoryReady] = useState(false);
  const [memoryState, setMemoryState] = useState<"loading" | "saved" | "offline">("loading");
  const [traceSummary, setTraceSummary] = useState({ count: 0, connected: false });
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    const sessionId = browserSessionId();
    let loadedLocalState = false;
    try {
      const saved = window.localStorage.getItem(LOCAL_STATE_KEY);
      if (saved) {
        const local = JSON.parse(saved) as SessionState;
        loadedLocalState = true;
        queueMicrotask(() => {
          if (!active) return;
          setMessages(local.messages?.length ? local.messages : initialMessages);
          setOverrides(local.overrides ?? {});
          setPending(local.pending ?? null);
        });
      }
    } catch {
      window.localStorage.removeItem(LOCAL_STATE_KEY);
    }

    fetch("/api/session", { headers: { "x-regodit-session": sessionId } })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((payload: { state: SessionState | null }) => {
        if (!active) return;
        if (payload.state && !loadedLocalState) {
          setMessages(payload.state.messages?.length ? payload.state.messages : initialMessages);
          setOverrides(payload.state.overrides ?? {});
          setPending(payload.state.pending ?? null);
        }
        setMemoryState("saved");
      })
      .catch(() => {
        if (active) setMemoryState("offline");
      })
      .finally(() => {
        if (active) setMemoryReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const sessionId = browserSessionId();
    fetch("/api/trace", { headers: { "x-regodit-session": sessionId } })
      .then((response) => response.json())
      .then((payload: { traces?: unknown[]; prismConfigured?: boolean }) => {
        setTraceSummary({ count: payload.traces?.length ?? 0, connected: Boolean(payload.prismConfigured) });
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!memoryReady) return;
    const sessionId = browserSessionId();
    const state = { messages, overrides, pending };
    window.localStorage.setItem(LOCAL_STATE_KEY, JSON.stringify(state));
    const timer = window.setTimeout(() => {
      fetch("/api/session", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-regodit-session": sessionId,
        },
        body: JSON.stringify({ state }),
      })
        .then((response) => {
          if (!response.ok) throw new Error("save failed");
          setMemoryState("saved");
        })
        .catch(() => setMemoryState("offline"));
    }, 500);
    return () => window.clearTimeout(timer);
  }, [memoryReady, messages, overrides, pending]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages]);

  const rows = useMemo(
    () =>
      questionnaire.map((item) => {
        const resolved = overrides[item.id] ?? seedAnswers[item.id];
        return {
          ...item,
          status: resolved?.status ?? ("unknown" as AnswerStatus),
          answer: resolved?.answer ?? "Unknown — needs confirmation",
          evidence: resolved?.evidence ?? "No supporting company information located",
          confidence: resolved?.confidence ?? 0,
        };
      }),
    [overrides],
  );

  const counts = useMemo(
    () =>
      rows.reduce(
        (totals, row) => {
          totals[row.status] += 1;
          return totals;
        },
        { verified: 0, confirmed: 0, conflict: 0, unknown: 0 } as Record<AnswerStatus, number>,
      ),
    [rows],
  );

  const readyCount = counts.verified + counts.confirmed;
  const activeFinding = findings.find((finding) => finding.key === selectedFinding) ?? findings[0];
  const activeOverride = overrides[activeFinding.questionId];
  const displayedFinding: Finding = activeOverride
    ? {
        ...activeFinding,
        status: activeOverride.status,
        answer: activeOverride.answer,
        confidence: activeOverride.confidence,
        rationale: `Recorded from this conversation ${activeOverride.confirmedAt}.`,
      }
    : activeFinding;

  function addExchange(userText: string, analyst: Message) {
    setMessages((current) => [...current, makeMessage("user", userText), analyst]);
    fetch("/api/trace", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-regodit-session": browserSessionId(),
      },
      body: JSON.stringify({
        input: userText,
        output: analyst.text,
        evidenceKeys: analyst.evidenceKeys ?? [],
        decision: analyst.kind === "conflict" ? "ask_for_clarification" : analyst.evidenceKeys?.length ? "answer_from_evidence" : "keep_unknown",
      }),
    })
      .then((response) => response.json())
      .then((payload: { prismForwarded?: boolean }) => {
        setTraceSummary((current) => ({ count: current.count + 1, connected: current.connected || Boolean(payload.prismForwarded) }));
      })
      .catch(() => undefined);
  }

  function resolveAccess(answer: string, status: AnswerStatus, confidence: number) {
    setOverrides((current) => ({
      ...current,
      "58.0": {
        status,
        answer,
        evidence: "Confirmed in analyst conversation",
        confidence,
        confirmedAt: new Date().toLocaleString(),
      },
    }));
  }

  function handleSuggestedResponse(value: string) {
    setSelectedFinding("production-access");
    if (value === "Yes, all completed") {
      setPending("access-details");
      addExchange(
        value,
        makeMessage(
          "analyst",
          "Thanks. To make that answer usable, what date were the changes completed, which accounts were revoked or reduced, and who verified the result?",
          { evidenceKeys: ["production-access"] },
        ),
      );
      return;
    }
    if (value === "Partially completed") {
      setPending("access-details");
      addExchange(
        value,
        makeMessage(
          "analyst",
          "Which actions are complete, which accounts still have elevated access, and what is the target completion date? I will keep the questionnaire answer in conflict until the remaining access is resolved.",
          { evidenceKeys: ["production-access"], kind: "conflict" },
        ),
      );
      return;
    }
    if (value === "Not yet") {
      resolveAccess(
        "User confirmed that the September 4 access-review actions remain open. Production access currently deviates from the documented policy.",
        "confirmed",
        96,
      );
      addExchange(
        value,
        makeMessage(
          "analyst",
          "Recorded. I will not answer that access is fully compliant. The questionnaire will state that the review identified open revocation and role-reduction actions, confirmed by you. I assigned the remediation follow-up to K. O'Brien.",
          { evidenceKeys: ["production-access"], kind: "success" },
        ),
      );
      return;
    }
    resolveAccess(
      "Unknown. The access review conflicts with policy and a security owner must confirm whether remediation is complete.",
      "unknown",
      22,
    );
    addExchange(
      value,
      makeMessage(
        "analyst",
        "That is the right place to stop rather than guess. I kept the answer unknown and routed one focused question to K. O'Brien: were the September 4 AWS access-review actions completed?",
        { evidenceKeys: ["production-access"] },
      ),
    );
  }

  function answerFromEvidence(input: string) {
    const text = input.toLowerCase();
    if (text.includes("conflict") || text.includes("contradiction")) {
      return makeMessage(
        "analyst",
        "I found four material conflicts: production access, cross-region backup replication, recovery-test history, and whether an on-premises backup server exists. None should be converted into a definitive questionnaire answer without clarification.",
        { evidenceKeys: ["production-access", "backups", "recovery-testing", "physical-infrastructure"], kind: "conflict" },
      );
    }
    if (text.includes("mfa") || text.includes("multi-factor") || text.includes("multifactor")) {
      setSelectedFinding("mfa");
      return makeMessage("analyst", findings.find((item) => item.key === "mfa")!.answer, { evidenceKeys: ["mfa"], kind: "success" });
    }
    if (text.includes("encrypt") || text.includes("at rest")) {
      setSelectedFinding("encryption");
      return makeMessage("analyst", findings.find((item) => item.key === "encryption")!.answer, { evidenceKeys: ["encryption"], kind: "success" });
    }
    if (text.includes("backup") || text.includes("rpo") || text.includes("restore")) {
      setSelectedFinding("backups");
      return makeMessage("analyst", findings.find((item) => item.key === "backups")!.answer, { evidenceKeys: ["backups"], kind: "conflict" });
    }
    if (text.includes("vulnerab") || text.includes("scan") || text.includes("penetration")) {
      setSelectedFinding("vulnerability-scanning");
      return makeMessage("analyst", findings.find((item) => item.key === "vulnerability-scanning")!.answer, { evidenceKeys: ["vulnerability-scanning"], kind: "success" });
    }
    if (text.includes("offboard") || text.includes("termination")) {
      setSelectedFinding("offboarding");
      return makeMessage("analyst", findings.find((item) => item.key === "offboarding")!.answer, { evidenceKeys: ["offboarding"] });
    }
    if ((text.includes("where") || text.includes("location") || text.includes("stored")) && text.includes("data")) {
      setSelectedFinding("data-location");
      return makeMessage("analyst", findings.find((item) => item.key === "data-location")!.answer, { evidenceKeys: ["data-location"], kind: "success" });
    }
    if (text.includes("production") || text.includes("access")) {
      setSelectedFinding("production-access");
      return makeMessage("analyst", findings.find((item) => item.key === "production-access")!.answer + " I need the owner to confirm whether the September 4 actions were completed.", { evidenceKeys: ["production-access"], kind: "conflict" });
    }
    if (/^(yes|yes\.|we do|confirmed)$/i.test(input.trim())) {
      return makeMessage(
        "analyst",
        "I need one more detail before I can record that. Which control does “yes” refer to, what systems are in scope, and is there a policy or operational record that supports it?",
      );
    }
    return makeMessage(
      "analyst",
      "I could not tie that statement to a specific questionnaire control yet. Please name the practice or question you want to update. I will preserve your wording as user-confirmed evidence and keep unsupported details unknown.",
    );
  }

  function submitMessage(event: FormEvent) {
    event.preventDefault();
    const input = draft.trim();
    if (!input) return;
    setDraft("");

    if (pending === "access-details") {
      if (input.length < 12 || /^(yes|done|all done)$/i.test(input)) {
        addExchange(
          input,
          makeMessage(
            "analyst",
            "I still need a completion date, the affected accounts, and the person who verified the change. Without those details I will keep this unresolved.",
            { evidenceKeys: ["production-access"], kind: "conflict" },
          ),
        );
        return;
      }
      resolveAccess(
        `User confirmed the September 4 access-review actions were completed. Details: ${input}`,
        "confirmed",
        93,
      );
      setPending(null);
      addExchange(
        input,
        makeMessage(
          "analyst",
          "Recorded as user-confirmed. I preserved your completion details, updated the security profile, and will not ask this question again unless the answer is corrected.",
          { evidenceKeys: ["production-access"], kind: "success" },
        ),
      );
      return;
    }

    addExchange(input, answerFromEvidence(input));
  }

  function runPrompt(prompt: string) {
    setDraft("");
    addExchange(prompt, answerFromEvidence(prompt));
  }

  function selectEvidence(findingKey: string) {
    setSelectedFinding(findingKey);
  }

  function exportQuestionnaire() {
    const header = ["Question ID", "Control Area", "Question", "Answer", "Evidence Status", "Confidence", "Source / Evidence"];
    const csvRows = [
      header,
      ...rows.map((row) => [
        row.id,
        row.category,
        row.question,
        row.answer,
        statusLabel[row.status],
        row.confidence ? `${row.confidence}%` : "",
        row.evidence,
      ]),
    ];
    const csv = csvRows.map((row) => row.map(quoteCsv).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "regodit-security-questionnaire.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="app-shell">
      <aside className="nav-rail" aria-label="Primary navigation">
        <button className="brand" onClick={() => setView("investigation")} aria-label="Regodit Analyst home">
          <span className="brand-mark">R</span>
          <span className="brand-copy">Regodit<br />Analyst</span>
        </button>
        <nav className="nav-list">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${view === item.id ? "active" : ""}`}
              onClick={() => setView(item.id)}
              aria-current={view === item.id ? "page" : undefined}
            >
              <span>{item.short}</span>
              <strong>{item.label}</strong>
            </button>
          ))}
        </nav>
        <div className="rail-foot">
          <span className={`memory-dot ${memoryState}`} />
          <span>{memoryState === "saved" ? "Memory on" : memoryState === "loading" ? "Loading" : "Local preview"}</span>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <span className="eyebrow">Enterprise readiness review</span>
            <h1>Regodit security review</h1>
          </div>
          <div className="review-progress" aria-label={`${readyCount} of 66 answers ready`}>
            <div className="progress-copy">
              <strong>{readyCount}<span>/66</span></strong>
              <span>answers ready</span>
            </div>
            <div className="progress-track"><span style={{ width: `${(readyCount / 66) * 100}%` }} /></div>
          </div>
          <button className="export-button" onClick={exportQuestionnaire}>Export questionnaire</button>
        </header>

        {view === "investigation" && (
          <section className="investigation-view">
            <div className="section-heading">
              <div>
                <span className="section-kicker">Live investigation</span>
                <h2>Resolve what the files cannot.</h2>
              </div>
              <div className="status-cluster" aria-label="Questionnaire status summary">
                <span><i className="dot verified" />{counts.verified} verified</span>
                <span><i className="dot conflict" />{counts.conflict} conflicts</span>
                <span><i className="dot unknown" />{counts.unknown} unknown</span>
              </div>
            </div>

            <div className="priority-strip">
              <div className="priority-number">01</div>
              <div>
                <span className="priority-label">Priority question</span>
                <strong>Who currently has standing production access?</strong>
              </div>
              <span className="owner-pill">Owner · K. O&apos;Brien</span>
            </div>

            <div className="chat" aria-live="polite">
              {messages.map((message) => (
                <article key={message.id} className={`message ${message.role} ${message.kind ?? ""}`}>
                  <div className="message-meta">
                    <span>{message.role === "analyst" ? "Regodit Analyst" : "You"}</span>
                    <time>{message.time}</time>
                  </div>
                  <p>{message.text}</p>
                  {!!message.evidenceKeys?.length && (
                    <div className="message-evidence">
                      {message.evidenceKeys.map((key) => {
                        const finding = findings.find((item) => item.key === key);
                        if (!finding) return null;
                        return (
                          <button key={key} onClick={() => selectEvidence(key)}>
                            <span>{finding.status === "conflict" ? "Conflict" : "Evidence"}</span>
                            {finding.evidence.length} source{finding.evidence.length === 1 ? "" : "s"}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </article>
              ))}
              <div ref={chatEndRef} />
            </div>

            {messages.length <= 2 && (
              <div className="response-options" aria-label="Suggested responses">
                {["Yes, all completed", "Partially completed", "Not yet", "I don’t know"].map((option) => (
                  <button key={option} onClick={() => handleSuggestedResponse(option)}>{option}</button>
                ))}
              </div>
            )}

            <div className="prompt-suggestions">
              {["Is MFA enabled?", "Where is customer data stored?", "What conflicts did you find?"].map((prompt) => (
                <button key={prompt} onClick={() => runPrompt(prompt)}>{prompt}</button>
              ))}
            </div>

            <form className="composer" onSubmit={submitMessage}>
              <label htmlFor="analyst-message">Message the analyst</label>
              <div className="composer-row">
                <textarea
                  id="analyst-message"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                  placeholder="Ask about a control or correct an answer…"
                  rows={2}
                />
                <button type="submit" aria-label="Send message">Send</button>
              </div>
              <div className="composer-note"><span />Searches evidence first · Unknown stays unknown</div>
            </form>
          </section>
        )}

        {view === "profile" && (
          <section className="list-view">
            <div className="section-heading">
              <div><span className="section-kicker">Persistent security profile</span><h2>What Regodit can prove today.</h2></div>
              <p>Each claim keeps its source, confidence, and correction history.</p>
            </div>
            <div className="finding-grid">
              {findings.map((finding) => {
                const saved = overrides[finding.questionId];
                const status = saved?.status ?? finding.status;
                return (
                  <button
                    key={finding.key}
                    className={`finding-card ${selectedFinding === finding.key ? "selected" : ""}`}
                    onClick={() => setSelectedFinding(finding.key)}
                  >
                    <div className="card-top"><span className={`status-tag ${status}`}>{statusLabel[status]}</span><strong>{saved?.confidence ?? finding.confidence}%</strong></div>
                    <h3>{finding.title}</h3>
                    <p>{saved?.answer ?? finding.answer}</p>
                    <span className="source-count">{finding.evidence.length} linked source{finding.evidence.length === 1 ? "" : "s"}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {view === "evidence" && (
          <section className="list-view evidence-library">
            <div className="section-heading">
              <div><span className="section-kicker">Evidence library</span><h2>26 files, mapped by trust.</h2></div>
              <p>Policies describe intent. Operational records and assurance reports help test reality.</p>
            </div>
            <div className="source-grid">
              {sourceGroups.map((group, index) => (
                <article key={group.name} className="source-group">
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{group.count}</strong>
                  <h3>{group.name}</h3>
                  <p>{group.note}</p>
                </article>
              ))}
            </div>
            <div className="observability-card">
              <div className="observability-head">
                <div><span className="section-kicker">Agent observability</span><h3>Every answer leaves a trace.</h3></div>
                <span className={`connection-state ${traceSummary.connected ? "connected" : "ready"}`}>
                  {traceSummary.connected ? "PRISM connected" : "PRISM ready"}
                </span>
              </div>
              <div className="trace-flow" aria-label="Example evidence trace">
                <div><span>01</span><strong>Search</strong><small>26 company files</small></div>
                <i />
                <div><span>02</span><strong>Retrieve</strong><small>2 exact sources</small></div>
                <i />
                <div><span>03</span><strong>Compare</strong><small>Conflict detected</small></div>
                <i />
                <div><span>04</span><strong>Decide</strong><small>Ask, do not guess</small></div>
              </div>
              <p>{traceSummary.count} conversation trace{traceSummary.count === 1 ? "" : "s"} captured in persistent memory. Live PRISM forwarding activates only when project credentials are configured.</p>
            </div>
            <div className="conflict-ledger">
              <div className="ledger-head"><span>Conflict ledger</span><strong>4 require a person</strong></div>
              {findings.filter((item) => item.status === "conflict").map((finding) => (
                <button key={finding.key} onClick={() => setSelectedFinding(finding.key)}>
                  <span className="ledger-index">{finding.questionId}</span>
                  <span><strong>{finding.title}</strong><small>{finding.conflict}</small></span>
                  <span className="ledger-owner">{finding.owner}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {view === "questionnaire" && (
          <section className="list-view questionnaire-view">
            <div className="section-heading">
              <div><span className="section-kicker">Vendor questionnaire</span><h2>Every answer shows its basis.</h2></div>
              <p>{readyCount} ready · {counts.conflict} conflicts · {counts.unknown} unknown</p>
            </div>
            <div className="question-table" role="table" aria-label="Security questionnaire">
              <div className="question-row question-header" role="row">
                <span>Control</span><span>Question and answer</span><span>Basis</span>
              </div>
              {rows.map((row) => (
                <button
                  key={row.id}
                  className="question-row"
                  role="row"
                  onClick={() => {
                    const matching = findings.find((finding) => finding.questionId === row.id);
                    if (matching) setSelectedFinding(matching.key);
                  }}
                >
                  <span className="question-id">{row.id}</span>
                  <span className="question-main"><strong>{row.question}</strong><small>{row.answer}</small></span>
                  <span className={`status-tag ${row.status}`}>{statusLabel[row.status]}</span>
                </button>
              ))}
            </div>
          </section>
        )}
      </section>

      <aside className="evidence-pane" aria-label="Evidence details">
        <div className="evidence-head">
          <span className="eyebrow">Evidence inspector</span>
          <span className={`status-tag ${displayedFinding.status}`}>{statusLabel[displayedFinding.status]}</span>
        </div>
        <div className="finding-title">
          <span>{displayedFinding.questionId}</span>
          <h2>{displayedFinding.title}</h2>
        </div>
        <div className="confidence-block">
          <div><span>Confidence</span><strong>{displayedFinding.confidence}%</strong></div>
          <div className="confidence-track"><span style={{ width: `${displayedFinding.confidence}%` }} /></div>
          <p>{displayedFinding.rationale}</p>
        </div>
        <div className="answer-block">
          <span>Current answer</span>
          <p>{displayedFinding.answer}</p>
        </div>
        {displayedFinding.conflict && !activeOverride && (
          <div className="conflict-block">
            <span>Why this is blocked</span>
            <p>{displayedFinding.conflict}</p>
          </div>
        )}
        <div className="evidence-list">
          <div className="evidence-list-head"><span>Linked evidence</span><strong>{displayedFinding.evidence.length}</strong></div>
          {displayedFinding.evidence.map((item, index) => (
            <article key={`${item.source}-${item.location}`}>
              <div className="source-marker">{String(index + 1).padStart(2, "0")}</div>
              <div>
                <span className={`strength ${item.strength}`}>{item.strength}</span>
                <h3>{item.source}</h3>
                <small>{item.location}</small>
                <p>“{item.excerpt}”</p>
              </div>
            </article>
          ))}
        </div>
        {displayedFinding.owner && (
          <div className="assignment"><span>Clarification owner</span><strong>{displayedFinding.owner}</strong></div>
        )}
      </aside>
    </main>
  );
}
