'use strict';
const express = require('express');
const cors = require('cors');
const { state, save } = require('./store');
const { calculateBill } = require('./billing');
const { toCsv } = require('./csv');
const PDFDocument = require('pdfkit');
const app = express();
app.use(cors()); app.use(express.json({ limit: '1mb' }));
const fail = (res, status, message) => res.status(status).json({ error: message });
const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;
app.get('/api/health', (_req,res)=>res.json({status:'ok', service:'RentPro API'}));
app.get('/api/settings', (_req,res)=>res.json(state.settings));
app.put('/api/settings', (req,res)=>{ const keys=['electricityRate','waterRate','garbageAmount']; for(const k of keys){ if(req.body[k] !== undefined && (!Number.isFinite(Number(req.body[k])) || Number(req.body[k])<0)) return fail(res,400,`${k} must be non-negative`); }
 state.settings={...state.settings,...Object.fromEntries(keys.filter(k=>req.body[k]!==undefined).map(k=>[k,Number(req.body[k])]))}; save(); res.json(state.settings); });
app.get('/api/flats', (_req,res)=>res.json(state.flats));
app.post('/api/flats', (req,res)=>{ const {flatNumber,tenantName='',phone='',monthlyRent,electricityReading=0,waterReading=0}=req.body;
 if(!String(flatNumber||'').trim()) return fail(res,400,'flatNumber is required'); if(state.flats.some(f=>f.flatNumber===String(flatNumber).trim())) return fail(res,409,'Flat number already exists');
 if(!Number.isFinite(Number(monthlyRent))||Number(monthlyRent)<0) return fail(res,400,'monthlyRent must be non-negative');
 for(const [v,label] of [[electricityReading,'electricityReading'],[waterReading,'waterReading']]) if(!Number.isFinite(Number(v))||Number(v)<0) return fail(res,400,`${label} must be non-negative`);
 const flat={id:state.nextFlatId++,flatNumber:String(flatNumber).trim(),tenantName:String(tenantName),phone:String(phone),monthlyRent:Number(monthlyRent),electricityReading:Number(electricityReading),waterReading:Number(waterReading),occupied:Boolean(tenantName)}; state.flats.push(flat); save(); res.status(201).json(flat); });
app.put('/api/flats/:id', (req,res)=>{const flat=state.flats.find(f=>f.id===Number(req.params.id)); if(!flat)return fail(res,404,'Flat not found'); const allowed=['flatNumber','tenantName','phone','monthlyRent','electricityReading','waterReading','occupied']; for(const k of allowed) if(req.body[k]!==undefined) flat[k]=['monthlyRent','electricityReading','waterReading'].includes(k)?Number(req.body[k]):req.body[k]; if(['monthlyRent','electricityReading','waterReading'].some(k=>!Number.isFinite(flat[k])||flat[k]<0)) return fail(res,400,'Rent and readings must be non-negative'); save();res.json(flat);});
app.delete('/api/flats/:id',(req,res)=>{const i=state.flats.findIndex(f=>f.id===Number(req.params.id));if(i<0)return fail(res,404,'Flat not found');state.flats.splice(i,1);save();res.status(204).end();});
app.get('/api/bills', (req,res)=>{const rows=state.bills.filter(b=>!req.query.month||b.month===req.query.month);res.json(rows);});
app.post('/api/bills/generate', (req,res)=>{const {month, readings}=req.body;if(!monthPattern.test(month||''))return fail(res,400,'month must be YYYY-MM');if(state.bills.some(b=>b.month===month))return fail(res,409,'Bills already generated for this month');if(!Array.isArray(readings)||readings.length!==state.flats.length)return fail(res,400,'Provide readings for every registered flat');
 try {const rows=state.flats.map(flat=>{const r=readings.find(x=>Number(x.flatId)===flat.id);if(!r)throw new Error(`Missing readings for flat ${flat.flatNumber}`);const previousBill=state.bills.filter(b=>b.flatId===flat.id).sort((a,b)=>b.month.localeCompare(a.month))[0];const ep=previousBill?previousBill.electricityCurrent:flat.electricityReading;const wp=previousBill?previousBill.waterCurrent:flat.waterReading;if(Number(r.electricityPrevious)!==ep||Number(r.waterPrevious)!==wp)throw new Error(`Previous readings must carry forward for flat ${flat.flatNumber} (electricity ${ep}, water ${wp})`);return calculateBill(flat,{...r,month},{...state.settings,otherCharges:r.otherCharges||0});}); rows.forEach(b=>b.id=state.nextBillId++);state.bills.push(...rows);save();res.status(201).json(rows);}catch(e){return fail(res,400,e.message);} });
app.post('/api/bills/:id/payment',(req,res)=>{const bill=state.bills.find(b=>b.id===Number(req.params.id));if(!bill)return fail(res,404,'Bill not found');const amount=Number(req.body.amount);if(!Number.isFinite(amount)||amount<=0)return fail(res,400,'Payment amount must be greater than zero');if(amount>bill.balance)return fail(res,400,'Payment exceeds outstanding balance');bill.paidAmount=Math.round((bill.paidAmount+amount)*100)/100;bill.balance=Math.round((bill.total-bill.paidAmount)*100)/100;bill.status=bill.balance===0?'PAID':'PARTIAL';bill.paymentMethod=String(req.body.paymentMethod||'UPI');bill.paymentDate=req.body.paymentDate||new Date().toISOString().slice(0,10);save();res.json(bill);});
app.get('/api/export/:month.csv',(req,res)=>{if(!monthPattern.test(req.params.month))return fail(res,400,'month must be YYYY-MM');const rows=state.bills.filter(b=>b.month===req.params.month);res.setHeader('Content-Type','text/csv; charset=utf-8');res.setHeader('Content-Disposition',`attachment; filename="RentPro-${req.params.month}.csv"`);res.send(toCsv(rows));});
app.get('/api/bills/:id/pdf',(req,res)=>{const b=state.bills.find(x=>x.id===Number(req.params.id));if(!b)return fail(res,404,'Bill not found');res.setHeader('Content-Type','application/pdf');res.setHeader('Content-Disposition',`attachment; filename="Bill-${b.flatNumber}-${b.month}.pdf"`);const doc=new PDFDocument({margin:48});doc.pipe(res);doc.fontSize(24).fillColor('#2563eb').text('RENTPRO', {align:'center'});doc.moveDown().fontSize(16).fillColor('#111827').text(`Rental Invoice | ${b.month}`,{align:'center'});doc.moveDown().fontSize(12).fillColor('#111827');doc.text(`Flat: ${b.flatNumber}    Tenant: ${b.tenantName}`);doc.moveDown();[['Monthly rent',b.rent],['Electricity',`${b.electricityUnits} units × ₹${b.electricityRate} = ₹${b.electricityAmount}`],['Water',`${b.waterUnits} units × ₹${b.waterRate} = ₹${b.waterAmount}`],['Garbage',b.garbageAmount],['Other charges',b.otherCharges],['Total',`₹${b.total}`],['Paid',`₹${b.paidAmount}`],['Balance',`₹${b.balance}`]].forEach(([k,v])=>doc.text(`${k}: ${v}`));doc.end();});
app.get('/api/dashboard',(req,res)=>{const month=req.query.month||new Date().toISOString().slice(0,7);const bills=state.bills.filter(b=>b.month===month);res.json({month,totalFlats:state.flats.length,occupiedFlats:state.flats.filter(f=>f.occupied).length,vacantFlats:state.flats.filter(f=>!f.occupied).length,totalBilled:bills.reduce((s,b)=>s+b.total,0),collected:bills.reduce((s,b)=>s+b.paidAmount,0),pending:bills.reduce((s,b)=>s+b.balance,0),billsCount:bills.length,availableMonths:[...new Set(state.bills.map(b=>b.month))].sort().reverse()});});

const fs = require('fs');
const path = require('path');
const distPath = path.join(__dirname, '..', '..', 'mobile', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.use((err,_req,res,_next)=>{res.status(500).json({error:'Internal server error'});});
module.exports=app;
