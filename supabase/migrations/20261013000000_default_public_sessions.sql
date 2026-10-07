-- Product decision: logged games are public by default now (the "Public
-- result" toggle is hidden from the UI). Existing rows keep whatever
-- visibility their owner already chose — only the default for new rows
-- changes.

alter table public.game_sessions alter column visibility set default 'public';
