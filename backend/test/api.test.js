'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const temp = path.join(os.tmpdir(), `rentpro-test-${process.pid}.json`);
process.env.RENTPRO_DATA_FILE = temp;
const { resetForTests } = require('../src/store');
const app = require('../src/app');

test('RentPro API test suite', async (t) => {
  await t.test('API flow: create flat, bill, CSV export, partial payment, dashboard and duplicate month validation', async () => {
    resetForTests();
    const created = await request(app).post('/api/flats').send({ flatNumber: '101', tenantName: 'Demo Tenant', phone: '9999999999', monthlyRent: 10000, electricityReading: 1250, waterReading: 100 });
    assert.equal(created.status, 201);
    const id = created.body.id;
    const bills = await request(app).post('/api/bills/generate').send({ month: '2026-11', readings: [{ flatId: id, electricityPrevious: 1250, electricityCurrent: 1400, waterPrevious: 100, waterCurrent: 115 }] });
    assert.equal(bills.status, 201);
    assert.equal(bills.body[0].total, 11775);
    const csv = await request(app).get('/api/export/2026-11.csv');
    assert.equal(csv.status, 200);
    assert.match(csv.text, /flatNumber,tenantName/);
    assert.match(csv.text, /101,Demo Tenant/);
    const duplicate = await request(app).post('/api/bills/generate').send({ month: '2026-11', readings: [] });
    assert.equal(duplicate.status, 409);
    const paid = await request(app).post(`/api/bills/${bills.body[0].id}/payment`).send({ amount: 5000, paymentMethod: 'UPI' });
    assert.equal(paid.status, 200);
    assert.equal(paid.body.status, 'PARTIAL');
    assert.equal(paid.body.balance, 6775);
    const dash = await request(app).get('/api/dashboard?month=2026-11');
    assert.equal(dash.body.totalFlats, 1);
    assert.equal(dash.body.collected, 5000);
    assert.equal(dash.body.pending, 6775);
    const pdf = await request(app).get(`/api/bills/${bills.body[0].id}/pdf`);
    assert.equal(pdf.status, 200);
    assert.match(pdf.headers['content-type'], /application\/pdf/);
  });

  await t.test('rejects incorrect carried-forward meter readings', async () => {
    resetForTests();
    const f = await request(app).post('/api/flats').send({ flatNumber: '202', monthlyRent: 6000, electricityReading: 22, waterReading: 4 });
    const r = await request(app).post('/api/bills/generate').send({ month: '2026-11', readings: [{ flatId: f.body.id, electricityPrevious: 0, electricityCurrent: 30, waterPrevious: 4, waterCurrent: 5 }] });
    assert.equal(r.status, 400);
    assert.match(r.body.error, /Previous readings must carry forward/);
  });

  await t.test('rejects invalid month format', async () => {
    const r = await request(app).post('/api/bills/generate').send({ month: 'Nov-26', readings: [] });
    assert.equal(r.status, 400);
  });

  await t.test('rejects payment greater than balance', async () => {
    resetForTests();
    const f = await request(app).post('/api/flats').send({ flatNumber: '303', monthlyRent: 1000, electricityReading: 0, waterReading: 0 });
    const b = await request(app).post('/api/bills/generate').send({ month: '2026-11', readings: [{ flatId: f.body.id, electricityPrevious: 0, electricityCurrent: 0, waterPrevious: 0, waterCurrent: 0 }] });
    assert.equal(b.status, 201);
    const r = await request(app).post(`/api/bills/${b.body[0].id}/payment`).send({ amount: 5000 });
    assert.equal(r.status, 400);
  });
});

test.after(() => {
  try { fs.unlinkSync(temp); } catch {}
});
