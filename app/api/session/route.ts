const MAX_STATE_BYTES = 240_000;

type StoredSession = {
  state: unknown;
  updatedAt: string;
};

const runtime = globalThis as typeof globalThis & {
  regoditSessions?: Map<string, StoredSession>;
};

const sessions = (runtime.regoditSessions ??= new Map<string, StoredSession>());

function sessionId(request: Request) {
  const value = request.headers.get("x-regodit-session") ?? "regodit-demo";
  return /^[a-zA-Z0-9-]{1,100}$/.test(value) ? value : "regodit-demo";
}

export async function GET(request: Request) {
  const saved = sessions.get(sessionId(request));
  return Response.json({
    state: saved?.state ?? null,
    updatedAt: saved?.updatedAt ?? null,
  });
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { state?: unknown };
    const serialized = JSON.stringify(payload.state ?? null);

    if (serialized.length > MAX_STATE_BYTES) {
      return Response.json({ error: "Session state is too large" }, { status: 413 });
    }

    const updatedAt = new Date().toISOString();
    sessions.set(sessionId(request), {
      state: JSON.parse(serialized),
      updatedAt,
    });

    return Response.json({ saved: true, updatedAt });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to save analyst memory" },
      { status: 500 },
    );
  }
}
