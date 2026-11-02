"""Publish trusted seminar issues as a static JSON feed for GitHub Pages."""

import json
import os
import re
import sys
import urllib.parse
import urllib.request
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "docs/data/talks.json"
TRUSTED = {"OWNER", "MEMBER", "COLLABORATOR"}
HEADINGS = {
    "발표 연월": "month", "발표 제목": "title", "발표자": "speaker",
    "발표자 소속": "affiliation", "일시": "date", "장소": "location",
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


def talk_from_issue(issue):
    if issue.get("pull_request") or not issue.get("title", "").startswith("[세미나]"):
        return None
    if issue.get("author_association") not in TRUSTED:
        return None
    values = fields_from_issue(issue.get("body"))
    month = values.get("month", "")
    if not re.fullmatch(r"\d{4}-(0[1-9]|1[0-2])", month) or not values.get("title"):
        return None
    if values.get("published", "공개") != "공개":
        return None
    return {
        "id": issue["number"], "month": month,
        "title": values["title"][:240], "speaker": values.get("speaker", "")[:180],
        "affiliation": values.get("affiliation", "")[:180],
        "date": values.get("date", "")[:120], "location": values.get("location", "")[:200],
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
    talks = [talk for issue in issues if (talk := talk_from_issue(issue))]
    talks.sort(key=lambda talk: (talk["month"], talk["id"]), reverse=True)
    return {"updatedAt": max((talk["updatedAt"] or "" for talk in talks), default="") or None, "talks": talks}


def main():
    repo = os.environ.get("GITHUB_REPOSITORY", "")
    token = os.environ.get("GITHUB_TOKEN", "")
    if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", repo) or not token:
        sys.exit("GITHUB_REPOSITORY and GITHUB_TOKEN are required")
    OUT.write_text(json.dumps(build(fetch_issues(repo, token)), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
