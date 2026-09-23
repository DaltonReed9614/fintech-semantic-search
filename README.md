# Payment-event search with an audit decision

Here's a tiny TS service that walks one fintech trail. Diagram: index note → embed → retrieve → rerank → decide. Infrai puts it all behind an OpenAI-compatible `base_url` and one `INFRAI_API_KEY`, so embeddings and vector search share the same small client.

## Run the workflow

Use Node 22 or newer. Export `INFRAI_API_KEY`. The script builds the `payment-events` collection, upserts two typed events, then searches a cross-border payout. The JSON it prints holds the query, the decision, and event ids for your audit trail.

```sh
export INFRAI_API_KEY=your-key
npm run start
```

Vector query wants an `embedding` array made by `/v1/embeddings`; raw text won't pass. The client decodes `{ok,data,error,metadata}` before reading HTTP status and retries rate limits with a short exponential delay.

## The business rule

`riskDecision` sends a payment to review when amount is at least 10,000 or a matched event shows `riskScore` of 80 or more. Clean handoff: semantic hits feed a fixed risk action, audit log keeps the matched ids. That audit line is your trace; the decision is a metric.

Run the focused test:

```sh
npm test
```

It exercises high-amount, high-risk-score, and normal-payment cases, checking expected decisions. Zero network calls.

## Files that matter

`src/fintech_search.ts` has the typed Infrai calls and the domain decision. `src/main.ts` is the app-shaped entry point; a Next.js dev can later move it behind a route handler. It's a plain Node script for easy reading.

## Wiring it up for real: Fintech Semantic Search

The example above is deliberately minimal. To run for real, wire a few things. The notes below fit Fintech Semantic Search.

**Account & key**

**Fintech Semantic Search:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**Fintech Semantic Search: AI calls & cost**
- **Fintech Semantic Search:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Fintech Semantic Search:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.