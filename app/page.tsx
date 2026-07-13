"use client";

import Image from "next/image";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from "react";

type Theme = "day" | "night";

const navItems = [
  { label: "首页", href: "#top" },
  { label: "技术文章", href: "#articles" },
  { label: "超频笔记", href: "#lab" },
  { label: "次元收藏", href: "#collection" },
  { label: "关于", href: "#about" },
];

const filters = ["全部", "电子", "超频", "硬件", "游戏与次元"] as const;
type Filter = (typeof filters)[number];

const articles = [
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [transitionTarget, setTransitionTarget] = useState<Theme>("night");
  const [selectedArticle, setSelectedArticle] = useState<
    (typeof articles)[number] | null
  >(null);
  const articleDialog = useRef<HTMLDialogElement>(null);
  const heroVisual = useRef<HTMLDivElement>(null);
  const trailCanvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
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
    const visual = heroVisual.current;
    const canvas = trailCanvas.current;
    if (
      !visual ||
      !canvas ||
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

  const visibleArticles = useMemo(
    () =>
      filter === "全部"
        ? articles
        : articles.filter((article) => article.category === filter),
    [filter],
  );

  const applyTheme = (nextTheme: Theme) => {
    document.documentElement.dataset.theme = nextTheme;
    setTheme(nextTheme);
  };

  const toggleTheme = (event: MouseEvent<HTMLButtonElement>) => {
    if (transitioning) return;

    const nextTheme: Theme = theme === "day" ? "night" : "day";
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

  const openArticle = (article: (typeof articles)[number]) => {
    setSelectedArticle(article);
    window.setTimeout(() => articleDialog.current?.showModal(), 0);
  };

  const closeArticle = () => {
    articleDialog.current?.close();
    setSelectedArticle(null);
  };

  return (
    <main
      id="top"
      className={`site-shell theme-${theme} ${transitioning ? "is-switching" : ""}`}
    >
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
        <a className="brand" href="#top" aria-label="返回首页">
          <span className="brand-mark" aria-hidden="true">
            <span />
          </span>
          <span className="brand-copy">
            <strong>MOZELLE</strong>
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
              className={index === 0 ? "is-active" : ""}
              aria-current={index === 0 ? "page" : undefined}
              onClick={() => setMenuOpen(false)}
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
          disabled={transitioning}
          aria-label={theme === "day" ? "切换到 Mon3tr 黑夜主题" : "切换到伊蕾娜白昼主题"}
          aria-pressed={theme === "night"}
        >
          <span className="toggle-track" aria-hidden="true">
            <span className="toggle-day">☼</span>
            <span className="toggle-night">M3</span>
            <span className="toggle-orb" />
          </span>
          <span className="toggle-label">{theme === "day" ? "DAY" : "NIGHT"}</span>
        </button>
      </header>

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-ambient" aria-hidden="true">
          <span className="ambient-grid" />
          <span className="ambient-wave" />
          <span className="floating-page page-one" />
          <span className="floating-page page-two" />
          <span className="crystal crystal-one" />
          <span className="crystal crystal-two" />
          <span className="crystal crystal-three" />
        </div>

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
            电子专业学生的个人博客，分享硬件、超频、游戏、Cosplay 与二次元。
            把拆解问题的过程，写成可以反复查阅的记录。
          </p>
          <div className="hero-actions">
            <a className="button button-primary" href="#articles">
              <span className="button-spark" aria-hidden="true">✦</span>
              进入博客
            </a>
            <a className="button button-secondary" href="#lab">
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
                <text className="magic-rune" x="50" y="7.1">✦</text>
                <text className="magic-rune" x="94.8" y="52.1">☽</text>
                <text className="magic-rune" x="50" y="97.1">◇</text>
                <text className="magic-rune" x="5" y="52.1">✧</text>
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

          <div className="hero-sigil sigil-night">
            <span className="originium-shell">
              <span className="originium-surface">
                <span className="originium-facet facet-one" />
                <span className="originium-facet facet-two" />
                <span className="originium-facet facet-three" />
                <span className="originium-heart" />
              </span>
            </span>
            <span className="mesh-scene">
              <span className="mesh-rotor">
                <svg className="mesh-depth-plane mesh-plane-a" viewBox="0 0 100 100" focusable="false">
                  <polygon points="50,5 72,11 88,29 93,50 84,72 63,91 37,91 16,72 7,50 12,29 28,11" />
                  <polyline points="50,5 50,95" />
                  <polyline points="12,29 88,71" />
                  <polyline points="7,50 93,50" />
                  <polyline points="16,72 84,28" />
                  <polygon points="50,18 72,34 72,66 50,82 28,66 28,34" />
                </svg>
                <svg className="mesh-depth-plane mesh-plane-b" viewBox="0 0 100 100" focusable="false">
                  <polygon points="50,7 75,17 91,40 88,65 68,87 40,93 17,76 8,50 18,23" />
                  <polyline points="18,23 88,65" />
                  <polyline points="8,50 91,40" />
                  <polyline points="17,76 75,17" />
                  <polyline points="40,93 50,7" />
                  <polygon points="50,22 70,38 66,64 44,78 27,57 31,34" />
                </svg>
                <svg className="ark-mesh" viewBox="0 0 100 100" focusable="false">
              <g className="mesh-orbiting">
                <g className="mesh-shell">
                  <polygon points="50,4 72,10 88,24 96,48 90,70 73,89 47,96 25,89 9,70 4,48 10,27 28,10" />
                  <polygon points="50,13 72,19 83,35 82,58 70,77 48,84 28,76 16,57 17,37 33,19" />
                  <polyline points="50,4 50,13 50,20 58,68 70,77 73,89" />
                  <polyline points="28,10 33,19 34,31 28,50 28,76 25,89" />
                  <polyline points="72,10 72,19 66,31 70,51 82,58 90,70" />
                  <polyline points="10,27 17,37 28,50 39,69 48,84 47,96" />
                  <polyline points="88,24 83,35 70,51 58,68 48,84 25,89" />
                </g>
                <g className="mesh-nodes mesh-nodes-outer">
                  <circle cx="50" cy="4" r="1.1" /><circle cx="72" cy="10" r="1.1" />
                  <circle cx="88" cy="24" r="1.1" /><circle cx="96" cy="48" r="1.1" />
                  <circle cx="90" cy="70" r="1.1" /><circle cx="73" cy="89" r="1.1" />
                  <circle cx="47" cy="96" r="1.1" /><circle cx="25" cy="89" r="1.1" />
                  <circle cx="9" cy="70" r="1.1" /><circle cx="4" cy="48" r="1.1" />
                  <circle cx="10" cy="27" r="1.1" /><circle cx="28" cy="10" r="1.1" />
                </g>
              </g>
              <g className="mesh-lattice">
                <polygon points="50,20 66,31 70,51 58,68 39,69 28,50 34,31" />
                <polyline points="4,48 28,50 50,50 70,51 96,48" />
                <polyline points="10,27 34,31 66,31 88,24" />
                <polyline points="9,70 39,69 58,68 90,70" />
                <polyline points="28,10 50,20 72,10 66,31 83,35 96,48" />
                <polyline points="4,48 17,37 33,19 50,4 72,19 88,24" />
                <polyline points="9,70 28,50 50,20 70,51 90,70" />
                <polyline points="25,89 39,69 50,50 66,31 88,24" />
                <polyline points="10,27 28,50 58,68 73,89" />
                <g className="mesh-nodes mesh-nodes-inner">
                  <circle cx="34" cy="31" r="0.9" /><circle cx="66" cy="31" r="0.9" />
                  <circle cx="70" cy="51" r="0.9" /><circle cx="58" cy="68" r="0.9" />
                  <circle cx="39" cy="69" r="0.9" /><circle cx="28" cy="50" r="0.9" />
                </g>
              </g>
                </svg>
              </span>
            </span>
            <span className="rhodes-emblem">
              <Image
                className="rhodes-logo-image"
                src="/rhodes-island-logo.webp"
                alt=""
                width={640}
                height={640}
                unoptimized
              />
            </span>
            <span className="sigil-label night-label-one">ORIGINIUM / REACTIVE</span>
            <span className="sigil-label night-label-two">RHODES / TERMINAL 03</span>
          </div>
          <canvas ref={trailCanvas} className="sigil-interaction" />
          <Image
            className="hero-character character-elaina"
            src="/elaina-user.webp"
            alt=""
            width={1600}
            height={1438}
            priority
            decoding="async"
            unoptimized
          />
          <Image
            className="hero-character character-mon3tr"
            src="/mon3tr-hero.webp"
            alt=""
            width={1024}
            height={1536}
            priority
            decoding="async"
            unoptimized
          />
        </div>

        <button
          className="latest-card"
          type="button"
          onClick={() => openArticle(articles[0])}
          aria-label="阅读最新文章：DDR5 超频：从电压、时序到稳定性"
        >
          <span className="latest-meta">
            <span>✥ 最新文章</span>
            <span>2026.07.12</span>
          </span>
          <strong>DDR5 超频：从电压、时序到稳定性</strong>
          <span className="latest-arrow" aria-hidden="true">→</span>
        </button>
        <a className="scroll-cue" href="#articles" aria-label="向下浏览文章">
          <span />
          SCROLL
        </a>
      </section>

      <section id="articles" className="content-section articles-section">
        <div className="section-heading">
          <div>
            <span className="section-index">01 / ARTICLES</span>
            <h2>技术文章</h2>
          </div>
          <p>从原理出发，也保留每一次调试中真正有用的细节。</p>
        </div>

        <div className="filter-bar" role="group" aria-label="文章分类筛选">
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

        <div className="article-grid" aria-live="polite">
          {visibleArticles.map((article, index) => (
            <article className="article-card" key={article.id}>
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
                  <button type="button" onClick={() => openArticle(article)}>
                    阅读 <span aria-hidden="true">↗</span>
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="lab" className="content-section lab-section">
        <div className="section-heading">
          <div>
            <span className="section-index">02 / LAB NOTES</span>
            <h2>实验与超频笔记</h2>
          </div>
          <p>不只展示结果，也记录失败参数、判断过程和下一步。</p>
        </div>
        <div className="lab-console">
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

      <section id="collection" className="content-section collection-section">
        <div className="section-heading">
          <div>
            <span className="section-index">03 / DIMENSION</span>
            <h2>次元收藏</h2>
          </div>
          <p>角色、游戏与 Cosplay，是技术之外同样认真保存的世界。</p>
        </div>
        <div className="collection-grid">
          {collections.map((item) => (
            <article className={`collection-card ${item.className}`} key={item.number}>
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

      <section id="about" className="content-section about-section">
        <div className="about-code" aria-hidden="true">
          <span>ABOUT / MOZELLE</span>
          <strong>EE</strong>
          <span>STUDENT · MAKER · PLAYER</span>
        </div>
        <div className="about-copy">
          <span className="section-index">04 / ABOUT</span>
          <h2>你好，我是 Mozelle。</h2>
          <p>
            我是一名电子专业学生，喜欢把复杂的硬件问题拆开、验证，再用自己的语言重新讲清楚。
            这里既有电路与超频的技术记录，也有游戏、二次元和 Cosplay 带来的灵感。
          </p>
          <p>
            这个博客不是一份完成的说明书，而是一张持续生长的地图：保存走过的弯路，也标记下一次想抵达的地方。
          </p>
          <a href="#articles" className="text-link">
            CONTINUE READING <span aria-hidden="true">↗</span>
          </a>
        </div>
      </section>

      <footer className="site-footer">
        <a className="brand footer-brand" href="#top">
          <span className="brand-mark" aria-hidden="true"><span /></span>
          <span className="brand-copy"><strong>MOZELLE</strong><small>{"// DIMENSION"}</small></span>
        </a>
        <p>在旅途与源石之间，持续记录。</p>
        <div>
          <span>© 2026 MOZELLE</span>
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
          <article>
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
            <div className="dialog-content">
              {selectedArticle.content.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </div>
            <div className="dialog-tags">
              {selectedArticle.tags.map((tag) => <span key={tag}>#{tag}</span>)}
            </div>
          </article>
        )}
      </dialog>
    </main>
  );
}
