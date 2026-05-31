create table if not exists reader_articles (
  id text primary key,
  title text not null,
  text text not null,
  audio_urls jsonb,
  segment_word_timings jsonb,
  created_at_ms bigint not null,
  updated_at_ms bigint not null
);

create index if not exists reader_articles_updated_at_ms_idx
  on reader_articles (updated_at_ms desc);

create table if not exists reader_settings (
  id text primary key,
  value jsonb not null,
  updated_at_ms bigint not null
);
