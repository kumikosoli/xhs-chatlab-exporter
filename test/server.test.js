import assert from "node:assert/strict";
import test from "node:test";

import { createAppServer } from "../src/server.js";

class FakeBridge {
  async runPageFunction(pageFunction, argument) {
    switch (pageFunction.name) {
      case "conversationStatePage":
        return {
          id: "62a4ea3d0000000021022482",
          name: "CandleST",
          kind: "c2c",
          messageListReady: true,
          messageCount: 42
        };
      case "scrollConversationListPage":
        return {
          changed: argument?.position === "top",
          top: 0,
          height: 500,
          clientHeight: 500
        };
      case "listConversationsPage":
        return {
          items: [
            {
              id: "62a4ea3d0000000021022482",
              kind: "c2c",
              name: "CandleST",
              active: true
            },
            {
              id: "137999752897687566",
              kind: "group",
              name: "测试群",
              active: false
            },
            {
              id: "__stranger_folder__",
              kind: "stranger-folder",
              name: "陌生人",
              active: false
            }
          ],
          scroll: { top: 0, height: 500, clientHeight: 500 }
        };
      default:
        throw new Error(`unexpected page function: ${pageFunction.name}`);
    }
  }
}

async function withServer(run) {
  const app = createAppServer({ bridge: new FakeBridge() });
  await new Promise((resolve) => app.server.listen(0, "127.0.0.1", resolve));
  const address = app.server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  try {
    await run({ app, baseUrl });
  } finally {
    await new Promise((resolve) => app.server.close(resolve));
  }
}

test("serves the local console with restrictive browser headers", async () => {
  await withServer(async ({ baseUrl }) => {
    const response = await fetch(`${baseUrl}/`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /text\/html/);
    assert.match(response.headers.get("content-security-policy"), /default-src 'self'/);
    assert.match(await response.text(), /小红书聊天归档器/);
  });
});

test("reports Safari state and returns only exportable conversations", async () => {
  await withServer(async ({ baseUrl }) => {
    const status = await (await fetch(`${baseUrl}/api/status`)).json();
    assert.equal(status.connected, true);
    assert.equal(status.state.name, "CandleST");

    const conversations = await (
      await fetch(`${baseUrl}/api/conversations`)
    ).json();
    assert.equal(conversations.conversations.length, 2);
    assert.deepEqual(
      conversations.conversations.map((item) => item.kind),
      ["private", "group"]
    );
  });
});

test("rejects local mutations without the per-process token", async () => {
  await withServer(async ({ baseUrl }) => {
    const response = await fetch(`${baseUrl}/api/export`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}"
    });
    assert.equal(response.status, 403);
  });
});
