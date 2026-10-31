-- Arrival signaled by the member; without it, 15 minutes after the start, the booking is released (rules §5).
-- Release is derived from the time, it is not stored.
alter table booking add column arrived_at timestamptz;
