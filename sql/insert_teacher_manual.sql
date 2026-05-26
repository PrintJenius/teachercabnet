-- 지인 계정 수동 등록 (운영 대시보드에서 만들어도 됨)
USE teacher_cabinet;

INSERT INTO teacher (login_id, password, nickname, is_admin)
VALUES ('friend01', '원하는비밀번호', 'friend01_nick', FALSE);
