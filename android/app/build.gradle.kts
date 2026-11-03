import java.util.Base64

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// CI passes -PversionCode=<int> -PversionName=<x.y.z> (derived from the app-vX.Y.Z tag).
val vCode = (findProperty("versionCode") as String?)?.toInt() ?: 1
val vName = (findProperty("versionName") as String?) ?: "0.1.0"

android {
    namespace = "fi.kuljento.v"
    compileSdk = 36
    defaultConfig {
        applicationId = "fi.kuljento.v"
        minSdk = 26
        targetSdk = 36
        versionCode = vCode
        versionName = vName
    }
    // Release signing comes from env only (never from git). Without it the release APK is unsigned.
    val ksB64 = System.getenv("V_KEYSTORE_B64")
    if (!ksB64.isNullOrBlank()) {
        val ks = layout.buildDirectory.file("v-release.jks").get().asFile
        ks.parentFile.mkdirs()
        ks.writeBytes(Base64.getMimeDecoder().decode(ksB64))
        signingConfigs.create("release") {
            storeFile = ks
            storePassword = System.getenv("V_KEYSTORE_PASS")
            keyAlias = System.getenv("V_KEY_ALIAS")
            keyPassword = System.getenv("V_KEY_PASS")
        }
    }
    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfigs.findByName("release")?.let { signingConfig = it }
        }
    }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
    kotlin { jvmToolchain(17) }
}

dependencies {
    implementation("androidx.core:core-ktx:1.17.0")
    implementation("androidx.activity:activity-ktx:1.11.0")
    implementation("androidx.swiperefreshlayout:swiperefreshlayout:1.1.0")
    implementation("androidx.webkit:webkit:1.14.0")
}
