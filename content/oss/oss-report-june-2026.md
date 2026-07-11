+++
date = "2026-06-30T00:00:00+03:00"
title = "Open Source Report"
subtitle = "June 2026"
slug = "2026-06"
draft = false
image = "/img/og/oss-report-june-2026.png"
comments = true
+++

The big theme this month was turning **LMPlayground** from a chat app into an **agentic, multimodal** one. **1.7.0** gave capable models **tools** — web search, page fetch, and a JavaScript sandbox they can call mid-reply. **1.8.0** then added on-device **vision**: attach a photo (or snap one) and chat about it with Gemma, Qwen, or Ministral vision models, all running locally.

Both Spark projects shipped **1.2.2**, whose headline is **Windows support** — the CLI, the skills, and the Claude connector now run on Windows alongside macOS.

## LMPlayground

- **[1.7.0](https://github.com/andriydruk/LMPlayground/releases/tag/1.7.0)** — **Tools** — capable models can now **search the web, fetch a page, and run JavaScript** during a reply, toggled per model in Settings → Tools.
- **[1.7.1](https://github.com/andriydruk/LMPlayground/releases/tag/1.7.1)** — Added **Gemma 4 12B** (Google) and **Granite 4.1 3B & 8B** (IBM) to the model catalog.
- **[1.8.0](https://github.com/andriydruk/LMPlayground/releases/tag/1.8.0)** — **Vision** — send or snap a photo and ask your model what it sees, with Gemma, Qwen, and Ministral vision models, running fully on-device. Enabled the **Vulkan GPU backend**.

## spark-cli-skills

- **[1.2.2](https://github.com/readdle/spark-cli-skills/releases/tag/1.2.2)** — **Windows support** for the Spark CLI, in addition to macOS. Added **`recipe-unsubscribe-audit`** — a full unsubscribe audit that scans inbox, archive, and GateKeeper for newsletter senders, classifies by volume and engagement, flags phishing and duplicates, then unsubscribes (contributed by @quser).

## spark-claude-extension

- **[1.2.2](https://github.com/readdle/spark-claude-extension/releases/tag/1.2.2)** — **Windows support** — the Claude connector now runs on Windows alongside macOS.
