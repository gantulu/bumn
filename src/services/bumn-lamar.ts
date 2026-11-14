import { readBumnCredentials } from "./bumn-auth";
const URL_API = "https://zyiavfljweavoxyyplxj.supabase.co/functions/v1/bumn-lamar";
export type ApplicationStatus = "draft"|"submitted"|"reviewing"|"shortlisted"|"rejected"|"accepted"|"withdrawn";
export type Application = {
 id:string; application_number:string; user_id:string; job_id:string; status:ApplicationStatus;
 full_name:string; email:string|null; phone:string; cv_title:string|null; cv_summary:string|null; cv_skills:string[];
 cv_education_summary:string|null; cv_experience_summary:string|null; cv_portfolio_url:string|null;
 cover_letter_subject:string|null; cover_letter_content:string|null; cover_letter_created_at:string|null;
 diploma_file_name:string|null; diploma_file_path:string|null; diploma_file_type:string|null; diploma_file_size:number|null; diploma_uploaded_at:string|null;
 identity_card_file_name:string|null; identity_card_file_path:string|null; identity_card_file_type:string|null; identity_card_file_size:number|null; identity_card_uploaded_at:string|null;
 education_level:string|null; education_institution:string|null; education_major:string|null; education_degree:string|null;
 education_start_year:number|null; education_graduation_year:number|null; education_gpa:number|null; education_description:string|null;
 experience_type:string|null; experience_company:string|null; experience_position:string|null; experience_employment_type:string|null;
 experience_location:string|null; experience_start_date:string|null; experience_end_date:string|null; experience_is_current:boolean;
 experience_description:string|null; experience_responsibilities:string[]; submitted_at:string|null; created_at:string; updated_at:string;
};
type Response<T>={success:boolean;message?:string;data?:T;pagination?:unknown};
function auth(){const c=readBumnCredentials();if(!c)throw new Error("Sesi login tidak ditemukan. Silakan masuk kembali.");return c;}
async function post<T>(payload:Record<string,unknown>):Promise<Response<T>>{
 const r=await fetch(URL_API,{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify({...auth(),...payload})});
 const j=await r.json() as Response<T>;if(!r.ok||!j.success)throw new Error(j.message||"Permintaan lamaran gagal.");return j;
}
export async function listApplications(){const r=await post<Application[]>({action:"list",limit:50,offset:0});return Array.isArray(r.data)?r.data:[];}
export async function createApplication(jobId:string){const r=await post<Application>({action:"create",job_id:jobId});if(!r.data)throw new Error("Draft tidak ditemukan.");return r.data;}
export async function updateApplication(id:string,data:Record<string,unknown>){const r=await post<Application>({action:"update",application_id:id,data});if(!r.data)throw new Error("Draft tidak ditemukan.");return r.data;}
export async function submitApplication(id:string){const r=await post<Application>({action:"submit",application_id:id});if(!r.data)throw new Error("Status lamaran tidak ditemukan.");return r.data;}
export async function uploadApplicationDocument(id:string,type:"diploma"|"identity_card",file:File){
 if(file.size<=0||file.size>5242880)throw new Error("Ukuran dokumen maksimal 5 MB.");
 if(!["application/pdf","image/jpeg","image/png"].includes(file.type))throw new Error("Dokumen harus PDF, JPG, atau PNG.");
 const c=auth(),f=new FormData();f.append("action","upload-document");f.append("phone",c.phone);f.append("password",c.password);f.append("application_id",id);f.append("document_type",type);f.append("file",file);
 const r=await fetch(URL_API,{method:"POST",headers:{Accept:"application/json"},body:f});const j=await r.json() as Response<Application>;
 if(!r.ok||!j.success||!j.data)throw new Error(j.message||"Upload dokumen gagal.");return j.data;
}
export async function getApplicationDocumentUrl(id:string,type:"diploma"|"identity_card"){
 const r=await post<{signed_url:string;expires_in:number}>({action:"get-document-url",application_id:id,document_type:type});
 if(!r.data?.signed_url)throw new Error("Tautan dokumen tidak tersedia.");return r.data.signed_url;
}
