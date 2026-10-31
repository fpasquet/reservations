-- Rappels de la veille : une ligne par membre et par jour rappelé, pour n'envoyer qu'un e-mail même si l'API redémarre.

create table booking_reminder (
  member_id integer not null references member (id),
  -- Le jour des réservations rappelées (date à Paris), pas le jour d'envoi
  day date not null,
  sent_at timestamptz not null default now(),
  primary key (member_id, day)
);
