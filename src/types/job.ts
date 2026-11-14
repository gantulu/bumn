export interface Job {
  id:string; title:string; company:string; category:string; location:string; type:string;
  education:string; salary:string; deadline:string; description:string;
  qualifications:string[]; applicationUrl?:string;
}
export type AppTab="home"|"search"|"saved"|"profile";
