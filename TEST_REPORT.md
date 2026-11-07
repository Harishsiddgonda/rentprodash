# RentPro QA / Test Report

**Project:** RentPro Rental Management App  
**Report date:** 07-Nov-2026  
**Test approach:** Node.js built-in test runner; calculation unit tests and Supertest API integration tests.

## Execution summary

| Test suite | Cases | Passed | Failed | Status |
|---|---:|---:|---:|---|
| Billing calculator unit tests | 4 | 4 | 0 | PASS |
| API integration suite (Supertest) | 5 | 5 | 0 | PASS |
| **Total** | **9** | **9** | **0** | **PASS (100%)** |

Test command executed:

```text
npm test
# tests 9, pass 9, fail 0, duration ~600ms
```

## Billing unit test coverage

1. Standard readings: electricity 150 units × ₹8 = ₹1,200; water 15 units × ₹30 = ₹450; rent ₹10,000 + garbage ₹125; bill total ₹11,775 — PASS.
2. Current electricity reading below previous reading — validation throws — PASS.
3. Negative meter reading — validation throws — PASS.
4. Decimal rate rounding to two currency decimals — PASS.

## API integration test coverage

1. Add flat, generate bill, export CSV, record partial payment, verify dashboard totals, verify PDF response, reject duplicate month — PASS.
2. Enforce meter reading carry-forward from the last generated month — PASS.
3. Reject invalid month format (`YYYY-MM`) — PASS.
4. Reject payment exceeding outstanding balance — PASS.

## Acceptance verification checklist

- [x] API health endpoint returns `status: ok`.
- [x] Owner can create flat/tenant and enter opening meter readings.
- [x] Rate settings save electricity, water, and garbage fee (default garbage ₹125).
- [x] Bill generation calculates utility usage, rent, and charges.
- [x] Repeated bill generation for same month is rejected rather than duplicating invoices.
- [x] Next billing month requires previous readings equal last month's current readings.
- [x] CSV includes every bill line for chosen month and is exportable/shareable.
- [x] Individual flat PDF can be downloaded/shared.
- [x] Partial and full payment change paid amount, outstanding balance, and status.
- [x] Dashboard totals reflect selected month.
- [x] Old records remain in backend data store (`backend/data.json`) and can be browsed by changing month.
- [x] Web frontend bundled and hosted alongside backend API on `http://localhost:4000`.
- [x] Expo Metro bundler running for mobile emulation and live testing on `http://localhost:8081`.
