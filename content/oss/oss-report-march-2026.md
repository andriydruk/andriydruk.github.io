+++
date = "2026-03-31T00:00:00+03:00"
title = "Open Source Report"
subtitle = "March 2026"
draft = false
image = "/img/og/oss-report-march-2026.png"
comments = true
+++

Big month for **[LMPlayground](https://play.google.com/store/apps/details?id=com.druk.lmplayground)** - six releases shipped to Google Play, taking the on-device llama.cpp chat app from basic model support to a proper thinking/reasoning UI, reliable downloads, and a much more stable runtime.

**[Service Browser](https://play.google.com/store/apps/details?id=com.druk.servicebrowser)** got a ground-up rewrite for its 3.0 release - pure Kotlin, native Android mDNS, and support all the way back to Android 6.

Also shipped a new version of **[swift-android-buildtools](https://github.com/readdle/swift-android-buildtools)** with per-class test isolation for running XCTests on Android.

## LMPlayground

- **[1.2.1](https://github.com/andriydruk/LMPlayground/releases/tag/1.2.1)** — Added Qwen 3.5 models (0.8B, 2B, 4B). Fixed crashes during model teardown and JNI session lifecycle. Updated llama.cpp to **b8191**.
- **[1.2.2](https://github.com/andriydruk/LMPlayground/releases/tag/1.2.2)** — Built a custom download manager with OkHttp and WorkManager to replace Android's unreliable `DownloadManager`. Supports background downloads, automatic resume, and progress notifications.
- **[1.3.0](https://github.com/andriydruk/LMPlayground/releases/tag/1.3.0)** — Introduced thinking/reasoning mode with collapsible UI and live timer. Added custom GGUF model loading from storage. Redesigned chat interface. Updated llama.cpp to **b8334** with Release-mode native builds.
- **[1.4.0](https://github.com/andriydruk/LMPlayground/releases/tag/1.4.0)** — Conversations now persist across restarts with a drawer for switching models. Added user-configurable generation parameters. Updated llama.cpp to **b8461**.
- **[1.4.1](https://github.com/andriydruk/LMPlayground/releases/tag/1.4.1)** — Added NVIDIA Nemotron 3 Nano 4B. Addressed native crash reports from Google Play by reducing batch size, capping OpenMP threads, and chunking long prompts. Several race condition fixes.
- **[1.4.2](https://github.com/andriydruk/LMPlayground/releases/tag/1.4.2)** — Updated llama.cpp to **b8590**. Fixed LazyColumn state consistency and nullable session handling.

## BonjourBrowser

- **[3.0.0](https://github.com/andriydruk/BonjourBrowser/releases/tag/3.0.0)** — Complete rewrite: Java to Kotlin, replaced rx2dnssd with Android's native `NsdManager`, migrated to AGP 9 and Kotlin 2. Lowered minSdk to 23 with a resolve fallback for pre-API 34 devices. New adaptive icon and Material 3 theming. Added instrumented tests.
- **[3.0.1](https://github.com/andriydruk/BonjourBrowser/releases/tag/v3.0.1)** — Fixed a crash on devices below API 34 where `NsdServiceInfo` methods were not available.
- **[3.0.2](https://github.com/andriydruk/BonjourBrowser/releases/tag/v3.0.2)** — Older devices now resolve all IP addresses via raw mDNS queries, matching the multi-address behavior of the old library.

## swift-android-buildtools

- **[6.2-r1](https://github.com/readdle/swift-android-buildtools/releases/tag/6.2-r1)** — Migrated from the legacy Swift Android Toolchain to official Swift SDK artifact bundles. Build tool rewritten in Python.
- **[6.2-r2](https://github.com/readdle/swift-android-buildtools/releases/tag/6.2-r2)** — New **`--isolate`** flag to run each XCTest class in its own process on Android, with crash detection that tells assertion failures apart from process crashes. Removed dead code left over from earlier merges.
