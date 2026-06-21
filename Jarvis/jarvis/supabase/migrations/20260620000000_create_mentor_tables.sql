-- Phase 3: accountability-mentor store for Jarvis.
--
-- Backs core/mentor.py — commitments Abhishek makes, facts about him, and
-- check-ins. Apply with the Supabase CLI (`supabase db push`) or paste into the
-- Supabase SQL editor. Jarvis connects with the SERVICE ROLE key, which bypasses
-- row-level security, so no policies are defined here.

-- Commitments the mentor holds him accountable to.
create table if not exists public.commitments (
    id          bigint generated always as identity primary key,
    category    text        not null default 'discipline'
                            check (category in ('genois', 'ms_prep', 'discipline')),
    description text        not null,
    due_date    date,                                 -- nullable: not every commitment has a deadline
    status      text        not null default 'open'
                            check (status in ('open', 'done', 'missed')),
    created_at  timestamptz not null default now()
);

-- get_open_commitments() filters status='open' and orders by created_at.
create index if not exists commitments_status_created_idx
    on public.commitments (status, created_at);

-- get_overdue_commitments() filters status='open' and due_date < today.
create index if not exists commitments_status_due_idx
    on public.commitments (status, due_date);

-- Long-lived facts about Abhishek, keyed by name. remember_fact() upserts on key.
create table if not exists public.facts (
    key        text        primary key,
    value      text        not null,
    updated_at timestamptz not null default now()
);

-- Progress check-ins (reserved for future use; mentor.py reads/writes commitments
-- and facts today, this table rounds out the Phase 3 schema).
create table if not exists public.check_ins (
    id         bigint      generated always as identity primary key,
    note       text        not null,
    created_at timestamptz not null default now()
);
