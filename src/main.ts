import { indexEvents, searchEvents, riskDecision, type PaymentEvent } from "./fintech_search.js";

const events: PaymentEvent[] = [
  { id: "pay_1001", merchant: "Northstar Pay", amount: 12500, currency: "USD", note: "Unusual cross-border payout from a new device" },
  { id: "pay_1002", merchant: "Harbor Books", amount: 42, currency: "USD", note: "Routine monthly subscription" }
];

const query = process.argv.slice(2).join(" ") || "cross-border payout from a new device";
await indexEvents(events);
const hits = await searchEvents(query);
const decision = riskDecision(events[0].amount, hits);
console.log(JSON.stringify({ query, decision, audit: { eventId: events[0].id, matched: hits.map((hit) => hit.id) } }));
