
-- =========================================================
-- Extensions
-- =========================================================
create extension if not exists vector;
create extension if not exists pg_trgm;

-- =========================================================
-- Enums
-- =========================================================
create type public.app_role as enum ('admin', 'user');
create type public.degree_level as enum ('school','undergraduate','postgraduate','phd','postdoc','any');
create type public.funding_type as enum ('full','partial','stipend','tuition','travel','research','other');
create type public.application_status as enum ('saved','preparing','ready','redirected','submitted','under_review','interview','awarded','rejected');
create type public.document_kind as enum ('resume','sop','essay','personal_statement','recommendation','transcript','other');
create type public.agent_kind as enum ('supervisor','search','eligibility','ranking','doc_review','checklist','reminder','tracker','chat');
create type public.run_status as enum ('running','succeeded','failed');

-- =========================================================
-- Helper: updated_at trigger
-- =========================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

-- =========================================================
-- User roles
-- =========================================================
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null default 'user',
  created_at timestamptz not null default now(),
  unique(user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "read own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- =========================================================
-- Profiles
-- =========================================================
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  avatar_url text,
  country text,
  degree_level public.degree_level default 'undergraduate',
  field_of_study text,
  university text,
  graduation_year int,
  cgpa numeric(4,2),
  skills text[] default '{}',
  achievements text,
  work_years int default 0,
  target_countries text[] default '{}',
  target_fields text[] default '{}',
  bio text,
  completion_pct int default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "read own profile" on public.profiles for select to authenticated using (auth.uid() = user_id);
create policy "update own profile" on public.profiles for update to authenticated using (auth.uid() = user_id);
create policy "insert own profile" on public.profiles for insert to authenticated with check (auth.uid() = user_id);
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();

-- Auto-create profile & default role on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, full_name, email, avatar_url)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)), new.email, new.raw_user_meta_data->>'avatar_url')
  on conflict (user_id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'user') on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- =========================================================
-- Scholarships (public catalog)
-- =========================================================
create table public.scholarships (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  provider text not null,
  source text,                       -- NSP, AICTE, Buddy4Study, Rhodes, Fulbright, etc.
  summary text,
  benefits text,
  amount_usd numeric,
  deadline date,
  eligibility text,
  required_documents text[] default '{}',
  apply_url text,
  country text,                       -- host country
  degree_level public.degree_level default 'any',
  funding_type public.funding_type default 'other',
  fields text[] default '{}',
  tags text[] default '{}',
  min_cgpa numeric(4,2),
  eligible_countries text[] default '{}', -- '{}' means all
  embedding vector(3072),
  is_active boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.scholarships to authenticated, anon;
grant insert, update, delete on public.scholarships to authenticated;
grant all on public.scholarships to service_role;
alter table public.scholarships enable row level security;
create policy "anyone reads active scholarships" on public.scholarships for select to anon, authenticated using (is_active = true);
create policy "admins manage scholarships" on public.scholarships for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create trigger scholarships_updated_at before update on public.scholarships for each row execute function public.set_updated_at();
create index scholarships_title_trgm on public.scholarships using gin (title gin_trgm_ops);
create index scholarships_summary_trgm on public.scholarships using gin (summary gin_trgm_ops);
create index scholarships_country_idx on public.scholarships (country);
create index scholarships_deadline_idx on public.scholarships (deadline);

-- =========================================================
-- Saved scholarships
-- =========================================================
create table public.saved_scholarships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scholarship_id uuid not null references public.scholarships(id) on delete cascade,
  note text,
  created_at timestamptz not null default now(),
  unique(user_id, scholarship_id)
);
grant select, insert, update, delete on public.saved_scholarships to authenticated;
grant all on public.saved_scholarships to service_role;
alter table public.saved_scholarships enable row level security;
create policy "manage own saves" on public.saved_scholarships for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =========================================================
-- Applications
-- =========================================================
create table public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scholarship_id uuid not null references public.scholarships(id) on delete cascade,
  status public.application_status not null default 'saved',
  notes text,
  timeline jsonb default '[]'::jsonb,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, scholarship_id)
);
grant select, insert, update, delete on public.applications to authenticated;
grant all on public.applications to service_role;
alter table public.applications enable row level security;
create policy "manage own applications" on public.applications for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger applications_updated_at before update on public.applications for each row execute function public.set_updated_at();

-- =========================================================
-- Documents
-- =========================================================
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind public.document_kind not null,
  title text not null,
  storage_path text,
  extracted_text text,
  review jsonb,           -- {score, grammar, ats, readability, suggestions[], missing[]}
  score int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.documents to authenticated;
grant all on public.documents to service_role;
alter table public.documents enable row level security;
create policy "manage own documents" on public.documents for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger documents_updated_at before update on public.documents for each row execute function public.set_updated_at();

-- =========================================================
-- Checklists
-- =========================================================
create table public.checklists (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  items jsonb not null default '[]'::jsonb,  -- [{id, label, done, due_at}]
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.checklists to authenticated;
grant all on public.checklists to service_role;
alter table public.checklists enable row level security;
create policy "manage own checklists" on public.checklists for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger checklists_updated_at before update on public.checklists for each row execute function public.set_updated_at();

-- =========================================================
-- Reminders
-- =========================================================
create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  application_id uuid references public.applications(id) on delete cascade,
  scholarship_id uuid references public.scholarships(id) on delete cascade,
  kind text not null,     -- deadline, checklist, weekly_summary
  message text not null,
  remind_at timestamptz not null,
  sent_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.reminders to authenticated;
grant all on public.reminders to service_role;
alter table public.reminders enable row level security;
create policy "manage own reminders" on public.reminders for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index reminders_user_remind_idx on public.reminders (user_id, remind_at);

-- =========================================================
-- Agent traces
-- =========================================================
create table public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind public.agent_kind not null,
  status public.run_status not null default 'running',
  input jsonb,
  output jsonb,
  error text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
grant select, insert, update, delete on public.agent_runs to authenticated;
grant all on public.agent_runs to service_role;
alter table public.agent_runs enable row level security;
create policy "read own runs" on public.agent_runs for select to authenticated using (auth.uid() = user_id);
create policy "insert own runs" on public.agent_runs for insert to authenticated with check (auth.uid() = user_id);
create policy "update own runs" on public.agent_runs for update to authenticated using (auth.uid() = user_id);

create table public.agent_steps (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.agent_runs(id) on delete cascade,
  agent public.agent_kind not null,
  input jsonb,
  output jsonb,
  tokens int,
  latency_ms int,
  error text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.agent_steps to authenticated;
grant all on public.agent_steps to service_role;
alter table public.agent_steps enable row level security;
create policy "read own steps" on public.agent_steps for select to authenticated using (
  exists(select 1 from public.agent_runs r where r.id = run_id and r.user_id = auth.uid())
);
create policy "insert own steps" on public.agent_steps for insert to authenticated with check (
  exists(select 1 from public.agent_runs r where r.id = run_id and r.user_id = auth.uid())
);

-- =========================================================
-- RAG match function (vector + fallback)
-- =========================================================
create or replace function public.match_scholarships(
  query_embedding vector(3072),
  match_count int default 20,
  filter_country text default null,
  filter_degree public.degree_level default null
)
returns table (
  id uuid, title text, provider text, summary text, deadline date, country text,
  degree_level public.degree_level, funding_type public.funding_type, apply_url text,
  amount_usd numeric, similarity float
)
language sql stable as $$
  select s.id, s.title, s.provider, s.summary, s.deadline, s.country,
         s.degree_level, s.funding_type, s.apply_url, s.amount_usd,
         case when s.embedding is not null then 1 - (s.embedding <=> query_embedding) else 0.5 end as similarity
  from public.scholarships s
  where s.is_active = true
    and (filter_country is null or s.country = filter_country or s.country = 'Global')
    and (filter_degree is null or s.degree_level = filter_degree or s.degree_level = 'any')
  order by similarity desc, s.deadline asc nulls last
  limit match_count;
$$;

-- =========================================================
-- Seed scholarships
-- =========================================================
insert into public.scholarships (title, provider, source, summary, benefits, amount_usd, deadline, eligibility, required_documents, apply_url, country, degree_level, funding_type, fields, tags, min_cgpa, eligible_countries) values
('Post Matric Scholarship for SC Students','Ministry of Social Justice','NSP','Central sector scheme supporting SC students in post-matriculation studies in India.','Full tuition + maintenance allowance',1200,'2026-10-31','SC category, family income under 2.5L, enrolled in a recognized post-matric course','{Transcript,IncomeCertificate,CasteCertificate,AadhaarCard}','https://scholarships.gov.in','India','undergraduate','tuition','{"any"}','{government,sc,india}',null,'{India}'),
('Central Sector Scholarship of Top Class Education','Ministry of Social Justice','NSP','For SC students in premier institutions covering full fees.','Full tuition + books + monthly stipend',3000,'2026-09-30','SC students admitted to notified premier institutes','{AdmissionLetter,IncomeCertificate,CasteCertificate}','https://scholarships.gov.in','India','postgraduate','full','{"engineering","management","medicine"}','{government,premier,india}',null,'{India}'),
('AICTE Pragati Scholarship for Girls','AICTE','AICTE','Encourages girls to pursue technical education in India.','Rs 50,000 per annum',600,'2026-10-31','First-year girls in AICTE-approved tech programs, family income under 8L','{AdmissionLetter,IncomeCertificate,AadhaarCard}','https://aicte-pragati.gov.in','India','undergraduate','partial','{"engineering","technology"}','{aicte,women,india}',null,'{India}'),
('AICTE Saksham Scholarship','AICTE','AICTE','Supports specially-abled students in technical education.','Rs 50,000 per annum',600,'2026-10-31','Specially-abled students (40%+ disability) in AICTE programs','{DisabilityCertificate,AdmissionLetter,IncomeCertificate}','https://aicte-saksham.gov.in','India','undergraduate','partial','{"engineering","technology"}','{aicte,disability,india}',null,'{India}'),
('Reliance Foundation Undergraduate Scholarship','Reliance Foundation','Buddy4Study','Merit-cum-means scholarship for undergraduate students in India.','Up to Rs 2,00,000 total',2400,'2026-11-15','First-year UG students, family income under 15L, 60%+ in class 12','{Marksheet,IncomeCertificate,AdmissionLetter}','https://scholarships.reliancefoundation.org','India','undergraduate','partial','{"any"}','{corporate,merit,india}',6.0,'{India}'),
('Tata Scholarship for Cornell University','Tata Trusts','Company','Full-tuition scholarship for Indian undergraduates at Cornell.','Full tuition + fees',60000,'2026-01-05','Indian citizens admitted to Cornell for undergraduate study, need-based','{Admission,IncomeProof,Essays,LORs}','https://www.tata.com/newsroom/community/tata-scholars-cornell-university','USA','undergraduate','full','{"any"}','{ivy,corporate,need-based}',null,'{India}'),
('Rhodes Scholarship','Rhodes Trust','International','World-renowned postgraduate scholarship at the University of Oxford.','Full tuition + stipend + travel',75000,'2026-07-31','Ages 18-24, outstanding academic + leadership record, admission to Oxford','{CV,Essays,References,Transcripts}','https://www.rhodeshouse.ox.ac.uk','UK','postgraduate','full','{"any"}','{oxford,prestigious,leadership}',8.5,'{"India","USA","Canada","Australia","Germany","Kenya","South Africa","Zimbabwe"}'),
('Fulbright-Nehru Master''s Fellowships','USIEF','International','For Indian students pursuing masters programs in the US.','Full tuition + living stipend + travel',50000,'2026-05-15','Indian citizens, 3+ years work experience, bachelor equivalent to US 4-year degree','{ResearchStatement,CV,LORs,Transcripts}','https://www.usief.org.in','USA','postgraduate','full','{"stem","humanities","social-sciences"}','{fulbright,usa,research}',7.5,'{India}'),
('Chevening Scholarships','UK Government','International','UK global scholarship programme funded by the Foreign, Commonwealth & Development Office.','Full tuition + stipend + travel',45000,'2026-11-05','2+ years work experience, undergrad degree, admission to eligible UK master''s','{Essays,References,Transcripts,IELTS}','https://www.chevening.org','UK','postgraduate','full','{"any"}','{uk,leadership,prestigious}',6.5,'{}'),
('DAAD Scholarship for Development-Related Postgraduate Courses','DAAD','International','For professionals from developing countries pursuing postgraduate studies in Germany.','Monthly stipend + travel + insurance',30000,'2026-09-30','2+ years professional experience, bachelor degree, from developing country','{CV,MotivationLetter,Transcripts,LORs}','https://www.daad.de','Germany','postgraduate','stipend','{"engineering","economics","public-policy","agriculture"}','{germany,daad,development}',null,'{}'),
('Erasmus Mundus Joint Master Degrees','European Commission','International','Prestigious EU scholarships for joint international master programmes.','Full tuition + monthly allowance + travel',55000,'2026-01-15','Bachelor degree, admission to an EMJMD consortium','{CV,MotivationLetter,Transcripts,LORs}','https://erasmus-plus.ec.europa.eu','Europe','postgraduate','full','{"any"}','{erasmus,eu,international}',null,'{}'),
('Commonwealth Scholarships','Commonwealth Scholarship Commission','International','For students from Commonwealth countries to study in the UK.','Full tuition + stipend + travel',55000,'2026-10-30','Citizen of eligible Commonwealth country, bachelor with upper second class','{CV,References,Transcripts,ResearchProposal}','https://cscuk.fcdo.gov.uk','UK','postgraduate','full','{"any"}','{commonwealth,uk,research}',null,'{"India","Kenya","Nigeria","Bangladesh","Pakistan","Sri Lanka","Ghana","South Africa"}'),
('MITACS Globalink Research Internship','Mitacs','International','12-week research internship in Canada for undergraduate students.','CA$3,000 stipend + travel + accommodation',6000,'2026-09-21','Undergrads in Sr 3 or Sr 4, top 25% of class, from partner countries','{CV,Transcripts,ResearchInterests}','https://www.mitacs.ca','Canada','undergraduate','research','{"stem"}','{research,canada,internship}',7.5,'{"India","Brazil","China","France","Germany","Mexico","Tunisia","Ukraine"}'),
('Australia Awards Scholarships','Australian Government','International','Long-term development awards for study in Australia.','Full tuition + stipend + travel + health cover',80000,'2026-04-30','From partner developing country, 2+ years work, bachelor degree','{CV,Essays,References}','https://www.dfat.gov.au/people-to-people/australia-awards','Australia','postgraduate','full','{"any"}','{australia,development}',null,'{}'),
('Knight-Hennessy Scholars','Stanford University','International','Fully-funded graduate scholarship at Stanford.','Full tuition + stipend',85000,'2026-10-11','Bachelor within last 7 years, admission to any Stanford graduate program','{Essays,LORs,Transcripts,CV}','https://knight-hennessy.stanford.edu','USA','postgraduate','full','{"any"}','{stanford,prestigious,leadership}',8.5,'{}'),
('Schwarzman Scholars','Schwarzman Scholars','International','One-year master''s at Tsinghua University in Beijing.','Full tuition + travel + stipend',75000,'2026-09-16','Under 29, bachelor degree, strong leadership, English fluency','{Essays,CV,References,VideoInterview}','https://www.schwarzmanscholars.org','China','postgraduate','full','{"public-policy","economics","international-relations"}','{china,leadership,prestigious}',8.0,'{}'),
('Google Generation Scholarship','Google','Company','For students in computer science and related fields.','$10,000 USD',10000,'2026-12-05','Enrolled in CS-related undergrad/grad, from underrepresented group','{Resume,Essays,Transcripts}','https://buildyourfuture.withgoogle.com','Global','undergraduate','partial','{"computer-science","engineering"}','{google,tech,diversity}',null,'{}'),
('Microsoft Tuition Scholarship','Microsoft','Company','Merit-based tuition scholarship in computing.','Up to full tuition',30000,'2026-01-31','US, Canada, or Mexico high school seniors pursuing CS undergrad','{Resume,Essays,Transcripts,References}','https://careers.microsoft.com','USA','undergraduate','partial','{"computer-science"}','{microsoft,tech,merit}',null,'{"USA","Canada","Mexico"}'),
('Adobe Research Women-in-Technology Scholarship','Adobe','Company','For women in CS and engineering programs.','$10,000 + summer internship',10000,'2026-10-08','Women in CS/engineering with 1 year remaining','{Resume,Essays,Transcripts}','https://research.adobe.com','Global','undergraduate','partial','{"computer-science","engineering"}','{adobe,women,tech}',null,'{}'),
('Palantir Future Scholarship','Palantir','Company','For students underrepresented in tech.','$7,000 + Palantir workshop',7000,'2026-04-30','Undergrads from underrepresented groups in CS/related','{Resume,Essays}','https://www.palantir.com/careers','USA','undergraduate','partial','{"computer-science"}','{palantir,tech,diversity}',null,'{"USA","Canada","UK"}'),
('Inlaks Shivdasani Scholarship','Inlaks Foundation','International','For young Indians pursuing masters at top world universities.','Up to $100,000',100000,'2026-03-30','Indian citizen under 30, admitted to top world univ, undergrad from Indian institution','{Essays,LORs,Transcripts,Admission}','https://www.inlaksfoundation.org','Global','postgraduate','full','{"any"}','{india,merit,international}',8.0,'{India}'),
('KVPY Fellowship','Government of India','NSP','For students pursuing basic sciences research.','Rs 5,000-7,000/month stipend + contingency',1500,'2026-08-31','Class 11 to first year BSc, aptitude test qualified','{ExamResult,AdmissionLetter}','https://kvpy.iisc.ernet.in','India','undergraduate','stipend','{"basic-sciences"}','{research,india,government}',null,'{India}'),
('INSPIRE Scholarship','DST','NSP','Encouragement to top science students in India.','Rs 80,000/year',1000,'2026-07-31','Top 1% in class 12, pursuing BSc/BS in basic/natural sciences','{Marksheet,AdmissionLetter}','https://online-inspire.gov.in','India','undergraduate','partial','{"basic-sciences"}','{india,government,science}',null,'{India}'),
('Prime Minister''s Research Fellowship','Government of India','NSP','For PhD students in IITs, IISc, IISERs.','Rs 70,000-80,000/month + research grant',12000,'2026-12-15','Direct PhD or first-year PhD in premier institutes, top academic record','{Transcripts,ResearchProposal,LORs}','https://www.pmrf.in','India','phd','stipend','{"stem"}','{india,pmrf,research}',8.5,'{India}'),
('Aga Khan Foundation International Scholarship','Aga Khan Foundation','International','For postgraduate studies at top global universities.','50% grant + 50% loan',30000,'2026-03-31','Excellent students from developing countries with financial need','{Essays,LORs,Transcripts,Admission}','https://the.akdn/en/how-we-work/our-agencies/aga-khan-foundation/international-scholarship-programme','Global','postgraduate','partial','{"any"}','{aga-khan,need-based,international}',null,'{}'),
('Gates Cambridge Scholarship','Bill & Melinda Gates Foundation','International','Full-cost postgraduate awards at Cambridge.','Full tuition + stipend + travel',70000,'2026-12-03','Non-UK citizens applying to Cambridge PhD/masters','{Essays,LORs,Transcripts}','https://www.gatescambridge.org','UK','postgraduate','full','{"any"}','{gates,cambridge,prestigious}',8.5,'{}'),
('MEXT Scholarship','MEXT Japan','International','Japanese Government scholarship for international students.','Full tuition + stipend + travel',35000,'2026-06-15','Nationals from countries with diplomatic ties to Japan','{Essays,Transcripts,LORs,MedicalCert}','https://www.mext.go.jp','Japan','postgraduate','full','{"any"}','{japan,government,international}',null,'{}'),
('Vanier Canada Graduate Scholarship','Government of Canada','International','For world-class doctoral students studying in Canada.','$50,000/year for 3 years',110000,'2026-11-01','PhD applicants with strong research and leadership','{ResearchProposal,LORs,CV}','https://vanier.gc.ca','Canada','phd','full','{"any"}','{canada,phd,research}',null,'{}'),
('Swiss Government Excellence Scholarships','Swiss Confederation','International','For foreign researchers and artists in Switzerland.','Monthly stipend + insurance + travel',30000,'2026-11-30','Postgraduate researchers, from eligible countries','{ResearchPlan,CV,LORs}','https://www.sbfi.admin.ch','Switzerland','postgraduate','stipend','{"any"}','{swiss,research,phd}',null,'{}'),
('Amazon Future Engineer Scholarship','Amazon','Company','For CS students from underserved communities.','$40,000 + paid internship',40000,'2026-01-24','US high school seniors pursuing CS, financial need','{Essays,Transcripts}','https://www.amazonfutureengineer.com','USA','undergraduate','partial','{"computer-science"}','{amazon,tech,diversity}',null,'{USA}'),
('CN Yang Scholars Programme','NTU Singapore','International','Full scholarship at Nanyang Technological University for STEM.','Full tuition + stipend + travel',45000,'2026-03-15','Top academic + strong research potential in STEM','{Essays,Transcripts,LORs}','https://www.ntu.edu.sg/cnyang','Singapore','undergraduate','full','{"stem"}','{ntu,singapore,stem}',9.0,'{}'),
('KAIST International Student Scholarship','KAIST','International','For international undergrads at KAIST South Korea.','Full tuition + living allowance',25000,'2026-10-31','International undergrad admits at KAIST','{Application,Transcripts,Essays}','https://admission.kaist.ac.kr','South Korea','undergraduate','full','{"stem"}','{kaist,korea,stem}',null,'{}');
