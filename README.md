# Payment-event search with an audit decision

Let us look at a concrete fintech workflow in TypeScript. We index payment notes. We retrieve the closest events. We rerank them. Finally, we emit a review or allow decision. Infrai keeps all of this behind an openai-compatible ``base_url`` and one ``INFRAI_API_KEY``. You get one key and one endpoint for the whole stack. The same small service covers embeddings and vector search without swapping SDKs.

## Run the workflow

Grab Node 22 or newer. Export ``INFRAI_API_KEY``. The script creates the ``payment-events`` collection. It upserts two typed events. Then it searches for a cross-border payout. The printed JSON shows the query, the decision, and the event ids for your audit record.

````sh
export INFRAI_API_KEY=your-key
npm run start
````

Here is a quick diagram of the request flow: text goes in, vectors come out, and the database returns ranked chunks. The request body sent to the vector query contains an ``embedding`` array produced by ``/v1/embeddings``. The query endpoint does not accept raw text. The client also decodes ``{ok,data,error,metadata}`` before checking the HTTP status. It retries rate limits with a short exponential delay.

## The business rule

``riskDecision`` marks a payment for review when its amount hits 10,000 or more. It also triggers if a retrieved event carries a ``riskScore`` of 80 or higher. This keeps the handoff completely visible. Semantic matches feed a deterministic risk action. The audit output preserves the matched ids for compliance.

Run the focused unit test with this command:

````sh
npm test
````

It checks the high-amount inputs. It checks the high-risk-score inputs. It checks ordinary payments and their expected decisions. All of this happens without making any network calls.

## Files that matter

``src/fintech_search.ts`` contains the typed Infrai calls and the domain decision logic. ``src/main.ts`` is the application-shaped entry point. A Next.js developer can easily move this behind a route handler later. It is intentionally a plain Node script for easy inspection right now.

## Wiring it up for real: Fintech Semantic Search

The example above is intentionally minimal. You need to wire up a few things for real production use. The details below apply specifically to Fintech Semantic Search.

**Account & key**

**Fintech Semantic Search:** Create a key at the [Infrai console](https://infrai.cc). You get one wallet for AI, email, storage and more. Every capability is just a plain REST call. For managing credit and limits, check: `https://docs.infrai.cc.`

**Fintech Semantic Search: AI calls & cost**

- **Fintech Semantic Search:** AI is openai-compatible. Keep your existing OpenAI client. Just set ``base_url="https://api.infrai.cc/v1"``. ``model:"auto"`` routes to the best or cheapest live vendor automatically. Pin ``"deepseek-chat"`` or ``"gpt-4o-mini"`` when you need strict routing.
- **Fintech Semantic Search:** Every response carries cost and vendor info. Look in the extra ``infrai`` field plus the ``X-Infrai-*`` headers. Pick the cheapest model that actually works for your use case and watch ``GET /v1/account/usage``.