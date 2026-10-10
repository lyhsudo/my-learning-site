#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
个人学习网站 · 内容构建脚本
用法：把 Markdown 笔记放进 content/ 下（可用子文件夹当作分类），
然后运行：  python build.py
生成 data.js 供 index.html 使用。

依赖（可选，推荐）：  pip install markdown
未安装时会使用内置的极简 Markdown 转换器兜底。
"""
import os
import re
import json
import glob
import shutil
import urllib.parse
import datetime

ROOT = os.path.dirname(os.path.abspath(__file__))
CONTENT = os.path.join(ROOT, "content")
OUT = os.path.join(ROOT, "data.js")
IMG_DIR = os.path.join(ROOT, "img")

# ---------- Markdown 转换 ----------
try:
    import markdown as _md_lib
    _MD = _md_lib.Markdown(
        extensions=["tables", "fenced_code", "toc", "sane_lists", "nl2br"]
    )

    def md_to_html(text):
        _MD.reset()
        return _MD.convert(text)
except Exception:
    def md_to_html(text):
        return _minimal_md(text)


def _minimal_md(text):
    """无第三方库时的极简转换，保证基本可读性。"""
    out = []
    for line in text.splitlines():
        line = re.sub(r"^######\s+", "<h6>", line)
        line = re.sub(r"^#####\s+", "<h5>", line)
        line = re.sub(r"^####\s+", "<h4>", line)
        line = re.sub(r"^###\s+", "<h3>", line)
        line = re.sub(r"^##\s+", "<h2>", line)
        line = re.sub(r"^#\s+", "<h1>", line)
        line = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", line)
        line = re.sub(r"\*(.+?)\*", r"<em>\1</em>", line)
        if line and not line.startswith("<h"):
            line = "<p>" + line + "</p>"
        out.append(line)
    return "\n".join(out)


# ---------- 工具函数 ----------
def parse_frontmatter(raw):
    fm, body = {}, raw
    m = re.match(r"^---\s*\n(.*?)\n---\s*\n?(.*)$", raw, re.DOTALL)
    if m:
        fm_text, body = m.group(1), m.group(2)
        for line in fm_text.splitlines():
            if ":" in line:
                k, v = line.split(":", 1)
                k, v = k.strip(), v.strip()
                if v.startswith("[") and v.endswith("]"):
                    v = [x.strip().strip("'\"") for x in v[1:-1].split(",") if x.strip()]
                fm[k] = v
    return fm, body


def word_count(text):
    cjk = len(re.findall(r"[一-鿿]", text))
    words = len(re.findall(r"[A-Za-z0-9]+", text))
    return cjk + words


def mathify(md_text):
    """把 $$块级公式$$ 和 $行内公式$ 转成 HTML 容器，
    避免 markdown 的换行处理把公式拆散（否则前端无法识别）。"""
    parts, last = [], 0
    for m in re.finditer(r"```[\s\S]*?```", md_text):
        parts.append(("md", md_text[last:m.start()]))
        parts.append(("code", m.group(0)))
        last = m.end()
    parts.append(("md", md_text[last:]))

    out = []
    for kind, chunk in parts:
        if kind == "code":
            out.append(chunk)
            continue
        chunk = re.sub(
            r"\$\$([\s\S]+?)\$\$",
            lambda m: '<div class="math">' + m.group(1) + "</div>",
            chunk,
        )
        chunk = re.sub(
            r"(?<!\$)\$([^$\n]+?)\$(?!\$)",
            lambda m: '<span class="math">' + m.group(1) + "</span>",
            chunk,
        )
        out.append(chunk)
    return "".join(out)


def copy_images(md_text, md_path):
    """把笔记里引用的本地图片复制到 img/，并把路径改写成网站可用路径。"""
    def repl(m):
        alt, src = m.group(1), m.group(2).strip()
        if src.startswith(("http://", "https://", "data:", "/")):
            return m.group(0)
        src_clean = src.split(" ")[0]
        src_file = os.path.normpath(
            os.path.join(os.path.dirname(md_path), urllib.parse.unquote(src_clean))
        )
        if os.path.isfile(src_file):
            name = os.path.basename(src_file)
            dst = os.path.join(IMG_DIR, name)
            if not os.path.exists(dst):
                shutil.copy2(src_file, dst)
            return "![%s](img/%s)" % (alt, name)
        return m.group(0)

    return re.sub(r"!\[(.*?)\]\((.*?)\)", repl, md_text)


def slugify(rel):
    s = os.path.splitext(rel)[0]
    s = s.replace(os.sep, "/")
    s = re.sub(r"[^0-9a-zA-Z一-鿿 _-]", "-", s)
    return s.strip("-")


# ---------- 主流程 ----------
def main():
    articles = []
    categories = {}
    os.makedirs(IMG_DIR, exist_ok=True)

    files = glob.glob(os.path.join(CONTENT, "**", "*.md"), recursive=True)
    files = [f for f in files if os.path.basename(f).lower() != "readme.md"]

    if not files:
        print("未找到 content/ 下的 Markdown 文件。")
    else:
        print(f"发现 {len(files)} 个 Markdown 文件，开始构建...")

    for path in sorted(files):
        rel = os.path.relpath(path, CONTENT)
        raw = open(path, encoding="utf-8").read()
        fm, body = parse_frontmatter(raw)
        body = copy_images(body, path)
        body = mathify(body)

        h = re.search(r"^#\s+(.+)$", body, re.MULTILINE)
        title = fm.get("title") or (h.group(1) if h else os.path.splitext(os.path.basename(path))[0])
        category = fm.get("category") or (os.path.dirname(rel) or "未分类")
        if category in ("", "."):
            category = "未分类"
        tags = fm.get("tags") or []
        if isinstance(tags, str):
            tags = [tags]
        date = fm.get("date", "")
        html = md_to_html(body)
        wc = word_count(body)
        aid = slugify(rel)

        articles.append({
            "id": aid,
            "title": title,
            "category": category,
            "tags": tags,
            "date": str(date),
            "wordCount": wc,
            "html": html,
            "md": body,
        })
        categories.setdefault(category, 0)
        categories[category] += 1

    data = {
        "siteTitle": "我的课程知识库",
        "generatedAt": datetime.datetime.now().strftime("%Y-%m-%d %H:%M"),
        "categories": [{"name": k, "count": v} for k, v in sorted(categories.items())],
        "articles": articles,
    }

    with open(OUT, "w", encoding="utf-8") as f:
        f.write("window.SITE_DATA = ")
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write(";\n")

    print(f"✅ 已生成 data.js：{len(articles)} 篇文章，{len(categories)} 个分类。")


if __name__ == "__main__":
    main()
