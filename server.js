const express=require('express');
const multer=require('multer');
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');

const app=express();
const PORT=process.env.PORT||3000;
const PUBLIC=path.join(__dirname,'public');
const UPLOADS=path.join(PUBLIC,'uploads');
const DB=path.join(__dirname,'phones.json');

fs.mkdirSync(UPLOADS,{recursive:true});
if(!fs.existsSync(DB)) fs.writeFileSync(DB,'[]');

const storage=multer.diskStorage({
 destination:(req,file,cb)=>cb(null,UPLOADS),
 filename:(req,file,cb)=>{
   const ext=path.extname(file.originalname).toLowerCase()||'.jpg';
   cb(null,Date.now()+'-'+crypto.randomBytes(5).toString('hex')+ext);
 }
});
const upload=multer({storage,limits:{fileSize:8*1024*1024}});

function readDB(){return JSON.parse(fs.readFileSync(DB,'utf8'))}
function writeDB(x){fs.writeFileSync(DB,JSON.stringify(x,null,2))}

app.use(express.static(PUBLIC));

app.get('/api/phones',(req,res)=>res.json(readDB()));

app.post('/api/phones',upload.array('images',10),(req,res)=>{
 try{
  const phones=readDB();
  const phone={
   id:crypto.randomUUID(),
   name:req.body.name,
   price:Number(req.body.price||0),
   storage:req.body.storage||'',
   color:req.body.color||'',
   condition:req.body.condition||'',
   battery:req.body.battery||'',
   description:req.body.description||'',
   images:(req.files||[]).map(f=>'/uploads/'+f.filename),
   createdAt:new Date().toISOString()
  };
  phones.unshift(phone);writeDB(phones);res.json(phone);
 }catch(e){res.status(500).json({error:e.message})}
});

app.delete('/api/phones/:id',(req,res)=>{
 const phones=readDB();const item=phones.find(p=>p.id===req.params.id);
 if(item) (item.images||[]).forEach(u=>{const f=path.join(PUBLIC,u.replace(/^\/+/,'').replace(/\//g,path.sep));if(fs.existsSync(f))fs.unlinkSync(f)});
 writeDB(phones.filter(p=>p.id!==req.params.id));res.json({ok:true});
});

app.delete('/api/phones',(req,res)=>{
 const phones=readDB();
 phones.forEach(p=>(p.images||[]).forEach(u=>{const f=path.join(PUBLIC,u.replace(/^\/+/,'').replace(/\//g,path.sep));if(fs.existsSync(f))fs.unlinkSync(f)}));
 writeDB([]);res.json({ok:true});
});

app.listen(PORT,()=>console.log(`MGH iPhone Store running on http://localhost:${PORT}`));