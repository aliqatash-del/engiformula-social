#!/usr/bin/env python3
"""Fetch openly licensed sounds and images from Openverse for a reel, with credits.

Runs in GitHub Actions (the cloud workspace cannot reach api.openverse.org).
Reads media/openverse/requests/<name>.json:
  {"sounds": [{"name": "clank", "query": "metal bucket clank", "max_ms": 4000, "n": 3}],
   "images": [{"name": "concrete", "query": "concrete texture", "n": 3}]}
Writes media/openverse/<name>/{sounds,images}/..., manifest.json and CREDITS.md.
Licence policy: sounds cc0/pdm/by from freesound; images cc0/pdm only (textures, elements, tools).
"""
import json, os, sys, time, urllib.parse, urllib.request

API = "https://api.openverse.org/v1/"
UA = {"User-Agent": "engiformula-social-media-fetch/1.0"}


def get(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def search(kind, q, licences, extra):
    qs = {"q": q, "license": licences, "page_size": "20", **extra}
    return json.loads(get(API + kind + "/?" + urllib.parse.urlencode(qs))).get("results", [])


def ext_of(url, default):
    e = os.path.splitext(urllib.parse.urlparse(url).path)[1].lower()
    return e if e and len(e) <= 5 else default


def main(req_path):
    name = os.path.splitext(os.path.basename(req_path))[0]
    spec = json.load(open(req_path))
    out = os.path.join("media", "openverse", name)
    man = {"request": req_path, "fetched": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "items": []}
    for kind, items, lic, extra, sub in (
        ("audio", spec.get("sounds", []), "cc0,pdm,by", {"source": "freesound"}, "sounds"),
        ("images", spec.get("images", []), "cc0,pdm", {}, "images"),
    ):
        os.makedirs(os.path.join(out, sub), exist_ok=True)
        for it in items:
            try:
                res = search(kind, it["query"], lic, extra)
            except Exception as e:  # one failed search must not stop the rest
                print(f"search failed for {it['query']!r}: {e}", file=sys.stderr); continue
            got = 0
            for r in res:
                if got >= it.get("n", 3): break
                if kind == "audio":
                    d = r.get("duration") or 0
                    if it.get("max_ms") and d > it["max_ms"]: continue
                url = r.get("url")
                if not url: continue
                fn = f"{it['name']}_{got + 1}{ext_of(url, '.mp3' if kind == 'audio' else '.jpg')}"
                try:
                    data = get(url)
                except Exception as e:
                    print(f"download failed {url}: {e}", file=sys.stderr); continue
                if len(data) > 15_000_000: continue
                open(os.path.join(out, sub, fn), "wb").write(data)
                man["items"].append({"file": f"{sub}/{fn}", "query": it["query"], "title": r.get("title"),
                    "creator": r.get("creator"), "license": r.get("license"), "license_version": r.get("license_version"),
                    "license_url": r.get("license_url"), "source": r.get("source"), "landing_url": r.get("foreign_landing_url"),
                    "duration_ms": r.get("duration"), "width": r.get("width"), "height": r.get("height"),
                    "attribution": r.get("attribution")})
                got += 1
            time.sleep(1)
    json.dump(man, open(os.path.join(out, "manifest.json"), "w"), indent=2)
    with open(os.path.join(out, "CREDITS.md"), "w") as f:
        f.write(f"# Openverse credits: {name}\n\nOnly files actually used in a published post need crediting there; CC BY files must be credited.\n\n")
        for m in man["items"]:
            f.write(f"- `{m['file']}`: {m['attribution'] or m['title']} ({m['license']} {m['license_version'] or ''}) {m['landing_url'] or ''}\n")
    print(f"{name}: {len(man['items'])} files")


if __name__ == "__main__":
    for p in sys.argv[1:]:
        main(p)
