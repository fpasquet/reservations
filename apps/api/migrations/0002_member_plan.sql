-- Formule d'abonnement du membre : nomade (10 h de salle par mois), resident (40 h) ou equipe (illimité).

alter table member
  add column plan text not null default 'nomade' check (plan in ('nomade', 'resident', 'equipe'));
