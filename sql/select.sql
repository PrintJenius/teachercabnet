-- Supabase SQL Editor / psql 데이터 확인용 (PostgreSQL)
-- 스키마는 Spring JPA ddl-auto로 생성됩니다. 이 파일은 조회만 합니다.

-- 계정
SELECT * FROM teacher ORDER BY teacher_id;

-- 원아·일지
SELECT * FROM student ORDER BY student_id;
SELECT * FROM student_journal ORDER BY journal_id DESC LIMIT 50;
SELECT * FROM student_journal_entry ORDER BY entry_id DESC LIMIT 50;

-- 수업 계획·카테고리 (레거시)
SELECT * FROM custom_category ORDER BY category_id;
SELECT * FROM lesson_plan ORDER BY lesson_plan_id DESC LIMIT 50;

-- 수업 일지
SELECT * FROM lesson_journal ORDER BY lesson_journal_id DESC LIMIT 50;
SELECT * FROM lesson_journal_material ORDER BY lesson_journal_material_id DESC LIMIT 50;

-- RAG 검색·자료 선택 로그
SELECT * FROM lesson_search_log ORDER BY search_log_id DESC LIMIT 50;
SELECT * FROM lesson_search_result_log ORDER BY result_log_id DESC LIMIT 50;
SELECT * FROM lesson_material_select_log ORDER BY select_log_id DESC LIMIT 50;
