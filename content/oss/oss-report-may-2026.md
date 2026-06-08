+++
date = "2026-05-31T00:00:00+03:00"
title = "Open Source Report"
subtitle = "May 2026"
slug = "2026-05"
draft = false
image = "/img/og/oss-report-may-2026.png"
comments = true
+++

Another busy month for **LMPlayground** - four releases shipped to Google Play, this time focused on running well across more devices. The UI grew adaptive layouts for tablets, foldables, and Chromebooks, and runtime CPU variant selection brings up to **2× faster** generation by dlopen'ing the best ARM feature level at startup. Inference now also lives in its own isolated `:llama` process, so a native crash can't take the whole app down. The model lineup gained **GPT-OSS 20B** (with Harmony reasoning), and oversized models now memory-map and run slowly instead of refusing to load. llama.cpp tracked from **b8929 to b9411** across the month.

**BonjourBrowser** shipped **3.0.3**, a critical fix that restored mDNS service discovery on **Android 16+** - the post-3.0.0 raw-socket resolver had been silenced by the Wi-Fi multicast filter and a port collision with the system mDNS daemon.

The two Spark-related projects each shipped two releases, tracking the Spark CLI from 1.1.0 to 1.2.1. The **1.1.0** releases crossed from read-only into **triage/write** territory: **spark-cli-skills** added 11 triage recipes and an 8-role persona library, while **spark-claude-extension** gained draft/comment/action tools. The **1.2.1** releases then added attachment reading, saved templates, and shared drafts to both.

## LMPlayground

- **[1.5.3](https://github.com/andriydruk/LMPlayground/releases/tag/1.5.3)** — Run llama.cpp in a separate `:llama` process for crash isolation. Hidden foreground-service notification showing the loaded model name and RAM usage. Softened the low-RAM gate from a hard refusal to an override dialog. Updated llama.cpp **b8929 → b9009**.
- **[1.5.4](https://github.com/andriydruk/LMPlayground/releases/tag/1.5.4)** — Friendly "Couldn't load model" dialog when a GGUF is corrupt or uses an unrecognized architecture, instead of a native crash. Caught inference-process death at the AIDL proxy and surfaced it as a recoverable error. Updated llama.cpp **b9009 → b9089** (RMS_NORM + MUL fusion CPU speedup, KleidiAI v1.24.0).
- **[1.6.0](https://github.com/andriydruk/LMPlayground/releases/tag/1.6.0)** — **Tablet, foldable, and Chromebook support** — a permanent session sidebar at ≥ 840 dp, hinge-aware sidebar width via `androidx.window`, and freeform windowing. **Runtime CPU variant selection** via `GGML_CPU_ALL_VARIANTS` — dlopens the best ARM feature level at startup (dotprod, i8mm/SVE) for up to **2× faster** generation. Localized Play Store tablet screenshots in 28 locales. Updated llama.cpp **b9089 → b9192**.
- **[1.6.1](https://github.com/andriydruk/LMPlayground/releases/tag/1.6.1)** — Added **GPT-OSS 20B** (native MXFP4) with the Harmony "analysis" channel rendered as a collapsible thinking section. **Large-model support** — models over the RAM budget now memory-map and run (slower) instead of failing to start. **Leaner downloads** — stream directly into the model folder and atomically rename on completion, halving peak disk use. Updated llama.cpp **b9192 → b9411**.

## BonjourBrowser

- **[v3.0.3](https://github.com/andriydruk/BonjourBrowser/releases/tag/v3.0.3)** — Fixed mDNS service discovery on **Android 16+** where the home screen showed no services. The raw-socket resolver now holds a `MulticastLock` (with the new `CHANGE_WIFI_MULTICAST_STATE` permission) and binds to an ephemeral source port so responders send unicast replies per RFC 6762 §5.1. Reworked the open-source licences screen, replacing the ANR-prone WebView with a lightweight TextView.

## spark-cli-skills

- **[1.1.0](https://github.com/readdle/spark-cli-skills/releases/tag/1.1.0)** — Expanded the **`use-spark`** base skill to Spark CLI 1.1.0 triage-level write commands (drafts, team comments, email/contact actions). Added **11 triage recipes** (inbox-zero, vacation-catchup, new-sender-review, draft-batch, meeting-followup, shared-inbox-triage, delegate-and-track, priority-tuning, newsletter-cleanup, notification-hygiene, label-organize) and an **8-persona library** (exec-assistant, founder, team-lead, project-manager, sales-rep, support-agent, meeting-manager, freelancer). Introduced per-account access levels (`read-only` / `triage`).
- **[1.2.1](https://github.com/readdle/spark-cli-skills/releases/tag/1.2.1)** — Updated the base skill to Spark CLI 1.2.1: new **`attachment`**, **`templates`**, and **`template`** commands. `search` gained a keyword-less list mode (paged table across all folders/accounts). `draft` gained team-shared drafts, collaboration flags, and template support. `thread` and `meeting` now accept Spark deep links.

## spark-claude-extension

- **[1.1.0](https://github.com/readdle/spark-claude-extension/releases/tag/1.1.0)** — Added write access on top of 1.0.0's read-only tools: **`draft`** (new/reply/forward/update with attachments and markdown), **`comment`** (team chat with auto-share), **`action`** (archive, pin, snooze, move, label, assign, share, mark done, reclassify), and **`contact-action`**. Per-account/shared-inbox access levels (`read-only` / `triage`). Added a privacy policy and tool annotations.
- **[1.2.1](https://github.com/readdle/spark-claude-extension/releases/tag/1.2.1)** — Surfaced 1.2.1 tools: **`attachment`** reading directly through MCP (images, audio, text, PDFs), **`templates`** and **`template`** listing, `draft` template application and sharing, and the new keyword-less `search` list mode across every folder and account.
