-- Check if trigger exists
SELECT tgname, tgrelid::regclass, tgfoid::regprocedure
FROM pg_trigger
WHERE tgname LIKE '%quiz%' OR tgname LIKE '%notify%';
