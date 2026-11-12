-- Check all triggers on quiz-related tables
SELECT 
  t.tgname as trigger_name,
  t.tgrelid::regclass as table_name,
  p.proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgrelid::regclass::text IN ('quiz_attempts', 'quiz_results', 'quizzes')
  AND NOT t.tgisinternal
ORDER BY t.tgrelid::regclass::text, t.tgname;
