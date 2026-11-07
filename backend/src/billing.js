'use strict';

function nonNegativeNumber(value, label) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw new Error(`${label} must be a non-negative number`);
  return n;
}
function calculateBill(flat, readings, settings = {}) {
  const electricityPrevious = nonNegativeNumber(readings.electricityPrevious, 'Electricity previous reading');
  const electricityCurrent = nonNegativeNumber(readings.electricityCurrent, 'Electricity current reading');
  const waterPrevious = nonNegativeNumber(readings.waterPrevious, 'Water previous reading');
  const waterCurrent = nonNegativeNumber(readings.waterCurrent, 'Water current reading');
  if (electricityCurrent < electricityPrevious) throw new Error('Electricity current reading cannot be lower than previous reading');
  if (waterCurrent < waterPrevious) throw new Error('Water current reading cannot be lower than previous reading');
  const electricityRate = nonNegativeNumber(settings.electricityRate ?? 8, 'Electricity rate');
  const waterRate = nonNegativeNumber(settings.waterRate ?? 30, 'Water rate');
  const garbageAmount = nonNegativeNumber(settings.garbageAmount ?? 125, 'Garbage amount');
  const rent = nonNegativeNumber(flat.monthlyRent, 'Monthly rent');
  const electricityUnits = electricityCurrent - electricityPrevious;
  const waterUnits = waterCurrent - waterPrevious;
  const electricityAmount = round2(electricityUnits * electricityRate);
  const waterAmount = round2(waterUnits * waterRate);
  const total = round2(rent + electricityAmount + waterAmount + garbageAmount + nonNegativeNumber(settings.otherCharges ?? 0, 'Other charges'));
  return { flatId: flat.id, flatNumber: flat.flatNumber, tenantName: flat.tenantName || '', month: readings.month,
    electricityPrevious, electricityCurrent, electricityUnits, electricityRate, electricityAmount,
    waterPrevious, waterCurrent, waterUnits, waterRate, waterAmount, rent, garbageAmount,
    otherCharges: Number(settings.otherCharges ?? 0), total, paidAmount: 0, balance: total, status: 'PENDING' };
}
function round2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }
module.exports = { calculateBill, round2 };
