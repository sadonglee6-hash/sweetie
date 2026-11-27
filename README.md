# Sweetie! · 甜心来信

每一个蛋糕，都藏着一个甜甜的故事。

[推门进店](https://sadonglee6-hash.github.io/sweetie/)

甜心来信是一款免登录的浏览器游戏。和 Mia 聊天，逛橱窗，翻手札，或在陶瓷转台上设计自己的蛋糕。制作过程在本地保存。首次成功缓存游戏后，同一浏览器可以断网重开。

## 开发与发布

运行 `npm ci --legacy-peer-deps`，再运行 `npm run dev`。`npm run check` 检查 TypeScript。`npm run build` 生成静态站点和离线资源清单。GitHub Pages 从 `main` 的 `/docs` 发布。

`client/` 包含 React、Zustand、视觉小说、物件热区、橱窗手札和声音设置。分层店门使用 GSAP，人物切换使用 Motion。归一化热区以正式场景画幅为坐标空间。

`src/` 包含 Three.js 蛋糕、射线拾取、涂抹、裱花、定制需求和导出模块。书中的可旋转模型通过 React Three Fiber 和 Drei 使用同一套蛋糕几何与配方。`public/assets/` 存放切分后的场景、人物、UI、食材和模型。调色陶瓷碗可通过 Blender 后台运行 `scripts/mixing-bowl.py` 重新生成。

作品存储在 IndexedDB，受限环境下回退到浏览器本地存储。演示需求单包含用料、规格、表面坐标、角度、比例、包装和估价，实际制作条件及价格由蛋糕师确认。游戏不接收支付或提交商家订单。

代码依赖保留各自许可证。店铺场景、Mia 和交互 UI 使用项目提供的正式美术。
