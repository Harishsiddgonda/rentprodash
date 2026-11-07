import React,{useEffect,useState} from 'react';
import {SafeAreaView,ScrollView,View,Text,TextInput,TouchableOpacity,Alert,ActivityIndicator,Platform,Modal} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

// Automatically detect API base URL depending on platform
const getApiUrl = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location && window.location.hostname) {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:4000';
    }
    return `http://${window.location.hostname}:4000`;
  }
  return Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000';
};
const API = getApiUrl();

const money=n=>'₹'+Number(n||0).toLocaleString('en-IN',{minimumFractionDigits:0,maximumFractionDigits:2});
const monthNow=()=>new Date().toISOString().slice(0,7);
const styles={
  screen:{flex:1,backgroundColor:'#F4F7FF',maxWidth:Platform.OS==='web'?680:undefined,width:'100%',alignSelf:'center'},
  pad:{padding:18},
  heading:{fontSize:28,fontWeight:'900',color:'#14213D'},
  sub:{fontSize:13,color:'#73809A',marginTop:4},
  card:{backgroundColor:'#fff',borderRadius:20,padding:16,marginBottom:12,shadowColor:'#223355',shadowOpacity:.07,shadowRadius:10,elevation:2},
  label:{fontSize:12,color:'#74809A',fontWeight:'700',marginBottom:6},
  input:{backgroundColor:'#F5F7FB',borderRadius:12,paddingHorizontal:12,paddingVertical:11,fontSize:15,color:'#17233D',marginBottom:10,borderWidth:1,borderColor:'#E5EAF4'},
  btn:{borderRadius:14,padding:14,alignItems:'center',marginVertical:5},
  btnText:{color:'#fff',fontWeight:'800',fontSize:15},
  row:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  small:{color:'#718096',fontSize:12},
  big:{fontSize:23,fontWeight:'900',color:'#14213D'}
};

function Field({label,value,onChange,placeholder,keyboardType='default'}){return <View><Text style={styles.label}>{label}</Text><TextInput value={String(value??'')} onChangeText={onChange} placeholder={placeholder||label} keyboardType={keyboardType} style={styles.input} placeholderTextColor="#A0ABC0"/></View>}
function Button({title,onPress,colors=['#5865F2','#8B5CF6']}){return <TouchableOpacity onPress={onPress} activeOpacity={.8}><LinearGradient colors={colors} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.btn}><Text style={styles.btnText}>{title}</Text></LinearGradient></TouchableOpacity>}

export default function App(){
 const [tab,setTab]=useState('Home'),[busy,setBusy]=useState(false),[month,setMonth]=useState(monthNow()),[dash,setDash]=useState({}),[flats,setFlats]=useState([]),[bills,setBills]=useState([]),[settings,setSettings]=useState({electricityRate:'8',waterRate:'30',garbageAmount:'125'});
 const [flatForm,setFlatForm]=useState({flatNumber:'',tenantName:'',phone:'',monthlyRent:'',electricityReading:'0',waterReading:'0'});
 const [reading,setReading]=useState({}),[paymentBill,setPaymentBill]=useState(null),[paymentInput,setPaymentInput]=useState('');

 const api=async(path,opts={})=>{
   const r=await fetch(API+path,{...opts,headers:{'Content-Type':'application/json',...(opts.headers||{})}});
   if(!r.ok){let e={};try{e=await r.json()}catch{}throw new Error(e.error||`Request failed (${r.status})`)}
   if(r.status===204)return null;
   return r.json()
 };

 const refresh=async()=>{
   try{
     const [d,f,history,s]=await Promise.all([api(`/api/dashboard?month=${month}`),api('/api/flats'),api('/api/bills'),api('/api/settings')]);
     const b=history.filter(x=>x.month===month);
     setDash(d);
     setFlats(f);
     setBills(b);
     setSettings({electricityRate:String(s.electricityRate),waterRate:String(s.waterRate),garbageAmount:String(s.garbageAmount)});
     setReading(old=>{
       const n={...old};
       f.forEach(flat=>{
         const prior=[...history].filter(x=>x.flatId===flat.id&&x.month<month).sort((a,z)=>z.month.localeCompare(a.month))[0];
         n[flat.id] ||= {electricityPrevious:String(prior?prior.electricityCurrent:flat.electricityReading),electricityCurrent:String(prior?prior.electricityCurrent:flat.electricityReading),waterPrevious:String(prior?prior.waterCurrent:flat.waterReading),waterCurrent:String(prior?prior.waterCurrent:flat.waterReading)};
       });
       return n;
     });
   }catch(e){
     Alert.alert('API connection',`${e.message}\nCheck server and API address: ${API}`)
   }
 };

 useEffect(()=>{refresh()},[month]);

 const action=async(fn,msg)=>{
   setBusy(true);
   try{
     await fn();
     await refresh();
     if(msg)Alert.alert('RentPro',msg)
   }catch(e){
     Alert.alert('Error',e.message)
   }finally{
     setBusy(false)
   }
 };

 const addFlat=()=>action(async()=>{
   await api('/api/flats',{method:'POST',body:JSON.stringify({...flatForm,monthlyRent:Number(flatForm.monthlyRent),electricityReading:Number(flatForm.electricityReading),waterReading:Number(flatForm.waterReading)})});
   setFlatForm({flatNumber:'',tenantName:'',phone:'',monthlyRent:'',electricityReading:'0',waterReading:'0'});
   setTab('Flats')
 },'Flat saved successfully');

 const saveRates=()=>action(()=>api('/api/settings',{method:'PUT',body:JSON.stringify({electricityRate:Number(settings.electricityRate),waterRate:Number(settings.waterRate),garbageAmount:Number(settings.garbageAmount)})}),'Billing rates updated');

 const generate=()=>action(async()=>{
   const payload=flats.map(f=>({flatId:f.id,...Object.fromEntries(Object.entries(reading[f.id]||{}).map(([k,v])=>[k,Number(v)]))}));
   await api('/api/bills/generate',{method:'POST',body:JSON.stringify({month,readings:payload})});
   setTab('Bills')
 },`Bills generated for ${month}`);

 const shareFile=async(url,name,mime)=>{
   if (Platform.OS === 'web' && typeof window !== 'undefined') {
     window.open(API+url, '_blank');
     return;
   }
   const response=await fetch(API+url);
   if(!response.ok)throw new Error('File export failed');
   const text=await response.text();
   const uri=FileSystem.documentDirectory+name;
   await FileSystem.writeAsStringAsync(uri,text);
   if(await Sharing.isAvailableAsync())await Sharing.shareAsync(uri,{mimeType:mime,dialogTitle:'Share RentPro bill'});
   else Alert.alert('Saved',uri)
 };

 const shareCsv=()=>action(()=>shareFile(`/api/export/${month}.csv`,`RentPro-${month}.csv`,'text/csv'));

 const sharePdf=(id,flatNo)=>action(async()=>{
   if (Platform.OS === 'web' && typeof window !== 'undefined') {
     window.open(`${API}/api/bills/${id}/pdf`, '_blank');
     return;
   }
   const response=await fetch(`${API}/api/bills/${id}/pdf`);
   if(!response.ok)throw new Error('PDF export failed');
   const blob=await response.blob();
   const base64=await new Promise((resolve,reject)=>{
     const reader=new FileReader();
     reader.onload=()=>resolve(reader.result.split(',')[1]);
     reader.onerror=reject;
     reader.readAsDataURL(blob)
   });
   const uri=FileSystem.documentDirectory+`Bill-${flatNo}-${month}.pdf`;
   await FileSystem.writeAsStringAsync(uri,base64,{encoding:FileSystem.EncodingType.Base64});
   await Sharing.shareAsync(uri,{mimeType:'application/pdf',dialogTitle:'Share flat bill'})
 });

 const pay=(bill)=>{setPaymentBill(bill);setPaymentInput('')};
 const submitPayment=()=>{
   const bill=paymentBill;
   const amount=Number(paymentInput);
   if(!bill||!Number.isFinite(amount)||amount<=0){Alert.alert('Invalid amount','Enter a payment amount greater than zero');return}
   if(amount>bill.balance){Alert.alert('Invalid amount','Payment cannot exceed the outstanding balance');return}
   action(()=>api(`/api/bills/${bill.id}/payment`,{method:'POST',body:JSON.stringify({amount,paymentMethod:'UPI'})}),'Payment recorded');
   setPaymentBill(null);
 };

 const nav=[['Home','⌂'],['Flats','▦'],['Readings','◉'],['Bills','▤'],['Settings','⚙']];

 return (
   <SafeAreaView style={styles.screen}>
     <ScrollView contentContainerStyle={styles.pad}>
       <LinearGradient colors={['#192A56','#5865F2','#9B5DE5']} style={{borderRadius:25,padding:20,marginBottom:18}}>
         <View style={styles.row}>
           <View>
             <Text style={{color:'#DDE4FF',fontWeight:'700'}}>RENTAL OWNER CONSOLE</Text>
             <Text style={{fontSize:29,color:'#fff',fontWeight:'900',marginTop:5}}>RentPro ✦</Text>
             <Text style={{color:'#E6E9FF',marginTop:4}}>Smart monthly billing & collection</Text>
           </View>
           <Text style={{fontSize:35}}>🏢</Text>
         </View>
         <View style={{marginTop:18,backgroundColor:'#FFFFFF20',borderRadius:14,padding:12}}>
           <Text style={{color:'#fff',fontWeight:'700'}}>Billing month</Text>
           <TextInput value={month} onChangeText={setMonth} placeholder="YYYY-MM" style={{color:'#fff',fontSize:18,fontWeight:'800',paddingVertical:4}}/>
         </View>
       </LinearGradient>

       {tab==='Home'&&<>
         <Text style={styles.heading}>Overview</Text>
         <Text style={styles.sub}>Your building at a glance</Text>
         <View style={{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',marginTop:15}}>
           {[['Total flats',dash.totalFlats||0,'#5865F2'],['Occupied',dash.occupiedFlats||0,'#00B894'],['Collected',money(dash.collected),'#0EA5E9'],['Pending',money(dash.pending),'#FF8A34']].map(([l,v,c])=>
             <View key={l} style={[styles.card,{width:'48%',borderTopWidth:4,borderTopColor:c}]}>
               <Text style={styles.label}>{l}</Text>
               <Text style={[styles.big,{color:c}]}>{v}</Text>
             </View>
           )}
         </View>
         <View style={styles.card}>
           <Text style={styles.label}>TOTAL BILLED THIS MONTH</Text>
           <Text style={[styles.big,{fontSize:30,color:'#5865F2'}]}>{money(dash.totalBilled)}</Text>
           <Text style={styles.sub}>{dash.billsCount||0} bills generated · {dash.vacantFlats||0} vacant flats</Text>
         </View>
         <Button title="＋ Add a Flat" onPress={()=>setTab('Flats')}/>
         <Button title="◉ Enter Meter Readings" onPress={()=>setTab('Readings')} colors={['#00B894','#00CEC9']}/>
         <Button title="▤ View / Share Bills" onPress={()=>setTab('Bills')} colors={['#FF8A34','#FF5E62']}/>
       </>}

       {tab==='Flats'&&<>
         <Text style={styles.heading}>Flat Directory</Text>
         <Text style={styles.sub}>Manage units, tenants and monthly rent</Text>
         <View style={styles.card}>
           <Text style={{fontWeight:'900',fontSize:18,marginBottom:10,color:'#5865F2'}}>Add new flat</Text>
           <Field label="Flat number" value={flatForm.flatNumber} onChange={v=>setFlatForm({...flatForm,flatNumber:v})}/>
           <Field label="Tenant name" value={flatForm.tenantName} onChange={v=>setFlatForm({...flatForm,tenantName:v})}/>
           <Field label="Phone number" value={flatForm.phone} onChange={v=>setFlatForm({...flatForm,phone:v})} keyboardType="phone-pad"/>
           <Field label="Monthly rent (₹)" value={flatForm.monthlyRent} onChange={v=>setFlatForm({...flatForm,monthlyRent:v})} keyboardType="decimal-pad"/>
           <Field label="Opening electricity meter reading" value={flatForm.electricityReading} onChange={v=>setFlatForm({...flatForm,electricityReading:v})} keyboardType="decimal-pad"/>
           <Field label="Opening water meter reading" value={flatForm.waterReading} onChange={v=>setFlatForm({...flatForm,waterReading:v})} keyboardType="decimal-pad"/>
           <Button title="Save Flat" onPress={addFlat}/>
         </View>
         {flats.map(f=>
           <View style={styles.card} key={f.id}>
             <View style={styles.row}>
               <Text style={{fontWeight:'900',fontSize:18,color:'#18264A'}}>🏠 Flat {f.flatNumber}</Text>
               <Text style={{fontWeight:'900',color:'#00B894'}}>{money(f.monthlyRent)}</Text>
             </View>
             <Text style={styles.sub}>{f.tenantName||'Vacant'} · {f.phone||'No phone'}</Text>
             <Text style={styles.small}>Meter opening · Electricity {f.electricityReading} / Water {f.waterReading}</Text>
           </View>
         )}
       </>}

       {tab==='Readings'&&<>
         <Text style={styles.heading}>Meter readings</Text>
         <Text style={styles.sub}>Enter current values. Previous values are carried forward automatically.</Text>
         {flats.map(f=>
           <View style={styles.card} key={f.id}>
             <Text style={{fontWeight:'900',fontSize:18,color:'#5865F2'}}>Flat {f.flatNumber} · {f.tenantName||'Vacant'}</Text>
             {['electricityPrevious','electricityCurrent','waterPrevious','waterCurrent'].map(k=>
               <Field key={k} label={k.replace(/([A-Z])/g,' $1').replace(/^./,s=>s.toUpperCase())} value={reading[f.id]?.[k]??''} onChange={v=>setReading(old=>({...old,[f.id]:{...old[f.id],[k]:v}}))} keyboardType="decimal-pad"/>
             )}
             <Text style={{color:'#00B894',fontWeight:'700'}}>Garbage charge: ₹{settings.garbageAmount}</Text>
           </View>
         )}
         <Button title={`Generate bills for ${month}`} onPress={generate} colors={['#00B894','#00CEC9']}/>
       </>}

       {tab==='Bills'&&<>
         <Text style={styles.heading}>Bills & collection</Text>
         <Text style={styles.sub}>Flat-wise invoice PDF and monthly CSV export</Text>
         <Button title={`⬇ Share / Export ${month} CSV`} onPress={shareCsv} colors={['#FF8A34','#FF5E62']}/>
         {bills.length===0&&<View style={styles.card}><Text style={{color:'#718096'}}>No bills for this month yet. Go to Meter Readings and generate bills.</Text></View>}
         {bills.map(b=>
           <View style={styles.card} key={b.id}>
             <View style={styles.row}>
               <Text style={{fontSize:18,fontWeight:'900',color:'#18264A'}}>Flat {b.flatNumber}</Text>
               <Text style={{fontWeight:'900',color:b.status==='PAID'?'#00B894':'#FF8A34'}}>{b.status}</Text>
             </View>
             <Text style={styles.sub}>{b.tenantName}</Text>
             <View style={{marginTop:10}}>
               {[['Rent',b.rent],['Electricity',b.electricityAmount],['Water',b.waterAmount],['Garbage',b.garbageAmount],['Total',b.total],['Paid',b.paidAmount],['Balance',b.balance]].map(([k,v])=>
                 <View style={[styles.row,{paddingVertical:3}]} key={k}>
                   <Text style={styles.small}>{k}</Text>
                   <Text style={{fontWeight:k==='Total'||k==='Balance'?'900':'600',color:k==='Balance'?'#FF5E62':'#24324D'}}>{money(v)}</Text>
                 </View>
               )}
             </View>
             <Button title="Share PDF bill" onPress={()=>sharePdf(b.id,b.flatNumber)} colors={['#5865F2','#8B5CF6']}/>
             <Button title="Record payment" onPress={()=>pay(b)} colors={['#00B894','#00CEC9']}/>
           </View>
         )}
       </>}

       {tab==='Settings'&&<>
         <Text style={styles.heading}>Billing settings</Text>
         <Text style={styles.sub}>Set your utility unit rates and fixed garbage charge</Text>
         <View style={styles.card}>
           <Field label="Electricity rate (₹ / unit)" value={settings.electricityRate} onChange={v=>setSettings({...settings,electricityRate:v})} keyboardType="decimal-pad"/>
           <Field label="Water rate (₹ / unit)" value={settings.waterRate} onChange={v=>setSettings({...settings,waterRate:v})} keyboardType="decimal-pad"/>
           <Field label="Garbage charge per flat (₹)" value={settings.garbageAmount} onChange={v=>setSettings({...settings,garbageAmount:v})} keyboardType="decimal-pad"/>
           <Button title="Save rates" onPress={saveRates}/>
           <Text style={styles.sub}>Data is persisted by the API in a local JSON database file. Back up backend/data.json regularly.</Text>
         </View>
       </>}

       {busy&&<View style={{padding:12}}><ActivityIndicator size="large" color="#5865F2"/></View>}
       <View style={{height:16}}/>
     </ScrollView>

     <Modal visible={!!paymentBill} transparent animationType="fade" onRequestClose={()=>setPaymentBill(null)}>
       <View style={{flex:1,backgroundColor:'#17233D88',justifyContent:'center',padding:24}}>
         <View style={{backgroundColor:'#fff',borderRadius:22,padding:20}}>
           <Text style={{fontSize:21,fontWeight:'900',color:'#17233D'}}>Record payment</Text>
           <Text style={styles.sub}>Flat {paymentBill?.flatNumber} · Outstanding {money(paymentBill?.balance)}</Text>
           <Field label="Payment amount (₹)" value={paymentInput} onChange={setPaymentInput} keyboardType="decimal-pad"/>
           <Button title="Confirm payment" onPress={submitPayment} colors={['#00B894','#00CEC9']}/>
           <TouchableOpacity onPress={()=>setPaymentBill(null)} style={{padding:12,alignItems:'center'}}>
             <Text style={{fontWeight:'800',color:'#718096'}}>Cancel</Text>
           </TouchableOpacity>
         </View>
       </View>
     </Modal>

     <View style={{flexDirection:'row',backgroundColor:'#fff',paddingTop:9,paddingBottom:Platform.OS==='android'?10:5,borderTopWidth:1,borderTopColor:'#E8ECF5'}}>
       {nav.map(([name,icon])=>
         <TouchableOpacity key={name} onPress={()=>setTab(name)} style={{flex:1,alignItems:'center',paddingVertical:7}}>
           <Text style={{fontSize:20,color:tab===name?'#5865F2':'#8A96AD'}}>{icon}</Text>
           <Text style={{fontSize:10,fontWeight:'800',color:tab===name?'#5865F2':'#8A96AD',marginTop:2}}>{name}</Text>
         </TouchableOpacity>
       )}
     </View>
   </SafeAreaView>
 );
}
