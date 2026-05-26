# -*- coding: utf-8 -*-
"""Filename → topic folder name (same rules for mp4 and pdf)."""
from __future__ import annotations

import re


def get_topic(name: str) -> str:
    n = name
    if "(사례" in n:
        return "교육사례_동영상"
    if "씨앗 공" in n:
        return "환경_기후_지속가능"
    if "그림책" in n:
        return "그림책_독서놀이"
    if "클로일리" in n:
        return "클로일리_영어소개"
    if re.search(r"놀이 쏙|경제|금융", n):
        return "경제_금융교육"
    if re.search(r"EBS|크니크니", n):
        return "EBS_사회성발달"
    if re.match(r"^\[이음교육\]|^이음교육|^영상 [1-4]_ ", n):
        return "이음교육"
    if "[교원이해제고" in n:
        return "교원이해_시민역량"
    if re.search(r"장애이해|장애공감", n):
        return "장애이해_포용"
    if "수·과학" in n or "수과학" in n:
        return "수과학_일상놀이"
    if "비판적 탐구" in n:
        return "탐구_비판적사고"
    if "교원역량강화" in n:
        return "교원역량강화"
    if "소규모 유치원" in n:
        return "소규모유치원_공동교육과정"
    if re.search(r"다 같이 놀자|우리 동네 보물창고", n):
        return "디지털교육_놀이사례"
    if "2019 개정 누리과정" in n:
        return "누리과정_교육과정이해"
    if n.startswith("[동영상]"):
        return "학교생활_초등연계_동영상"
    if "유아·교사용 콘텐츠" in n or "[음원]" in n:
        return "유아교사용_콘텐츠_음원"
    if re.search(
        r"디지털 부모 지원|\(동영상 자료\) 디지털 부모|\[가정 연계|양육 길라잡이|행복한 아이|사회성 부모 지원",
        n,
    ):
        return "부모_가정연계_지원"
    if re.search(
        r"\(학부모용|학부모에게|학부모가 |부모 지원|부모용\)|교사를 위한 부모교육",
        n,
    ):
        return "부모_가정연계_지원"
    if re.search(
        r"디지털|패들렛|미디어 문해|미디어 중독|건강 체조|챌린지 영상 촬영|유아의 균형 있는 디지털|유아교육 현장에 적합한 디지털",
        n,
    ):
        return "디지털_미디어_문해"
    if n.startswith("#"):
        return "놀이_교육과정_공동체"
    if re.search(r"지구파워번개맨|우리는 기후지킴이", n):
        return "환경_기후_지속가능"
    if re.search(
        r"^1\. 지구가 뜨거워|^10\. 플라스틱은 탄소|^2\. 지구가 아파|^3\. 탄소야|^4\. 우리나라에서 재배|^5\. 바다가 |^6\. 기후변화|^7\. 사라져가는 섬|^8\. 숲은|^9\. 갯벌은|^1[1-9]\. |^20\. |^15\. 살기 좋은|^16\. 파란|^17\. 탄소를|^18\. 똑똑한|^19\. 뜨거워지는",
        n,
    ):
        return "환경_기후_지속가능"
    if re.search(
        r"지구가 뜨거워져요_시온|물을 아껴 써요_손|사라져가는 동물_|사라지는 섬나라|플라스틱은 탄소 덩어리_천연|초록 에너지",
        n,
    ):
        return "환경_기후_지속가능"
    if re.search(r"사라져가는 동물[^가]|뜨거워지는 날씨를 이겨", n):
        return "환경_기후_지속가능"
    if re.match(
        r"^1-1\.|^1-2\.|^1-3\.|^1-4\.|^1-5\.|^3-2\.|^3-5\.", n
    ):
        return "유아활동_자아와가족"
    if n.startswith("3-3."):
        return "디지털_미디어_문해"
    if n.startswith("4-6."):
        return "클로일리_영어소개"
    if re.search(
        r"가치노래|같이 만드는 놀이|가치가 빛나는|놀이, 시간을 말하다|놀이, 어디든 무엇이든",
        n,
    ):
        return "놀이_일반_가치"
    if re.search(r"건강검진|경계가 뭐예요|스트레스가 있어요|탄탄이의 고민", n):
        return "건강_안전_심리"
    if re.match(r"^sample_|^test_", n):
        return "기타_샘플"
    return "기타"
