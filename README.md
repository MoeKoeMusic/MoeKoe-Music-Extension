<div align="center">
  <img src="MoeKoeMusic/build/icons/linux/256x256.png" width="180" alt="MoeKoe Music" />

# MoeKoe Music Extension

MoeKoe Music 浏览器插件版，基于 [MoeKoeMusic Web](https://github.com/MoeKoeMusic/MoeKoeMusic/) 构建，并在浏览器扩展内完成 API 路由兼容。

![Manifest V3](https://img.shields.io/badge/Manifest-V3-4285F4)
![Vue](https://img.shields.io/badge/Vue-3-42b883)
![Vite](https://img.shields.io/badge/Vite-7-646CFF)
![License](https://img.shields.io/badge/License-GPL--2.0-blue)
</div>

## 特性

- 点击浏览器插件图标后打开独立窗口运行 MoeKoeMusic。
- 无需用户配置 API 地址，也无需额外启动本地 API 服务。
- 保留 MoeKoeMusic 原有 Web 页面与交互，兼容浏览器扩展运行环境。

## 快速开始

### 环境要求

- Node.js 20 或更高版本
- Git
- Chrome / Edge 等 Chromium 内核浏览器

### 安装依赖

```bash
git submodule update --init --recursive
npm install
npm run install:app
```

`npm run install:app` 会分别安装 `MoeKoeMusic` 与 `MoeKoeMusic/api` 的依赖。安装后建议检查子模块工作区，避免把上游 lockfile 的非预期变化提交进去。

### 构建扩展

```bash
npm run build
```

构建产物会输出到：

```text
dist/extension
```

### 安装到浏览器

1. 打开 `chrome://extensions` 或 `edge://extensions`。
2. 启用“开发者模式”。
3. 点击“加载已解压的扩展程序”。
4. 选择本项目下的 `dist/extension` 目录。

不要加载源码目录 `extension`，否则浏览器会提示清单或背景脚本加载失败。

## API 运行方式

这个项目不会让用户填写 API 地址。MoeKoeMusic 前端仍然按照自己的 HTTP 路由发起请求，构建时会把 Axios 请求适配到扩展内部消息通道。

请求流程如下：

```text
MoeKoeMusic Web
  -> extension/app/api-adapter.js
  -> extension/api/service-worker.cjs
  -> extension/api/generated/modules.cjs
  -> MoeKoeMusic/api/module/*.js
  -> KuGou 相关接口
```

`extension/api/generated/modules.cjs` 是生成文件，由 `scripts/generate-extension-api-entry.mjs` 扫描 `MoeKoeMusic/api/module` 后生成。新增或更新 API 模块后，重新运行下面任一命令即可：

```bash
npm run generate:api
npm run build
```

## 项目结构

```text
.
├── MoeKoeMusic/                         # 上游 MoeKoeMusic 子模块
│   └── api/                             # 上游 API 子模块
├── extension/
│   ├── app/
│   │   ├── api-adapter.js               # Web 端 Axios 适配器
│   │   └── locale-init.js               # 外置语言初始化脚本
│   ├── api/
│   │   ├── generated/modules.cjs        # API 路由映射生成文件
│   │   ├── axios-fetch.cjs              # 浏览器 fetch 版 Axios 兼容层
│   │   ├── service-worker.cjs           # 扩展后台逻辑
│   │   └── url.cjs                      # url 模块兼容层
│   ├── manifest.json                    # 扩展清单
│   └── vite.extension.config.mjs        # 扩展构建配置
├── scripts/
│   ├── build-extension.mjs              # 扩展构建脚本
│   └── generate-extension-api-entry.mjs # API 映射生成脚本
└── dist/extension                       # 构建后的扩展目录
```

## 技术栈

| 技术 | 用途 |
| --- | --- |
| Manifest V3 | 浏览器扩展运行环境 |
| Vue 3 | MoeKoeMusic Web 页面 |
| Vite | Web 页面构建 |
| esbuild | Service Worker 打包 |
| Chrome Extensions API | 窗口打开、消息通信、存储 |
| KuGouMusicApi | 上游 API 模块来源 |


## 相关项目

- [MoeKoeMusic](https://github.com/MoeKoeMusic/MoeKoeMusic/)：MoeKoeMusic 多平台客户端。
- [KuGouMusicApi](https://github.com/MakcRe/KuGouMusicApi)：MoeKoeMusic 使用的 API 项目。
- [MoeKoeMusic-mobile](https://github.com/MoeKoeMusic/MoeKoeMusic-mobile)：MoeKoeMusic 移动端版本。

## 免责声明

本项目仅用于学习与技术研究。项目中的音乐数据、歌词、封面等内容版权归原版权方所有，请勿将本项目用于商业用途或违反相关服务条款的场景。使用本项目产生的任何风险由使用者自行承担。

## License

本项目沿用上游 MoeKoeMusic 的开源协议，详见 [MoeKoeMusic/LICENSE](MoeKoeMusic/LICENSE)。
