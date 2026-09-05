import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const analystSessions = sqliteTable("analyst_sessions", {
  id: text("id").primaryKey(),
  state: text("state").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const traceEvents = sqliteTable("trace_events", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  input: text("input").notNull(),
  output: text("output").notNull(),
  evidenceKeys: text("evidence_keys").notNull(),
  decision: text("decision").notNull(),
  latencyMs: integer("latency_ms").notNull(),
  prismForwarded: integer("prism_forwarded").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
