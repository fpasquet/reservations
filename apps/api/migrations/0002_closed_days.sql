-- Jours où l'espace est fermé : aucune réservation n'y est possible.

create table closed_day (
  day date primary key,
  name text not null,
  -- 'public_holiday' : jours fériés relus chaque jour depuis l'API publique ; les autres sources ne sont jamais touchées
  source text not null default 'public_holiday'
);
