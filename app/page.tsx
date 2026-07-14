"use client";

import { flushSync } from "react-dom";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from "react";

type Theme = "day" | "night";
type ArticleOrigin = "latest" | "card";

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => {
    finished: Promise<void>;
  };
};

const navItems = [
  { label: "首页", href: "#top" },
  { label: "技术文章", href: "#articles" },
  { label: "超频笔记", href: "#lab" },
  { label: "次元收藏", href: "#collection" },
  { label: "关于", href: "#about" },
];

const filters = ["全部", "电子", "超频", "硬件", "游戏与次元"] as const;
type Filter = (typeof filters)[number];

export type Article = {
  id: string;
  category: Filter;
  code: string;
  date: string;
  readTime: string;
  title: string;
  summary: string;
  tags: string[];
  content: string[];
  contentHtml?: string;
  coverUrl?: string | null;
};

type PublicSettings = {
  siteTitle: string;
  tagline: string;
  bio: string;
};

const fallbackSettings: PublicSettings = {
  siteTitle: "Mozelle Journal",
  tagline: "在旅途与源石之间，持续记录。",
  bio: "电子专业学生，记录硬件、超频、游戏、Cosplay 与二次元世界。",
};

const fallbackArticles: Article[] = [
  {
    id: "ddr5-stability",
    category: "超频" as Filter,
    code: "OC / 001",
    date: "2026.07.12",
    readTime: "12 min",
    title: "DDR5 超频：从电压、时序到稳定性",
    summary:
      "把 VDD、VDDQ、VPP 与内存控制器电压放进同一张逻辑图，理解频率、时序和稳定性的真实边界。",
    tags: ["DDR5", "电压", "时序"],
    content: [
      "内存超频不是单纯提高频率，而是在信号完整性、内存颗粒特性与内存控制器能力之间寻找平衡点。频率决定单位时间内能够完成的传输次数，时序决定完成一次操作需要等待多少个时钟周期。",
      "调试时应先固定变量：确定目标频率，再分别处理主时序、次级时序与电压。每轮只改变少量参数，并记录测试环境、温度和错误位置，才能区分随机波动与真正稳定。",
      "稳定性测试也不能只看是否能够开机。短时压力测试适合快速排错，长时间混合负载更接近日常使用；最终参数还要经过冷启动、休眠唤醒和不同温度条件验证。",
    ],
  },
  {
    id: "pmic-rails",
    category: "电子" as Filter,
    code: "EE / 014",
    date: "2026.07.08",
    readTime: "8 min",
    title: "主板与 PMIC：DDR5 电压究竟从哪里来",
    summary:
      "沿着供电路径拆解主板输入、DIMM 上的 PMIC 以及颗粒端电压，建立完整而不混乱的电源视图。",
    tags: ["PMIC", "供电", "主板"],
    content: [
      "DDR5 将主要电源管理功能移到内存模组上。主板负责提供上游输入与控制条件，DIMM 上的 PMIC 再生成颗粒和相关电路真正使用的多路电压。",
      "分析一条电源轨时，最重要的是区分输入、输出与参考电压。名称相近不代表来源相同，测量点也必须结合原理图、PMIC 型号和板级布局判断。",
      "这种划分不仅影响故障排查，也决定超频调压的边界：软件中可见的电压选项，最终仍要经过主板控制逻辑和模组端电源器件执行。",
    ],
  },
  {
    id: "drmos-reading",
    category: "硬件" as Filter,
    code: "HW / 009",
    date: "2026.07.03",
    readTime: "10 min",
    title: "看懂一颗 DrMOS：参数、损耗与温度",
    summary:
      "从额定电流走向真实工况，理解开关频率、导通电阻、散热条件为什么比单一的电流数字更重要。",
    tags: ["DrMOS", "VRM", "散热"],
    content: [
      "DrMOS 把高侧 MOS、低侧 MOS 与驱动器集成在一个封装中。数据手册中的最大电流通常依赖特定散热条件，不能直接等同于设备中的长期安全电流。",
      "真实损耗主要来自导通损耗、开关损耗和驱动损耗。负载、开关频率、输入输出压差与 PCB 铜箔条件都会改变结温，因此判断安全性需要把整套条件一起看。",
      "排查时可以从相数、每相电流、温升和热循环入手，再结合示波器观察开关节点，而不是只根据器件外壳温度下结论。",
    ],
  },
  {
    id: "acg-workspace",
    category: "游戏与次元" as Filter,
    code: "ACG / 006",
    date: "2026.06.28",
    readTime: "6 min",
    title: "我的次元工作台：游戏、Cos 与电子设备",
    summary:
      "从桌面布置到影像记录，把不同兴趣放进同一个能够长期维护的个人空间。",
    tags: ["ACG", "Cosplay", "Setup"],
    content: [
      "一个真正适合自己的工作台，不必追求展示柜式的整齐。它更像一套可持续的系统：常用设备随手可取，收藏有明确位置，拍摄与维修可以快速切换。",
      "对我来说，电子、游戏和 Cosplay 并不是相互分离的兴趣。灯光控制、设备调试、角色造型和影像后期之间，本来就共享许多观察与解决问题的方法。",
      "整理空间的目标也不是一次完成，而是让每次使用后都更容易恢复，让下一次灵感出现时不必先处理一大堆阻力。",
    ],
  },
];

const labNotes = [
  {
    index: "01",
    title: "内存超频",
    value: "DDR5 / AM5",
    detail: "频率、主次时序、训练与稳定性测试记录",
  },
  {
    index: "02",
    title: "板级分析",
    value: "POWER / PCB",
    detail: "PMIC、DrMOS、MOSFET 与供电路径拆解",
  },
  {
    index: "03",
    title: "显示制造",
    value: "TFT-LCD / CUT",
    detail: "切割、研磨、清洗、检查与设备参数笔记",
  },
];

const collections = [
  {
    number: "01",
    title: "魔女之旅",
    subtitle: "ELAINA / DAYLIGHT",
    description: "灰发、旅行与故事。白昼主题的灵感原点。",
    className: "collection-elaina",
  },
  {
    number: "02",
    title: "Mon3tr",
    subtitle: "MON3TR / NIGHTFALL",
    description: "源石、生体机械与锋利的绿色能量。",
    className: "collection-mon3tr",
  },
  {
    number: "03",
    title: "Cosplay 记录",
    subtitle: "COS / FRAME",
    description: "造型、布光、拍摄与每一次角色表达。",
    className: "collection-cos",
  },
  {
    number: "04",
    title: "游戏档案",
    subtitle: "GAME / ARCHIVE",
    description: "喜欢的世界、机制，以及值得留下的瞬间。",
    className: "collection-game",
  },
];

export default function Home() {
  const [theme, setTheme] = useState<Theme>("day");
  const [filter, setFilter] = useState<Filter>("全部");
  const [articles, setArticles] = useState<Article[]>(fallbackArticles);
  const [siteSettings, setSiteSettings] = useState<PublicSettings>(fallbackSettings);
  const [menuOpen, setMenuOpen] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [transitionTarget, setTransitionTarget] = useState<Theme>("night");
  const [nightVisualReady, setNightVisualReady] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [articleOrigin, setArticleOrigin] = useState<ArticleOrigin>("card");
  const [transitionArticleId, setTransitionArticleId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState("top");
  const [sectionJump, setSectionJump] = useState<{
    key: number;
    label: string;
  } | null>(null);
  const articleDialog = useRef<HTMLDialogElement>(null);
  const heroSection = useRef<HTMLElement>(null);
  const heroVisual = useRef<HTMLDivElement>(null);
  const trailCanvas = useRef<HTMLCanvasElement>(null);
  const rhodesParticleCanvas = useRef<HTMLCanvasElement>(null);
  const wireSphereCanvas = useRef<HTMLCanvasElement>(null);
  const sectionJumpTimer = useRef<number | null>(null);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  useEffect(() => {
    const revealNodes = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reveal]"),
    );
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const liteMotion =
      reducedMotion || document.documentElement.dataset.motion === "lite";

    if (liteMotion || !("IntersectionObserver" in window)) {
      revealNodes.forEach((node) => node.classList.add("is-revealed"));
      return;
    }

    revealNodes.forEach((node) => node.classList.add("reveal-pending"));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const node = entry.target as HTMLElement;
          node.classList.add("is-revealed");
          observer.unobserve(node);
          window.setTimeout(() => {
            node.classList.remove("reveal-pending", "is-revealed");
          }, 920);
        });
      },
      { rootMargin: "0px 0px -9% 0px", threshold: 0.08 },
    );
    revealNodes.forEach((node) => observer.observe(node));

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>("[data-section]"),
    );
    if (!("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((first, second) => second.intersectionRatio - first.intersectionRatio);
        const section = visible[0]?.target as HTMLElement | undefined;
        if (section?.dataset.section) setActiveSection(section.dataset.section);
      },
      { rootMargin: "-22% 0px -66% 0px", threshold: [0, 0.1] },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(
    () => () => {
      if (sectionJumpTimer.current) window.clearTimeout(sectionJumpTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (CSS.supports("animation-timeline: scroll()")) return;

    const progress = document.querySelector<HTMLElement>(".page-scroll-progress");
    if (!progress) return;
    let frame = 0;

    const updateProgress = () => {
      frame = 0;
      const scrollable = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight,
      );
      const value = Math.min(1, Math.max(0, window.scrollY / scrollable));
      progress.style.transform = `scaleX(${value})`;
    };
    const requestUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateProgress);
    };

    updateProgress();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate, { passive: true });
    return () => {
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    const hero = heroSection.current;
    if (!hero) return;
    let frame = 0;

    const updateHeroStory = () => {
      frame = 0;
      const bounds = hero.getBoundingClientRect();
      const progress = Math.min(
        1,
        Math.max(0, -bounds.top / Math.max(1, bounds.height * 0.72)),
      );
      hero.style.setProperty("--hero-grid-y", `${progress * 22}px`);
      hero.style.setProperty("--hero-copy-y", `${progress * -7}px`);
      hero.classList.toggle("is-scroll-engaged", progress > 0.055);
    };
    const requestUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateHeroStory);
    };

    updateHeroStory();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate, { passive: true });
    return () => {
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/posts", {
      headers: { accept: "application/json" },
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error("文章服务暂不可用");
        return response.json() as Promise<{ posts?: Article[] }>;
      })
      .then((payload) => {
        if (payload.posts?.length) setArticles(payload.posts);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        // Sites 设计预览与未配置 API 的环境继续使用内置文章。
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/settings", {
      headers: { accept: "application/json" },
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error("站点设置服务暂不可用");
        return response.json() as Promise<{ settings?: Partial<PublicSettings> }>;
      })
      .then((payload) => {
        if (payload.settings) {
          setSiteSettings((current) => ({ ...current, ...payload.settings }));
        }
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const motionQuery = window.matchMedia(
      "(max-width: 940px), (pointer: coarse), (prefers-reduced-motion: reduce)",
    );
    const deviceNavigator = navigator as Navigator & {
      deviceMemory?: number;
      connection?: { saveData?: boolean };
    };

    const updateMotionMode = () => {
      const limitedHardware =
        (deviceNavigator.hardwareConcurrency || 8) <= 4 ||
        (deviceNavigator.deviceMemory || 8) <= 4 ||
        Boolean(deviceNavigator.connection?.saveData);
      root.dataset.motion =
        motionQuery.matches || limitedHardware ? "lite" : "full";
    };

    updateMotionMode();
    motionQuery.addEventListener("change", updateMotionMode);
    return () => motionQuery.removeEventListener("change", updateMotionMode);
  }, []);

  useEffect(() => {
    if (document.documentElement.dataset.motion !== "full") return;

    const idleWindow = window as Window & {
      requestIdleCallback?: (
        callback: () => void,
        options?: { timeout: number },
      ) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    let idleHandle = 0;
    let timer = 0;

    const scheduleWarmup = () => {
      timer = window.setTimeout(() => {
        if (idleWindow.requestIdleCallback) {
          idleHandle = idleWindow.requestIdleCallback(
            () => setNightVisualReady(true),
            { timeout: 3000 },
          );
        } else {
          setNightVisualReady(true);
        }
      }, 1600);
    };

    if (document.readyState === "complete") {
      scheduleWarmup();
    } else {
      window.addEventListener("load", scheduleWarmup, { once: true });
    }

    return () => {
      window.removeEventListener("load", scheduleWarmup);
      if (timer) window.clearTimeout(timer);
      if (idleHandle) idleWindow.cancelIdleCallback?.(idleHandle);
    };
  }, []);

  useEffect(() => {
    const visual = heroVisual.current;
    const canvas = trailCanvas.current;
    if (
      !visual ||
      !canvas ||
      theme !== "day" ||
      document.documentElement.dataset.motion === "lite" ||
      window.matchMedia("(pointer: coarse), (prefers-reduced-motion: reduce)")
        .matches
    ) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) return;

    type TrailPoint = { x: number; y: number; createdAt: number };
    let points: TrailPoint[] = [];
    let frame = 0;
    let lastFrame = 0;
    let width = 0;
    let height = 0;
    let visualRect = visual.getBoundingClientRect();
    const lifetime = 520;

    const resizeCanvas = () => {
      const rect = visual.getBoundingClientRect();
      visualRect = rect;
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.25);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.round(width * pixelRatio));
      canvas.height = Math.max(1, Math.round(height * pixelRatio));
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.clearRect(0, 0, width, height);
    };

    const clipToSigil = () => {
      context.beginPath();
      if (theme === "day") {
        context.arc(
          width * 0.55,
          height * 0.44,
          Math.min(width * 0.46, height * 0.43),
          0,
          Math.PI * 2,
        );
      } else {
        const vertices = [
          [0.55, 0.04],
          [0.72, 0.08],
          [0.88, 0.2],
          [0.97, 0.39],
          [0.94, 0.61],
          [0.8, 0.81],
          [0.62, 0.94],
          [0.4, 0.92],
          [0.21, 0.8],
          [0.08, 0.6],
          [0.09, 0.37],
          [0.23, 0.17],
          [0.4, 0.08],
        ];
        vertices.forEach(([x, y], index) => {
          if (index === 0) context.moveTo(x * width, y * height);
          else context.lineTo(x * width, y * height);
        });
        context.closePath();
      }
      context.clip();
    };

    const drawTrail = (now: number) => {
      if (now - lastFrame < 16) {
        frame = window.requestAnimationFrame(drawTrail);
        return;
      }
      lastFrame = now;
      points = points.filter((point) => now - point.createdAt < lifetime);
      context.clearRect(0, 0, width, height);

      if (points.length > 1) {
        context.save();
        clipToSigil();
        context.globalCompositeOperation = "lighter";
        context.lineCap = "round";
        context.lineJoin = "round";
        context.shadowColor =
          theme === "day" ? "rgba(159, 124, 255, .48)" : "rgba(111, 255, 151, .58)";
        context.shadowBlur = 5;

        for (let index = 1; index < points.length; index += 1) {
          const previous = points[index - 1];
          const current = points[index];
          const age = (now - current.createdAt) / lifetime;
          const alpha = Math.max(0, (1 - age) * (index / points.length));
          context.beginPath();
          context.moveTo(previous.x, previous.y);
          context.lineTo(current.x, current.y);
          context.lineWidth = 0.7 + (index / points.length) * 1.8;
          context.strokeStyle =
            theme === "day"
              ? `rgba(178, 139, 255, ${alpha * 0.8})`
              : `rgba(120, 255, 157, ${alpha * 0.9})`;
          context.stroke();
        }

        const head = points[points.length - 1];
        const headAlpha = Math.max(0, 1 - (now - head.createdAt) / lifetime);
        context.beginPath();
        context.arc(head.x, head.y, 2.6, 0, Math.PI * 2);
        context.fillStyle =
          theme === "day"
            ? `rgba(255, 220, 148, ${headAlpha})`
            : `rgba(199, 255, 103, ${headAlpha})`;
        context.fill();
        context.restore();
      }

      frame = points.length ? window.requestAnimationFrame(drawTrail) : 0;
    };

    const requestDraw = () => {
      if (!frame) frame = window.requestAnimationFrame(drawTrail);
    };

    const handlePointerMove = (event: globalThis.PointerEvent) => {
      if (event.pointerType === "touch") return;
      const x = event.clientX - visualRect.left;
      const y = event.clientY - visualRect.top;
      const normalizedX = (x / visualRect.width - 0.55) * 2;
      const normalizedY = (y / visualRect.height - 0.44) * 2;

      visual.style.setProperty("--pointer-x", `${x}px`);
      visual.style.setProperty("--pointer-y", `${y}px`);
      if (theme === "day") {
        visual.style.setProperty("--sigil-shift-x", `${normalizedX * 9}px`);
        visual.style.setProperty("--sigil-shift-y", `${normalizedY * 7}px`);
        visual.style.setProperty("--sigil-shift-x-rev", `${normalizedX * -6}px`);
        visual.style.setProperty("--sigil-shift-y-rev", `${normalizedY * -5}px`);
        visual.style.setProperty("--sigil-rotate", `${normalizedX * 2.4}deg`);
        visual.style.setProperty("--sigil-rotate-rev", `${normalizedY * -2.2}deg`);
      } else {
        visual.style.setProperty("--mesh-shift-x", `${normalizedX * 13}px`);
        visual.style.setProperty("--mesh-shift-y", `${normalizedY * 10}px`);
        visual.style.setProperty("--mesh-rotate", `${(normalizedX - normalizedY) * 1.8}deg`);
        visual.style.setProperty("--mesh-tilt-x", `${normalizedY * -6}deg`);
        visual.style.setProperty("--mesh-tilt-y", `${normalizedX * 8}deg`);
      }

      const previous = points[points.length - 1];
      if (!previous || Math.hypot(previous.x - x, previous.y - y) > 3) {
        points.push({ x, y, createdAt: performance.now() });
        if (points.length > 18) points.shift();
      }
      requestDraw();
    };

    const resetPointer = () => {
      visual.style.setProperty("--sigil-shift-x", "0px");
      visual.style.setProperty("--sigil-shift-y", "0px");
      visual.style.setProperty("--sigil-shift-x-rev", "0px");
      visual.style.setProperty("--sigil-shift-y-rev", "0px");
      visual.style.setProperty("--sigil-rotate", "0deg");
      visual.style.setProperty("--sigil-rotate-rev", "0deg");
      visual.style.setProperty("--mesh-shift-x", "0px");
      visual.style.setProperty("--mesh-shift-y", "0px");
      visual.style.setProperty("--mesh-rotate", "0deg");
      visual.style.setProperty("--mesh-tilt-x", "0deg");
      visual.style.setProperty("--mesh-tilt-y", "0deg");
      requestDraw();
    };

    resizeCanvas();
    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(visual);
    const updateVisualRect = () => {
      visualRect = visual.getBoundingClientRect();
    };
    window.addEventListener("scroll", updateVisualRect, { passive: true });
    visual.addEventListener("pointermove", handlePointerMove, { passive: true });
    visual.addEventListener("pointerleave", resetPointer);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("scroll", updateVisualRect);
      visual.removeEventListener("pointermove", handlePointerMove);
      visual.removeEventListener("pointerleave", resetPointer);
      if (frame) window.cancelAnimationFrame(frame);
      context.clearRect(0, 0, width, height);
    };
  }, [theme]);

  useEffect(() => {
    const visual = heroSection.current;
    const canvas = rhodesParticleCanvas.current;
    if (!visual || !canvas) return;

    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;

    if (theme !== "night" || transitioning) {
      context.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    type RhodesParticle = {
      ox: number;
      oy: number;
      x: number;
      y: number;
      vx: number;
      vy: number;
      phase: number;
      size: number;
      bright: boolean;
    };

    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const lowPower =
      document.documentElement.dataset.motion === "lite" || coarsePointer;
    const particles: RhodesParticle[] = [];
    const pointer = { x: -10_000, y: -10_000, active: false };
    const sourceImage = new window.Image();
    sourceImage.decoding = "async";

    let frame = 0;
    let lastFrame = 0;
    let width = 0;
    let height = 0;
    let visualRect = visual.getBoundingClientRect();
    let imageReady = false;
    let destroyed = false;
    let assembledOnce = false;
    let assemblyStartedAt = 0;
    let inView = visualRect.bottom > 0 && visualRect.top < window.innerHeight;

    const drawParticles = (now: number, update = true) => {
      context.clearRect(0, 0, width, height);
      if (!particles.length) return;

      const pointerRadius = lowPower ? 52 : 76;
      const pointerRadiusSquared = pointerRadius * pointerRadius;
      const assembling = assemblyStartedAt > 0 && now - assemblyStartedAt < 1150;
      const spring = lowPower ? 0.024 : assembling ? 0.042 : 0.029;
      const friction = lowPower ? 0.8 : 0.83;
      const drift = lowPower ? 0.12 : 0.32;

      context.globalCompositeOperation = "source-over";
      context.beginPath();
      for (const particle of particles) {
        if (update) {
          if (pointer.active && !coarsePointer && !prefersReducedMotion) {
            const dx = particle.x - pointer.x;
            const dy = particle.y - pointer.y;
            const distanceSquared = dx * dx + dy * dy;
            if (distanceSquared > 0.1 && distanceSquared < pointerRadiusSquared) {
              const distance = Math.sqrt(distanceSquared);
              const falloff = 1 - distance / pointerRadius;
              const force = falloff * falloff * 2.35;
              particle.vx += (dx / distance) * force;
              particle.vy += (dy / distance) * force;
            }
          }

          const targetX =
            particle.ox + Math.sin(now * 0.00072 + particle.phase) * drift;
          const targetY =
            particle.oy + Math.cos(now * 0.00061 + particle.phase) * drift;
          particle.vx = (particle.vx + (targetX - particle.x) * spring) * friction;
          particle.vy = (particle.vy + (targetY - particle.y) * spring) * friction;
          particle.x += particle.vx;
          particle.y += particle.vy;
        }
        context.rect(particle.x, particle.y, particle.size, particle.size);
      }
      context.fillStyle = lowPower
        ? "rgba(130, 255, 165, .8)"
        : "rgba(118, 255, 158, .9)";
      context.fill();

      context.beginPath();
      for (let index = 0; index < particles.length; index += 1) {
        const particle = particles[index];
        if (!particle.bright) continue;
        const glowSize = particle.size * 1.7;
        context.rect(
          particle.x - glowSize * 0.22,
          particle.y - glowSize * 0.22,
          glowSize,
          glowSize,
        );
      }
      context.fillStyle = "rgba(224, 255, 118, .98)";
      context.fill();
    };

    const animate = (now: number) => {
      if (destroyed) return;
      const frameInterval = lowPower ? 1000 / 16 : 1000 / 32;
      if (now - lastFrame >= frameInterval) {
        lastFrame = now;
        drawParticles(now);
      }
      frame = window.requestAnimationFrame(animate);
    };

    const buildParticles = () => {
      if (!imageReady || !width || !height) return;

      const sampleSize = lowPower ? 200 : 280;
      const offscreen = document.createElement("canvas");
      offscreen.width = sampleSize;
      offscreen.height = sampleSize;
      const offscreenContext = offscreen.getContext("2d", {
        willReadFrequently: true,
      });
      if (!offscreenContext) return;
      offscreenContext.clearRect(0, 0, sampleSize, sampleSize);
      offscreenContext.drawImage(sourceImage, 0, 0, sampleSize, sampleSize);
      const pixels = offscreenContext.getImageData(
        0,
        0,
        sampleSize,
        sampleSize,
      ).data;

      const maxParticles = lowPower ? 520 : 1650;
      let step = lowPower ? 4 : 2;
      let samples: Array<[number, number, number]> = [];
      const collectSamples = () => {
        const next: Array<[number, number, number]> = [];
        for (let y = 0; y < sampleSize; y += step) {
          for (let x = 0; x < sampleSize; x += step) {
            const alpha = pixels[(y * sampleSize + x) * 4 + 3];
            if (alpha > 72) next.push([x, y, alpha]);
          }
        }
        return next;
      };
      samples = collectSamples();
      while (samples.length > maxParticles && step < 12) {
        step += 1;
        samples = collectSamples();
      }

      const compactLayout = width < 940;
      const logoSize = Math.min(
        width * (compactLayout ? 0.94 : 0.44),
        height * (compactLayout ? 0.5 : 0.72),
      );
      const centerX = width * (compactLayout ? 0.5 : 0.245);
      const centerY = height * (compactLayout ? 0.34 : 0.365);
      const offsetX = centerX - logoSize / 2;
      const offsetY = centerY - logoSize / 2;
      const scale = logoSize / sampleSize;
      const shouldAssemble =
        !assembledOnce && !prefersReducedMotion && !lowPower;
      if (shouldAssemble) assemblyStartedAt = performance.now();
      const scatter = prefersReducedMotion ? 0 : lowPower ? 10 : 24;

      particles.length = 0;
      samples.forEach(([sampleX, sampleY], index) => {
        const ox = offsetX + sampleX * scale;
        const oy = offsetY + sampleY * scale;
        const assemblyAngle =
          (index / Math.max(1, samples.length)) * Math.PI * 2 +
          Math.sin(index * 1.83) * 0.34;
        const assemblyRadius =
          logoSize * (0.48 + ((index * 17) % 31) / 31 * 0.34);
        particles.push({
          ox,
          oy,
          x: shouldAssemble
            ? centerX + Math.cos(assemblyAngle) * assemblyRadius
            : ox + (Math.random() - 0.5) * scatter,
          y: shouldAssemble
            ? centerY + Math.sin(assemblyAngle) * assemblyRadius * 0.72
            : oy + (Math.random() - 0.5) * scatter,
          vx: 0,
          vy: 0,
          phase: Math.random() * Math.PI * 2,
          size: Math.max(1.05, Math.min(2.15, scale * 0.72)),
          bright: index % 19 === 0,
        });
      });

      assembledOnce = true;
      drawParticles(performance.now(), false);
    };

    const resizeCanvas = () => {
      visualRect = visual.getBoundingClientRect();
      width = visualRect.width;
      height = visualRect.height;
      const pixelRatio = Math.min(
        window.devicePixelRatio || 1,
        lowPower ? 1 : 1.25,
      );
      canvas.width = Math.max(1, Math.round(width * pixelRatio));
      canvas.height = Math.max(1, Math.round(height * pixelRatio));
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      buildParticles();
    };

    const handlePointerMove = (event: globalThis.PointerEvent) => {
      if (event.pointerType === "touch") return;
      pointer.x = event.clientX - visualRect.left;
      pointer.y = event.clientY - visualRect.top;
      pointer.active = true;
    };
    const handlePointerLeave = () => {
      pointer.active = false;
    };
    const updateAnimationState = () => {
      if (document.hidden || !inView || prefersReducedMotion) {
        if (frame) window.cancelAnimationFrame(frame);
        frame = 0;
      } else if (!frame) {
        frame = window.requestAnimationFrame(animate);
      }
    };
    const handleVisibility = () => updateAnimationState();

    sourceImage.onload = () => {
      if (destroyed) return;
      imageReady = true;
      buildParticles();
    };
    sourceImage.src = "/rhodes-island-logo.webp";

    resizeCanvas();
    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(visual);
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      updateAnimationState();
    });
    visibilityObserver.observe(visual);
    if (!coarsePointer && !prefersReducedMotion) {
      visual.addEventListener("pointermove", handlePointerMove, { passive: true });
      visual.addEventListener("pointerleave", handlePointerLeave);
    }
    document.addEventListener("visibilitychange", handleVisibility);
    updateAnimationState();

    return () => {
      destroyed = true;
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      visual.removeEventListener("pointermove", handlePointerMove);
      visual.removeEventListener("pointerleave", handlePointerLeave);
      document.removeEventListener("visibilitychange", handleVisibility);
      if (frame) window.cancelAnimationFrame(frame);
      context.clearRect(0, 0, width, height);
      sourceImage.onload = null;
    };
  }, [theme, transitioning]);

  useEffect(() => {
    const visual = heroVisual.current;
    const canvas = wireSphereCanvas.current;
    if (!visual || !canvas) return;

    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;

    if (theme !== "night") {
      context.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    type Vector3 = { x: number; y: number; z: number; phase: number };
    type Edge = { a: number; b: number; accent: boolean };
    type ProjectedPoint = {
      x: number;
      y: number;
      z: number;
      depth: number;
      index: number;
    };
    type ProjectedEdge = {
      start: ProjectedPoint;
      end: ProjectedPoint;
      depth: number;
      accent: boolean;
      index: number;
    };

    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const lowPower =
      document.documentElement.dataset.motion === "lite" || coarsePointer;
    const deviceNavigator = navigator as Navigator & { deviceMemory?: number };
    const highMotionPerformance =
      !lowPower &&
      (deviceNavigator.hardwareConcurrency || 4) >= 8 &&
      (deviceNavigator.deviceMemory || 4) >= 8;
    const nodeCount = prefersReducedMotion ? 20 : lowPower ? 26 : 44;
    const chordCount = prefersReducedMotion ? 6 : lowPower ? 12 : 26;
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    const clamp = (value: number, minimum = 0, maximum = 1) =>
      Math.max(minimum, Math.min(maximum, value));
    const normalize = (point: Pick<Vector3, "x" | "y" | "z">) => {
      const length = Math.hypot(point.x, point.y, point.z) || 1;
      return {
        x: point.x / length,
        y: point.y / length,
        z: point.z / length,
      };
    };
    const nodes: Vector3[] = Array.from({ length: nodeCount }, (_, index) => {
      const y = 1 - ((index + 0.5) / nodeCount) * 2;
      const radius = Math.sqrt(Math.max(0, 1 - y * y));
      const angle = goldenAngle * index + Math.sin(index * 2.17) * 0.055;
      const irregularity = 1 + Math.sin(index * 4.13) * 0.026;
      const normalized = normalize({
        x: Math.cos(angle) * radius * irregularity,
        y: y * (1 + Math.cos(index * 2.73) * 0.02),
        z: Math.sin(angle) * radius * irregularity,
      });
      return {
        ...normalized,
        phase: index * 1.731 + (index % 5) * 0.47,
      };
    });

    const createRandom = (seed: number) => {
      let value = seed >>> 0;
      return () => {
        value += 0x6d2b79f5;
        let result = value;
        result = Math.imul(result ^ (result >>> 15), result | 1);
        result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
        return ((result ^ (result >>> 14)) >>> 0) / 4_294_967_296;
      };
    };

    const edgeKey = (a: number, b: number) =>
      `${Math.min(a, b)}-${Math.max(a, b)}`;

    const createSurfaceEdges = (): Edge[] => {
      const edges: Edge[] = [];
      const seen = new Set<string>();
      const neighbourCount = lowPower ? 3 : 4;
      nodes.forEach((node, index) => {
        const neighbours = nodes
          .map((candidate, candidateIndex) => ({
            index: candidateIndex,
            distance:
              (node.x - candidate.x) ** 2 +
              (node.y - candidate.y) ** 2 +
              (node.z - candidate.z) ** 2,
          }))
          .filter((candidate) => candidate.index !== index)
          .sort((first, second) => first.distance - second.distance)
          .slice(0, neighbourCount);
        neighbours.forEach((neighbour) => {
          const key = edgeKey(index, neighbour.index);
          if (seen.has(key)) return;
          seen.add(key);
          edges.push({
            a: index,
            b: neighbour.index,
            accent: edges.length % 9 === 0,
          });
        });
      });
      return edges;
    };

    const surfaceEdges = createSurfaceEdges();
    const surfaceEdgeKeys = new Set(
      surfaceEdges.map((edge) => edgeKey(edge.a, edge.b)),
    );

    const createFaces = () => {
      const adjacency = Array.from(
        { length: nodeCount },
        () => new Set<number>(),
      );
      surfaceEdges.forEach((edge) => {
        adjacency[edge.a].add(edge.b);
        adjacency[edge.b].add(edge.a);
      });
      const faces: Array<[number, number, number]> = [];
      const faceLimit = lowPower ? 10 : 24;
      for (let a = 0; a < nodeCount && faces.length < faceLimit; a += 1) {
        const neighbours = [...adjacency[a]].filter((value) => value > a);
        for (let first = 0; first < neighbours.length; first += 1) {
          for (
            let second = first + 1;
            second < neighbours.length;
            second += 1
          ) {
            const b = neighbours[first];
            const c = neighbours[second];
            if (adjacency[b].has(c)) faces.push([a, b, c]);
            if (faces.length >= faceLimit) break;
          }
          if (faces.length >= faceLimit) break;
        }
      }
      return faces;
    };

    const faces = createFaces();

    const createChords = (seed: number): Edge[] => {
      const random = createRandom(seed);
      const edges: Edge[] = [];
      const seen = new Set<string>();
      let attempts = 0;
      while (edges.length < chordCount && attempts < chordCount * 90) {
        attempts += 1;
        const a = Math.floor(random() * nodeCount);
        const b = Math.floor(random() * nodeCount);
        if (a === b) continue;
        const key = edgeKey(a, b);
        if (seen.has(key) || surfaceEdgeKeys.has(key)) continue;
        const first = nodes[a];
        const second = nodes[b];
        const dot = first.x * second.x + first.y * second.y + first.z * second.z;
        if (dot < -0.72 || dot > 0.34) continue;
        seen.add(key);
        edges.push({ a, b, accent: edges.length % 5 === 0 });
      }
      for (let index = 0; edges.length < chordCount; index += 1) {
        edges.push({
          a: index % nodeCount,
          b: (index * 7 + Math.floor(nodeCount * 0.41)) % nodeCount,
          accent: index % 5 === 0,
        });
      }
      return edges;
    };

    let topologySeed = 41;
    let previousChords = createChords(topologySeed);
    topologySeed += 37;
    let nextChords = createChords(topologySeed);
    let topologyStartedAt = performance.now();
    let frame = 0;
    let lastFrame = 0;
    let lastRaf = 0;
    let slowFrames = 0;
    let frameInterval = prefersReducedMotion
      ? Number.POSITIVE_INFINITY
      : lowPower
        ? 1000 / 20
        : highMotionPerformance
          ? 1000 / 60
          : 1000 / 30;
    let width = 0;
    let height = 0;
    let centerX = 0;
    let centerY = 0;
    let sphereRadius = 0;
    let volumeGradient: CanvasGradient | null = null;
    let destroyed = false;
    let focusPulse = 0;
    const initialBounds = visual.getBoundingClientRect();
    let inView =
      initialBounds.bottom > 0 && initialBounds.top < window.innerHeight;

    const rotatePoint = (
      point: Pick<Vector3, "x" | "y" | "z">,
      yaw: number,
      pitch: number,
      roll: number,
    ) => {
      const cosYaw = Math.cos(yaw);
      const sinYaw = Math.sin(yaw);
      const xAfterYaw = point.x * cosYaw + point.z * sinYaw;
      const zAfterYaw = -point.x * sinYaw + point.z * cosYaw;

      const cosPitch = Math.cos(pitch);
      const sinPitch = Math.sin(pitch);
      const yAfterPitch = point.y * cosPitch - zAfterYaw * sinPitch;
      const zAfterPitch = point.y * sinPitch + zAfterYaw * cosPitch;

      const cosRoll = Math.cos(roll);
      const sinRoll = Math.sin(roll);
      return {
        x: xAfterYaw * cosRoll - yAfterPitch * sinRoll,
        y: xAfterYaw * sinRoll + yAfterPitch * cosRoll,
        z: zAfterPitch,
      };
    };

    const projectPoint = (
      point: Pick<Vector3, "x" | "y" | "z">,
      index: number,
    ): ProjectedPoint => {
      const cameraDistance = 3.05;
      const perspective = cameraDistance / (cameraDistance - point.z);
      return {
        x: centerX + point.x * sphereRadius * perspective,
        y: centerY + point.y * sphereRadius * perspective,
        z: point.z,
        depth: clamp((point.z + 1) * 0.5),
        index,
      };
    };

    const interpolateOnSphere = (
      from: Pick<Vector3, "x" | "y" | "z">,
      to: Pick<Vector3, "x" | "y" | "z">,
      progress: number,
    ) =>
      normalize({
        x: from.x + (to.x - from.x) * progress,
        y: from.y + (to.y - from.y) * progress,
        z: from.z + (to.z - from.z) * progress,
      });

    const convexHull = (points: ProjectedPoint[]) => {
      if (points.length <= 3) return [...points];
      const sorted = [...points].sort((first, second) =>
        first.x === second.x ? first.y - second.y : first.x - second.x,
      );
      const cross = (
        origin: ProjectedPoint,
        first: ProjectedPoint,
        second: ProjectedPoint,
      ) =>
        (first.x - origin.x) * (second.y - origin.y) -
        (first.y - origin.y) * (second.x - origin.x);
      const lower: ProjectedPoint[] = [];
      sorted.forEach((point) => {
        while (
          lower.length >= 2 &&
          cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0
        ) {
          lower.pop();
        }
        lower.push(point);
      });
      const upper: ProjectedPoint[] = [];
      [...sorted].reverse().forEach((point) => {
        while (
          upper.length >= 2 &&
          cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0
        ) {
          upper.pop();
        }
        upper.push(point);
      });
      lower.pop();
      upper.pop();
      return lower.concat(upper);
    };

    const drawEdge = (edge: ProjectedEdge, kind: "surface" | "chord") => {
      const depthCurve = edge.depth * edge.depth;
      const isSurface = kind === "surface";
      const baseAlpha = isSurface
        ? 0.085 + depthCurve * (edge.accent ? 0.8 : 0.6)
        : 0.075 + depthCurve * (edge.accent ? 0.58 : 0.4);
      const focusBoost =
        0.9 + edge.depth * 0.12 + focusPulse * edge.depth * 0.05;
      const alpha = baseAlpha * focusBoost;
      context.beginPath();
      context.moveTo(edge.start.x, edge.start.y);
      context.lineTo(edge.end.x, edge.end.y);
      context.lineWidth = isSurface
        ? 0.42 + edge.depth * 1.22 + focusPulse * edge.depth * 0.12 + (edge.accent ? 0.42 : 0)
        : 0.36 + edge.depth * 0.72 + focusPulse * edge.depth * 0.08 + (edge.accent ? 0.24 : 0);
      context.strokeStyle = edge.accent
        ? `rgba(205, 255, 82, ${clamp(alpha, 0, 0.94)})`
        : `rgba(84, 239, 132, ${clamp(alpha, 0, 0.78)})`;
      context.stroke();
    };

    const drawSphere = (now: number) => {
      context.clearRect(0, 0, width, height);
      if (!width || !height) return;
      focusPulse = lowPower ? 0 : 0.5 + Math.sin(now * 0.00058) * 0.5;

      const topologyDuration = lowPower ? 4300 : 2900;
      let topologyProgress = (now - topologyStartedAt) / topologyDuration;
      if (topologyProgress >= 1) {
        previousChords = nextChords;
        topologySeed += 37;
        nextChords = createChords(topologySeed);
        topologyStartedAt = now;
        topologyProgress = 0;
      }
      const morph =
        0.5 - Math.cos(Math.max(0, Math.min(1, topologyProgress)) * Math.PI) * 0.5;

      const yaw = now * 0.00022;
      const pitch = 0.2 + Math.sin(now * 0.00015) * 0.18;
      const roll = -0.1 + Math.cos(now * 0.00011) * 0.14;
      const driftAmount = lowPower ? 0.008 : 0.018;
      const rotatedNodes = nodes.map((node) => {
        const firstDrift = Math.sin(now * 0.00042 + node.phase) * driftAmount;
        const secondDrift =
          Math.cos(now * 0.00031 + node.phase * 1.37) * driftAmount * 0.72;
        const deformed = normalize({
          x: node.x + node.y * firstDrift - node.z * secondDrift,
          y: node.y - node.x * firstDrift * 0.7 + node.z * secondDrift,
          z: node.z + node.x * secondDrift - node.y * firstDrift * 0.35,
        });
        return rotatePoint(deformed, yaw, pitch, roll);
      });
      const projectedNodes = rotatedNodes.map((point, index) =>
        projectPoint(point, index),
      );

      const hull = convexHull(projectedNodes);
      if (hull.length > 2) {
        context.beginPath();
        context.moveTo(hull[0].x, hull[0].y);
        hull.slice(1).forEach((point) => context.lineTo(point.x, point.y));
        context.closePath();
        context.fillStyle = volumeGradient ?? "rgba(30, 121, 63, 0.06)";
        context.fill();
      }

      const projectedFaces = faces
        .map((face) => ({
          points: face.map((index) => projectedNodes[index]),
          depth:
            face.reduce((sum, index) => sum + projectedNodes[index].depth, 0) /
            face.length,
        }))
        .sort((first, second) => first.depth - second.depth);
      projectedFaces.forEach((face) => {
        context.beginPath();
        context.moveTo(face.points[0].x, face.points[0].y);
        context.lineTo(face.points[1].x, face.points[1].y);
        context.lineTo(face.points[2].x, face.points[2].y);
        context.closePath();
        context.fillStyle = `rgba(94, 255, 145, ${0.006 + face.depth ** 3 * 0.045})`;
        context.fill();
      });

      const dynamicChords = previousChords.map((fromEdge, index) => {
        const toEdge = nextChords[index % nextChords.length];
        const startOnSphere = interpolateOnSphere(
          nodes[fromEdge.a],
          nodes[toEdge.a],
          morph,
        );
        const endOnSphere = interpolateOnSphere(
          nodes[fromEdge.b],
          nodes[toEdge.b],
          morph,
        );
        const startRotated = rotatePoint(startOnSphere, yaw, pitch, roll);
        const endRotated = rotatePoint(endOnSphere, yaw, pitch, roll);
        const start = projectPoint(startRotated, fromEdge.a);
        const end = projectPoint(endRotated, fromEdge.b);
        return {
          start,
          end,
          depth: clamp((startRotated.z + endRotated.z + 2) * 0.25),
          accent: fromEdge.accent || toEdge.accent,
          index,
        };
      });
      dynamicChords.sort((first, second) => first.depth - second.depth);

      const projectedSurface = surfaceEdges
        .map((edge, index) => ({
          start: projectedNodes[edge.a],
          end: projectedNodes[edge.b],
          depth:
            (projectedNodes[edge.a].depth + projectedNodes[edge.b].depth) * 0.5,
          accent: edge.accent,
          index,
        }))
        .sort((first, second) => first.depth - second.depth);

      context.globalCompositeOperation = "source-over";
      dynamicChords.forEach((edge) => drawEdge(edge, "chord"));
      projectedSurface.forEach((edge) => drawEdge(edge, "surface"));

      context.beginPath();
      if (hull.length > 1) {
        context.moveTo(hull[0].x, hull[0].y);
        hull.slice(1).forEach((point) => context.lineTo(point.x, point.y));
        context.closePath();
        context.lineWidth = 0.95;
        context.strokeStyle = "rgba(171, 255, 100, 0.34)";
        context.stroke();
      }

      [...projectedNodes]
        .sort((first, second) => first.depth - second.depth)
        .forEach((node) => {
          const radius =
            0.58 + node.depth * 1.85 + focusPulse * node.depth * 0.18;
          context.beginPath();
          context.arc(node.x, node.y, radius, 0, Math.PI * 2);
          context.fillStyle =
            node.index % 9 === 0
              ? `rgba(215, 255, 90, ${0.18 + node.depth * 0.78})`
              : `rgba(119, 255, 156, ${0.1 + node.depth * 0.7})`;
          context.fill();
        });

      if (!lowPower && !prefersReducedMotion) {
        dynamicChords.forEach((edge) => {
          if (edge.index % 5 !== 0) return;
          const travel = (now * 0.0002 + edge.index * 0.173) % 1;
          const x = edge.start.x + (edge.end.x - edge.start.x) * travel;
          const y = edge.start.y + (edge.end.y - edge.start.y) * travel;
          context.beginPath();
          context.arc(x, y, 0.9 + edge.depth * 1.15, 0, Math.PI * 2);
          context.fillStyle = `rgba(224, 255, 117, ${0.25 + edge.depth * 0.62})`;
          context.fill();
        });
      }
    };

    const animate = (now: number) => {
      if (destroyed) return;
      if (lastRaf) {
        const rafDuration = now - lastRaf;
        slowFrames = rafDuration > 25 ? slowFrames + 1 : Math.max(0, slowFrames - 1);
        if (!lowPower && slowFrames > 24) frameInterval = 1000 / 30;
      }
      lastRaf = now;
      if (now - lastFrame >= frameInterval) {
        lastFrame = now;
        drawSphere(now);
      }
      frame = window.requestAnimationFrame(animate);
    };

    const resizeCanvas = () => {
      const bounds = visual.getBoundingClientRect();
      width = bounds.width;
      height = bounds.height;
      const compactLayout = width < 720;
      centerX = width * (compactLayout ? 0.5 : 0.59);
      centerY = height * (compactLayout ? 0.48 : 0.44);
      sphereRadius = Math.min(
        width * (compactLayout ? 0.38 : 0.36),
        height * (compactLayout ? 0.31 : 0.39),
      );
      const pixelRatio = Math.min(
        window.devicePixelRatio || 1,
        lowPower ? 1 : 1.15,
      );
      canvas.width = Math.max(1, Math.round(width * pixelRatio));
      canvas.height = Math.max(1, Math.round(height * pixelRatio));
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      volumeGradient = context.createRadialGradient(
        centerX - sphereRadius * 0.18,
        centerY - sphereRadius * 0.2,
        sphereRadius * 0.08,
        centerX,
        centerY,
        sphereRadius * 1.08,
      );
      volumeGradient.addColorStop(0, "rgba(132, 255, 158, 0.095)");
      volumeGradient.addColorStop(0.58, "rgba(50, 173, 91, 0.047)");
      volumeGradient.addColorStop(1, "rgba(9, 58, 30, 0.006)");
      drawSphere(performance.now());
    };

    const updateAnimationState = () => {
      if (document.hidden || !inView || prefersReducedMotion) {
        if (frame) window.cancelAnimationFrame(frame);
        frame = 0;
      } else if (!frame) {
        lastRaf = 0;
        frame = window.requestAnimationFrame(animate);
      }
    };
    const handleVisibility = () => updateAnimationState();

    resizeCanvas();
    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(visual);
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      updateAnimationState();
    });
    visibilityObserver.observe(visual);
    document.addEventListener("visibilitychange", handleVisibility);
    updateAnimationState();

    return () => {
      destroyed = true;
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
      if (frame) window.cancelAnimationFrame(frame);
      context.clearRect(0, 0, width, height);
    };
  }, [theme]);

  const visibleArticles = useMemo(
    () =>
      filter === "全部"
        ? articles
        : articles.filter((article) => article.category === filter),
    [filter, articles],
  );

  const latestArticle = articles[0] ?? fallbackArticles[0];

  useEffect(() => {
    if (
      document.documentElement.dataset.motion === "lite" ||
      window.matchMedia("(pointer: coarse), (prefers-reduced-motion: reduce)")
        .matches
    ) {
      return;
    }

    const cards = Array.from(
      document.querySelectorAll<HTMLElement>("[data-tilt-card]"),
    );
    const cleanups = cards.map((card) => {
      let frame = 0;
      let pointerX = 0;
      let pointerY = 0;

      const render = () => {
        frame = 0;
        const bounds = card.getBoundingClientRect();
        const normalizedX = Math.min(
          1,
          Math.max(-1, ((pointerX - bounds.left) / bounds.width - 0.5) * 2),
        );
        const normalizedY = Math.min(
          1,
          Math.max(-1, ((pointerY - bounds.top) / bounds.height - 0.5) * 2),
        );
        card.style.setProperty("--card-tilt-x", `${normalizedY * -3.2}deg`);
        card.style.setProperty("--card-tilt-y", `${normalizedX * 4.2}deg`);
        card.style.setProperty("--card-glow-x", `${(normalizedX + 1) * 50}%`);
        card.style.setProperty("--card-glow-y", `${(normalizedY + 1) * 50}%`);
      };
      const handleMove = (event: globalThis.PointerEvent) => {
        if (event.pointerType === "touch") return;
        pointerX = event.clientX;
        pointerY = event.clientY;
        if (!frame) frame = window.requestAnimationFrame(render);
      };
      const handleLeave = () => {
        if (frame) window.cancelAnimationFrame(frame);
        frame = 0;
        card.style.setProperty("--card-tilt-x", "0deg");
        card.style.setProperty("--card-tilt-y", "0deg");
        card.style.setProperty("--card-glow-x", "50%");
        card.style.setProperty("--card-glow-y", "50%");
      };

      card.addEventListener("pointermove", handleMove, { passive: true });
      card.addEventListener("pointerleave", handleLeave);
      return () => {
        card.removeEventListener("pointermove", handleMove);
        card.removeEventListener("pointerleave", handleLeave);
        if (frame) window.cancelAnimationFrame(frame);
      };
    });

    return () => cleanups.forEach((cleanup) => cleanup());
  }, [filter, articles.length]);

  const articleSourceStyle = (
    articleId: string,
    origin: ArticleOrigin,
  ): CSSProperties | undefined =>
    transitionArticleId === articleId &&
    articleOrigin === origin &&
    selectedArticle?.id !== articleId
      ? { viewTransitionName: "article-shared" }
      : undefined;

  const articleDialogStyle: CSSProperties | undefined =
    transitionArticleId && selectedArticle?.id === transitionArticleId
      ? { viewTransitionName: "article-shared" }
      : undefined;

  const applyTheme = (nextTheme: Theme) => {
    document.documentElement.dataset.theme = nextTheme;
    setTheme(nextTheme);
  };

  const toggleTheme = (event: MouseEvent<HTMLButtonElement>) => {
    if (transitioning) return;

    const nextTheme: Theme = theme === "day" ? "night" : "day";
    if (nextTheme === "night") setNightVisualReady(true);
    const rect = event.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const liteMotion =
      reducedMotion ||
      document.documentElement.dataset.motion === "lite" ||
      window.matchMedia("(max-width: 940px), (pointer: coarse)").matches;

    document.documentElement.style.setProperty("--switch-x", `${x}px`);
    document.documentElement.style.setProperty("--switch-y", `${y}px`);
    document.documentElement.dataset.switching = nextTheme;
    setTransitionTarget(nextTheme);
    setTransitioning(true);

    const finishTransition = () => {
      setTransitioning(false);
      delete document.documentElement.dataset.switching;
    };

    const switchDelay = reducedMotion ? 0 : liteMotion ? 100 : 160;
    const totalDuration = reducedMotion ? 160 : liteMotion ? 390 : 900;
    window.setTimeout(() => applyTheme(nextTheme), switchDelay);
    window.setTimeout(finishTransition, totalDuration);
  };

  const openArticle = (article: Article, origin: ArticleOrigin) => {
    const transitionDocument = document as ViewTransitionDocument;
    const richMotion =
      document.documentElement.dataset.motion !== "lite" &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!richMotion || !transitionDocument.startViewTransition) {
      setArticleOrigin(origin);
      setSelectedArticle(article);
      window.setTimeout(() => articleDialog.current?.showModal(), 0);
      return;
    }

    flushSync(() => {
      setArticleOrigin(origin);
      setTransitionArticleId(article.id);
    });
    const transition = transitionDocument.startViewTransition(() => {
      flushSync(() => setSelectedArticle(article));
      articleDialog.current?.showModal();
    });
    void transition.finished
      .catch(() => undefined)
      .finally(() => setTransitionArticleId(null));
  };

  const closeArticle = () => {
    if (!selectedArticle) return;
    const transitionDocument = document as ViewTransitionDocument;
    const richMotion =
      document.documentElement.dataset.motion !== "lite" &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!richMotion || !transitionDocument.startViewTransition) {
      articleDialog.current?.close();
      setSelectedArticle(null);
      return;
    }

    flushSync(() => setTransitionArticleId(selectedArticle.id));
    const transition = transitionDocument.startViewTransition(() => {
      articleDialog.current?.close();
      flushSync(() => setSelectedArticle(null));
    });
    void transition.finished
      .catch(() => undefined)
      .finally(() => setTransitionArticleId(null));
  };

  const handleSectionNavigation = (event: MouseEvent<HTMLAnchorElement>) => {
    const href = event.currentTarget.getAttribute("href");
    if (!href?.startsWith("#")) return;

    const targetId = decodeURIComponent(href.slice(1)) || "top";
    const target = document.getElementById(targetId);
    if (!target) return;

    event.preventDefault();
    setMenuOpen(false);
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const liteMotion =
      reducedMotion || document.documentElement.dataset.motion === "lite";

    if (!liteMotion) {
      if (sectionJumpTimer.current) {
        window.clearTimeout(sectionJumpTimer.current);
      }
      const label =
        event.currentTarget.dataset.transitionLabel || targetId.toUpperCase();
      setSectionJump({ key: Date.now(), label });
      sectionJumpTimer.current = window.setTimeout(
        () => setSectionJump(null),
        780,
      );
    }

    window.requestAnimationFrame(() => {
      target.scrollIntoView({
        behavior: reducedMotion ? "auto" : "smooth",
        block: "start",
      });
    });
    window.history.replaceState(null, "", href);
  };

  return (
    <main
      id="top"
      className={`site-shell theme-${theme} ${transitioning ? "is-switching" : ""}`}
    >
      <span className="page-scroll-progress" aria-hidden="true" />
      <aside className="journey-rail" aria-hidden="true">
        <span className="journey-track" />
        <div>
          {navItems.map((item, index) => {
            const sectionId = item.href.slice(1);
            return (
              <span
                className={activeSection === sectionId ? "is-active" : ""}
                key={item.href}
              >
                {String(index + 1).padStart(2, "0")}
              </span>
            );
          })}
        </div>
        <small>{activeSection.toUpperCase()}</small>
      </aside>

      {sectionJump && (
        <div
          key={sectionJump.key}
          className="section-jump-transition"
          aria-hidden="true"
        >
          <span className="section-jump-veil" />
          <span className="section-jump-line" />
          <span className="section-jump-code">
            {"// "}{sectionJump.label}
          </span>
        </div>
      )}

      <div
        className={`theme-transition ${transitioning ? "is-active" : ""} to-${transitionTarget}`}
        aria-hidden="true"
      >
        <span className="transition-flash" />
        <span className="transition-ring ring-one" />
        <span className="transition-ring ring-two" />
        <span className="transition-sweep" />
        <span className="transition-core">{transitionTarget === "night" ? "M3" : "EI"}</span>
        <span className="transition-shard shard-1" />
        <span className="transition-shard shard-2" />
        <span className="transition-shard shard-3" />
        <span className="transition-shard shard-4" />
        <span className="transition-shard shard-5" />
        <span className="transition-shard shard-6" />
      </div>

      <header className="site-header">
        <a
          className="brand"
          href="#top"
          data-transition-label="TOP"
          onClick={handleSectionNavigation}
        >
          <span className="brand-mark" aria-hidden="true">
            <span />
          </span>
          <span className="brand-copy">
            <strong>{siteSettings.siteTitle}</strong>
            <small>{"// DIMENSION"}</small>
          </span>
        </a>

        <button
          className={`menu-toggle ${menuOpen ? "is-open" : ""}`}
          type="button"
          aria-label={menuOpen ? "关闭导航" : "打开导航"}
          aria-expanded={menuOpen}
          aria-controls="main-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span />
          <span />
        </button>

        <nav id="main-navigation" className={`site-nav ${menuOpen ? "is-open" : ""}`} aria-label="主导航">
          {navItems.map((item, index) => (
            <a
              href={item.href}
              key={item.href}
              className={activeSection === item.href.slice(1) ? "is-active" : ""}
              aria-current={activeSection === item.href.slice(1) ? "page" : undefined}
              data-transition-label={item.href.slice(1).toUpperCase()}
              onClick={handleSectionNavigation}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              {item.label}
            </a>
          ))}
        </nav>

        <button
          className="theme-toggle"
          type="button"
          onClick={toggleTheme}
          onPointerEnter={() => setNightVisualReady(true)}
          onFocus={() => setNightVisualReady(true)}
          disabled={transitioning}
          aria-label={
            theme === "day"
              ? "DAY NIGHT 主题切换：切换到 Mon3tr 黑夜主题"
              : "DAY NIGHT 主题切换：切换到伊蕾娜白昼主题"
          }
          aria-pressed={theme === "night"}
        >
          <span className="toggle-track" aria-hidden="true">
            <span className="toggle-thumb" />
            <span className="toggle-option toggle-day">
              <span className="toggle-symbol">☼</span>
              <span className="toggle-option-label">DAY</span>
            </span>
            <span className="toggle-option toggle-night">
              <span className="toggle-symbol toggle-m3">M3</span>
              <span className="toggle-option-label">NIGHT</span>
            </span>
          </span>
        </button>
      </header>

      <section
        ref={heroSection}
        className="hero"
        aria-labelledby="hero-title"
        data-section="top"
        data-section-state={activeSection === "top" ? "active" : undefined}
      >
        <div className="hero-ambient" aria-hidden="true">
          <span className="ambient-grid" />
          <span className="ambient-wave" />
          <span className="floating-page page-one" />
          <span className="floating-page page-two" />
          <span className="crystal crystal-one" />
          <span className="crystal crystal-two" />
          <span className="crystal crystal-three" />
        </div>

        <canvas
          ref={rhodesParticleCanvas}
          className="rhodes-particle-logo"
          aria-hidden="true"
        />

        <div className="hero-copy">
          <div className="hero-kicker">
            <span className="kicker-dot" />
            <span>{theme === "day" ? "DAYLIGHT / ELAINA" : "NIGHTFALL / MON3TR"}</span>
            <span className="kicker-code">{theme === "day" ? "EI-017" : "M3-010"}</span>
          </div>
          <h1 id="hero-title">
            {theme === "day" ? (
              <>
                在旅途与电路之间，
                <br />
                记录我的热爱。
              </>
            ) : (
              <>
                在源石与电路之间，
                <br />
                点亮每一次探索。
              </>
            )}
          </h1>
          <p className="hero-description">
            {siteSettings.bio} 把拆解问题的过程，写成可以反复查阅的记录。
          </p>
          <div className="hero-actions">
            <a
              className="button button-primary"
              href="#articles"
              data-transition-label="ARTICLES"
              onClick={handleSectionNavigation}
            >
              <span className="button-spark" aria-hidden="true">✦</span>
              进入博客
            </a>
            <a
              className="button button-secondary"
              href="#lab"
              data-transition-label="LAB NOTES"
              onClick={handleSectionNavigation}
            >
              查看实验记录
              <span aria-hidden="true">↗</span>
            </a>
          </div>
          <ul className="interest-tags" aria-label="兴趣领域">
            <li><span>◈</span> ELECTRONICS</li>
            <li><span>⌁</span> OVERCLOCKING</li>
            <li><span>✧</span> COSPLAY</li>
            <li><span>◇</span> ACG</li>
          </ul>
        </div>

        <div ref={heroVisual} className="hero-visual" aria-hidden="true">
          <div className="hero-sigil sigil-day">
            <span className="magic-aura" />
            <svg className="anime-magic" viewBox="0 0 100 100" focusable="false">
              <g className="magic-outer-layer">
                <circle className="magic-circle magic-circle-outer" cx="50" cy="50" r="47" />
                <circle className="magic-circle magic-circle-runes" cx="50" cy="50" r="43" />
                <circle className="magic-circle magic-circle-main" cx="50" cy="50" r="38" />
                <path className="magic-arc magic-arc-one" pathLength="1" d="M 14 33 A 40 40 0 0 1 70 15" />
                <path className="magic-arc magic-arc-two" pathLength="1" d="M 86 67 A 40 40 0 0 1 30 85" />
                <circle className="magic-seal" cx="50" cy="5" r="3.4" />
                <circle className="magic-seal" cx="95" cy="50" r="3.4" />
                <circle className="magic-seal" cx="50" cy="95" r="3.4" />
                <circle className="magic-seal" cx="5" cy="50" r="3.4" />
                <g className="magic-rune-icon magic-icon-star" transform="translate(50 5)">
                  <path d="M0 -2.2 L0.58 -0.58 L2.2 0 L0.58 0.58 L0 2.2 L-0.58 0.58 L-2.2 0 L-0.58 -0.58 Z" />
                </g>
                <g className="magic-rune-icon magic-icon-moon" transform="translate(95 50)">
                  <path transform="translate(0.68 0)" d="M0.9 -2.05 A2.25 2.25 0 1 0 0.9 2.05 A1.72 1.72 0 0 1 0.9 -2.05 Z" />
                </g>
                <g className="magic-rune-icon magic-icon-sun" transform="translate(50 95)">
                  <circle cx="0" cy="0" r="0.95" />
                  <path d="M0 -2.45 V-1.55 M0 1.55 V2.45 M-2.45 0 H-1.55 M1.55 0 H2.45 M-1.73 -1.73 L-1.1 -1.1 M1.1 1.1 L1.73 1.73 M1.73 -1.73 L1.1 -1.1 M-1.1 1.1 L-1.73 1.73" />
                </g>
                <g className="magic-rune-icon magic-icon-spark" transform="translate(5 50)">
                  <path d="M0 -2.15 C0.22 -0.62 0.62 -0.22 2.15 0 C0.62 0.22 0.22 0.62 0 2.15 C-0.22 0.62 -0.62 0.22 -2.15 0 C-0.62 -0.22 -0.22 -0.62 0 -2.15 Z" />
                </g>
                <text className="magic-rune magic-rune-small" x="76" y="19">ᚨ</text>
                <text className="magic-rune magic-rune-small" x="82" y="82">ᛇ</text>
                <text className="magic-rune magic-rune-small" x="18" y="82">ᚱ</text>
                <text className="magic-rune magic-rune-small" x="24" y="19">ᚹ</text>
              </g>
              <g className="magic-inner-layer">
                <circle className="magic-circle magic-circle-inner" cx="50" cy="50" r="31" />
                <polygon className="magic-hexagram" points="50,18 78,67 22,67" />
                <polygon className="magic-hexagram" points="50,82 22,33 78,33" />
                <circle className="magic-circle magic-circle-core" cx="50" cy="50" r="20" />
                <path className="magic-diamond" d="M50 28 L72 50 L50 72 L28 50 Z" />
                <path className="magic-cross" d="M50 19 V81 M19 50 H81" />
              </g>
              <g className="magic-core-layer">
                <circle className="magic-core-halo" cx="50" cy="50" r="10" />
                <path className="magic-core-star" d="M50 38 L54 46 L63 50 L54 54 L50 63 L46 54 L37 50 L46 46 Z" />
                <circle className="magic-core-dot" cx="50" cy="50" r="2.4" />
              </g>
            </svg>
            <span className="sigil-label day-label-one">ASHEN WITCH / 017</span>
            <span className="sigil-label day-label-two">TRAVEL RECORD / ACTIVE</span>
          </div>

          <div className="hero-sigil sigil-night" aria-hidden="true">
            <span className="sigil-label night-label-one">ORIGINIUM / REACTIVE</span>
            <span className="sigil-label night-label-two">RHODES / TERMINAL 03</span>
          </div>
          <canvas
            ref={wireSphereCanvas}
            className="wire-sphere-canvas"
            aria-hidden="true"
          />
          <canvas ref={trailCanvas} className="sigil-interaction" />
          <picture>
            <source
              media="(max-width: 560px)"
              type="image/avif"
              srcSet="/elaina-user-800.avif"
            />
            <source
              type="image/avif"
              srcSet="/elaina-user-640.avif 640w, /elaina-user-960.avif 960w, /elaina-user-1280.avif 1280w"
              sizes="(max-width: 560px) 158vw, (max-width: 940px) 128vw, (max-width: 1180px) 62vw, 78vw"
            />
            <source
              media="(max-width: 560px)"
              type="image/webp"
              srcSet="/elaina-user-800.webp"
            />
            <source
              type="image/webp"
              srcSet="/elaina-user-640.webp 640w, /elaina-user-960.webp 960w, /elaina-user-1280.webp 1280w"
              sizes="(max-width: 560px) 158vw, (max-width: 940px) 128vw, (max-width: 1180px) 62vw, 78vw"
            />
            <img
              className="hero-character character-elaina"
              src="/elaina-user-960.webp"
              alt=""
              width={1600}
              height={1438}
              fetchPriority="high"
              decoding="async"
            />
          </picture>
          {nightVisualReady && (
            <picture>
              <source
                type="image/avif"
                srcSet="/mon3tr-hero-480.avif 480w, /mon3tr-hero-720.avif 720w, /mon3tr-hero-960.avif 960w"
                sizes="(max-width: 560px) 70vw, (max-width: 940px) 49vw, 50vw"
              />
              <source
                type="image/webp"
                srcSet="/mon3tr-hero-480.webp 480w, /mon3tr-hero-720.webp 720w, /mon3tr-hero.webp 1024w"
                sizes="(max-width: 560px) 70vw, (max-width: 940px) 49vw, 50vw"
              />
              <img
                className="hero-character character-mon3tr"
                src="/mon3tr-hero-720.webp"
                alt=""
                width={1024}
                height={1536}
                loading="lazy"
                decoding="async"
              />
            </picture>
          )}
        </div>

        <button
          className="latest-card"
          type="button"
          style={articleSourceStyle(latestArticle.id, "latest")}
          onClick={() => openArticle(latestArticle, "latest")}
        >
          <span className="latest-meta">
            <span>✥ 最新文章</span>
            <span>{latestArticle.date}</span>
          </span>
          <strong>{latestArticle.title}</strong>
          <span className="latest-arrow" aria-hidden="true">→</span>
        </button>
        <a
          className="scroll-cue"
          href="#articles"
          aria-label="SCROLL，向下浏览文章"
          data-transition-label="ARTICLES"
          onClick={handleSectionNavigation}
        >
          <span />
          SCROLL
        </a>
      </section>

      <section
        id="articles"
        className="content-section articles-section"
        data-section="articles"
        data-section-state={activeSection === "articles" ? "active" : undefined}
      >
        <div className="section-heading" data-reveal="up">
          <div>
            <span className="section-index">01 / ARTICLES</span>
            <h2>技术文章</h2>
          </div>
          <p>从原理出发，也保留每一次调试中真正有用的细节。</p>
        </div>

        <div
          className="filter-bar"
          role="group"
          aria-label="文章分类筛选"
          data-reveal="up"
        >
          {filters.map((item) => (
            <button
              key={item}
              type="button"
              className={filter === item ? "is-active" : ""}
              aria-pressed={filter === item}
              onClick={() => setFilter(item)}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="article-grid" aria-live="polite" data-reveal="up">
          {visibleArticles.map((article, index) => (
            <article
              className="article-card"
              key={article.id}
              data-tilt-card
              style={articleSourceStyle(article.id, "card")}
            >
              <span className="card-specular" aria-hidden="true" />
              <div className="article-card-top">
                <span>{article.code}</span>
                <span>{article.date}</span>
              </div>
              <div className={`article-visual visual-${(index % 4) + 1}`} aria-hidden="true">
                <span className="visual-chip" />
                <span className="visual-wave" />
                <span className="visual-number">{String(index + 1).padStart(2, "0")}</span>
              </div>
              <div className="article-body">
                <span className="article-category">{article.category}</span>
                <h3>{article.title}</h3>
                <p>{article.summary}</p>
                <div className="article-footer">
                  <div>
                    {article.tags.map((tag) => <span key={tag}>#{tag}</span>)}
                  </div>
                  <button type="button" onClick={() => openArticle(article, "card")}>
                    阅读 <span aria-hidden="true">↗</span>
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section
        id="lab"
        className="content-section lab-section"
        data-section="lab"
        data-section-state={activeSection === "lab" ? "active" : undefined}
      >
        <div className="section-heading" data-reveal="up">
          <div>
            <span className="section-index">02 / LAB NOTES</span>
            <h2>实验与超频笔记</h2>
          </div>
          <p>不只展示结果，也记录失败参数、判断过程和下一步。</p>
        </div>
        <div className="lab-console" data-reveal="up">
          <div className="console-header">
            <span><i /> MOZELLE_LAB</span>
            <span>STATUS / ONLINE</span>
          </div>
          <div className="lab-list">
            {labNotes.map((note) => (
              <article key={note.index}>
                <span className="lab-index">{note.index}</span>
                <div>
                  <h3>{note.title}</h3>
                  <p>{note.detail}</p>
                </div>
                <strong>{note.value}</strong>
                <span className="lab-arrow" aria-hidden="true">↗</span>
              </article>
            ))}
          </div>
          <div className="console-footer">
            <span>LAST SYNC / 2026.07.12</span>
            <span className="console-line" />
            <span>3 ACTIVE TOPICS</span>
          </div>
        </div>
      </section>

      <section
        id="collection"
        className="content-section collection-section"
        data-section="collection"
        data-section-state={activeSection === "collection" ? "active" : undefined}
      >
        <div className="section-heading" data-reveal="up">
          <div>
            <span className="section-index">03 / DIMENSION</span>
            <h2>次元收藏</h2>
          </div>
          <p>角色、游戏与 Cosplay，是技术之外同样认真保存的世界。</p>
        </div>
        <div className="collection-grid" data-reveal="up">
          {collections.map((item) => (
            <article
              className={`collection-card ${item.className}`}
              key={item.number}
              data-tilt-card
            >
              <span className="card-specular" aria-hidden="true" />
              <span className="collection-number">{item.number}</span>
              <div className="collection-art" aria-hidden="true">
                <span className="collection-orbit" />
                <span className="collection-sigil" />
              </div>
              <div className="collection-copy">
                <span>{item.subtitle}</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section
        id="about"
        className="content-section about-section"
        data-section="about"
        data-section-state={activeSection === "about" ? "active" : undefined}
      >
        <div className="about-code" aria-hidden="true" data-reveal="left">
          <span>ABOUT / MOZELLE</span>
          <strong>EE</strong>
          <span>STUDENT · MAKER · PLAYER</span>
        </div>
        <div className="about-copy" data-reveal="right">
          <span className="section-index">04 / ABOUT</span>
          <h2>你好，我是 Mozelle。</h2>
          <p>{siteSettings.bio}</p>
          <p>
            这个博客不是一份完成的说明书，而是一张持续生长的地图：保存走过的弯路，也标记下一次想抵达的地方。
          </p>
          <a
            href="#articles"
            className="text-link"
            data-transition-label="ARTICLES"
            onClick={handleSectionNavigation}
          >
            CONTINUE READING <span aria-hidden="true">↗</span>
          </a>
        </div>
      </section>

      <footer className="site-footer" data-reveal="up">
        <a
          className="brand footer-brand"
          href="#top"
          data-transition-label="TOP"
          onClick={handleSectionNavigation}
        >
          <span className="brand-mark" aria-hidden="true"><span /></span>
          <span className="brand-copy"><strong>{siteSettings.siteTitle}</strong><small>{"// DIMENSION"}</small></span>
        </a>
        <p>{siteSettings.tagline}</p>
        <div>
          <span>© 2026 MOZELLE</span>
          <a href="/admin">管理后台 / CONTROL ↗</a>
          <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            BACK TO TOP ↑
          </button>
        </div>
      </footer>

      <dialog
        ref={articleDialog}
        className="article-dialog"
        aria-labelledby={selectedArticle ? "article-dialog-title" : undefined}
        onClose={() => setSelectedArticle(null)}
        onCancel={(event) => {
          event.preventDefault();
          closeArticle();
        }}
      >
        {selectedArticle && (
          <article style={articleDialogStyle}>
            <button className="dialog-close" type="button" onClick={closeArticle} aria-label="关闭文章">
              <span />
              <span />
            </button>
            <div className="dialog-meta">
              <span>{selectedArticle.code}</span>
              <span>{selectedArticle.date}</span>
              <span>{selectedArticle.readTime}</span>
            </div>
            <h2 id="article-dialog-title">{selectedArticle.title}</h2>
            <p className="dialog-lead">{selectedArticle.summary}</p>
            <div className="dialog-divider"><span /></div>
            {selectedArticle.contentHtml ? (
              <div
                className="dialog-content article-rich-content"
                dangerouslySetInnerHTML={{ __html: selectedArticle.contentHtml }}
              />
            ) : (
              <div className="dialog-content">
                {selectedArticle.content.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
            )}
            <div className="dialog-tags">
              {selectedArticle.tags.map((tag) => <span key={tag}>#{tag}</span>)}
            </div>
          </article>
        )}
      </dialog>
    </main>
  );
}
