'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const {calculateBill}=require('../src/billing');
const flat={id:1,flatNumber:'101',tenantName:'Test Tenant',monthlyRent:10000};
test('calculates utility units and complete monthly bill',()=>{const b=calculateBill(flat,{month:'2026-11',electricityPrevious:1250,electricityCurrent:1400,waterPrevious:100,waterCurrent:115},{electricityRate:8,waterRate:30,garbageAmount:125});assert.equal(b.electricityUnits,150);assert.equal(b.electricityAmount,1200);assert.equal(b.waterUnits,15);assert.equal(b.waterAmount,450);assert.equal(b.total,11775);assert.equal(b.balance,11775);});
test('rejects lower current meter reading',()=>assert.throws(()=>calculateBill(flat,{electricityPrevious:10,electricityCurrent:9,waterPrevious:0,waterCurrent:1}),/cannot be lower/));
test('rejects negative values',()=>assert.throws(()=>calculateBill(flat,{electricityPrevious:-1,electricityCurrent:2,waterPrevious:0,waterCurrent:1}),/non-negative/));
test('rounds fractional charges to cents',()=>{const b=calculateBill({...flat,monthlyRent:1.25},{electricityPrevious:0,electricityCurrent:1,waterPrevious:0,waterCurrent:1},{electricityRate:1.333,waterRate:2.555,garbageAmount:0});assert.equal(b.electricityAmount,1.33);assert.equal(b.waterAmount,2.56);assert.equal(b.total,5.14);});
