import Fastify from "fastify";
import cookie from "@fastify/cookie";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import { Pool } from "pg";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import {
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const serverDirectory = path.dirname(fileURLToPath(import.meta.url));
const uploadDirectory = path.resolve(process.env.UPLOAD_DIR || "/data/uploads");
const publicOrigin = (process.env.PUBLIC_ORIGIN || "http://localhost").replace(/\/$/, "");
const port = Number(process.env.API_PORT || 8788);
const secureCookies = publicOrigin.startsWith("https://");

const requiredEnvironment = [
  "SESSION_SECRET",
  "ADMIN_PASSWORD",
];

const missingEnvironment = requiredEnvironment.filter((key) => !process.env[key]);
const hasDatabaseConfiguration = Boolean(
  process.env.DATABASE_URL ||
    (process.env.PGHOST && process.env.PGDATABASE && process.env.PGUSER && process.env.PGPASSWORD),
);
if (!hasDatabaseConfiguration) missingEnvironment.unshift("DATABASE_URL or PG* variables");
if (missingEnvironment.length) {
  throw new Error(`Missing required environment variables: ${missingEnvironment.join(", ")}`);
}

const sessionSecret = process.env.SESSION_SECRET;
const adminPasswordDigest = createHash("sha256")
  .update(process.env.ADMIN_PASSWORD)
  .digest();
const adminGitHubId = process.env.ADMIN_GITHUB_ID
  ? String(process.env.ADMIN_GITHUB_ID)
  : null;
const githubOAuthEnabled = Boolean(
  process.env.GITHUB_CLIENT_ID &&
    process.env.GITHUB_CLIENT_SECRET &&
    adminGitHubId,
);
const passwordFailures = new Map();
const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : new Pool();
const app = Fastify({
  logger: true,
  trustProxy: true,
  bodyLimit: 2 * 1024 * 1024,
});

await mkdir(uploadDirectory, { recursive: true });
await app.register(cookie);
await app.register(multipart, {
  limits: {
    files: 1,
    fileSize: 10 * 1024 * 1024,
    fields: 4,
    parts: 5,
  },
});
await app.register(fastifyStatic, {
  root: uploadDirectory,
  prefix: "/uploads/",
  decorateReply: false,
  immutable: true,
  maxAge: "30d",
});

app.addHook("onSend", async (_request, reply, payload) => {
  reply.header("x-content-type-options", "nosniff");
  reply.header("x-frame-options", "DENY");
  reply.header("referrer-policy", "strict-origin-when-cross-origin");
  reply.header("permissions-policy", "camera=(), microphone=(), geolocation=()");
  reply.header(
    "content-security-policy",
    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
  );
  return payload;
});

const schemaSql = await readFile(path.join(serverDirectory, "schema.sql"), "utf8");
await pool.query(schemaSql);

function base64Url(value) {
  return Buffer.from(value).toString("base64url");
}

function signValue(value) {
  const encoded = base64Url(value);
  const signature = createHmac("sha256", sessionSecret).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

function verifySignedValue(value) {
  if (!value || !value.includes(".")) return null;
  const [encoded, providedSignature] = value.split(".", 2);
  const expectedSignature = createHmac("sha256", sessionSecret)
    .update(encoded)
    .digest("base64url");
  const expected = Buffer.from(expectedSignature);
  const provided = Buffer.from(providedSignature);
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) return null;
  try {
    return Buffer.from(encoded, "base64url").toString("utf8");
  } catch {
    return null;
  }
}

function createSession({ id, login, avatarUrl = null, provider }) {
  return signValue(
    JSON.stringify({
      id: String(id),
      login,
      avatarUrl,
      provider,
      role: "admin",
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
    }),
  );
}

function readSession(request) {
  const raw = verifySignedValue(request.cookies.mozelle_admin);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw);
    const validIdentity =
      (session.provider === "password" && session.id === "password-admin") ||
      (session.provider === "github" &&
        adminGitHubId &&
        String(session.id) === adminGitHubId);
    if (
      session.role !== "admin" ||
      !validIdentity ||
      typeof session.exp !== "number" ||
      session.exp < Date.now()
    ) {
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

async function requireAdmin(request, reply) {
  const session = readSession(request);
  if (!session) {
    return reply.code(401).send({ error: "UNAUTHORIZED", message: "请先完成后台管理员验证。" });
  }
  request.admin = session;
}

async function verifyMutationOrigin(request, reply) {
  const origin = request.headers.origin;
  if (origin && origin.replace(/\/$/, "") !== publicOrigin) {
    return reply.code(403).send({ error: "INVALID_ORIGIN", message: "请求来源不受信任。" });
  }
}

function cleanText(value, maxLength = 500) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function validateSlug(value) {
  const slug = cleanText(value, 180).toLowerCase();
  return /^[a-z0-9\u4e00-\u9fff]+(?:-[a-z0-9\u4e00-\u9fff]+)*$/.test(slug)
    ? slug
    : null;
}

function normalizeTags(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((tag) => cleanText(tag, 32)).filter(Boolean))].slice(0, 12);
}

function normalizeCoverUrl(value) {
  const coverUrl = cleanText(value, 500);
  if (!coverUrl) return null;
  if (coverUrl.startsWith("/uploads/") || coverUrl.startsWith(`${publicOrigin}/uploads/`)) {
    return coverUrl;
  }
  throw new Error("文章封面必须来自媒体库。");
}

function normalizePostPayload(body = {}) {
  const title = cleanText(body.title, 180);
  const slug = validateSlug(body.slug);
  const contentMarkdown = typeof body.contentMarkdown === "string"
    ? body.contentMarkdown.slice(0, 1_000_000)
    : "";
  const allowedStatuses = new Set(["draft", "published", "scheduled"]);
  const status = allowedStatuses.has(body.status) ? body.status : "draft";
  const publishedAt = body.publishedAt ? new Date(body.publishedAt) : null;

  if (!title) throw new Error("文章标题不能为空。");
  if (!slug) throw new Error("文章链接只能包含中文、英文字母、数字和连字符。");
  if (status === "scheduled" && (!publishedAt || Number.isNaN(publishedAt.valueOf()))) {
    throw new Error("定时发布必须填写有效时间。");
  }

  return {
    title,
    slug,
    summary: cleanText(body.summary, 600),
    category: cleanText(body.category, 40) || "电子",
    tags: normalizeTags(body.tags),
    code: cleanText(body.code, 30) || "EE / NEW",
    readTime: cleanText(body.readTime, 30) || "5 min",
    contentMarkdown,
    coverUrl: normalizeCoverUrl(body.coverUrl),
    status,
    publishedAt:
      status === "published"
        ? publishedAt && !Number.isNaN(publishedAt.valueOf())
          ? publishedAt.toISOString()
          : new Date().toISOString()
        : status === "scheduled"
          ? publishedAt.toISOString()
          : null,
  };
}

function mapPost(row) {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    summary: row.summary,
    category: row.category,
    tags: Array.isArray(row.tags) ? row.tags : [],
    code: row.code,
    readTime: row.read_time,
    contentMarkdown: row.content_markdown,
    coverUrl: row.cover_url,
    status: row.status,
    publishedAt: row.published_at?.toISOString?.() ?? row.published_at ?? null,
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
    updatedAt: row.updated_at?.toISOString?.() ?? row.updated_at,
  };
}

function renderMarkdown(markdown) {
  const rawHtml = marked.parse(markdown, { gfm: true, breaks: false });
  return sanitizeHtml(rawHtml, {
    allowedTags: [
      "p", "br", "h1", "h2", "h3", "h4", "strong", "em", "del", "blockquote",
      "ul", "ol", "li", "pre", "code", "a", "img", "hr", "table", "thead", "tbody",
      "tr", "th", "td",
    ],
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "title", "loading"],
      code: ["class"],
    },
    allowedSchemes: ["http", "https"],
    allowedSchemesByTag: { img: ["http", "https"] },
    allowProtocolRelative: false,
    transformTags: {
      a: (_tagName, attributes) => ({
        tagName: "a",
        attribs: { ...attributes, target: "_blank", rel: "noopener noreferrer" },
      }),
      img: (_tagName, attributes) => ({
        tagName: "img",
        attribs: { ...attributes, loading: "lazy" },
      }),
    },
    exclusiveFilter(frame) {
      if (frame.tag === "img") {
        const src = frame.attribs?.src || "";
        return !(src.startsWith("/uploads/") || src.startsWith(`${publicOrigin}/uploads/`));
      }
      return false;
    },
  });
}

function markdownParagraphs(markdown) {
  return markdown
    .replace(/```[\s\S]*?```/g, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[>*_`#-]/g, "")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function mapPublicPost(row) {
  const post = mapPost(row);
  return {
    id: post.id,
    category: post.category,
    code: post.code,
    date: (post.publishedAt || post.updatedAt).slice(0, 10).replace(/-/g, "."),
    readTime: post.readTime,
    title: post.title,
    summary: post.summary,
    tags: post.tags,
    content: markdownParagraphs(post.contentMarkdown),
    contentHtml: renderMarkdown(post.contentMarkdown),
    coverUrl: post.coverUrl,
  };
}

function mapAsset(row) {
  return {
    id: row.id,
    url: row.public_url,
    filename: row.filename,
    alt: row.alt_text,
    size: row.size_bytes,
    mimeType: row.mime_type,
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
  };
}

function detectImage(buffer) {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { mime: "image/png", extension: "png" };
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mime: "image/jpeg", extension: "jpg" };
  }
  if (buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") {
    return { mime: "image/webp", extension: "webp" };
  }
  const gifHeader = buffer.toString("ascii", 0, 6);
  if (gifHeader === "GIF87a" || gifHeader === "GIF89a") {
    return { mime: "image/gif", extension: "gif" };
  }
  return null;
}

async function seedPosts() {
  const { rows } = await pool.query("SELECT COUNT(*)::int AS count FROM posts");
  if (rows[0].count > 0) return;

  const seeds = [
    {
      slug: "ddr5-stability",
      title: "DDR5 超频：从电压、时序到稳定性",
      summary: "把 VDD、VDDQ、VPP 与内存控制器电压放进同一张逻辑图，理解频率、时序和稳定性的真实边界。",
      category: "超频",
      tags: ["DDR5", "电压", "时序"],
      code: "OC / 001",
      readTime: "12 min",
      content: "## 从变量控制开始\n\n内存超频不是单纯提高频率，而是在信号完整性、颗粒特性与内存控制器能力之间寻找平衡。\n\n调试时应先固定变量：确定目标频率，再分别处理主时序、次级时序与电压。\n\n> 稳定性测试不能只看是否能够开机，还要验证冷启动、休眠唤醒和不同温度条件。",
    },
    {
      slug: "pmic-rails",
      title: "主板与 PMIC：DDR5 电压究竟从哪里来",
      summary: "沿着供电路径拆解主板输入、DIMM 上的 PMIC 以及颗粒端电压。",
      category: "电子",
      tags: ["PMIC", "供电", "主板"],
      code: "EE / 014",
      readTime: "8 min",
      content: "## 供电路径\n\nDDR5 将主要电源管理功能移到内存模组上。主板负责上游输入，DIMM 上的 PMIC 再生成颗粒与相关电路实际使用的多路电压。",
    },
    {
      slug: "drmos-reading",
      title: "看懂一颗 DrMOS：参数、损耗与温度",
      summary: "从额定电流走向真实工况，理解开关频率、导通电阻和散热条件。",
      category: "硬件",
      tags: ["DrMOS", "VRM", "散热"],
      code: "HW / 009",
      readTime: "10 min",
      content: "## 不只看额定电流\n\n真实损耗主要来自导通损耗、开关损耗与驱动损耗。判断安全性需要把负载、开关频率和 PCB 散热条件一起考虑。",
    },
    {
      slug: "acg-workspace",
      title: "我的次元工作台：游戏、Cos 与电子设备",
      summary: "从桌面布置到影像记录，把不同兴趣放进同一个能够长期维护的个人空间。",
      category: "游戏与次元",
      tags: ["ACG", "Cosplay", "Setup"],
      code: "ACG / 006",
      readTime: "6 min",
      content: "## 一个可持续的个人空间\n\n电子、游戏和 Cosplay 并不是相互分离的兴趣。灯光控制、设备调试、角色造型与影像后期共享着许多观察和解决问题的方法。",
    },
  ];

  for (const seed of seeds) {
    await pool.query(
      `INSERT INTO posts
        (id, slug, title, summary, category, tags, code, read_time, content_markdown, status, published_at)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, 'published', NOW())
       ON CONFLICT (slug) DO NOTHING`,
      [
        randomUUID(), seed.slug, seed.title, seed.summary, seed.category,
        JSON.stringify(seed.tags), seed.code, seed.readTime, seed.content,
      ],
    );
  }
}

await seedPosts();

app.get("/api/health", async () => {
  await pool.query("SELECT 1");
  return { ok: true, service: "mozelle-journal-api" };
});

app.get("/api/auth/session", async (request) => {
  const session = readSession(request);
  return {
    authenticated: Boolean(session),
    passwordEnabled: true,
    loginUrl: githubOAuthEnabled ? "/api/auth/github/start" : undefined,
    user: session ? { login: session.login, avatarUrl: session.avatarUrl } : undefined,
  };
});

app.post(
  "/api/auth/password",
  { preHandler: [verifyMutationOrigin] },
  async (request, reply) => {
    const attemptKey = request.ip || "unknown";
    const now = Date.now();
    const previous = passwordFailures.get(attemptKey);
    if (previous?.blockedUntil > now) {
      const retryAfter = Math.ceil((previous.blockedUntil - now) / 1000);
      reply.header("retry-after", String(retryAfter));
      return reply.code(429).send({
        error: "TOO_MANY_ATTEMPTS",
        message: `尝试次数过多，请在 ${retryAfter} 秒后重试。`,
      });
    }

    const password =
      typeof request.body?.password === "string"
        ? request.body.password.slice(0, 128)
        : "";
    const providedDigest = createHash("sha256").update(password).digest();
    const passwordMatches = timingSafeEqual(adminPasswordDigest, providedDigest);

    if (!passwordMatches) {
      const withinWindow = previous && now - previous.firstFailure < 10 * 60 * 1000;
      const failures = withinWindow ? previous.failures + 1 : 1;
      const blockedUntil = failures >= 5 ? now + 10 * 60 * 1000 : 0;
      passwordFailures.set(attemptKey, {
        failures,
        firstFailure: withinWindow ? previous.firstFailure : now,
        blockedUntil,
      });
      return reply.code(failures >= 5 ? 429 : 401).send({
        error: failures >= 5 ? "TOO_MANY_ATTEMPTS" : "INVALID_PASSWORD",
        message:
          failures >= 5
            ? "尝试次数过多，请在 10 分钟后重试。"
            : "后台密码不正确。",
      });
    }

    passwordFailures.delete(attemptKey);
    reply.setCookie(
      "mozelle_admin",
      createSession({
        id: "password-admin",
        login: "Mozelle",
        provider: "password",
      }),
      {
        httpOnly: true,
        secure: secureCookies,
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60,
      },
    );
    return {
      authenticated: true,
      user: { login: "Mozelle", avatarUrl: null },
    };
  },
);

app.get("/api/auth/github/start", async (_request, reply) => {
  if (!githubOAuthEnabled) {
    return reply.code(503).send("此站点未启用 GitHub 备用登录，请使用后台密码。");
  }
  const state = randomBytes(24).toString("base64url");
  reply.setCookie("mozelle_oauth_state", signValue(state), {
    httpOnly: true,
    secure: secureCookies,
    sameSite: "lax",
    path: "/api/auth/github",
    maxAge: 600,
  });
  const authorize = new URL("https://github.com/login/oauth/authorize");
  authorize.searchParams.set("client_id", process.env.GITHUB_CLIENT_ID);
  authorize.searchParams.set("redirect_uri", `${publicOrigin}/api/auth/github/callback`);
  authorize.searchParams.set("scope", "read:user");
  authorize.searchParams.set("state", state);
  return reply.redirect(authorize.href);
});

app.get("/api/auth/github/callback", async (request, reply) => {
  if (!githubOAuthEnabled) {
    return reply.code(503).send("此站点未启用 GitHub 备用登录，请使用后台密码。");
  }
  const { code, state } = request.query || {};
  const savedState = verifySignedValue(request.cookies.mozelle_oauth_state);
  reply.clearCookie("mozelle_oauth_state", { path: "/api/auth/github" });
  if (!code || !state || !savedState || state !== savedState) {
    return reply.code(400).send("GitHub 登录状态无效，请返回后台重新登录。");
  }

  const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: `${publicOrigin}/api/auth/github/callback`,
    }),
  });
  const tokenPayload = await tokenResponse.json();
  if (!tokenResponse.ok || !tokenPayload.access_token) {
    request.log.error(
      { status: tokenResponse.status, error: tokenPayload.error },
      "GitHub token exchange failed",
    );
    return reply.code(502).send("GitHub 登录失败，请稍后重试。");
  }

  const userResponse = await fetch("https://api.github.com/user", {
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${tokenPayload.access_token}`,
      "user-agent": "mozelle-journal",
      "x-github-api-version": "2022-11-28",
    },
  });
  const user = await userResponse.json();
  if (!userResponse.ok || String(user.id) !== adminGitHubId) {
    return reply.code(403).send("此 GitHub 账号没有后台管理权限。");
  }

  reply.setCookie("mozelle_admin", createSession({
    id: user.id,
    login: user.login,
    avatarUrl: user.avatar_url || null,
    provider: "github",
  }), {
    httpOnly: true,
    secure: secureCookies,
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
  return reply.redirect(`${publicOrigin}/admin`);
});

app.post(
  "/api/auth/logout",
  { preHandler: [verifyMutationOrigin] },
  async (_request, reply) => {
    reply.clearCookie("mozelle_admin", { path: "/" });
    return { ok: true };
  },
);

app.get("/api/posts", async (_request, reply) => {
  const { rows } = await pool.query(
    `SELECT * FROM posts
     WHERE status IN ('published', 'scheduled')
       AND published_at IS NOT NULL
       AND published_at <= NOW()
     ORDER BY published_at DESC`,
  );
  reply.header("cache-control", "public, max-age=30, stale-while-revalidate=120");
  return { posts: rows.map(mapPublicPost) };
});

app.get("/api/settings", async (_request, reply) => {
  const defaults = {
    siteTitle: "Mozelle Journal",
    tagline: "在旅途与源石之间，持续记录。",
    bio: "电子专业学生，记录硬件、超频、游戏、Cosplay 与二次元世界。",
    defaultCategory: "电子",
    defaultAuthor: "Mozelle",
  };
  const { rows } = await pool.query("SELECT setting_key, setting_value FROM site_settings");
  reply.header("cache-control", "public, max-age=30, stale-while-revalidate=120");
  return {
    settings: {
      ...defaults,
      ...Object.fromEntries(rows.map((row) => [row.setting_key, row.setting_value])),
    },
  };
});

app.get("/api/admin/posts", { preHandler: [requireAdmin] }, async () => {
  const { rows } = await pool.query("SELECT * FROM posts ORDER BY updated_at DESC");
  return { posts: rows.map(mapPost) };
});

app.post(
  "/api/admin/posts",
  { preHandler: [verifyMutationOrigin, requireAdmin] },
  async (request, reply) => {
    let post;
    try {
      post = normalizePostPayload(request.body);
    } catch (error) {
      return reply.code(400).send({ error: "INVALID_POST", message: error.message });
    }
    const id = randomUUID();
    try {
      const { rows } = await pool.query(
        `INSERT INTO posts
          (id, slug, title, summary, category, tags, code, read_time, content_markdown,
           cover_url, status, published_at)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [
          id, post.slug, post.title, post.summary, post.category, JSON.stringify(post.tags),
          post.code, post.readTime, post.contentMarkdown, post.coverUrl, post.status,
          post.publishedAt,
        ],
      );
      await pool.query(
        "INSERT INTO revisions (id, post_id, snapshot) VALUES ($1, $2, $3::jsonb)",
        [randomUUID(), id, JSON.stringify(mapPost(rows[0]))],
      );
      return reply.code(201).send({ post: mapPost(rows[0]) });
    } catch (error) {
      if (error.code === "23505") {
        return reply.code(409).send({ error: "SLUG_EXISTS", message: "文章链接已经被使用。" });
      }
      throw error;
    }
  },
);

app.put(
  "/api/admin/posts/:id",
  { preHandler: [verifyMutationOrigin, requireAdmin] },
  async (request, reply) => {
    let post;
    try {
      post = normalizePostPayload(request.body);
    } catch (error) {
      return reply.code(400).send({ error: "INVALID_POST", message: error.message });
    }
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const current = await client.query("SELECT * FROM posts WHERE id = $1 FOR UPDATE", [request.params.id]);
      if (!current.rows.length) {
        await client.query("ROLLBACK");
        return reply.code(404).send({ error: "NOT_FOUND", message: "文章不存在。" });
      }
      await client.query(
        "INSERT INTO revisions (id, post_id, snapshot) VALUES ($1, $2, $3::jsonb)",
        [randomUUID(), request.params.id, JSON.stringify(mapPost(current.rows[0]))],
      );
      const result = await client.query(
        `UPDATE posts SET
          slug = $2, title = $3, summary = $4, category = $5, tags = $6::jsonb,
          code = $7, read_time = $8, content_markdown = $9, cover_url = $10,
          status = $11, published_at = $12, updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [
          request.params.id, post.slug, post.title, post.summary, post.category,
          JSON.stringify(post.tags), post.code, post.readTime, post.contentMarkdown,
          post.coverUrl, post.status, post.publishedAt,
        ],
      );
      await client.query("COMMIT");
      return { post: mapPost(result.rows[0]) };
    } catch (error) {
      await client.query("ROLLBACK");
      if (error.code === "23505") {
        return reply.code(409).send({ error: "SLUG_EXISTS", message: "文章链接已经被使用。" });
      }
      throw error;
    } finally {
      client.release();
    }
  },
);

app.delete(
  "/api/admin/posts/:id",
  { preHandler: [verifyMutationOrigin, requireAdmin] },
  async (request, reply) => {
    const result = await pool.query("DELETE FROM posts WHERE id = $1", [request.params.id]);
    return result.rowCount ? { ok: true } : reply.code(404).send({ error: "NOT_FOUND" });
  },
);

app.get(
  "/api/admin/posts/:id/revisions",
  { preHandler: [requireAdmin] },
  async (request) => {
    const { rows } = await pool.query(
      "SELECT id, snapshot, created_at FROM revisions WHERE post_id = $1 ORDER BY created_at DESC LIMIT 30",
      [request.params.id],
    );
    return {
      revisions: rows.map((row) => ({
        id: row.id,
        snapshot: row.snapshot,
        createdAt: row.created_at?.toISOString?.() ?? row.created_at,
      })),
    };
  },
);

app.post(
  "/api/admin/posts/:id/revisions/:revisionId/restore",
  { preHandler: [verifyMutationOrigin, requireAdmin] },
  async (request, reply) => {
    const revision = await pool.query(
      "SELECT snapshot FROM revisions WHERE id = $1 AND post_id = $2",
      [request.params.revisionId, request.params.id],
    );
    if (!revision.rows.length) return reply.code(404).send({ error: "NOT_FOUND" });
    const snapshot = normalizePostPayload(revision.rows[0].snapshot);
    const result = await pool.query(
      `UPDATE posts SET slug = $2, title = $3, summary = $4, category = $5,
       tags = $6::jsonb, code = $7, read_time = $8, content_markdown = $9,
       cover_url = $10, status = $11, published_at = $12, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [
        request.params.id, snapshot.slug, snapshot.title, snapshot.summary, snapshot.category,
        JSON.stringify(snapshot.tags), snapshot.code, snapshot.readTime, snapshot.contentMarkdown,
        snapshot.coverUrl, snapshot.status, snapshot.publishedAt,
      ],
    );
    return { post: mapPost(result.rows[0]) };
  },
);

app.get("/api/admin/media", { preHandler: [requireAdmin] }, async () => {
  const { rows } = await pool.query("SELECT * FROM assets ORDER BY created_at DESC");
  return { assets: rows.map(mapAsset) };
});

app.post(
  "/api/admin/media",
  { preHandler: [verifyMutationOrigin, requireAdmin] },
  async (request, reply) => {
    let filePart;
    let alt = "";
    for await (const part of request.parts()) {
      if (part.type === "file") {
        if (filePart) return reply.code(400).send({ error: "ONE_FILE_ONLY" });
        filePart = {
          filename: part.filename,
          clientMime: part.mimetype,
          buffer: await part.toBuffer(),
        };
      } else if (part.fieldname === "alt") {
        alt = cleanText(part.value, 180);
      }
    }
    if (!filePart) return reply.code(400).send({ error: "FILE_REQUIRED", message: "请选择图片。" });
    const detected = detectImage(filePart.buffer);
    if (!detected) {
      return reply.code(415).send({ error: "UNSUPPORTED_IMAGE", message: "仅支持 JPEG、PNG、WebP 和 GIF。" });
    }
    const hash = createHash("sha256").update(filePart.buffer).digest("hex").slice(0, 16);
    const objectKey = `${new Date().toISOString().slice(0, 7)}/${randomUUID()}-${hash}.${detected.extension}`;
    const destination = path.join(uploadDirectory, objectKey);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, filePart.buffer, { flag: "wx" });
    const id = randomUUID();
    const publicUrl = `/uploads/${objectKey}`;
    try {
      const { rows } = await pool.query(
        `INSERT INTO assets
          (id, object_key, filename, mime_type, size_bytes, alt_text, public_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [
          id, objectKey, cleanText(filePart.filename, 240) || `${id}.${detected.extension}`,
          detected.mime, filePart.buffer.length, alt, publicUrl,
        ],
      );
      return reply.code(201).send({ asset: mapAsset(rows[0]) });
    } catch (error) {
      await unlink(destination).catch(() => undefined);
      throw error;
    }
  },
);

app.delete(
  "/api/admin/media/:id",
  { preHandler: [verifyMutationOrigin, requireAdmin] },
  async (request, reply) => {
    const asset = await pool.query("SELECT * FROM assets WHERE id = $1", [request.params.id]);
    if (!asset.rows.length) return reply.code(404).send({ error: "NOT_FOUND" });
    const row = asset.rows[0];
    const usage = await pool.query(
      "SELECT 1 FROM posts WHERE cover_url = $1 OR content_markdown LIKE $2 LIMIT 1",
      [row.public_url, `%${row.public_url}%`],
    );
    if (usage.rows.length) {
      return reply.code(409).send({ error: "ASSET_IN_USE", message: "图片仍被文章引用，无法删除。" });
    }
    await pool.query("DELETE FROM assets WHERE id = $1", [request.params.id]);
    await unlink(path.join(uploadDirectory, row.object_key)).catch((error) => {
      if (error.code !== "ENOENT") throw error;
    });
    return { ok: true };
  },
);

app.get("/api/admin/settings", { preHandler: [requireAdmin] }, async () => {
  const { rows } = await pool.query("SELECT setting_key, setting_value FROM site_settings");
  return { settings: Object.fromEntries(rows.map((row) => [row.setting_key, row.setting_value])) };
});

app.put(
  "/api/admin/settings",
  { preHandler: [verifyMutationOrigin, requireAdmin] },
  async (request) => {
    const allowedKeys = new Set(["siteTitle", "tagline", "bio", "defaultCategory", "defaultAuthor"]);
    const entries = Object.entries(request.body || {}).filter(([key]) => allowedKeys.has(key));
    for (const [key, value] of entries) {
      await pool.query(
        `INSERT INTO site_settings (setting_key, setting_value, updated_at)
         VALUES ($1, $2::jsonb, NOW())
         ON CONFLICT (setting_key) DO UPDATE
         SET setting_value = EXCLUDED.setting_value, updated_at = NOW()`,
        [key, JSON.stringify(value)],
      );
    }
    return { ok: true };
  },
);

app.setErrorHandler((error, request, reply) => {
  request.log.error(error);
  if (error.code === "FST_REQ_FILE_TOO_LARGE") {
    return reply.code(413).send({ error: "FILE_TOO_LARGE", message: "图片不能超过 10 MB。" });
  }
  return reply.code(error.statusCode || 500).send({
    error: "INTERNAL_ERROR",
    message: error.statusCode && error.statusCode < 500 ? error.message : "服务器暂时无法处理请求。",
  });
});

const close = async (signal) => {
  app.log.info({ signal }, "shutting down");
  await app.close();
  await pool.end();
  process.exit(0);
};

process.on("SIGTERM", () => void close("SIGTERM"));
process.on("SIGINT", () => void close("SIGINT"));

await app.listen({ host: "0.0.0.0", port });
