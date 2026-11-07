'use strict';
const fs = require('fs');
const path = require('path');
function getFile() {
  return process.env.RENTPRO_DATA_FILE || path.join(__dirname, '..', 'data.json');
}
const state = { flats: [], bills: [], settings: { electricityRate: 8, waterRate: 30, garbageAmount: 125 }, nextFlatId: 1, nextBillId: 1 };
function load() {
  try {
    const file = getFile();
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      state.flats = data.flats || [];
      state.bills = data.bills || [];
      state.settings = data.settings || { electricityRate: 8, waterRate: 30, garbageAmount: 125 };
      state.nextFlatId = data.nextFlatId || 1;
      state.nextBillId = data.nextBillId || 1;
    }
  } catch (e) {
    throw new Error(`Could not read data file: ${e.message}`);
  }
}
function save() {
  const file = getFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(state, null, 2));
}
function resetForTests() {
  state.flats = [];
  state.bills = [];
  state.settings = { electricityRate: 8, waterRate: 30, garbageAmount: 125 };
  state.nextFlatId = 1;
  state.nextBillId = 1;
  save();
}
load();
module.exports = { state, save, resetForTests, load };
