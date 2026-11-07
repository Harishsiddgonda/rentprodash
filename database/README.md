# RentPro Database

RentPro uses a lightweight, zero-dependency persistent JSON document database store located at `backend/data.json`.

## Schema & Collections

### 1. `flats`
Stores apartment units and tenant occupancy details:
- `id` (Number): Unique flat identifier
- `flatNumber` (String): Unit number (e.g., "101", "201")
- `tenantName` (String): Current tenant's full name (or empty string if vacant)
- `phone` (String): Contact phone number
- `monthlyRent` (Number): Base monthly rental amount in INR (₹)
- `electricityReading` (Number): Initial / opening electricity meter reading
- `waterReading` (Number): Initial / opening water meter reading
- `occupied` (Boolean): Automatic flag indicating whether the unit is currently leased

### 2. `bills`
Stores monthly generated invoices and payment ledger:
- `id` (Number): Unique invoice identifier
- `flatId` (Number): Foreign key referencing `flats.id`
- `flatNumber` (String): Flat number
- `tenantName` (String): Tenant name on the bill
- `month` (String): Billing cycle period in `YYYY-MM` format (e.g. `2026-10`)
- `rent` (Number): Rent amount
- `electricityPrevious` (Number): Opening meter reading for the billing month
- `electricityCurrent` (Number): Closing meter reading
- `electricityUnits` (Number): Consumed units (`electricityCurrent - electricityPrevious`)
- `electricityRate` (Number): Rate per unit in INR (from settings)
- `electricityAmount` (Number): Total electricity charge (`units × rate`)
- `waterPrevious` (Number): Opening water meter reading
- `waterCurrent` (Number): Closing water meter reading
- `waterUnits` (Number): Consumed water units (`waterCurrent - waterPrevious`)
- `waterRate` (Number): Rate per unit in INR (from settings)
- `waterAmount` (Number): Total water charge (`units × rate`)
- `garbageAmount` (Number): Fixed sanitation/garbage maintenance charge
- `otherCharges` (Number): Any ad-hoc adjustments or miscellaneous charges
- `total` (Number): Net invoice amount (`rent + electricity + water + garbage + other`)
- `paidAmount` (Number): Cumulative payments received towards this bill
- `balance` (Number): Remaining unpaid balance (`total - paidAmount`)
- `status` (String): `PAID` | `PARTIAL` | `PENDING`
- `paymentMethod` (String): e.g. `UPI`, `CASH`, `NET_BANKING`
- `paymentDate` (String): ISO date string `YYYY-MM-DD`

### 3. `settings`
Global tariff rates configured by the property manager:
- `electricityRate` (Number): Cost per kWh / electricity unit (default: ₹8)
- `waterRate` (Number): Cost per 1000L / water unit (default: ₹30)
- `garbageAmount` (Number): Fixed monthly charge per flat (default: ₹125)

## Seed Data

A ready-to-use sample dataset with preconfigured flats and October 2026 billing records is provided in [`database/data.json`](./data.json) and mirrored in [`backend/data.json`](../backend/data.json).
