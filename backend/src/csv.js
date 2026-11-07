'use strict';
const columns = ['month','flatNumber','tenantName','rent','electricityPrevious','electricityCurrent','electricityUnits','electricityRate','electricityAmount','waterPrevious','waterCurrent','waterUnits','waterRate','waterAmount','garbageAmount','otherCharges','total','paidAmount','balance','status'];
function cell(v) { const s = String(v ?? ''); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }
function toCsv(rows) { return [columns.join(','), ...rows.map(r => columns.map(k => cell(r[k])).join(','))].join('\r\n') + '\r\n'; }
module.exports = { toCsv, columns };
