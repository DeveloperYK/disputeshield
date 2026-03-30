---
shaping: true
---

# Close the Loop — Shaping

## Problem

The core happy path (dispute arrives → merchant analyzes → submits evidence to Stripe) is 90% built but breaks at critical points. A merchant connecting today would see disputes, get AI analysis, but couldn't actually submit a response back to Stripe. The product is a shell without the last mile.

## Outcome

A merchant can connect their Stripe test account, receive a test dispute, analyze it, compile evidence, generate a response, and submit it back to Stripe — all within DisputeShield.

---

## Requirements (R)

| ID | Requirement | Status |
|----|-------------|--------|
| R0 | End-to-end flow works: dispute in → evidence submitted to Stripe | Core goal |
| R1 | Stripe reason strings map to our reason code database | Must-have |
| R2 | Evidence is actually submitted to Stripe via their API | Must-have |
| R3 | Merchants can upload files (screenshots, PDFs) as evidence | Must-have |
| R4 | Subscription tier gates features (free can't generate responses) | Nice-to-have |
| R5 | Approaching deadlines surface to the merchant | Nice-to-have |
| R6 | Works against Stripe test mode for demo/development | Must-have |

---

## Shape A: Close the gaps in order

Minimal changes to existing code to complete the flow.

| Part | Mechanism |
|------|-----------|
| **A1** | **Reason code mapper** — Map Stripe's `reason` strings (e.g. "fraudulent", "product_not_received") to our reason_codes.json entries. Add mapping table + fallback to closest match. |
| **A2** | **Stripe evidence submission** — Call `stripe.Dispute.modify()` with evidence dict built from our Evidence records. Map our evidence types to Stripe's evidence fields. |
| **A3** | **File upload** — Add upload endpoint that stores files locally (dev) or S3 (prod). Evidence records get file_url populated. Frontend gets file picker in add-evidence dialog. |
| **A4** | **Tier gating middleware** — Decorator/dependency that checks user's subscription_tier before allowing analyze/generate endpoints. Free = view only, Starter = analyze + evidence, Growth+ = full. |
| **A5** | **Deadline surfacing** — Sort disputes by evidence_due_by. Show countdown badge on dispute cards. Dashboard stat for "due within 48h". |

---

## Fit Check: R × A

| Req | Requirement | Status | A |
|-----|-------------|--------|---|
| R0 | End-to-end flow works | Core goal | ✅ |
| R1 | Stripe reason → reason code mapping | Must-have | ✅ |
| R2 | Evidence submitted to Stripe API | Must-have | ✅ |
| R3 | File upload for evidence | Must-have | ✅ |
| R4 | Tier gating | Nice-to-have | ✅ |
| R5 | Deadline surfacing | Nice-to-have | ✅ |
| R6 | Works with Stripe test mode | Must-have | ✅ |

---

## Slices (implementation order)

### V1: Reason code mapping + Stripe submission
- A1 + A2 — closes the core loop
- Merchant can go dispute → analyze → generate → submit to Stripe
- Demo: create test dispute in Stripe, submit evidence via DisputeShield

### V2: File upload
- A3 — local file storage for dev, S3-ready interface
- Frontend file picker in evidence dialog
- Demo: upload a screenshot, see it in evidence list

### V3: Tier gating + deadline surfacing
- A4 + A5 — polish for production
- Free users see analysis locked, upgrade CTA
- Countdown timers on dispute cards

---

## Decision

Only one shape here — the architecture is set, we're filling gaps. Start with V1 (reason mapping + Stripe submission) since it's the core loop.
