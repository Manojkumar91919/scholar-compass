
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
language sql stable set search_path = public as $$
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
