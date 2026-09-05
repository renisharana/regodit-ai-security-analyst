import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("build contains the Regodit analyst experience", async () => {
  const [page, layout, securityData] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/security-data.ts", import.meta.url), "utf8"),
    access(new URL("../dist/server/index.js", import.meta.url)),
  ]);

  assert.match(layout, /Regodit Analyst/);
  assert.match(page, /What Regodit can prove today\./);
  assert.match(page, /Investigation/);
  assert.match(page, /Security profile/);
  assert.match(page, /Evidence library/);
  assert.match(page, /Questionnaire/);
  assert.match(page, /api\/session/);
  assert.match(page, /api\/trace/);
  assert.match(securityData, /production-access/);
  assert.match(securityData, /Unknown — needs confirmation|status: "unknown"/);
  assert.doesNotMatch(page, /Your site is taking shape/);
});
