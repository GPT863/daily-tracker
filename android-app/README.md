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
  - 拍照上传
  - Android 12+ 系统启动页
  - 原生本地提醒通知
  - 明文 HTTP 访问（便于访问局域网或未上 HTTPS 的后端）

## 打开方式

1. 用 Android Studio 打开 `android-app`
2. 等 Gradle Sync 完成
3. 连接安卓手机或启动模拟器
4. 点击 `Run`
5. 需要 APK 时使用 `Build > Build APK(s)`

## Release 出包

默认可以直接构建 `debug` 包。要生成可安装的正式 `release` 包，需要先准备签名文件。

1. 在 `android-app` 目录生成 keystore，例如：

```powershell
keytool -genkeypair -v -keystore release-keystore.jks -alias dailytracker -keyalg RSA -keysize 2048 -validity 3650
```

2. 复制 `keystore.properties.example` 为 `keystore.properties`
3. 填入你的 keystore 路径和口令
4. 执行 `assembleRelease`

当前工程会自动读取 `android-app/keystore.properties`：

```properties
storeFile=release-keystore.jks
storePassword=你的store密码
keyAlias=dailytracker
keyPassword=你的key密码
```

如果没有 `keystore.properties`，`release` 仍可构建，但产物会是未签名包，只适合进一步签名，不适合直接安装。

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
- 当前版本已经把“提醒通知”接管到 Android 原生调度与通知通道，保存提醒后会把提醒列表同步给宿主 App
- Web 通知和浏览器级 PWA 能力在 Android WebView 中仍不如 Chrome 完整，除提醒以外的后台能力仍建议后续继续原生化
- Android Studio 建议使用内置 JDK 17；当前工程的 `compileSdk` 为 35
