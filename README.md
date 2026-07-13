# Mozelle Journal

> 在旅途与电路之间，记录我的热爱。

一个以二次元视觉为核心的个人博客，记录电子技术、硬件超频、游戏、Cosplay 与日常探索。网站采用伊蕾娜白昼主题和 Mon3tr 夜间主题，并为桌面端与移动端分别优化了主题切换和交互动效。

**在线访问：** [mozelle-journal.mozelle.chatgpt.site](https://mozelle-journal.mozelle.chatgpt.site)

## 主要特色

- **双主题设计**：白昼模式以伊蕾娜与动态魔法阵为核心；夜间模式以 Mon3tr、源石和三维线条网络为核心。
- **沉浸式切换**：主题切换包含分层遮罩、色彩过渡和角色场景变换。
- **指针交互**：桌面端的魔法阵与三维线条会对鼠标移动作出实时响应。
- **移动端优化**：降低高负载动画，重新调整角色构图与视觉中心，改善低配置设备体验。
- **博客内容展示**：包含电子、超频、硬件、游戏与二次元等分类内容。
- **响应式布局**：适配桌面、平板和手机屏幕。

## 技术栈

- React
- TypeScript
- Vinext / Vite
- Cloudflare Worker
- CSS 动画与响应式布局
- 可选 Cloudflare D1、R2 与 Drizzle ORM

## 本地运行

建议使用 Node.js 22.13 或更高版本。

```bash
npm ci
npm run dev
```

构建与测试：

```bash
npm run build
npm test
```

## 主要目录

```text
app/              页面、组件与全局样式
public/           伊蕾娜、Mon3tr、罗德岛标志及站点图片
worker/           Cloudflare Worker 入口
db/               数据库接口与结构
scripts/          安装、构建和产物验证脚本
tests/            页面渲染测试
```

## 部署配置

公开仓库中的 `.openai/hosting.json` 使用安全占位项目标识，不包含真实的 ChatGPT Sites 内部项目 ID。实际部署时应由对应托管平台生成或注入自己的配置，请勿把私有部署标识、访问令牌或环境变量提交到公开仓库。

## 后续计划

- 文章管理后台
- Markdown 与实时预览编辑器
- 图片上传和媒体库
- 草稿、发布与定时发布
- 文章修订历史
- D1 内容数据库与 R2 图片存储

## 素材说明

网站中的角色与相关美术素材仅用于个人非商业展示，相关版权归原作者及权利方所有。二次使用或公开部署时，请自行确认素材授权范围。
