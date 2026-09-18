import { strict as assert } from "node:assert";
import { riskDecision } from "../src/fintech_search.js";

assert.equal(riskDecision(12500, []), "review");
assert.equal(riskDecision(42, [{ id: "x", score: 0.9, metadata: { riskScore: 85 } }]), "review");
assert.equal(riskDecision(42, [{ id: "x", score: 0.9, metadata: { riskScore: 10 } }]), "allow");
console.log("risk decision tests passed");
