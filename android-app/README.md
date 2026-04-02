# Android APK 打包

这个目录现在是一个可导入 Android Studio 的 WebView 壳工程，目标是把仓库根目录的前端页面打包成安卓 APK。

## 方案

- Web 内容通过 `WebViewAssetLoader` 从 `https://appassets.androidplatform.net/assets/web/index.html` 加载
- 前端静态资源打包进 `app/src/main/assets/web`
- Android 端开启了：
  - JavaScript
  - DOM Storage
  - IndexedDB/Web SQL 兼容开关
  - 文件选择器
  - 明文 HTTP 访问（便于访问局域网或未上 HTTPS 的后端）

## 打开方式

1. 用 Android Studio 打开 `android-app`
2. 等 Gradle Sync 完成
3. 连接安卓手机或启动模拟器
4. 点击 `Run`
5. 需要 APK 时使用 `Build > Build APK(s)`

## 资源同步

当前 APK 使用的前端资源在：

- `app/src/main/assets/web/index.html`
- `app/src/main/assets/web/style.css`
- `app/src/main/assets/web/app.js`
- `app/src/main/assets/web/sw.js`
- `app/src/main/assets/web/manifest.json`
- `app/src/main/assets/web/icons`
- `app/src/main/assets/web/vendor`

如果你修改了仓库根目录前端文件，需要同步复制到上面的 `assets/web` 目录后再重新打包。

可以直接运行：

```powershell
./sync-web-assets.ps1
```

## 使用限制

- 云同步后端地址不能使用手机上的 `127.0.0.1`
- 如果后端跑在电脑上，请改成电脑局域网 IP，例如 `http://192.168.1.10:5231`
- 当前壳应用优先保证页面可运行，不包含原生提醒、原生后台同步、原生推送
- Web 通知和浏览器级 PWA 能力在 Android WebView 中不如 Chrome 完整，这部分要单独做原生接管才会更稳
- Android Studio 建议使用内置 JDK 17；当前工程的 `compileSdk` 为 35
