import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BUCKET = "bumn-lamar-documents";
const MAX_SIZE = 5 * 1024 * 1024;
const MIME = new Map([["application/pdf","pdf"],["image/jpeg","jpg"],["image/png","png"]]);
const DOCS = ["diploma","identity_card"] as const;
const CORS = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json; charset=utf-8"};
type Obj = Record<string, unknown>;
type Doc = typeof DOCS[number];
const json = (body: unknown, status=200) => new Response(JSON.stringify(body), {status,headers:CORS});
const isObj = (v: unknown): v is Obj => !!v && typeof v==="object" && !Array.isArray(v);
const phoneOf = (v:string) => { const d=v.replace(/\D/g,""); return d.startsWith("0")?`62${d.slice(1)}`:d.startsWith("8")?`62${d}`:d; };
const validPhone = (v:string) => /^62\d{8,13}$/.test(v);
const text = (v:unknown,max=10000):string|null|undefined => {
 if(v===undefined)return undefined; if(v===null||v==="")return null;
 if(typeof v!=="string")throw new Error("Field teks tidak valid.");
 const s=v.trim(); if(s.length>max)throw new Error("Field melebihi batas karakter."); return s||null;
};
const validDate = (v:unknown) => {
 if(v===null||v===undefined||v==="")return true;
 if(typeof v!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;
 const d=new Date(v+"T00:00:00.000Z"); return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===v;
};
const ownedPath = (p:unknown,u:string,a:string,t:Doc) => typeof p==="string" && p.split("/").length===4 && p.split("/")[0]===u && p.split("/")[1]===a && p.split("/")[2]===t && !p.split("/").some(x=>!x||x==="."||x==="..");

async function authenticate(db:ReturnType<typeof createClient>, p:unknown, pw:unknown) {
 const phone=phoneOf(typeof p==="string"?p:""), password=typeof pw==="string"?pw:"";
 if(!validPhone(phone)||!password)return {response:json({success:false,message:"Kredensial tidak valid."},400)};
 const {data:user,error}=await db.from("bumn_users").select("id,full_name,phone,email,password,is_active").eq("phone",phone).maybeSingle();
 if(error)throw error;
 if(!user||user.password!==password)return {response:json({success:false,message:"Nomor telepon atau password tidak sesuai."},401)};
 if(!user.is_active)return {response:json({success:false,message:"Akun tidak aktif."},403)};
 return {user};
}
const editable = ["full_name","email","cv_title","cv_summary","cv_skills","cv_education_summary","cv_experience_summary","cv_portfolio_url","cover_letter_subject","cover_letter_content","cover_letter_created_at","education_level","education_institution","education_major","education_degree","education_start_year","education_graduation_year","education_gpa","education_description","experience_type","experience_company","experience_position","experience_employment_type","experience_location","experience_start_date","experience_end_date","experience_is_current","experience_description","experience_responsibilities"];
function validate(input:Obj):Obj {
 if(Object.keys(input).some(k=>!editable.includes(k)))throw new Error("Terdapat field lamaran yang tidak diizinkan.");
 const out:Obj={};
 for(const [k,v] of Object.entries(input)){
  if(k==="cv_skills"||k==="experience_responsibilities"){
   if(!Array.isArray(v)||v.length>100||v.some(x=>typeof x!=="string"||x.length>300))throw new Error(k+" harus berupa array teks (maksimal 100 item)."); out[k]=v;
  } else if(k==="education_start_year"||k==="education_graduation_year"){
   if(v!==null&&v!==""&&(typeof v!=="number"||!Number.isInteger(v)||v<1900||v>2200))throw new Error("Tahun pendidikan tidak valid."); out[k]=v===""?null:v;
  } else if(k==="education_gpa"){
   if(v!==null&&v!==""&&(typeof v!=="number"||v<0||v>4))throw new Error("IPK harus bernilai 0 sampai 4."); out[k]=v===""?null:v;
  } else if(k==="experience_is_current"){
   if(typeof v!=="boolean")throw new Error("Status pengalaman tidak valid."); out[k]=v;
  } else if(k==="experience_start_date"||k==="experience_end_date"){
   if(!validDate(v))throw new Error("Tanggal pengalaman tidak valid."); out[k]=v||null;
  } else if(k==="cover_letter_created_at"){
   if(v!==null&&v!==""&&(typeof v!=="string"||Number.isNaN(Date.parse(v))))throw new Error("Tanggal cover letter tidak valid."); out[k]=v||null;
  } else if(k==="email"){
   const e=text(v,254); if(e&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))throw new Error("Format email tidak valid."); out[k]=e?.toLowerCase()??null;
  } else out[k]=text(v,k==="full_name"?120:k==="cv_title"?200:k==="cv_portfolio_url"?2048:10000);
 }
 if(out.experience_is_current===true&&out.experience_end_date)throw new Error("Pengalaman aktif tidak boleh memiliki tanggal selesai.");
 return out;
}
async function newNumber(db:ReturnType<typeof createClient>) {
 const y=new Date().getUTCFullYear(), prefix=`BL-${y}-`;
 const {data,error}=await db.from("bumn_lamar").select("application_number").like("application_number",prefix+"%").order("application_number",{ascending:false}).limit(1);
 if(error)throw error; const last=data?.[0]?.application_number as string|undefined;
 const n=last?Number(last.slice(prefix.length)):0; if(!Number.isSafeInteger(n)||n>=999999)throw new Error("Nomor lamaran tidak tersedia.");
 return prefix+String(n+1).padStart(6,"0");
}

Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:CORS});
 if(req.method!=="POST")return json({success:false,message:"Method not allowed."},405);
 try{
  const ct=req.headers.get("content-type")||"", len=Number(req.headers.get("content-length")||0);
  if(len>MAX_SIZE+128*1024)return json({success:false,message:"Ukuran file maksimal 5 MB."},413);
  let b:Obj, file:File|null=null;
  if(ct.includes("multipart/form-data")){
   const f=await req.formData(); b={action:f.get("action"),phone:f.get("phone"),password:f.get("password"),application_id:f.get("application_id"),document_type:f.get("document_type")};
   const x=f.get("file"); file=x instanceof File?x:null;
  }else{const x:unknown=await req.json();if(!isObj(x))return json({success:false,message:"Body harus berupa object."},400);b=x;}
  const action=typeof b.action==="string"?b.action:"";
  if(!["create","get","update","submit","list","withdraw","upload-document","delete-document","delete-draft","get-document-url"].includes(action))return json({success:false,message:"Action tidak valid."},400);
  const url=Deno.env.get("SUPABASE_URL"), key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"); if(!url||!key)throw new Error("Server configuration missing.");
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const auth=await authenticate(db,b.phone,b.password); if("response" in auth)return auth.response; const user=auth.user;

  if(action==="create"){
   if(typeof b.job_id!=="string"||!b.job_id.trim())return json({success:false,message:"job_id wajib diisi."},400);
   const {data:job,error:je}=await db.from("bumn_jobs").select("id").eq("id",b.job_id).maybeSingle();if(je)throw je;if(!job)return json({success:false,message:"Lowongan tidak ditemukan."},404);
   const {data:active,error:ae}=await db.from("bumn_lamar").select("id").eq("user_id",user.id).eq("job_id",b.job_id).in("status",["draft","submitted","reviewing","shortlisted"]).limit(1);if(ae)throw ae;if(active?.length)return json({success:false,message:"Lamaran aktif untuk lowongan ini sudah tersedia."},409);
   const application_number=await newNumber(db);
   const {data,error}=await db.from("bumn_lamar").insert({application_number,user_id:user.id,job_id:b.job_id,status:"draft",full_name:user.full_name,email:user.email,phone:user.phone}).select("*").single();
   if(error){if(error.code==="23505")return json({success:false,message:"Nomor lamaran bentrok, silakan ulangi."},409);throw error;}
   return json({success:true,message:"Draft lamaran dibuat.",data},201);
  }
  if(action==="list"){
   const limit=Math.min(Math.max(Number(b.limit)||20,1),50),offset=Math.max(Number(b.offset)||0,0);
   let q=db.from("bumn_lamar").select("*",{count:"exact"}).eq("user_id",user.id).order("created_at",{ascending:false}).range(offset,offset+limit-1);
   if(typeof b.status==="string")q=q.eq("status",b.status);
   const {data,error,count}=await q;if(error)throw error;
   return json({success:true,data,pagination:{count:count??0,limit,offset,has_more:offset+(data?.length??0)<(count??0)}});
  }
  const id=typeof b.application_id==="string"?b.application_id:"";if(!id)return json({success:false,message:"application_id wajib diisi."},400);
  const {data:a,error:ae}=await db.from("bumn_lamar").select("*").eq("id",id).eq("user_id",user.id).maybeSingle();if(ae)throw ae;if(!a)return json({success:false,message:"Lamaran tidak ditemukan."},404);
  if(action==="get")return json({success:true,data:a});
  if(action==="update"){
   if(a.status!=="draft")return json({success:false,message:"Hanya draft yang dapat diperbarui."},409);
   if(!isObj(b.data))return json({success:false,message:"data wajib berupa object."},400);
   const updates=validate(b.data);
   const {data,error}=await db.from("bumn_lamar").update(updates).eq("id",id).eq("user_id",user.id).eq("status","draft").select("*").single();if(error)throw error;
   return json({success:true,message:"Draft diperbarui.",data});
  }
  if(action==="submit"){
   if(a.status!=="draft")return json({success:false,message:"Hanya draft yang dapat dikirim."},409);
   const {data,error}=await db.from("bumn_lamar").update({status:"submitted",submitted_at:new Date().toISOString()}).eq("id",id).eq("user_id",user.id).eq("status","draft").select("*").single();if(error)throw error;
   return json({success:true,message:"Lamaran berhasil dikirim.",data});
  }
  if(action==="withdraw"){
   if(!["submitted","reviewing","shortlisted"].includes(a.status))return json({success:false,message:"Status lamaran tidak dapat ditarik."},409);
   const {data,error}=await db.from("bumn_lamar").update({status:"withdrawn"}).eq("id",id).eq("user_id",user.id).select("*").single();if(error)throw error;
   return json({success:true,message:"Lamaran ditarik.",data});
  }
  if(action==="delete-draft"){
   if(a.status!=="draft")return json({success:false,message:"Hanya draft yang dapat dihapus."},409);
   const paths=[a.diploma_file_path,a.identity_card_file_path].filter((x):x is string=>typeof x==="string");
   if(paths.length){const {error}=await db.storage.from(BUCKET).remove(paths);if(error)throw error;}
   const {error}=await db.from("bumn_lamar").delete().eq("id",id).eq("user_id",user.id).eq("status","draft");if(error)throw error;
   return json({success:true,message:"Draft dihapus."});
  }
  if(action==="upload-document"){
   if(a.status!=="draft")return json({success:false,message:"Upload hanya tersedia untuk draft."},409);
   const t=b.document_type as Doc;if(!DOCS.includes(t))return json({success:false,message:"document_type harus diploma atau identity_card."},400);
   if(!file)return json({success:false,message:"File wajib dipilih."},400);
   const ext=MIME.get(file.type);if(!ext)return json({success:false,message:"Format file harus PDF, JPG, atau PNG."},415);
   if(file.size<=0||file.size>MAX_SIZE)return json({success:false,message:"Ukuran file maksimal 5 MB."},413);
   const bytes=new Uint8Array(await file.slice(0,12).arrayBuffer());
   const signature=file.type==="application/pdf"?new TextDecoder().decode(bytes.slice(0,5))==="%PDF-":file.type==="image/jpeg"?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:file.type==="image/png"?bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71:false;
   if(!signature)return json({success:false,message:"Konten file tidak sesuai dengan format."},415);
   const path=`${user.id}/${id}/${t}/${crypto.randomUUID()}.${ext}`;
   const {error:up}=await db.storage.from(BUCKET).upload(path,file,{contentType:file.type,upsert:false,cacheControl:"3600"});if(up)throw up;
   const old=a[t+"_file_path"];
   const fields:Obj={[t+"_file_name"]:file.name.slice(0,255),[t+"_file_path"]:path,[t+"_file_type"]:file.type,[t+"_file_size"]:file.size,[t+"_uploaded_at"]:new Date().toISOString()};
   const {data,error}=await db.from("bumn_lamar").update(fields).eq("id",id).eq("user_id",user.id).eq("status","draft").select("*").single();
   if(error){await db.storage.from(BUCKET).remove([path]);throw error;}
   if(ownedPath(old,user.id,id,t)){const {error:re}=await db.storage.from(BUCKET).remove([old]);if(re)console.error("Old document cleanup:",re.message);}
   return json({success:true,message:"Dokumen diunggah.",data});
  }
  if(action==="delete-document"){
   if(a.status!=="draft")return json({success:false,message:"Dokumen hanya dapat dihapus pada draft."},409);
   const t=b.document_type as Doc;if(!DOCS.includes(t))return json({success:false,message:"document_type tidak valid."},400);
   const path=a[t+"_file_path"];if(path&&!ownedPath(path,user.id,id,t))return json({success:false,message:"Path dokumen tidak valid."},403);
   if(path){const {error}=await db.storage.from(BUCKET).remove([path as string]);if(error)throw error;}
   const fields:Obj={[t+"_file_name"]:null,[t+"_file_path"]:null,[t+"_file_type"]:null,[t+"_file_size"]:null,[t+"_uploaded_at"]:null};
   const {data,error}=await db.from("bumn_lamar").update(fields).eq("id",id).eq("user_id",user.id).select("*").single();if(error)throw error;
   return json({success:true,message:"Dokumen dihapus.",data});
  }
  if(action==="get-document-url"){
   const t=b.document_type as Doc;if(!DOCS.includes(t))return json({success:false,message:"document_type tidak valid."},400);
   const path=a[t+"_file_path"];if(!ownedPath(path,user.id,id,t))return json({success:false,message:"Dokumen tidak ditemukan."},404);
   const {data,error}=await db.storage.from(BUCKET).createSignedUrl(path as string,300);if(error)throw error;
   return json({success:true,data:{signed_url:data.signedUrl,expires_in:300}});
  }
  return json({success:false,message:"Action tidak valid."},400);
 }catch(e){
  console.error("bumn-lamar error:",e);
  const m=e instanceof Error?e.message:"";
  const client=["Field","Terdapat","Tahun","IPK","Status","Tanggal","Format","Pengalaman","Kredensial"].some(x=>m.startsWith(x));
  return json({success:false,message:client?m:"Terjadi kesalahan pada server."},client?400:500);
 }
});