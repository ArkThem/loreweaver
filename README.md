# LoreWeaver Proxy SillyTavern Extension

This is the MVP extension shell for LoreWeaver. It listens for chat events,
sends message events to the proxy, exposes a small Memory panel, and provides
`window.LoreWeaverProxy.buildSTMemoryMetadata()` for request metadata wiring.

Install it by copying this directory into SillyTavern's third-party extension
directory:

```text
SillyTavern/public/scripts/extensions/third-party/loreweaver-proxy
```

Point the panel at the proxy URL, usually:

```text
http://localhost:8088
```

For the Kubernetes/NPM route, use:

```text
/loreweaver
```

## UI Smoke

Click `UI Smoke` in the LoreWeaver panel to run a synthetic end-to-end check
from inside SillyTavern. It does not add a message to the visible chat. The test
uses the current world metadata, creates an isolated synthetic chat id, then:

1. checks `/readyz`;
2. checks `/v1/debug/status`;
3. checks `/v1/models`;
4. checks `/v1/embeddings`;
5. ingests a synthetic message about Lyra;
6. retrieves a memory block;
7. deletes the synthetic message;
8. verifies via debug endpoint that active facts are gone.

The result is printed in the debug output block as a compact pass/fail JSON
report.
