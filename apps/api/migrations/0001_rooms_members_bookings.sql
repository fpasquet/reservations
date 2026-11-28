-- Salles, membres et réservations de l'espace.

create table room (
  id serial primary key,
  name text not null unique,
  floor smallint not null,
  capacity smallint not null check (capacity > 0),
  -- Codes d'équipement (screen, videoconference, whiteboard, speakerphone, step_free_access)
  equipment text[] not null default '{}',
  -- Couleur de la vignette de la salle dans l'interface, au format #rrggbb
  color text not null,
  description text not null default ''
);

create table member (
  id serial primary key,
  full_name text not null,
  email text not null unique,
  company text not null
);

create table booking (
  id serial primary key,
  room_id integer not null references room (id),
  member_id integer not null references member (id),
  title text not null,
  attendees smallint check (attendees > 0),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  cancelled_at timestamptz,
  check (ends_at > starts_at)
);

create index booking_room_starts_at on booking (room_id, starts_at);
create index booking_member_starts_at on booking (member_id, starts_at);
