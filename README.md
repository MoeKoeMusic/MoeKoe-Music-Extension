# MoeKoe Music 浏览器插件版

这个仓库是 [iAJue/MoeKoeMusic](https://github.com/iAJue/MoeKoeMusic/) 浏览器插件版。

点击插件图标后会打开一个独立窗口，窗口内运行 MoeKoeMusic 的 Web 版本。

## 目录说明

- `MoeKoeMusic/`：上游项目子模块。
- `extension/manifest.json`：浏览器插件清单文件。
- `extension/app/api-adapter.js`：注入到 Web 端 Axios 的插件 API adapter。
- `extension/app/locale-init.js`：外置语言初始化脚本，避免 MV3 CSP 拦截 inline script。
- `extension/api/service-worker.cjs`：插件后台 service worker，负责打开窗口和处理 API 请求。
- `extension/api/axios-fetch.cjs`：给 API 模块使用的浏览器 fetch 版 Axios 兼容层。
- `extension/api/url.cjs`：浏览器环境下的 `url` 模块 shim。
- `scripts/generate-extension-api-entry.mjs`：扫描 `MoeKoeMusic/api/module`，生成 HTTP 路由到 API 模块的映射。
- `scripts/build-extension.mjs`：构建 Web 页面、修补扩展产物、打包 service worker。

## 安装与构建

```bash
git submodule update --init --recursive
npm install
npm run install:app
npm run build
```

构建产物会生成到：

```text
dist/extension
```

在 Chrome / Edge 中打开 `chrome://extensions`，启用开发者模式，然后选择“加载已解压的扩展程序”，加载 `dist/extension` 目录。

## 构建细节

`npm run build` 会依次执行：

1. 生成 `extension/api/generated/modules.cjs`。
2. 使用 `extension/vite.extension.config.mjs` 构建 MoeKoeMusic Web 页面。
3. 将上游 `index.html` 中的 inline language script 替换为 `locale-init.js`，避免扩展 CSP 报错。
4. 使用 esbuild 打包 `extension/api/service-worker.cjs`。
5. 复制 `manifest.json` 和图标到 `dist/extension`。

`extension/api/generated/modules.cjs` 是生成文件，不建议手动修改；新增或更新 API 模块后重新运行 `npm run generate:api` 或 `npm run build` 即可。

## 常用命令

```bash
npm run generate:api
npm run build
```

`npm run install:app` 会安装 `MoeKoeMusic` 和 `MoeKoeMusic/api` 的依赖。安装依赖可能会修改子模块内的 lockfile，提交前请确认子模块工作区没有意外改动。

## 注意事项

- 插件需要 `storage` 权限保存 API 会话和设备信息。
- 插件声明了 `http://*/*` 与 `https://*/*` host permissions，用于 service worker 直接访问 KuGou 相关接口。
- MV3 不允许 inline script。不要直接把 `<script>...</script>` 写进扩展页面产物，应该使用外部脚本文件。
- 上游子模块源码保持不变，所有兼容逻辑都应放在外层 `extension/` 或 `scripts/` 中。

