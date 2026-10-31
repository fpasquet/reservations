-- Deux réservations non annulées ne se chevauchent pas dans une même salle.
-- L'intervalle est semi-ouvert [début, fin[ : une réservation peut commencer quand la précédente finit.
create extension if not exists btree_gist;

alter table booking
  add constraint booking_room_no_overlap
  exclude using gist (room_id with =, tstzrange(starts_at, ends_at, '[)') with &&)
  where (cancelled_at is null);
