-- db/seed.sql
-- First-run data for 404 Parke Ave. Run once after schema.sql.
-- ⚠️ Replace the placeholder @example.com emails with the girls' real
-- addresses before running — email is the login identity, and codes are
-- sent there.

INSERT INTO people (name, email, is_admin, splits_bills) VALUES
  ('Abby',     'abby@example.com',     1, 1),
  ('Ava',      'ava@example.com',      1, 1),
  ('Caroline', 'caroline@example.com', 1, 1),
  ('Brenda',   'brenda@example.com',   1, 1),
  -- The maintainer: can sign in and run the portal, never owes a share.
  ('Aaron',    'me@aaronperkel.com',   1, 0);

-- Each utility belongs to the roommate whose name is on the account; she pays
-- the provider and the other three owe her their shares.
INSERT INTO bill_types (name, emoji, processing_fee, owner_id) VALUES
  ('Wifi',     '🛜', 0, (SELECT id FROM people WHERE name = 'Abby')),
  ('Electric', '⚡', 0, (SELECT id FROM people WHERE name = 'Ava')),
  ('Gas',      '🔥', 0, (SELECT id FROM people WHERE name = 'Caroline')),
  ('Water',    '💧', 0, (SELECT id FROM people WHERE name = 'Brenda'));

-- Default reminder schedule: 9 AM ET, heads-up 7 days out, urgent within 3.
INSERT INTO reminder_config (enabled, send_hour, first_reminder_days, urgent_reminder_days)
VALUES (1, 9, 7, 3);

-- ---------------------------------------------------------------------------
-- Demo bills so the site has something to show. No PDFs attached.
-- 🗑 Delete everything below (bills + bill_debts) before real use:
--    DELETE FROM bill_debts; DELETE FROM bills;
-- ---------------------------------------------------------------------------

-- Gas: Caroline's account, still open — Abby, Ava, Brenda each owe her.
INSERT INTO bills (type_id, bill_date, due_date, total, per_person_cost, status, pdf_path, added_by_id)
VALUES ((SELECT id FROM bill_types WHERE name = 'Gas'), '2026-07-02', '2026-07-18', 62.40, 15.60, 'unpaid', NULL,
        (SELECT id FROM people WHERE name = 'Caroline'));
INSERT INTO bill_debts (bill_id, person_id)
SELECT LAST_INSERT_ID(), id FROM people WHERE name IN ('Abby', 'Ava', 'Brenda');

-- Wifi: Abby's account — Ava already paid her back, Caroline & Brenda haven't.
INSERT INTO bills (type_id, bill_date, due_date, total, per_person_cost, status, pdf_path, added_by_id)
VALUES ((SELECT id FROM bill_types WHERE name = 'Wifi'), '2026-07-01', '2026-07-25', 79.99, 20.00, 'unpaid', NULL,
        (SELECT id FROM people WHERE name = 'Abby'));
INSERT INTO bill_debts (bill_id, person_id)
SELECT LAST_INSERT_ID(), id FROM people WHERE name IN ('Caroline', 'Brenda');

-- Water: Brenda's account, just posted — everyone else still owes.
INSERT INTO bills (type_id, bill_date, due_date, total, per_person_cost, status, pdf_path, added_by_id)
VALUES ((SELECT id FROM bill_types WHERE name = 'Water'), '2026-07-10', '2026-08-01', 43.16, 10.79, 'unpaid', NULL,
        (SELECT id FROM people WHERE name = 'Brenda'));
INSERT INTO bill_debts (bill_id, person_id)
SELECT LAST_INSERT_ID(), id FROM people WHERE name IN ('Abby', 'Ava', 'Caroline');

-- Electric: Ava's account, settled last month.
INSERT INTO bills (type_id, bill_date, due_date, total, per_person_cost, status, pdf_path, added_by_id)
VALUES ((SELECT id FROM bill_types WHERE name = 'Electric'), '2026-06-05', '2026-06-20', 104.12, 26.03, 'paid', NULL,
        (SELECT id FROM people WHERE name = 'Ava'));
