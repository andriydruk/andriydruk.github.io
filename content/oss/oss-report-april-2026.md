+++
date = "2026-04-30T00:00:00+03:00"
title = "Open Source Report"
subtitle = "April 2026"
slug = "2026-04"
draft = false
image = "/img/og/oss-report-april-2026.png"
comments = true
+++

Rare event - I actually wrote a blog post. **[Compact Compact Language Detector](https://www.andriydruk.com/post/compact-compact-language-detector/)** is the launch post for two new pure-C language-detection libraries: **ccld3** and **compact-fasttext**. Both keep the original weights but drop the C++/protobuf/external-model baggage, and both check 100% against their reference implementations. There's a WebAssembly demo running CLD2, FastText, and CLD3 side-by-side in the browser.

Another big month for **LMPlayground** - seven releases shipped to Google Play, adding system prompts, full localization in 28 languages, a device-language-aware model catalog, generation speed metrics, and a RAM-fit gate that blocks oversized models before they crash low-memory phones. The whole release pipeline is now fully automated with **fastlane**: store listing, "What's New" notes, and Paparazzi-generated marketing screenshots all roll out from a single push, in all 28 locales.

Two new Spark-related projects shipped their **1.0.0**: **spark-cli-skills** packages 13 AI-agent recipes for the Spark CLI, and **spark-claude-extension** wraps Spark as a Claude Desktop MCP bundle.

Two new sites went live:
* **[druk.me](https://druk.me/)** as a new personal domain (front page only for now).
* **[lmplayground.app](https://lmplayground.app/)** as the landing page for LMPlayground (also localized in 28 languages)

## LMPlayground

- **[1.4.3](https://github.com/andriydruk/LMPlayground/releases/tag/1.4.3)** — Added Gemma 4 (E2B, E4B). Per-model generation parameter persistence. Thinking budget control for all thinking model formats via llama.cpp PEG parser (Qwen3, DeepSeek, Gemma 4).
- **[1.4.4](https://github.com/andriydruk/LMPlayground/releases/tag/1.4.4)** — Generation speed metrics (response time and tok/s per message). Added LFM2.5 350M. Model hint on conversation reload. Automated Google Play deployment via GitHub Actions.
- **[1.4.5](https://github.com/andriydruk/LMPlayground/releases/tag/1.4.5)** — Performance and stability improvemtns. Hide tok/s and time stats while generation is still in progress.
- **[1.4.6](https://github.com/andriydruk/LMPlayground/releases/tag/1.4.6)** — Fixed token speed stats not showing for all messages in a session.
- **[1.5.0](https://github.com/andriydruk/LMPlayground/releases/tag/1.5.0)** — **System prompts library** with per-model MRU. **Localized UI in 28 languages** (Arabic, Chinese, Hebrew, Hindi, Japanese, Korean, Polish, Portuguese, Spanish, Thai, Ukrainian, Vietnamese, and more).
- **[1.5.1](https://github.com/andriydruk/LMPlayground/releases/tag/1.5.1)** — **Device-language-aware model catalog** — splits models into "Supports your language" and "Other models" using HuggingFace model card language declarations. In-app language picker in Settings via AppCompat per-app locale API.
- **[1.5.2](https://github.com/andriydruk/LMPlayground/releases/tag/1.5.2)** — **RAM-fit gate on model load** — refuses weights larger than 70% of total device RAM with a clear error, preventing the crash mmap'd models trigger on low-RAM phones. Performance and stability improvemnts.

## spark-cli-skills

- **[1.0.0](https://github.com/readdle/spark-cli-skills/releases/tag/1.0.0)** — Initial release. Ships the **`use-spark`** base skill with a complete command reference for the Spark CLI (mail, calendar, contacts, teams, meetings) plus 13 recipes covering inbox triage by category, morning standup, meeting prep, invitation handling, scheduling, end-of-day review, weekly digest, multi-account review, topic timelines, stakeholder briefs, shared-inbox health, team workload audits, and calendar audits.

## spark-claude-extension

- **[1.0.0](https://github.com/readdle/spark-claude-extension/releases/tag/1.0.0)** — Initial release. Ships **`Spark.mcpb`**, a Claude Desktop extension bundle (MCP server) that gives Claude read-only access to Spark on macOS - browse accounts, folders, and emails with Gmail-style filters; search by topic (keyword + semantic); read full threads with headers, bodies, and attachments; list calendar events and find mutual availability; look up contacts and team info; list and read meeting transcripts with summaries and notes. Companion **`Spark.skill`** archive bundles the CLI skill for direct import.

## ccld3

- **[Initial release](https://github.com/andriydruk/ccld3)** — **Compact Compact Language Detector 3**. A pure-C inference engine for Google's CLD3 model with zero dependencies and weights embedded in source - no C++, no protobuf, no external model file. **109 languages**, ~1.4 MB of model data. Validated against the official C++ implementation: **100% agreement on 3000 samples**. CMake and SwiftPM build setups.

## compact-fasttext

- **[Initial release](https://github.com/andriydruk/compact-fasttext)** — **Compact FastText**. A pure-C inference engine for Facebook's `lid.176.ftz` FastText model with zero dependencies and weights embedded in source - no FastText runtime, no external `.ftz` file. **176 languages**, ~2.6 MB of model data. Validated against the official Python implementation: **100% agreement on 3000 samples**. CMake and SwiftPM build setups.

## Writing

- **[Compact Compact Language Detector](https://www.andriydruk.com/post/compact-compact-language-detector/)** — Long-form launch post for **ccld3** and **compact-fasttext**. Covers why CLD2 worked for Spark, why CLD3 (protobuf) and FastText (separate model file) stopped feeling compact, and how repackaging the original Google/Facebook weights as pure-C inference engines brings them back to "drop in and forget" territory. Includes a side-by-side comparison table and a **WebAssembly demo** running CLD2, FastText, and CLD3 in the browser.

## Websites

- **[lmplayground.app](https://lmplayground.app/)** — New marketing site for LMPlayground. Sections cover on-device privacy (zero packets during inference), 25+ curated mobile-friendly models, the three-tap install flow, and the **28-language UI**. The site itself is also localized in 28 languages.
- **[druk.me](https://druk.me/)** — New personal domain. Single-page card site for now, deployed via GitHub Pages with a custom domain.
