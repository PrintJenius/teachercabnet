export const mainMenus = ['수업자료', '아이일지', '관리']

/** 로그인한 교사만 접근 가능한 메인 메뉴 */
export const loginRequiredMenus = ['수업자료']

/** 비로그인 시 기본으로 보여 줄 메뉴 */
export const defaultMenuForGuest = '아이일지'

export const subMenus = {
  수업자료: ['자료 찾기', '수업 일지', '', ''],
  아이일지: ['일지작성', '일지보기', '아이등록', '', ''],
  관리: ['아이관리', '운영 대시보드', '', ''],
}
