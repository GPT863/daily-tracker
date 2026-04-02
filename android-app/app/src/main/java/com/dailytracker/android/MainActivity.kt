package com.dailytracker.android

import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.os.Bundle
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
import androidx.webkit.ServiceWorkerControllerCompat
import androidx.webkit.WebViewAssetLoader
import androidx.webkit.WebViewClientCompat
import androidx.webkit.WebViewFeature

class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    private var filePathCallback: ValueCallback<Array<Uri>>? = null

    private val filePickerLauncher =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            val callback = filePathCallback
            filePathCallback = null

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

            callback.onReceiveValue(if (uris.isEmpty()) null else uris)
        }

    private val assetLoader by lazy {
        WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webView)

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

                val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                    addCategory(Intent.CATEGORY_OPENABLE)
                    type = "*/*"
                    putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true)
                    putExtra(Intent.EXTRA_MIME_TYPES, arrayOf("image/*", "application/pdf"))
                }

                return try {
                    filePickerLauncher.launch(intent)
                    true
                } catch (_: ActivityNotFoundException) {
                    this@MainActivity.filePathCallback = null
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
}
