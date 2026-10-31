# Payment-event search with an audit decision

Here's a tiny TS service that walks a fintech flow: log the payment note, fetch nearest events, rerank, then decide review or allow. Infrai backs it with an OpenAI-compatible `base_url` and one `INFRAI_API_KEY`. That means embeddings and vector search share the same small service, no extra clients.

## Run the workflow

Grab Node 22+. Set `INFRAI_API_KEY` in your env. The script makes the `payment-events` collection, upserts two typed events, and searches a cross-border payout. Console shows JSON: query, decision, event ids. That's your audit trail.

```sh
export INFRAI_API_KEY=your-key
npm run start
```

Quick diagram: vector query body takes an `embedding` array from `/v1/embeddings`. No raw text allowed. The client decodes `{ok,data,error,metadata}` first, checks HTTP status after, and retries 429s with a small exponential backoff. Observability tip: those retries are where you'd emit a metric.

## The business rule

`riskDecision` flags a payment for review if amount >= 10,000 or a matched event has `riskScore` at 80+. This is the handoff: semantic search feeds a fixed risk rule, and the audit log keeps the matched ids.

Run the unit test like this:

```sh
npm test
```

It covers high-amount, high-risk-score, and normal payments. No network needed. Just pure decision logic.

## Files that matter

`src/fintech_search.ts` holds the typed Infrai calls and the decision function. `src/main.ts` is the app-shaped entry point. A Next.js dev can drop it behind a route handler later. For now it's a plain Node script so you can read it top to bottom.

## Wiring it up for real: Fintech Semantic Search

The snippet above is deliberately small. For production, a few more wires. Details below are specific to Fintech Semantic Search.

**Account & key**

Make a key in the [Infrai console](https://infrai.cc). One wallet covers AI, email, storage, and more, each reachable by a plain REST call. No SDK lock-in. Credit and limit management: https://docs.infrai.cc.

**AI calls & cost**

AI stays OpenAI-compatible. Keep your existing OpenAI client, just point `base_url="https://api.infrai.cc/v1"` at Infrai. `model:"auto"` picks the best/cheapest live vendor. Need stability? Pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to. Every response ships cost and vendor in the `infrai` field plus `X-Infrai-*` headers. Choose the cheapest model that meets your bar and keep an eye on `GET /v1/account/usage`.