"""Publish an APPROVED post to Instagram and/or the Facebook Page through Meta's Graph API.

Usage: python scripts/publish.py <post_id>        (refuses anything not approved)
Docs:
  Instagram  https://developers.facebook.com/docs/instagram-platform/content-publishing
  FB Reels   https://developers.facebook.com/docs/video-api/guides/reels-publishing
  FB posts   https://developers.facebook.com/docs/pages-api/posts
  FB stories https://developers.facebook.com/docs/page-stories-api
"""
from __future__ import annotations

import sys
import time

from common import DRY_RUN, SETTINGS, Post, env, find_post, http, log, now
from storage import public_url

GRAPH = f"https://graph.facebook.com/{SETTINGS['graph_api_version']}"


# ---------------- Instagram ----------------

class Instagram:
    def __init__(self):
        self.user = env("IG_USER_ID")
        self.token = env("PAGE_ACCESS_TOKEN")  # a Page token works for the IG account linked to that Page

    def _container(self, **params) -> str:
        params["access_token"] = self.token
        return http("POST", f"{GRAPH}/{self.user}/media", data=params)["id"]

    def _wait(self, container_id: str, minutes: int = 10) -> None:
        deadline = time.time() + minutes * 60
        while True:
            status = http("GET", f"{GRAPH}/{container_id}",
                          params={"fields": "status_code,status", "access_token": self.token})
            code = status.get("status_code")
            if code == "FINISHED":
                return
            if code in ("ERROR", "EXPIRED"):
                raise RuntimeError(f"Instagram container {container_id} {code}: {status.get('status')}")
            if time.time() > deadline:
                raise RuntimeError(f"Instagram container {container_id} not ready after {minutes} min")
            time.sleep(10)

    def _publish(self, container_id: str) -> str:
        self._wait(container_id)
        media_id = http("POST", f"{GRAPH}/{self.user}/media_publish",
                        data={"creation_id": container_id, "access_token": self.token})["id"]
        return media_id

    def remaining_quota(self) -> int | None:
        body = http("GET", f"{GRAPH}/{self.user}/content_publishing_limit",
                    params={"fields": "quota_usage,config", "access_token": self.token})
        try:
            row = body["data"][0]
            return int(row["config"]["quota_total"]) - int(row["quota_usage"])
        except (KeyError, IndexError, TypeError):
            return None

    def publish(self, post: Post, urls: list[str]) -> str:
        kind, caption = post.data["type"], post.full_caption("instagram")
        if kind == "image":
            return self._publish(self._container(image_url=urls[0], caption=caption))
        if kind == "carousel":
            children = [self._container(image_url=u, is_carousel_item="true") for u in urls]
            return self._publish(self._container(media_type="CAROUSEL", children=",".join(children),
                                                 caption=caption))
        if kind == "reel":
            params = dict(media_type="REELS", video_url=urls[0], caption=caption, share_to_feed="true")
            if post.data.get("cover_frame_ms") is not None:
                params["thumb_offset"] = str(post.data["cover_frame_ms"])
            return self._publish(self._container(**params))
        if kind == "story":
            field = "video_url" if urls[0].lower().endswith((".mp4", ".mov")) else "image_url"
            return self._publish(self._container(media_type="STORIES", **{field: urls[0]}))
        raise ValueError(f"Instagram cannot publish type '{kind}'")


# ---------------- Facebook Page ----------------

class FacebookPage:
    def __init__(self):
        self.page = env("FB_PAGE_ID")
        self.token = env("PAGE_ACCESS_TOKEN")

    def _photo(self, url: str, published: bool, caption: str | None = None) -> dict:
        data = {"url": url, "published": "true" if published else "false", "access_token": self.token}
        if caption:
            data["caption"] = caption
        return http("POST", f"{GRAPH}/{self.page}/photos", data=data)

    def _reel(self, url: str, description: str) -> str:
        start = http("POST", f"{GRAPH}/{self.page}/video_reels",
                     data={"upload_phase": "start", "access_token": self.token})
        video_id = start["video_id"]
        http("POST", start.get("upload_url", f"https://rupload.facebook.com/video-upload/"
                                             f"{SETTINGS['graph_api_version']}/{video_id}"),
             headers={"Authorization": f"OAuth {self.token}", "file_url": url})
        http("POST", f"{GRAPH}/{self.page}/video_reels",
             data={"upload_phase": "finish", "video_id": video_id, "video_state": "PUBLISHED",
                   "description": description, "access_token": self.token})
        return video_id

    def publish(self, post: Post, urls: list[str]) -> str:
        kind, caption = post.data["type"], post.full_caption("facebook")
        if kind == "text":
            return http("POST", f"{GRAPH}/{self.page}/feed",
                        data={"message": caption, "access_token": self.token})["id"]
        if kind == "image":
            body = self._photo(urls[0], True, caption)
            return body.get("post_id", body["id"])
        if kind == "carousel":  # Facebook has no carousel: a multi-photo post shows the same slides
            ids = [self._photo(u, False)["id"] for u in urls]
            data = {"message": caption, "access_token": self.token}
            for i, media_id in enumerate(ids):
                data[f"attached_media[{i}]"] = f'{{"media_fbid":"{media_id}"}}'
            return http("POST", f"{GRAPH}/{self.page}/feed", data=data)["id"]
        if kind == "reel":
            return self._reel(urls[0], caption)
        if kind == "story":
            if urls[0].lower().endswith((".mp4", ".mov")):
                raise ValueError("Facebook video stories need the upload flow — post video stories by hand")
            photo_id = self._photo(urls[0], False)["id"]
            return http("POST", f"{GRAPH}/{self.page}/photo_stories",
                        data={"photo_id": photo_id, "access_token": self.token}).get("post_id", photo_id)
        raise ValueError(f"Facebook cannot publish type '{kind}'")

    def comment(self, object_id: str, message: str) -> None:
        http("POST", f"{GRAPH}/{object_id}/comments", data={"message": message, "access_token": self.token})


# ---------------- run ----------------

def publish_post(post: Post) -> dict:
    if post.status != "approved":
        raise SystemExit(f"{post.id} is '{post.status}', not approved — refusing to publish.")
    urls = [public_url(p, post.id) for p in post.media_paths()]
    results, errors = {}, {}
    for platform in post.data["platforms"]:
        try:
            if platform == "instagram":
                ig = Instagram()
                quota = None if DRY_RUN else ig.remaining_quota()
                if quota is not None and quota <= 0:
                    raise RuntimeError("Instagram 24-hour publishing quota used up")
                results["instagram"] = ig.publish(post, urls)
            elif platform == "facebook":
                fb = FacebookPage()
                object_id = fb.publish(post, urls)
                results["facebook"] = object_id
                if post.data.get("first_comment") and post.data["type"] != "story":
                    fb.comment(object_id, post.data["first_comment"])
            log(f"{post.id}: published to {platform} ({results[platform]})")
        except Exception as exc:  # keep going with the other platform
            errors[platform] = str(exc)
            log(f"{post.id}: {platform} FAILED — {exc}")
    post.set(status="published" if results else "failed",  # partial success keeps the error list
             published_at=now().isoformat(), published_ids=results, publish_errors=errors or None)
    return {"results": results, "errors": errors}


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("usage: publish.py <post_id>")
    target = find_post(sys.argv[1])
    if not target:
        sys.exit("post not found")
    outcome = publish_post(target)
    sys.exit(1 if outcome["errors"] else 0)
