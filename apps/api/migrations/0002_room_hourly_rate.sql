-- Tarif horaire HT des salles (docs/reglement.md, § 3), en centimes.

alter table room add column hourly_rate_cents integer not null default 0 check (hourly_rate_cents >= 0);

-- Les salles déjà en base reçoivent leur tarif ; le seed fixe les mêmes valeurs.
update room set hourly_rate_cents = case name
  when 'Cabine 1' then 800
  when 'Cabine 2' then 800
  when 'Bibliothèque' then 1500
  when 'Petit Salon' then 1800
  when 'Salle d''Été' then 2000
  when 'La Serre' then 2200
  when 'Studio' then 2500
  when 'Atelier' then 4000
  when 'Salon Verrière' then 6000
  else 0
end;
