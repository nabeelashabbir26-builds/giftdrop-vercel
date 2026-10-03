// GiftDrop API for Vercel. Data: Upstash Redis (REST). Media: Vercel Blob.
const crypto=require('crypto');
const RU=process.env.KV_REST_API_URL||process.env.UPSTASH_REDIS_REST_URL,RT=process.env.KV_REST_API_TOKEN||process.env.UPSTASH_REDIS_REST_TOKEN;
const R=async(...c)=>{if(!RU||!RT)throw new Error('Database not configured');const r=await fetch(RU,{method:'POST',headers:{Authorization:'Bearer '+RT,'Content-Type':'application/json'},body:JSON.stringify(c.map(String))});const j=await r.json();if(j.error)throw new Error(j.error);return j.result};
const G=async k=>{const v=await R('GET',k);return v?JSON.parse(v):null},S=(k,v)=>R('SET',k,JSON.stringify(v));
const rid=n=>crypto.randomBytes(n).toString('base64url'),hp=(pw,salt)=>crypto.scryptSync(pw,salt,32).toString('hex');
const TYPES={'image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp','video/mp4':'.mp4','video/webm':'.webm','video/quicktime':'.mov','audio/mpeg':'.mp3','audio/mp4':'.m4a','audio/x-m4a':'.m4a','audio/wav':'.wav','audio/ogg':'.ogg','audio/webm':'.weba'};
const MAXUP=4*1024*1024; // Vercel functions accept ~4.5 MB request bodies
const send=(res,code,obj)=>{res.statusCode=code;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(obj))};
const raw=(req,max)=>new Promise((ok,no)=>{const c=[];let n=0,big=false;req.on('data',d=>{n+=d.length;if(n>max)big=true;else c.push(d)});req.on('end',()=>big?no(new Error('File too large')):ok(Buffer.concat(c)));req.on('error',no)});
const json=async req=>{try{return JSON.parse((await raw(req,1e6)).toString()||'{}')}catch(e){return{}}};
const OC=['birthday','anniversary','friendship','congrats','eid','thanks'],TH=['noir','ivory','blush','emerald','midnight','sunrise'];
const s=(v,n)=>String(v==null?'':v).slice(0,n),url=v=>typeof v==='string'&&/^https:\/\/[\w-]+\.public\.blob\.vercel-storage\.com\/gift\/[\w-]+\.\w+$/.test(v)?v:'';
const clean=b=>{const m=b.music||{};return{occasion:OC.includes(b.occasion)?b.occasion:'birthday',theme:TH.includes(b.theme)?b.theme:'ivory',to:s(b.to,60),from:s(b.from,60),title:s(b.title,120),
msgs:(Array.isArray(b.msgs)?b.msgs:[]).slice(0,5).map(x=>s(x,1000)),photos:(Array.isArray(b.photos)?b.photos:[]).slice(0,12).map(url).filter(Boolean),video:url(b.video),
music:{type:['none','preset','upload'].includes(m.type)?m.type:'none',v:m.type==='upload'?url(m.v):s(m.v,20),name:s(m.name,80)},finale:s(b.finale,500),status:b.status==='published'?'published':'draft'}};
const files=g=>[...g.photos,g.video,g.music&&g.music.type==='upload'&&g.music.v].filter(Boolean);
const rm=async l=>{if(!l.length)return;try{const{del}=await import('@vercel/blob');await del(l)}catch(e){}};
const pub=g=>{const{owner,...r}=g;return r};
module.exports=async(req,res)=>{try{
const p=new URL(req.url,'http://x').pathname.replace(/\/$/,''),M=req.method;
const tok=(req.headers.authorization||'').slice(7),em=tok&&await R('GET','sess:'+tok),user=em?await G('user:'+em):null;
const sess=async u=>{const t=rid(24);await R('SET','sess:'+t,u.email,'EX',30*86400);return{token:t,user:{email:u.email,name:u.name}}};
if(p==='/api/signup'&&M==='POST'){const b=await json(req),email=s(b.email,120).trim().toLowerCase();
 if(!/^\S+@\S+\.\S+$/.test(email))return send(res,400,{error:'Enter a valid email.'});if(s(b.password,200).length<6)return send(res,400,{error:'Password must be at least 6 characters.'});
 if(await G('user:'+email))return send(res,409,{error:'That email already has an account.'});
 const salt=rid(12),u={email,name:s(b.name,60).trim()||email.split('@')[0],salt,hash:hp(b.password,salt)};await S('user:'+email,u);return send(res,200,await sess(u))}
if(p==='/api/login'&&M==='POST'){const b=await json(req),u=await G('user:'+s(b.email,120).trim().toLowerCase());
 if(!u||!crypto.timingSafeEqual(Buffer.from(hp(s(b.password,200),u.salt)),Buffer.from(u.hash)))return send(res,401,{error:'Email or password is incorrect.'});return send(res,200,await sess(u))}
let m=p.match(/^\/api\/g\/([\w-]+)$/);
if(m&&M==='GET'){const g=await G('gift:'+m[1]);return g&&g.status==='published'?send(res,200,pub(g)):send(res,404,{error:'Gift not found'})}
if(!user)return send(res,401,{error:'Please sign in.'});
if(p==='/api/me')return send(res,200,{user:{email:user.email,name:user.name}});
if(p==='/api/logout'&&M==='POST'){await R('DEL','sess:'+tok);return send(res,200,{ok:1})}
if(p==='/api/gifts'&&M==='GET'){const ids=await R('SMEMBERS','ugifts:'+user.email),gs=ids.length?(await R('MGET',...ids.map(i=>'gift:'+i))).filter(Boolean).map(v=>JSON.parse(v)):[];return send(res,200,gs.sort((a,b)=>b.created-a.created).map(pub))}
if(p==='/api/gifts'&&M==='POST'){const g={id:rid(9),owner:user.email,created:Date.now(),...clean(await json(req))};await S('gift:'+g.id,g);await R('SADD','ugifts:'+user.email,g.id);return send(res,200,pub(g))}
if(p==='/api/upload'&&M==='POST'){const ct=(req.headers['content-type']||'').split(';')[0],ext=TYPES[ct];if(!ext)return send(res,415,{error:'Unsupported file type.'});
 const buf=await raw(req,MAXUP),{put}=await import('@vercel/blob'),b=await put('gift/'+rid(10)+ext,buf,{access:'public',contentType:ct,addRandomSuffix:false});return send(res,200,{url:b.url})}
m=p.match(/^\/api\/gifts\/([\w-]+)$/);
if(m){const g=await G('gift:'+m[1]);if(!g||g.owner!==user.email)return send(res,404,{error:'Gift not found'});
 if(M==='GET')return send(res,200,pub(g));
 if(M==='PUT'){const old=files(g);Object.assign(g,clean(await json(req)));await S('gift:'+g.id,g);const keep=files(g);await rm(old.filter(f=>!keep.includes(f)));return send(res,200,pub(g))}
 if(M==='DELETE'){await rm(files(g));await R('DEL','gift:'+g.id);await R('SREM','ugifts:'+user.email,g.id);return send(res,200,{ok:1})}}
send(res,404,{error:'Not found'})}catch(e){const big=e.message==='File too large';send(res,big?413:500,{error:big?'File too large (max 4 MB on this host).':'Server error'})}};
