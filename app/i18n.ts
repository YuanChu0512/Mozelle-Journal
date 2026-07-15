import type { Article, Filter } from "./article-data";

export type Language = "zh" | "en";

type ArticleTranslation = Pick<Article, "title" | "summary" | "tags" | "content">;

export const categoryLabels: Record<Language, Record<Filter, string>> = {
  zh: {
    全部: "全部",
    电子: "电子",
    超频: "超频",
    硬件: "硬件",
    游戏与次元: "游戏与次元",
  },
  en: {
    全部: "All",
    电子: "Electronics",
    超频: "Overclocking",
    硬件: "Hardware",
    游戏与次元: "Games & ACG",
  },
};

export const homeCopy = {
  zh: {
    nav: ["首页", "技术文章", "超频笔记", "次元收藏", "关于"],
    openMenu: "打开导航",
    closeMenu: "关闭导航",
    mainNav: "主导航",
    admin: "管理后台",
    adminLabel: "打开管理后台",
    languageLabel: "切换到英文",
    themeDayLabel: "切换到 Mon3tr 黑夜主题",
    themeNightLabel: "切换到伊蕾娜白昼主题",
    heroDay: ["在旅途与电路之间，", "记录我的热爱。"],
    heroNight: ["在源石与电路之间，", "点亮每一次探索。"],
    bio: "电子专业学生，记录硬件、超频、游戏、Cosplay 与二次元世界。",
    heroBioSuffix: "把拆解问题的过程，写成可以反复查阅的记录。",
    enterBlog: "进入博客",
    labAction: "查看实验记录",
    interestsLabel: "兴趣领域",
    latest: "最新文章",
    latestLabel: (title: string) => `阅读最新文章：${title}`,
    scrollLabel: "向下浏览文章",
    articlesTitle: "技术文章",
    articlesIntro: "从原理出发，也保留每一次调试中真正有用的细节。",
    filterLabel: "文章分类筛选",
    read: "阅读",
    labTitle: "实验与超频笔记",
    labIntro: "不只展示结果，也记录失败参数、判断过程和下一步。",
    collectionTitle: "次元收藏",
    collectionIntro: "角色、游戏与 Cosplay，是技术之外同样认真保存的世界。",
    aboutTitle: "你好，我是 Mozelle。",
    aboutBody: "这个博客不是一份完成的说明书，而是一张持续生长的地图：保存走过的弯路，也标记下一次想抵达的地方。",
    continueReading: "继续阅读",
    tagline: "在旅途与源石之间，持续记录。",
    backToTop: "返回顶部",
    labNotes: [
      ["内存超频", "频率、主次时序、训练与稳定性测试记录"],
      ["板级分析", "PMIC、DrMOS、MOSFET 与供电路径拆解"],
      ["显示制造", "切割、研磨、清洗、检查与设备参数笔记"],
    ],
    collections: [
      ["魔女之旅", "灰发、旅行与故事。白昼主题的灵感原点。"],
      ["Mon3tr", "源石、生体机械与锋利的绿色能量。"],
      ["Cosplay 记录", "造型、布光、拍摄与每一次角色表达。"],
      ["游戏档案", "喜欢的世界、机制，以及值得留下的瞬间。"],
    ],
  },
  en: {
    nav: ["Home", "Articles", "Lab Notes", "Collections", "About"],
    openMenu: "Open navigation",
    closeMenu: "Close navigation",
    mainNav: "Main navigation",
    admin: "Admin",
    adminLabel: "Open admin control panel",
    languageLabel: "Switch to Chinese",
    themeDayLabel: "Switch to the Mon3tr night theme",
    themeNightLabel: "Switch to the Elaina daylight theme",
    heroDay: ["Between journeys and circuits,", "I document what I love."],
    heroNight: ["Between Originium and circuits,", "I illuminate every discovery."],
    bio: "An electronics student documenting hardware, overclocking, games, cosplay, and ACG culture.",
    heroBioSuffix: "I turn the process of taking problems apart into notes worth revisiting.",
    enterBlog: "Enter the Journal",
    labAction: "View Lab Notes",
    interestsLabel: "Fields of interest",
    latest: "Latest Article",
    latestLabel: (title: string) => `Read the latest article: ${title}`,
    scrollLabel: "Scroll down to browse articles",
    articlesTitle: "Technical Articles",
    articlesIntro: "Starting from first principles while preserving the details that matter in real debugging.",
    filterLabel: "Filter articles by category",
    read: "Read",
    labTitle: "Experiments & Overclocking",
    labIntro: "Not just the result, but failed settings, diagnosis, and the next move.",
    collectionTitle: "Cross-Dimensional Archive",
    collectionIntro: "Characters, games, and cosplay—the worlds I preserve with the same care as technology.",
    aboutTitle: "Hello, I’m Mozelle.",
    aboutBody: "This blog is not a finished manual. It is a map that keeps growing: preserving the detours behind me and marking where I want to go next.",
    continueReading: "Continue Reading",
    tagline: "Recording the journey between travel and Originium.",
    backToTop: "Back to Top",
    labNotes: [
      ["Memory Overclocking", "Frequency, timings, memory training, and stability test logs"],
      ["Board-Level Analysis", "PMIC, DrMOS, MOSFET, and power-path breakdowns"],
      ["Display Manufacturing", "Cutting, grinding, cleaning, inspection, and equipment notes"],
    ],
    collections: [
      ["Wandering Witch", "Silver hair, journeys, and stories—the origin of the daylight theme."],
      ["Mon3tr", "Originium, biomechanics, and razor-sharp green energy."],
      ["Cosplay Records", "Styling, lighting, photography, and every new interpretation of a character."],
      ["Game Archive", "The worlds, systems, and moments worth preserving."],
    ],
  },
} as const;

export const articleCopy = {
  zh: {
    homeLabel: "返回 Mozelle Journal 首页",
    back: "返回文章列表",
    backShort: "返回",
    themeLabel: "切换日间与夜间主题",
    languageLabel: "切换到英文",
    loading: "正在载入文章",
    missing: "没有找到这篇文章",
    missingBody: "文章可能尚未发布，或者地址已经发生变化。",
    other: "阅读其他文章",
  },
  en: {
    homeLabel: "Return to the Mozelle Journal homepage",
    back: "Back to Articles",
    backShort: "Back",
    themeLabel: "Switch between day and night themes",
    languageLabel: "Switch to Chinese",
    loading: "Loading the article",
    missing: "Article not found",
    missingBody: "The article may not be published yet, or its address may have changed.",
    other: "Explore More Articles",
  },
} as const;

const englishArticles: Record<string, ArticleTranslation> = {
  "ddr5-stability": {
    title: "DDR5 Overclocking: From Voltages and Timings to Stability",
    summary: "Place VDD, VDDQ, VPP, and memory-controller voltages in one logical model to understand the real limits of frequency, timings, and stability.",
    tags: ["DDR5", "Voltage", "Timings"],
    content: [
      "Memory overclocking is not simply about raising frequency. It is a search for balance among signal integrity, DRAM characteristics, and the memory controller. Frequency determines how many transfers can happen in a given time, while timings determine how many clock cycles each operation must wait.",
      "Start by controlling variables: choose a target frequency, then tune primary timings, secondary timings, and voltages separately. Change only a few parameters per round and record the test environment, temperature, and error location. That is how random fluctuation can be separated from genuine stability.",
      "Stability testing cannot stop at a successful boot. Short stress tests are useful for rapid diagnosis, while long mixed workloads better represent daily use. Final settings should also survive cold boots, wake from sleep, and different temperature conditions.",
    ],
  },
  "pmic-rails": {
    title: "Motherboards and PMICs: Where DDR5 Voltages Come From",
    summary: "Trace the power path from the motherboard input through the DIMM-mounted PMIC to the voltages actually used by the memory chips and related circuits.",
    tags: ["PMIC", "Power Delivery", "Motherboard"],
    content: [
      "DDR5 moves the main power-management functions onto the memory module. The motherboard supplies the upstream input and control conditions, while the DIMM-mounted PMIC generates the multiple rails used by the memory chips and supporting circuits.",
      "When analyzing a power rail, the most important step is separating input, output, and reference voltages. Similar names do not imply a common source, and every measurement point must be interpreted alongside the schematic, PMIC model, and board layout.",
      "This division affects more than fault diagnosis—it also defines the limits of overclocking voltage control. The values exposed in software are ultimately executed through the motherboard’s control logic and the module-side power devices.",
    ],
  },
  "drmos-reading": {
    title: "Reading a DrMOS: Ratings, Losses, and Temperature",
    summary: "Move beyond the headline current rating to understand why switching frequency, on-resistance, and cooling conditions matter more than a single number.",
    tags: ["DrMOS", "VRM", "Thermals"],
    content: [
      "A DrMOS integrates the high-side MOSFET, low-side MOSFET, and driver in one package. The maximum current in a data sheet usually assumes specific cooling conditions and should not be treated as the device’s safe continuous current in a real system.",
      "Actual losses mainly come from conduction, switching, and gate-drive losses. Load, switching frequency, input-to-output voltage difference, and PCB copper all affect junction temperature, so safe operation must be judged from the full set of conditions.",
      "A useful diagnosis starts with phase count, current per phase, temperature rise, and thermal cycling, then checks the switching node with an oscilloscope instead of drawing conclusions from package temperature alone.",
    ],
  },
  "acg-workspace": {
    title: "My Cross-Dimensional Workbench: Games, Cosplay, and Electronics",
    summary: "From desk layout to visual records, bring different interests into one personal space that can be maintained for the long term.",
    tags: ["ACG", "Cosplay", "Setup"],
    content: [
      "A workbench that genuinely fits its owner does not need display-case perfection. It works more like a sustainable system: frequently used gear stays within reach, collections have clear places, and the space can switch quickly between photography and repair work.",
      "For me, electronics, games, and cosplay are not separate interests. Lighting control, hardware tuning, character styling, and post-production already share many of the same ways of observing and solving problems.",
      "The goal of organizing a space is not to finish it once. It is to make the room easier to reset after every use, so the next idea does not begin by fighting through unnecessary friction.",
    ],
  },
};

export function localizeArticle(article: Article, language: Language): Article {
  if (language === "zh") return article;
  const translation = englishArticles[article.id];
  if (!translation) return article;
  return {
    ...article,
    ...translation,
    contentHtml: undefined,
  };
}
