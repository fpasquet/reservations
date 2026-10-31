-- Liste d'attente sur un créneau déjà pris : le premier inscrit reçoit une offre (offered_at) et a jusqu'à
-- offer_expires_at pour la confirmer ; l'inscription est supprimée à l'expiration de l'offre ou au début du créneau.

create table waitlist_entry (
  id serial primary key,
  room_id integer not null references room (id),
  member_id integer not null references member (id),
  title text not null,
  attendees smallint check (attendees > 0),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  offered_at timestamptz,
  offer_expires_at timestamptz,
  check (ends_at > starts_at),
  unique (room_id, member_id, starts_at, ends_at)
);

create index waitlist_entry_member on waitlist_entry (member_id, starts_at);
