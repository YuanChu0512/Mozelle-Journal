export const filters = ["全部", "电子", "超频", "硬件", "游戏与次元"] as const;

export type Filter = (typeof filters)[number];

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

export const fallbackArticles: Article[] = [
  {
    id: "ddr5-stability",
    category: "超频",
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
    category: "电子",
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
    category: "硬件",
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
    category: "游戏与次元",
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
