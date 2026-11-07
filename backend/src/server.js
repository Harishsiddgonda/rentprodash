'use strict';
const app=require('./app'); const port=Number(process.env.PORT||4000);
app.listen(port,'0.0.0.0',()=>console.log(`RentPro API running on port ${port}`));
