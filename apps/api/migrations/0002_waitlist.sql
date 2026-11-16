-- Liste d'attente sur un créneau déjà pris.

create table waitlist_entry (
  id serial primary key,
  room_id integer not null references room (id),
  member_id integer not null references member (id),
  title text not null,
  attendees smallint check (attendees > 0),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  -- Renseignés quand le créneau s'est libéré et a été proposé au membre, qui doit confirmer avant offer_expires_at
  offered_at timestamptz,
  offer_expires_at timestamptz,
  check (ends_at > starts_at),
  check ((offered_at is null) = (offer_expires_at is null))
);

create index waitlist_entry_member on waitlist_entry (member_id, starts_at);
create index waitlist_entry_room_starts_at on waitlist_entry (room_id, starts_at);
