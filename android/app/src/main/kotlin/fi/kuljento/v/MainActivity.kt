package fi.kuljento.v

import android.annotation.SuppressLint
import android.app.DownloadManager
import android.content.*
import android.net.Uri
import android.os.*
import android.provider.MediaStore
import android.provider.Settings
import android.util.Base64
import android.webkit.*
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.core.content.pm.PackageInfoCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import org.json.JSONObject
import java.io.File
import java.net.URL
import java.net.URLDecoder
import java.security.MessageDigest
import kotlin.concurrent.thread

private const val HOME = "https://v.kuljento.fi"

class MainActivity : ComponentActivity() {
    private lateinit var web: WebView
    private lateinit var refresh: SwipeRefreshLayout
    private var lastUrl = HOME
    @Volatile private var curUrl = ""
    private var chooser: ValueCallback<Array<Uri>>? = null
    private var saveBytes: ByteArray? = null
    private var dlId = -1L
    private var dlSha = ""
    private var readyApk: File? = null
    private val apkFile get() = File(getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), "v-update.apk")

    private val pick = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) {
        chooser?.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(it.resultCode, it.data)); chooser = null
    }
    private val saveAs = registerForActivityResult(ActivityResultContracts.CreateDocument("application/json")) { uri -> // API < 29 only
        val b = saveBytes; saveBytes = null
        if (uri != null && b != null) contentResolver.openOutputStream(uri)?.use { it.write(b) }
    }
    private val dlDone = object : BroadcastReceiver() {
        override fun onReceive(c: Context, i: Intent) {
            if (i.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1) != dlId) return
            thread {
                val f = apkFile
                val ok = f.exists() && sha256(f).equals(dlSha, true)
                runOnUiThread { if (ok) { readyApk = f; installReady() } else { f.delete(); toast("Päivitys epäonnistui (tarkistussumma)") } }
            }
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(b: Bundle?) {
        super.onCreate(b)
        web = WebView(this).apply {
            setBackgroundColor(0xFF16171A.toInt())
            settings.javaScriptEnabled = true; settings.domStorageEnabled = true
            addJavascriptInterface(Native(), "VAppNative")
            setDownloadListener { url, _, cd, mime, _ -> download(url, cd, mime) }
            webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(v: WebView, r: WebResourceRequest): Boolean {
                    if (r.url.host == Uri.parse(HOME).host || r.url.scheme == "file") return false
                    runCatching { startActivity(Intent(Intent.ACTION_VIEW, r.url)) }; return true
                }
                override fun onPageStarted(v: WebView, u: String, f: android.graphics.Bitmap?) {
                    curUrl = u
                    if (!WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) v.evaluateJavascript(shim(), null)
                }
                override fun onPageFinished(v: WebView, u: String) { refresh.isRefreshing = false }
                override fun onReceivedError(v: WebView, r: WebResourceRequest, e: WebResourceError) {
                    if (!r.isForMainFrame) return
                    lastUrl = r.url.toString(); refresh.isRefreshing = false
                    v.loadUrl("file:///android_asset/offline.html")
                }
            }
            webChromeClient = object : WebChromeClient() {
                override fun onShowFileChooser(v: WebView, cb: ValueCallback<Array<Uri>>, p: FileChooserParams): Boolean {
                    chooser?.onReceiveValue(null); chooser = cb
                    return runCatching { pick.launch(p.createIntent()); true }.getOrElse { chooser = null; false }
                }
            }
        }
        if (WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT))
            WebViewCompat.addDocumentStartJavaScript(web, shim(), setOf(HOME))
        refresh = SwipeRefreshLayout(this).apply {
            setColorSchemeColors(0xFFFD5E0D.toInt()); setProgressBackgroundColorSchemeColor(0xFF22252A.toInt())
            setOnChildScrollUpCallback { _, _ -> web.scrollY > 0 }
            setOnRefreshListener { if (web.url?.startsWith("file:") == true) web.loadUrl(lastUrl) else web.reload() }
            addView(web)
        }
        setContentView(android.widget.FrameLayout(this).apply { setBackgroundColor(0xFF16171A.toInt()); addView(refresh) })
        ViewCompat.setOnApplyWindowInsetsListener(refresh.parent as android.view.View) { v, i ->
            val s = i.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.ime())
            v.setPadding(s.left, s.top, s.right, s.bottom); WindowInsetsCompat.CONSUMED
        }
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() { if (web.canGoBack()) web.goBack() else { isEnabled = false; onBackPressedDispatcher.onBackPressed() } }
        })
        ContextCompat.registerReceiver(this, dlDone, IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE), ContextCompat.RECEIVER_EXPORTED)
        if (b == null) web.loadUrl(HOME) else web.restoreState(b)
    }

    override fun onSaveInstanceState(o: Bundle) { super.onSaveInstanceState(o); web.saveState(o) }
    override fun onResume() { super.onResume(); installReady() }
    override fun onDestroy() { unregisterReceiver(dlDone); super.onDestroy() }

    // window.VApp contract: versionCode is a plain int, installApk(url) takes the apk URL from version.json.
    private fun shim(): String {
        val vc = PackageInfoCompat.getLongVersionCode(packageManager.getPackageInfo(packageName, 0))
        return "window.VApp={versionCode:$vc,installApk:function(u){VAppNative.installApk(String(u))}};"
    }

    private fun toast(s: String) = runOnUiThread { Toast.makeText(this, s, Toast.LENGTH_LONG).show() }
    private fun sha256(f: File) = MessageDigest.getInstance("SHA-256").also { d -> f.inputStream().use { s -> val buf = ByteArray(65536); while (true) { val n = s.read(buf); if (n < 0) break; d.update(buf, 0, n) } } }
        .digest().joinToString("") { "%02x".format(it) }

    // blob: / data: downloads (the JSON export). Blobs are read by the page and handed back as a data URL.
    private fun download(url: String, cd: String?, mime: String?) {
        val name = if (mime?.contains("json") == true) "v-varmuuskopio.json" else URLUtil.guessFileName(url, cd, mime)
        when {
            url.startsWith("data:") -> save(url, name)
            url.startsWith("blob:") -> web.evaluateJavascript("fetch(${JSONObject.quote(url)}).then(r=>r.blob()).then(b=>{var f=new FileReader();f.onloadend=()=>VAppNative.save(f.result,${JSONObject.quote(name)});f.readAsDataURL(b)})", null)
            else -> runCatching { (getSystemService(DOWNLOAD_SERVICE) as DownloadManager).enqueue(DownloadManager.Request(Uri.parse(url)).setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED).setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, name)) }
        }
    }

    private fun save(dataUrl: String, name: String) {
        val head = dataUrl.substringBefore(','); val body = dataUrl.substringAfter(',')
        val bytes = if (head.endsWith(";base64")) Base64.decode(body, Base64.DEFAULT) else URLDecoder.decode(body, "UTF-8").toByteArray()
        val mime = head.removePrefix("data:").substringBefore(';').ifEmpty { "application/octet-stream" }
        if (Build.VERSION.SDK_INT >= 29) {
            val cv = ContentValues().apply { put(MediaStore.Downloads.DISPLAY_NAME, name); put(MediaStore.Downloads.MIME_TYPE, mime) }
            val u = contentResolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv)
            if (u != null) { contentResolver.openOutputStream(u)?.use { it.write(bytes) }; toast("Tallennettu Lataukset-kansioon: $name") } else toast("Tallennus epäonnistui")
        } else runOnUiThread { saveBytes = bytes; saveAs.launch(name) }
    }

    private fun installReady() {
        val f = readyApk ?: return
        if (!packageManager.canRequestPackageInstalls()) {
            startActivity(Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:$packageName")))
            toast("Salli V:n asennusoikeus ja palaa takaisin"); return
        }
        readyApk = null
        val u = FileProvider.getUriForFile(this, "$packageName.files", f)
        startActivity(Intent(Intent.ACTION_VIEW).setDataAndType(u, "application/vnd.android.package-archive").addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK))
    }

    inner class Native {
        @JavascriptInterface fun save(dataUrl: String, name: String) { if (trusted()) this@MainActivity.save(dataUrl, name.substringAfterLast('/')) }
        @JavascriptInterface fun retry() = runOnUiThread { web.loadUrl(lastUrl) }

        // Downloads the APK, checks it against the sha256 published in version.json, then opens the installer.
        @JavascriptInterface fun installApk(url: String) {
            if (!trusted() || !url.startsWith("https://")) return
            thread {
                try {
                    val sha = URL("$HOME/version.json").openConnection().apply { useCaches = false }.getInputStream().use { JSONObject(it.reader().readText()).optString("sha256") }
                    if (sha.length != 64) { toast("Päivitystä ei voi vahvistaa (sha256 puuttuu)"); return@thread }
                    dlSha = sha; apkFile.delete()
                    dlId = (getSystemService(DOWNLOAD_SERVICE) as DownloadManager).enqueue(DownloadManager.Request(Uri.parse(url)).setTitle("V").setDestinationUri(Uri.fromFile(apkFile))
                        .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED))
                    toast("Ladataan päivitystä…")
                } catch (e: Exception) { toast("Päivitys epäonnistui: ${e.message}") }
            }
        }
        private fun trusted() = Uri.parse(HOME).host == Uri.parse(curUrl).host || curUrl.startsWith("file:///android_asset/")
    }
}
