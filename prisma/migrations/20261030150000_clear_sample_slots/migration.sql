-- One-time clean-up for the trial: remove the sample lives so the team can
-- start again from Input Live Slot. Payments go with their slots (cascade).
-- Rooms, brands, staff, MCs, shifts and users are kept.
DELETE FROM "slot_locks";
DELETE FROM "slots";
