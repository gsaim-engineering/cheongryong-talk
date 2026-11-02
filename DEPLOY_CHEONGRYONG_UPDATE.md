# 청룡토크 홈페이지 수정본 적용

1. 이 압축 파일을 풀고 각 파일을 저장소 루트의 같은 경로에 반영합니다. ZIP 파일 자체를 GitHub 저장소에 올려도 압축이 자동으로 풀리지는 않습니다.
2. `.github/ISSUE_TEMPLATE/seminar.yml`, `scripts/sync_issues.py`, `docs/data/history.json`, `docs/data/talks.json`을 함께 반영한 다음 새 세미나 이슈를 등록합니다. 기존 기록과 Image Morphing 숨김 상태 보존을 위해 동기화 스크립트를 빠뜨리지 마세요.
3. `docs/index.html`, `docs/main.js`, `docs/styles.css`, `docs/data/site.json`, `docs/assets/puang-official.gif`, `README.md`도 함께 반영합니다. 기존 `docs/assets/puang-presenter.png`와 `docs/data/upcoming.json`은 저장소에서 제거합니다.
4. 커밋 후 GitHub Pages 작업이 끝나면 공개 페이지에서 예정된 토크의 빈 상태와 지난 발표 11건을 확인합니다. 새 세미나 이슈의 행사 날짜가 한국 날짜 기준 오늘 또는 미래이면 예정 영역에 표시되고, 다음 날부터 지난 이야기로 이동합니다.
