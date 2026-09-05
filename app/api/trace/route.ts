type TraceEvent = {
  id: string;
  sessionId: string;
  input: string;
  output: string;
  evidenceKeys: string[];
  decision: string;
  latencyMs: number;
  prismForwarded: boolean;
  createdAt: string;
};

const runtime = globalThis as typeof globalThis & {
  regoditTraces?: TraceEvent[];
};

const traces = (runtime.regoditTraces ??= []);

function sessionId(request: Request) {
  const value = request.headers.get("x-regodit-session") ?? "regodit-demo";
  return /^[a-zA-Z0-9-]{1,100}$/.test(value) ? value : "regodit-demo";
}

function prismConfigured() {
  return Boolean(process.env.PRISMTRACE_PROJECT_ID && process.env.PRISMTRACE_API_KEY);
}

export async function GET(request: Request) {
  const currentSession = sessionId(request);
  return Response.json({
    traces: traces.filter((trace) => trace.sessionId === currentSession).slice(-12).reverse(),
    prismConfigured: prismConfigured(),
  });
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  const payload = (await request.json()) as {
    input?: string;
    output?: string;
    evidenceKeys?: string[];
    decision?: string;
  };
  const input = payload.input?.slice(0, 8_000) ?? "";
  const output = payload.output?.slice(0, 16_000) ?? "";
  if (!input || !output) {
    return Response.json({ error: "input and output are required" }, { status: 400 });
  }

  const currentSession = sessionId(request);
  const evidenceKeys = payload.evidenceKeys ?? [];
  const decision = payload.decision?.slice(0, 120) ?? "evidence_response";
  const latencyMs = Math.max(1, Date.now() - startedAt);
  let prismForwarded = false;

  const host = process.env.PRISMTRACE_HOST ?? "https://prism.blockconvey.com";
  if (prismConfigured()) {
    try {
      const response = await fetch(`${host.replace(/\/$/, "")}/api/traces`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "X-PRISMtrace-Key": process.env.PRISMTRACE_API_KEY!,
        },
        body: JSON.stringify({
          project_id: process.env.PRISMTRACE_PROJECT_ID,
          session_id: currentSession,
          agent_id: "regodit-security-analyst",
          model: "regodit-evidence-engine-v1",
          input_messages: [{ role: "user", content: input }],
          output_message: output,
          latency_ms: latencyMs,
          metadata: { evidence_keys: evidenceKeys, decision },
        }),
      });
      prismForwarded = response.ok;
    } catch {
      prismForwarded = false;
    }
  }

  traces.push({
    id: crypto.randomUUID(),
    sessionId: currentSession,
    input,
    output,
    evidenceKeys,
    decision,
    latencyMs,
    prismForwarded,
    createdAt: new Date().toISOString(),
  });
  if (traces.length > 500) traces.splice(0, traces.length - 500);

  return Response.json({ captured: true, prismForwarded });
}
