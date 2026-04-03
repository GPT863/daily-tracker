package com.dailytracker.android

import android.Manifest
import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.provider.MediaStore
import android.webkit.CookieManager
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.webkit.ServiceWorkerControllerCompat
import androidx.webkit.WebViewAssetLoader
import androidx.webkit.WebViewClientCompat
import androidx.webkit.WebViewFeature
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private var pendingCameraUri: Uri? = null
    private var pendingReminderId: String? = null
    private var pageReady = false
    private val notificationPermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            if (!granted) {
                webView.post { webView.evaluateJavascript("window.showToast && window.showToast('请在系统设置中允许通知权限');", null) }
            }
        }

    private val filePickerLauncher =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            val callback = filePathCallback
            filePathCallback = null
            val cameraUri = pendingCameraUri
            pendingCameraUri = null

            if (callback == null) {
                return@registerForActivityResult
            }

            if (result.resultCode != RESULT_OK) {
                callback.onReceiveValue(null)
                return@registerForActivityResult
            }

            val data = result.data
            val uris = buildList {
                data?.data?.let(::add)
                val clipData = data?.clipData
                if (clipData != null) {
                    for (index in 0 until clipData.itemCount) {
                        clipData.getItemAt(index)?.uri?.let(::add)
                    }
                }
            }.distinct().toTypedArray()

            if (uris.isNotEmpty()) {
                callback.onReceiveValue(uris)
            } else if (cameraUri != null) {
                callback.onReceiveValue(arrayOf(cameraUri))
            } else {
                callback.onReceiveValue(null)
            }
        }

    private val assetLoader by lazy {
        WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webView)
        pendingReminderId = intent.getStringExtra("reminder_id")

        ReminderScheduler.createNotificationChannel(this)
        configureWebView()
        configureBackNavigation()

        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState)
        } else {
            webView.loadUrl(APP_HOME_URL)
        }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webView.saveState(outState)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        pendingReminderId = intent.getStringExtra("reminder_id")
        if (pageReady) {
            dispatchPendingNavigation()
        }
    }

    override fun onDestroy() {
        filePathCallback?.onReceiveValue(null)
        filePathCallback = null
        webView.destroy()
        super.onDestroy()
    }

    private fun configureWebView() {
        CookieManager.getInstance().setAcceptCookie(true)
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true)

        if (WebViewFeature.isFeatureSupported(WebViewFeature.SERVICE_WORKER_BASIC_USAGE)) {
            val serviceWorkerSettings = ServiceWorkerControllerCompat.getInstance().serviceWorkerWebSettings
            serviceWorkerSettings.allowContentAccess = true
            serviceWorkerSettings.allowFileAccess = true
            serviceWorkerSettings.blockNetworkLoads = false
            serviceWorkerSettings.cacheMode = WebSettings.LOAD_DEFAULT
        }

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            allowContentAccess = true
            allowFileAccess = true
            mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
            mediaPlaybackRequiresUserGesture = false
            loadsImagesAutomatically = true
            builtInZoomControls = false
            displayZoomControls = false
        }

        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG)
        webView.addJavascriptInterface(ReminderBridge(this), "AndroidReminders")

        webView.webViewClient = object : WebViewClientCompat() {
            override fun shouldInterceptRequest(
                view: WebView,
                request: WebResourceRequest
            ): WebResourceResponse? {
                return assetLoader.shouldInterceptRequest(request.url)
            }

            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val uri = request.url
                if (uri.host == APP_ASSET_HOST) {
                    return false
                }

                return try {
                    startActivity(Intent(Intent.ACTION_VIEW, uri))
                    true
                } catch (_: ActivityNotFoundException) {
                    false
                }
            }

            override fun onPageFinished(view: WebView, url: String) {
                super.onPageFinished(view, url)
                pageReady = true
                dispatchPendingNavigation()
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                if (filePathCallback == null) {
                    return false
                }

                this@MainActivity.filePathCallback?.onReceiveValue(null)
                this@MainActivity.filePathCallback = filePathCallback

                val pickIntent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                    addCategory(Intent.CATEGORY_OPENABLE)
                    type = "*/*"
                    putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true)
                    putExtra(Intent.EXTRA_MIME_TYPES, arrayOf("image/*", "application/pdf"))
                }

                val captureIntent = createImageCaptureIntent()
                val chooserIntent = Intent(Intent.ACTION_CHOOSER).apply {
                    putExtra(Intent.EXTRA_INTENT, pickIntent)
                    if (captureIntent != null) {
                        putExtra(Intent.EXTRA_INITIAL_INTENTS, arrayOf(captureIntent))
                    }
                }

                return try {
                    filePickerLauncher.launch(chooserIntent)
                    true
                } catch (_: ActivityNotFoundException) {
                    this@MainActivity.filePathCallback = null
                    pendingCameraUri = null
                    filePathCallback.onReceiveValue(null)
                    false
                }
            }
        }
    }

    private fun configureBackNavigation() {
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    finish()
                }
            }
        })
    }

    companion object {
        private const val APP_ASSET_HOST = "appassets.androidplatform.net"
        private const val APP_HOME_URL =
            "https://appassets.androidplatform.net/assets/web/index.html"
    }

    fun requestNativeNotificationPermission() {
        if (android.os.Build.VERSION.SDK_INT < android.os.Build.VERSION_CODES.TIRAMISU) {
            return
        }

        if (ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.POST_NOTIFICATIONS
            ) == android.content.pm.PackageManager.PERMISSION_GRANTED
        ) {
            return
        }

        notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
    }

    private fun dispatchPendingNavigation() {
        val reminderId = pendingReminderId?.takeIf { it.isNotBlank() } ?: return
        val escapedReminderId = reminderId
            .replace("\\", "\\\\")
            .replace("'", "\\'")

        val script = """
            (function() {
                if (typeof window.openReminderManagerFor === 'function') {
                    window.openReminderManagerFor('$escapedReminderId');
                } else if (typeof window.openReminderPage === 'function') {
                    window.openReminderPage('today');
                } else if (typeof window.switchPage === 'function') {
                    window.switchPage('reminders');
                }
            })();
        """.trimIndent()

        webView.post {
            webView.evaluateJavascript(script, null)
        }
        pendingReminderId = null
    }

    private fun createImageCaptureIntent(): Intent? {
        return try {
            val imageFile = createTempImageFile()
            val imageUri = FileProvider.getUriForFile(
                this,
                "${BuildConfig.APPLICATION_ID}.fileprovider",
                imageFile
            )
            pendingCameraUri = imageUri

            Intent(MediaStore.ACTION_IMAGE_CAPTURE).apply {
                putExtra(MediaStore.EXTRA_OUTPUT, imageUri)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
            }
        } catch (_: Exception) {
            pendingCameraUri = null
            null
        }
    }

    private fun createTempImageFile(): File {
        val timeStamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date())
        val storageDir = File(cacheDir, "camera").apply {
            if (!exists()) {
                mkdirs()
            }
        }
        return File.createTempFile("IMG_${timeStamp}_", ".jpg", storageDir)
    }
}
