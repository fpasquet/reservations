-- Réservations récurrentes : une série regroupe les occurrences hebdomadaires créées ensemble.

create table booking_series (
  id serial primary key,
  member_id integer not null references member (id),
  -- Nombre de semaines demandé ; certaines occurrences en conflit peuvent ne pas avoir été créées
  weeks smallint not null check (weeks between 2 and 12),
  created_at timestamptz not null default now()
);

alter table booking add column series_id integer references booking_series (id);

create index booking_series_id on booking (series_id) where series_id is not null;
