"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { MarkdownPreview } from "./markdown-preview";
import "./admin.css";

type AdminTheme = "day" | "night";
type Section = "dashboard" | "posts" | "editor" | "media" | "settings";
type PostStatus = "draft" | "published" | "scheduled";

type AdminPost = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  category: string;
  tags: string[];
  code: string;
  readTime: string;
  contentMarkdown: string;
  coverUrl: string | null;
  status: PostStatus;
  publishedAt: string | null;
  updatedAt: string;
};

type MediaAsset = {
  id: string;
  url: string;
  filename: string;
  alt: string;
  size: number;
  createdAt: string;
};

type SessionPayload = {
  authenticated: boolean;
  passwordEnabled?: boolean;
  loginUrl?: string;
  user?: { login: string; avatarUrl?: string | null };
};

type SiteSettings = {
  siteTitle: string;
  tagline: string;
  bio: string;
  defaultCategory: string;
  defaultAuthor: string;
};

const defaultSettings: SiteSettings = {
  siteTitle: "Mozelle Journal",
  tagline: "在旅途与源石之间，持续记录。",
  bio: "电子专业学生，记录硬件、超频、游戏、Cosplay 与二次元世界。",
  defaultCategory: "电子",
  defaultAuthor: "Mozelle",
};

const demoPosts: AdminPost[] = [
  {
    id: "demo-ddr5",
    title: "DDR5 超频：从电压、时序到稳定性",
    slug: "ddr5-stability",
    summary: "把 VDD、VDDQ、VPP 与内存控制器电压放进同一张逻辑图。",
    category: "超频",
    tags: ["DDR5", "电压", "时序"],
    code: "OC / 001",
    readTime: "12 min",
    contentMarkdown:
      "## 从变量控制开始\n\n内存超频不是单纯提高频率，而是在信号完整性、颗粒特性与内存控制器能力之间寻找平衡。\n\n> 每轮只改变少量参数，并记录温度、错误位置与测试环境。\n\n- 先确定目标频率\n- 再处理主次时序\n- 最后验证冷启动与日常负载",
    coverUrl: null,
    status: "published",
    publishedAt: "2026-07-12T12:00:00.000Z",
    updatedAt: "2026-07-13T03:20:00.000Z",
  },
  {
    id: "demo-pmic",
    title: "主板与 PMIC：DDR5 电压究竟从哪里来",
    slug: "pmic-rails",
    summary: "沿着供电路径拆解主板输入、DIMM PMIC 与颗粒端电压。",
    category: "电子",
    tags: ["PMIC", "供电", "主板"],
    code: "EE / 014",
    readTime: "8 min",
    contentMarkdown: "## 供电路径\n\nDDR5 将主要电源管理功能移到内存模组上。",
    coverUrl: null,
    status: "draft",
    publishedAt: null,
    updatedAt: "2026-07-12T10:08:00.000Z",
  },
  {
    id: "demo-cos",
    title: "下一次 Cos 拍摄的布光记录",
    slug: "cos-lighting-note",
    summary: "记录主光、轮廓光与环境色的组合。",
    category: "游戏与次元",
    tags: ["Cosplay", "布光"],
    code: "ACG / 007",
    readTime: "6 min",
    contentMarkdown: "## 拍摄计划\n\n这篇文章将在周末完成拍摄后发布。",
    coverUrl: null,
    status: "scheduled",
    publishedAt: "2026-07-20T10:00:00.000Z",
    updatedAt: "2026-07-13T01:32:00.000Z",
  },
];

const emptyPost = (): AdminPost => ({
  id: "",
  title: "",
  slug: "",
  summary: "",
  category: "电子",
  tags: [],
  code: "EE / NEW",
  readTime: "5 min",
  contentMarkdown: "# 新文章\n\n从这里开始记录。",
  coverUrl: null,
  status: "draft",
  publishedAt: null,
  updatedAt: new Date().toISOString(),
});

const navItems: Array<{ id: Section; label: string; index: string }> = [
  { id: "dashboard", label: "控制台", index: "01" },
  { id: "posts", label: "文章管理", index: "02" },
  { id: "editor", label: "文章编辑", index: "03" },
  { id: "media", label: "媒体库", index: "04" },
  { id: "settings", label: "站点设置", index: "05" },
];

function formatDate(value: string | null): string {
  if (!value) return "尚未发布";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function statusText(status: PostStatus): string {
  return status === "published" ? "已发布" : status === "scheduled" ? "定时" : "草稿";
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\u4e00-\u9fff-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function AdminPage() {
  const [theme, setTheme] = useState<AdminTheme>("night");
  const [section, setSection] = useState<Section>("dashboard");
  const [posts, setPosts] = useState<AdminPost[]>(demoPosts);
  const [draft, setDraft] = useState<AdminPost>(demoPosts[0]);
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [session, setSession] = useState<"loading" | "guest" | "authenticated">(
    "loading",
  );
  const [sessionUser, setSessionUser] = useState<SessionPayload["user"]>();
  const [loginUrl, setLoginUrl] = useState<string>();
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authenticating, setAuthenticating] = useState(false);
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState<"edit" | "preview">("edit");
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("mozelle-admin-theme");
    if (savedTheme === "day" || savedTheme === "night") {
      queueMicrotask(() => setTheme(savedTheme));
    }

    fetch("/api/auth/session", { headers: { accept: "application/json" } })
      .then(async (response) => {
        if (!response.ok) throw new Error("API unavailable");
        return (await response.json()) as SessionPayload;
      })
      .then((payload) => {
        setLoginUrl(payload.loginUrl);
        if (!payload.authenticated) {
          setSession("guest");
          return;
        }
        setSessionUser(payload.user);
        setSession("authenticated");
      })
      .catch(() => setSession("guest"));
  }, []);

  useEffect(() => {
    if (session !== "authenticated") return;
    Promise.all([
      fetch("/api/admin/posts").then((response) => response.json()),
      fetch("/api/admin/media").then((response) => response.json()),
      fetch("/api/admin/settings").then((response) => response.json()),
    ])
      .then(([postPayload, mediaPayload, settingsPayload]) => {
        if (postPayload.posts?.length) {
          setPosts(postPayload.posts);
          setDraft(postPayload.posts[0]);
        }
        if (mediaPayload.assets) setAssets(mediaPayload.assets);
        if (settingsPayload.settings) {
          setSettings((current) => ({ ...current, ...settingsPayload.settings }));
        }
      })
      .catch(() => setNotice("后台数据暂时无法读取，请检查 VPS API 服务。"));
  }, [session]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const counts = useMemo(
    () => ({
      total: posts.length,
      published: posts.filter((post) => post.status === "published").length,
      drafts: posts.filter((post) => post.status === "draft").length,
      scheduled: posts.filter((post) => post.status === "scheduled").length,
    }),
    [posts],
  );

  const changeTheme = () => {
    const next = theme === "night" ? "day" : "night";
    setTheme(next);
    window.localStorage.setItem("mozelle-admin-theme", next);
  };

  const editPost = (post: AdminPost) => {
    setDraft(post);
    setSection("editor");
    setPreviewMode("edit");
  };

  const createPost = () => {
    setDraft({ ...emptyPost(), category: settings.defaultCategory });
    setSection("editor");
    setPreviewMode("edit");
  };

  const updateDraft = <K extends keyof AdminPost>(key: K, value: AdminPost[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const persistPost = async (status: PostStatus) => {
    const title = draft.title.trim();
    const slug = slugify(draft.slug || draft.title);
    if (!title || !slug) {
      setNotice("请填写文章标题和链接地址。 ");
      return;
    }
    const next: AdminPost = {
      ...draft,
      title,
      slug,
      status,
      publishedAt:
        status === "published"
          ? new Date().toISOString()
          : status === "scheduled"
            ? draft.publishedAt
            : null,
      updatedAt: new Date().toISOString(),
    };

    setSaving(true);
    try {
      const response = await fetch(
        next.id ? `/api/admin/posts/${encodeURIComponent(next.id)}` : "/api/admin/posts",
        {
          method: next.id ? "PUT" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(next),
        },
      );
      if (!response.ok) throw new Error((await response.text()) || "保存失败");
      const payload = (await response.json()) as { post: AdminPost };
      setDraft(payload.post);
      setPosts((current) => [payload.post, ...current.filter((post) => post.id !== payload.post.id)]);
      setNotice(status === "published" ? "文章已发布。" : status === "scheduled" ? "已设置定时发布。" : "草稿已保存。");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "保存失败，请稍后重试。");
    } finally {
      setSaving(false);
    }
  };

  const deletePost = async (post: AdminPost) => {
    if (!window.confirm(`确定删除《${post.title}》吗？此操作不可撤销。`)) return;
    try {
      const response = await fetch(`/api/admin/posts/${encodeURIComponent(post.id)}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("删除失败");
      setPosts((current) => current.filter((item) => item.id !== post.id));
      setNotice("文章已删除。");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "删除失败。");
    }
  };

  const uploadImage = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setNotice("请选择图片文件。");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setNotice("图片不能超过 10 MB。");
      return;
    }

    try {
      const body = new FormData();
      body.append("file", file);
      body.append("alt", file.name.replace(/\.[^.]+$/, ""));
      const response = await fetch("/api/admin/media", { method: "POST", body });
      if (!response.ok) throw new Error((await response.text()) || "上传失败");
      const { asset } = (await response.json()) as { asset: MediaAsset };
      setAssets((current) => [asset, ...current]);
      setNotice("图片上传成功。");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "图片上传失败。");
    }
  };

  const insertImage = (asset: MediaAsset) => {
    updateDraft(
      "contentMarkdown",
      `${draft.contentMarkdown.trimEnd()}\n\n![${asset.alt || asset.filename}](${asset.url})\n`,
    );
    setSection("editor");
    setNotice("图片 Markdown 已插入文章末尾。");
  };

  const setAsCover = (asset: MediaAsset) => {
    updateDraft("coverUrl", asset.url);
    setSection("editor");
    setNotice("已将图片设为文章封面。");
  };

  const deleteAsset = async (asset: MediaAsset) => {
    if (!window.confirm(`确定删除图片“${asset.filename}”吗？`)) return;
    try {
      const response = await fetch(`/api/admin/media/${encodeURIComponent(asset.id)}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message || "图片删除失败。");
      }
      setAssets((current) => current.filter((item) => item.id !== asset.id));
      setNotice("图片已删除。");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "图片删除失败。");
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!response.ok) throw new Error("站点设置保存失败。");
      setNotice("站点设置已保存。");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "站点设置保存失败。");
    } finally {
      setSaving(false);
    }
  };

  const authenticateWithPassword = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    if (authenticating || !password) return;

    setAuthenticating(true);
    setAuthError("");
    try {
      let response: Response | undefined;
      try {
        response = await fetch("/api/auth/password", {
          method: "POST",
          headers: {
            accept: "application/json",
            "content-type": "application/json",
          },
          body: JSON.stringify({ password }),
        });
      } catch {
        response = undefined;
      }

      if (response?.ok) {
        const payload = (await response.json()) as SessionPayload;
        setSessionUser(payload.user ?? { login: "Mozelle" });
        setPassword("");
        setSession("authenticated");
        return;
      }

      if (response) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        setAuthError(payload?.message || "验证失败，请稍后重试。");
        return;
      }
      setAuthError("后台 API 尚未连接，请检查 VPS 服务是否已经启动。");
    } finally {
      setAuthenticating(false);
    }
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    window.location.assign("/admin");
  };

  if (session === "loading") {
    return (
      <main className="admin-loading">
        <span className="loading-glyph">MZ</span>
        <p>正在连接控制终端…</p>
      </main>
    );
  }

  if (session === "guest") {
    return (
      <main className="admin-login">
        <section>
          <span className="login-kicker">MOZELLE / CONTROL ACCESS</span>
          <div className="login-mark"><i /></div>
          <h1>进入博客控制后台</h1>
          <p>输入管理员密码后进入文章、图片与站点设置终端。</p>
          <form className="admin-password-form" onSubmit={authenticateWithPassword}>
            <label htmlFor="admin-password">ADMIN PASSWORD</label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              placeholder="输入后台密码"
              maxLength={128}
              autoFocus
            />
            {authError && <span className="admin-auth-error" role="alert">{authError}</span>}
            <button type="submit" disabled={authenticating || !password}>
              {authenticating ? "正在验证…" : "验证并进入"}
              <span>→</span>
            </button>
          </form>
          {loginUrl && (
            <a className="github-fallback" href={loginUrl}>
              使用 GitHub 管理员账号 <span>↗</span>
            </a>
          )}
          <small>VPS 会在服务端验证密码；连续输错 5 次将锁定 10 分钟。</small>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-app" data-admin-theme={theme}>
      <aside className="admin-sidebar">
        <Link className="admin-brand" href="/">
          <span className="admin-brand-mark"><i /></span>
          <span><strong>MOZELLE</strong><small>{"// CONTROL"}</small></span>
        </Link>
        <nav aria-label="后台导航">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={section === item.id ? "is-active" : ""}
              onClick={() => setSection(item.id)}
            >
              <span>{item.index}</span>{item.label}
            </button>
          ))}
        </nav>
        <div className="admin-profile">
          <span className="profile-avatar">
            {sessionUser?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={sessionUser.avatarUrl} alt="" />
            ) : (
              "M"
            )}
          </span>
          <span><strong>{sessionUser?.login ?? "Mozelle"}</strong><small>ADMIN / ONLINE</small></span>
          <button type="button" onClick={logout} aria-label="退出后台">↪</button>
        </div>
      </aside>

      <section className="admin-workspace">
        <header className="admin-topbar">
          <div>
            <span>MOZELLE JOURNAL</span>
            <strong>{navItems.find((item) => item.id === section)?.label}</strong>
          </div>
          <div className="topbar-actions">
            <a href="/" target="_blank">查看博客 ↗</a>
            <button type="button" className="theme-control" onClick={changeTheme} aria-label="切换后台主题">
              <span>{theme === "night" ? "M3" : "EI"}</span>
              <i />
            </button>
          </div>
        </header>

        <div className="admin-content">
          {section === "dashboard" && (
            <section className="dashboard-view">
              <div className="view-heading">
                <div><span>01 / OVERVIEW</span><h1>欢迎回来，Mozelle。</h1></div>
                <button type="button" className="primary-action" onClick={createPost}>＋ 写新文章</button>
              </div>
              <div className="stat-grid">
                {[
                  ["全部文章", counts.total, "TOTAL"],
                  ["已发布", counts.published, "LIVE"],
                  ["草稿", counts.drafts, "DRAFT"],
                  ["定时发布", counts.scheduled, "QUEUE"],
                ].map(([label, value, meta]) => (
                  <article key={label}>
                    <span>{meta}</span><strong>{String(value).padStart(2, "0")}</strong><p>{label}</p><i />
                  </article>
                ))}
              </div>
              <div className="dashboard-columns">
                <section className="panel recent-panel">
                  <div className="panel-heading"><div><span>RECENT FILES</span><h2>最近文章</h2></div><button onClick={() => setSection("posts")}>查看全部 →</button></div>
                  <div className="compact-post-list">
                    {posts.slice(0, 4).map((post) => (
                      <button key={post.id} onClick={() => editPost(post)}>
                        <span className={`status-dot status-${post.status}`} />
                        <span><strong>{post.title}</strong><small>{post.category} · {formatDate(post.updatedAt)}</small></span>
                        <em>{statusText(post.status)}</em><i>↗</i>
                      </button>
                    ))}
                  </div>
                </section>
                <section className="panel quick-panel">
                  <div className="panel-heading"><div><span>QUICK ACCESS</span><h2>快捷操作</h2></div></div>
                  <button onClick={createPost}><span>✦</span><strong>创建空白文章</strong><small>打开 Markdown 编辑器</small></button>
                  <button onClick={() => fileInput.current?.click()}><span>◇</span><strong>上传新图片</strong><small>添加到媒体库</small></button>
                  <button onClick={() => setSection("settings")}><span>⌁</span><strong>修改站点信息</strong><small>标题、介绍和默认分类</small></button>
                </section>
              </div>
            </section>
          )}

          {section === "posts" && (
            <section className="posts-view">
              <div className="view-heading">
                <div><span>02 / CONTENT</span><h1>文章管理</h1><p>统一管理草稿、已发布文章与发布计划。</p></div>
                <button type="button" className="primary-action" onClick={createPost}>＋ 新建文章</button>
              </div>
              <div className="post-table panel">
                <div className="post-table-head"><span>文章</span><span>分类</span><span>状态</span><span>更新时间</span><span>操作</span></div>
                {posts.map((post) => (
                  <article key={post.id}>
                    <div><strong>{post.title}</strong><small>/{post.slug}</small></div>
                    <span>{post.category}</span>
                    <span className={`status-pill status-${post.status}`}>{statusText(post.status)}</span>
                    <time>{formatDate(post.updatedAt)}</time>
                    <div className="row-actions"><button onClick={() => editPost(post)}>编辑</button><button onClick={() => deletePost(post)}>删除</button></div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {section === "editor" && (
            <section className="editor-view">
              <div className="editor-heading">
                <div><span>03 / EDITOR</span><h1>{draft.id ? "编辑文章" : "新建文章"}</h1><p>{saving ? "正在保存…" : `上次更新：${formatDate(draft.updatedAt)}`}</p></div>
                <div><button type="button" onClick={() => persistPost("draft")}>保存草稿</button><button type="button" className="primary-action" onClick={() => persistPost("published")}>发布文章</button></div>
              </div>
              <div className="editor-layout">
                <section className="editor-main panel">
                  <label className="title-field"><span>文章标题</span><input value={draft.title} onChange={(event) => updateDraft("title", event.target.value)} placeholder="输入文章标题" /></label>
                  <div className="editor-toolbar">
                    <button type="button" onClick={() => updateDraft("contentMarkdown", `${draft.contentMarkdown}\n## 小标题\n`)}>H2</button>
                    <button type="button" onClick={() => updateDraft("contentMarkdown", `${draft.contentMarkdown} **重点内容**`)}>B</button>
                    <button type="button" onClick={() => updateDraft("contentMarkdown", `${draft.contentMarkdown}\n> 引用内容\n`)}>❞</button>
                    <button type="button" onClick={() => updateDraft("contentMarkdown", `${draft.contentMarkdown}\n\`\`\`\n代码\n\`\`\`\n`)}>&lt;/&gt;</button>
                    <button type="button" onClick={() => setSection("media")}>图片 ◇</button>
                    <div className="mobile-preview-tabs"><button className={previewMode === "edit" ? "is-active" : ""} onClick={() => setPreviewMode("edit")}>编辑</button><button className={previewMode === "preview" ? "is-active" : ""} onClick={() => setPreviewMode("preview")}>预览</button></div>
                  </div>
                  <div className="editor-split" data-mobile-mode={previewMode}>
                    <textarea aria-label="Markdown 正文" value={draft.contentMarkdown} onChange={(event) => updateDraft("contentMarkdown", event.target.value)} spellCheck={false} />
                    <MarkdownPreview markdown={draft.contentMarkdown} />
                  </div>
                </section>
                <aside className="editor-meta panel">
                  <h2>发布设置</h2>
                  <label><span>文章链接</span><input value={draft.slug} onChange={(event) => updateDraft("slug", slugify(event.target.value))} onBlur={() => !draft.slug && updateDraft("slug", slugify(draft.title))} placeholder="article-slug" /></label>
                  <label><span>摘要</span><textarea value={draft.summary} onChange={(event) => updateDraft("summary", event.target.value)} rows={4} /></label>
                  <div className="two-fields"><label><span>分类</span><select value={draft.category} onChange={(event) => updateDraft("category", event.target.value)}><option>电子</option><option>超频</option><option>硬件</option><option>游戏与次元</option></select></label><label><span>阅读时间</span><input value={draft.readTime} onChange={(event) => updateDraft("readTime", event.target.value)} /></label></div>
                  <label><span>标签（用逗号分隔）</span><input value={draft.tags.join(", ")} onChange={(event) => updateDraft("tags", event.target.value.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean))} /></label>
                  <label><span>内容编号</span><input value={draft.code} onChange={(event) => updateDraft("code", event.target.value)} /></label>
                  <label><span>定时发布时间</span><input type="datetime-local" value={draft.publishedAt ? draft.publishedAt.slice(0, 16) : ""} onChange={(event) => updateDraft("publishedAt", event.target.value ? new Date(event.target.value).toISOString() : null)} /></label>
                  <button type="button" className="schedule-action" onClick={() => persistPost("scheduled")}>加入发布队列</button>
                  <div className="cover-control">
                    <span>文章封面</span>
                    {draft.coverUrl ? (
                      <>
                        {/* Dynamic uploads intentionally bypass image optimization. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={draft.coverUrl} alt="封面预览" />
                        <div><button type="button" onClick={() => setSection("media")}>更换封面</button><button type="button" onClick={() => updateDraft("coverUrl", null)}>移除</button></div>
                      </>
                    ) : (
                      <button type="button" onClick={() => setSection("media")}>＋ 从媒体库选择</button>
                    )}
                  </div>
                </aside>
              </div>
            </section>
          )}

          {section === "media" && (
            <section className="media-view">
              <div className="view-heading"><div><span>04 / ASSETS</span><h1>媒体库</h1><p>上传封面与正文图片，点击图片即可插入当前文章。</p></div><button className="primary-action" onClick={() => fileInput.current?.click()}>↑ 上传图片</button></div>
              <div className="upload-dropzone" onClick={() => fileInput.current?.click()}><span>◇</span><strong>点击选择图片</strong><p>支持 JPEG、PNG、WebP 和 GIF，单张不超过 10 MB</p></div>
              {assets.length ? (
                <div className="media-grid">
                  {assets.map((asset) => (
                    <article key={asset.id}>
                      <div>
                        {/* Dynamic uploads intentionally bypass image optimization. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={asset.url} alt={asset.alt} />
                      </div>
                      <strong>{asset.filename}</strong>
                      <small>{Math.max(1, Math.round(asset.size / 1024))} KB</small>
                      <div className="media-actions"><button onClick={() => insertImage(asset)}>插入正文</button><button onClick={() => setAsCover(asset)}>设为封面</button><button className="danger-action" onClick={() => deleteAsset(asset)}>删除</button></div>
                    </article>
                  ))}
                </div>
              ) : <div className="empty-media"><span>NO ASSETS</span><p>媒体库还是空的，上传第一张文章图片吧。</p></div>}
            </section>
          )}

          {section === "settings" && (
            <section className="settings-view">
              <div className="view-heading"><div><span>05 / CONFIG</span><h1>站点设置</h1><p>接入 VPS API 后，这些内容会保存到 PostgreSQL。</p></div><button className="primary-action" disabled={saving} onClick={saveSettings}>{saving ? "保存中…" : "保存设置"}</button></div>
              <div className="settings-grid"><section className="panel"><h2>基本信息</h2><label><span>网站名称</span><input value={settings.siteTitle} onChange={(event) => setSettings((current) => ({ ...current, siteTitle: event.target.value }))} /></label><label><span>网站副标题</span><input value={settings.tagline} onChange={(event) => setSettings((current) => ({ ...current, tagline: event.target.value }))} /></label><label><span>个人介绍</span><textarea rows={5} value={settings.bio} onChange={(event) => setSettings((current) => ({ ...current, bio: event.target.value }))} /></label></section><section className="panel"><h2>发布偏好</h2><label><span>默认分类</span><select value={settings.defaultCategory} onChange={(event) => setSettings((current) => ({ ...current, defaultCategory: event.target.value }))}><option>电子</option><option>超频</option><option>硬件</option><option>游戏与次元</option></select></label><label><span>默认作者</span><input value={settings.defaultAuthor} onChange={(event) => setSettings((current) => ({ ...current, defaultAuthor: event.target.value }))} /></label><div className="settings-note"><strong>修订记录已启用</strong><p>每次更新文章前，服务端会自动保留旧版本，最多可由接口读取最近 30 个版本。</p></div><div className="settings-note"><strong>图片安全检查已启用</strong><p>上传时会核验文件头，仅允许 JPEG、PNG、WebP 和 GIF。</p></div></section></div>
            </section>
          )}
        </div>
      </section>

      <input ref={fileInput} className="file-input" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadImage(file); event.currentTarget.value = ""; }} />
      {notice && <div className="admin-toast" role="status">{notice}</div>}
    </main>
  );
}
