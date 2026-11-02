"""Publish trusted seminar issues as a static JSON feed for GitHub Pages."""

import json
import os
import re
import sys
import urllib.parse
import urllib.request
from datetime import date
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "docs/data/talks.json"
HISTORY = OUT.with_name("history.json")
TRUSTED = {"OWNER", "MEMBER", "COLLABORATOR"}
HEADINGS = {
    "발표 연월": "month", "발표 제목": "title", "발표자": "speaker",
    "발표자 소속": "affiliation", "일시": "date", "장소": "location",
    "행사 날짜": "eventDate", "시간": "time",
    "발표 분야": "category", "발표 실적": "venue",
    "발표 소개": "summary", "포스터 이미지 URL": "posterUrl",
    "YouTube 영상 URL": "videoUrl", "홈페이지 표시": "published",
}


def fields_from_issue(body):
    fields = {}
    chunks = re.split(r"(?m)^### (.+?)\s*$", body or "")
    for i in range(1, len(chunks) - 1, 2):
        key = HEADINGS.get(chunks[i].strip())
        if key:
            value = chunks[i + 1].strip()
            fields[key] = "" if value == "_No response_" else value
    return fields


def https_url(value):
    parsed = urllib.parse.urlparse(value or "")
    return value[:500] if parsed.scheme == "https" and parsed.netloc else ""


def normalized_day(value, legacy=False):
    pattern = r"\s*(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.?(?:\s|$)" if legacy else r"(\d{4})-(\d{2})-(\d{2})"
    match = re.match(pattern, value or "") if legacy else re.fullmatch(pattern, value or "")
    if not match:
        return ""
    try:
        return date(*map(int, match.groups())).isoformat()
    except ValueError:
        return ""


def talk_from_issue(issue):
    if issue.get("pull_request") or not issue.get("title", "").startswith("[세미나]"):
        return None
    if issue.get("author_association") not in TRUSTED:
        return None
    values = fields_from_issue(issue.get("body"))
    if values.get("published", "공개") != "공개":
        return None
    if "eventDate" in values:
        event_day = normalized_day(values["eventDate"])
        if not event_day:
            raise ValueError(f"Issue #{issue['number']}: 행사 날짜는 YYYY-MM-DD 형식의 실제 날짜여야 합니다.")
    else:
        event_day = normalized_day(values.get("date", ""), legacy=True)
    month = event_day[:7] if event_day else values.get("month", "")
    if not re.fullmatch(r"\d{4}-(0[1-9]|1[0-2])", month) or not values.get("title"):
        return None
    time = values.get("time", "").strip()
    old_date = values.get("date", "")
    if not time and old_date:
        match = re.search(r"\d{1,2}:\d{2}(?:\s*[~–-]\s*\d{1,2}:\d{2})?", old_date)
        time = match.group() if match else ""
    display_date = old_date or f"{event_day[:4]}. {event_day[5:7]}. {event_day[8:10]}. {time}".strip()
    return {
        "id": issue["number"], "month": month,
        "title": values["title"][:240], "speaker": values.get("speaker", "")[:180],
        "affiliation": values.get("affiliation", "")[:180],
        "eventDate": event_day, "time": time[:120],
        "date": display_date[:120], "location": values.get("location", "")[:200],
        "category": values.get("category", "")[:100], "venue": values.get("venue", "")[:100],
        "summary": values.get("summary", "")[:4000],
        "posterUrl": https_url(values.get("posterUrl")),
        "videoUrl": https_url(values.get("videoUrl")),
        "noticeUrl": issue.get("html_url", ""),
        "updatedAt": issue.get("updated_at"), "published": True,
    }


def fetch_issues(repo, token):
    result = []
    for page in range(1, 11):
        url = f"https://api.github.com/repos/{repo}/issues?state=all&per_page=100&page={page}"
        request = urllib.request.Request(url, headers={
            "Accept": "application/vnd.github+json", "Authorization": f"Bearer {token}",
            "User-Agent": "cheongryong-talk-sync", "X-GitHub-Api-Version": "2022-11-28",
        })
        with urllib.request.urlopen(request, timeout=20) as response:
            batch = json.load(response)
        result.extend(batch)
        if len(batch) < 100:
            return result
    raise RuntimeError("Issue count exceeds the safe 1,000-item sync limit")


def build(issues):
    history = json.loads(HISTORY.read_text(encoding="utf-8"))["talks"]
    key = lambda talk: (talk["month"], talk["title"].casefold().strip(), talk.get("speaker", "").casefold().strip())
    hidden = {key(talk) for talk in history if talk.get("published") is False}
    current = [talk for issue in issues if (talk := talk_from_issue(issue)) and key(talk) not in hidden]
    # An issue for the same month, title and speaker can add a later video or correction.
    merged = {key(talk): talk for talk in history}
    merged.update({key(talk): talk for talk in current})
    talks = sorted(merged.values(), key=lambda talk: (talk["month"], talk["id"]), reverse=True)
    return {"updatedAt": max((talk["updatedAt"] or "" for talk in current), default="") or None, "talks": talks}


def main():
    repo = os.environ.get("GITHUB_REPOSITORY", "")
    token = os.environ.get("GITHUB_TOKEN", "")
    if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", repo) or not token:
        sys.exit("GITHUB_REPOSITORY and GITHUB_TOKEN are required")
    OUT.write_text(json.dumps(build(fetch_issues(repo, token)), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
