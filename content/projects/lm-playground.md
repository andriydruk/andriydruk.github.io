---
date: 2023-12-01T00:07:18+02:00
repo: "https://play.google.com/store/apps/details?id=com.druk.lmplayground"
title: "LM Playground"
project_type: "Android application"
image: "/img/lm-playground.jpg"
---

[LM Playground](https://play.google.com/store/apps/details?id=com.druk.lmplayground) is an Android app for running Large Language Models locally on your device. No cloud, no API keys, no data leaving your phone - everything runs on-device for complete privacy.

Download models from a curated list of 12 model families (Qwen, Gemma, Llama, Phi, DeepSeek, Mistral, and more) ranging from 0.6B to 8B parameters, or load any custom GGUF file. The app features rich markdown rendering in chat responses, support for reasoning models like DeepSeek R1 with styled thinking step displays, persistent conversations, and configurable generation parameters.

Under the hood, a custom download engine built on OkHttp and WorkManager handles model downloads with automatic resume for interrupted transfers, progress notifications with speed and ETA, and flexible storage management via Android's Storage Access Framework.

Built on [llama.cpp](https://github.com/ggerganov/llama.cpp) with KleidiAI-optimized kernels and OpenMP for arm64 performance. The [source code](https://github.com/andriydruk/LMPlayground) is available under the MIT license.
