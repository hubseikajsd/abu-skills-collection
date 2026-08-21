[English](README.md) | 한국어

# claude-office-skills

> **Claude in Excel · Claude in PowerPoint의 스킬을 Claude Code에서 쓸 수 있게 복원한 모음.**

Anthropic은 **Claude in Excel**과 **Claude in PowerPoint** 애드인에 도메인 스킬(DCF 모델링, 덱 빌딩, 수식 감사 등)을 내장해서 배포합니다. 이 저장소는 그 스킬들을 Claude Code에서 바로 불러쓸 수 있는 `SKILL.md` 형식으로 복원한 것입니다. 덕분에 애드인 밖 — 로컬 `.xlsx` / `.pptx` 파일, 터미널 워크플로우, Claude Code가 파일 시스템을 건드릴 수 있는 어디서든 — 같은 스킬을 쓸 수 있습니다.

[시작하기](#시작하기) • [스킬](#스킬) • [설치](#설치) • [고지사항](#고지사항)

---

## 시작하기

### 1. 클론

```bash
git clone https://github.com/<your-handle>/claude-office-skills.git
cd claude-office-skills
```

### 2. Claude Code에 스킬 복사

```bash
# 전체 설치
cp -r claude-in-excel/* ~/.claude/skills/
cp -r claude-in-powerpoint/* ~/.claude/skills/

# 특정 스킬만
cp -r claude-in-excel/dcf-model ~/.claude/skills/
```

### 3. Claude Code에서 호출

각 스킬의 프론트매터에 자연어 트리거가 정의돼 있어서, 그냥 원하는 작업을 말하면 됩니다:

```
"이 회사 DCF 만들어줘"
"이 스프레드시트 감사해줘"
"경쟁 환경 덱 만들어줘"
"이 덱 리프레시해줘"
```

Claude Code가 요청을 알아서 해당 스킬에 매칭합니다.

---

## 스킬

### 📊 claude-in-excel (6개)

| 스킬 | 용도 | 트리거 예시 |
|-------|------|-------------|
| `audit-xls` | 수식 오류·모델 무결성 감사 | "수식 체크해줘", "모델이 안 맞아", "스프레드시트 QA" |
| `clean-data-xls` | 지저분한 데이터 정리/표준화 | "데이터 정리해줘", "시트 표준화" |
| `3-statement-model` | IS / BS / CF 3재무제표 모델 | "3-statement 모델 만들어줘", "재무 모델 채워줘" |
| `dcf-model` | DCF 밸류에이션 모델 | "DCF 만들어줘", "이 회사 밸류에이션" |
| `lbo-model` | LBO 모델 | "LBO 모델링", "이 바이아웃 모델링" |
| `comps-analysis` | 비교기업 분석 | "comps 돌려줘", "피어 비교" |

### 🎨 claude-in-powerpoint (3개)

| 스킬 | 용도 | 트리거 예시 |
|-------|------|-------------|
| `competitive-analysis` | 경쟁 환경 덱 빌드 | "경쟁사 분석", "마켓 맵 만들어줘" |
| `deck-refresh` | 기존 덱의 숫자 업데이트 (분기 리프레시, 어닝 업데이트, 컴프 롤) | "Q4 숫자로 덱 업데이트", "이거 롤포워드" |
| `ib-check-deck` | IB급 덱 QC — 숫자 일관성, 내러티브 정합성, 포맷팅 검수 | "숫자 체크해줘", "슬라이드 간 수치 대사", "클라이언트 보내도 되나" |

각 스킬 폴더 구조:

```
<skill-name>/
├── SKILL.md           # name, description(트리거), 본문 지시
├── references/        # 보조 문서 (스키마, 프레임워크, 수식 레퍼런스)
└── scripts/           # 선택적 Python 헬퍼
```

**번들된 헬퍼 스크립트:**

| 스크립트 | 포함된 스킬 | 용도 |
|----------|-------------|------|
| `recalc.py` | `3-statement-model`, `dcf-model`, `lbo-model`, `comps-analysis` | 편집 후 수식 재계산·재연결 |
| `validate_dcf.py` | `dcf-model` | 완성된 DCF 검증 (WACC, 터미널 밸류, 성장 가정) |
| `extract_numbers.py` | `ib-check-deck` | 덱에서 모든 수치 추출해 슬라이드 간 대조 |

---

## 설치

### 전역 설치 (추천)

Claude Code가 전역으로 참조하는 경로에 복사:

```bash
# 저장소 루트에서
cp -r claude-in-excel/* ~/.claude/skills/
cp -r claude-in-powerpoint/* ~/.claude/skills/
```

### 프로젝트별 설치

특정 프로젝트에만 필요한 스킬을 넣고 싶을 때:

```bash
mkdir -p .claude/skills
cp -r /path/to/claude-office-skills/claude-in-excel/dcf-model .claude/skills/
```

### 설치 확인

해당 디렉토리에서 Claude Code 실행 후:

```
"지금 어떤 스킬 쓸 수 있어?"
```

설치된 스킬이 목록에 나오면 정상.

---

## 저장소 구조

```
claude-office-skills/
├── README.md
├── README.ko.md
├── claude-in-excel/
│   ├── audit-xls/
│   ├── clean-data-xls/
│   ├── 3-statement-model/
│   ├── dcf-model/
│   ├── lbo-model/
│   └── comps-analysis/
└── claude-in-powerpoint/
    ├── competitive-analysis/
    ├── deck-refresh/
    └── ib-check-deck/
```

---

## 왜 만들었나

Claude in Excel / PowerPoint는 좋은 도구지만, **애드인 안에서만** 동작합니다. Claude Code로 로컬 파일을 다루는 사람 입장에서는, DCF 모델링·덱 빌딩·수식 감사 같은 좋은 스킬 로직이 그냥 거기 갇혀 있는 셈이죠. 이 저장소는 그 스킬들을 실제 작업이 벌어지는 곳 — 터미널 — 으로 옮겨옵니다:

- 엑셀 열지 않고 로컬 `.xlsx`에 DCF 돌리기
- 터미널에서 재무 모델 감사
- 프로그래매틱하게 만든 `.pptx`에 덱 빌드
- 다른 Claude Code 도구(git, bash, MCP 서버)와 오피스 스킬 체이닝

프롬프트도 출력도 같고, 애드인에서만 분리한 것뿐입니다.

---

## 고지사항

> ⚠️ **이 스킬들은 Anthropic이 Claude in Excel / Claude in PowerPoint에 번들한 공식 스킬의 복원본**입니다. 스킬 설계에 대한 모든 크레딧은 Anthropic에 있습니다. 이 저장소는 해당 스킬을 Claude Code 환경으로 옮기기 위한 비공식 커뮤니티 아카이브입니다.
>
> - 원본 스킬 콘텐츠의 모든 저작권은 **Anthropic** 소유.
> - 이 저장소는 **Anthropic과 무관하며 공식 인증을 받지 않았습니다**.
> - Anthropic이 요청하면 즉시 내립니다.
>
> 저장소 구조, 문서, Claude Code용으로 새로 쓴 헬퍼 스크립트는 MIT로 공개합니다 (아래 참고).

---

## 요구사항

- [Claude Code](https://docs.anthropic.com/claude-code) CLI
- 스킬을 실행할 수 있는 Claude 플랜 또는 API 키

`dcf-model` 같은 일부 스킬은 Python 헬퍼 스크립트가 딸려 있습니다. 쓰고 싶으면 `python3`이 필요하고, 안 쓰면 `SKILL.md`만으로도 동작합니다.

---

## 기여

애드인과 동작이 다른 스킬을 발견했다면 다음을 포함해서 이슈/PR 올려주세요:

1. 어떤 스킬인지
2. 애드인에서는 어떻게 동작하는지
3. 이 저장소에서는 어떻게 동작하는지
4. 가능하면 수정된 `SKILL.md` diff

다른 Claude 제품에서 추출한 스킬은 출처 명시 없이 올리지 말아주세요.

---

## 라이선스

- **저장소 구조 & 문서:** MIT
- **스킬 콘텐츠 (SKILL.md, references, scripts):** © Anthropic — 커뮤니티 복원 아카이브 차원에서 보관. 요청 시 삭제.

---

<div align="center">

**오피스 애드인 스킬을 터미널로.**

</div>
