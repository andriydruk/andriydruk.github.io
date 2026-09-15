+++
date = "2026-08-31T00:00:00+03:00"
title = "Open Source Report"
subtitle = "August 2026"
slug = "2026-08"
draft = false
image = "/img/og/oss-report-august-2026.png"
comments = true
+++

The month went into two new pure-Swift libraries, both ports of a reference implementation in another language. **swift-pii** finds and removes personal data — a behavioural port of Microsoft's Python **Presidio**, down to the spaCy pipeline it depends on, including the dependency parser. **swift-anydoc** converts Word, PowerPoint, Excel, OpenDocument, RTF, EPUB, CSV and PDF to Markdown — a port of Rust **firecrawl/anydoc**, with the Rust binary used as an oracle so that "correct" means byte-identical rather than "the tests pass". Neither has a tagged release yet; both are public and working.

**LMPlayground** shipped **1.9.1** — three new reasoning models that can also use tools, and seven fixes, four of which were found by a new macOS harness that runs the whole model catalog against real weights instead of waiting for a phone to prove something is broken.

Both Spark projects sat still in August; their **1.3.1** landed in early September and belongs in the next report.

## LMPlayground

- **[1.9.1](https://github.com/andriydruk/LMPlayground/releases/tag/1.9.1)** — Added **LFM2.5 2.6B**, **SmolLM3 3B** and **MiniCPM5 1B** — reasoning models that can also search the web, fetch a page and run JavaScript. **LFM2.5 1.2B** now ships the Instruct build (at that size, thinking before every reply costs more latency than it returns), and **Qwen 3.5** moves from Q3_K_M to **IQ4_XS** — about half the quality loss at the same speed for 3% more download. Fixes: SmolLM3's tool calls arrived as raw XML because its published chat template never rendered them; image turns passed an uninitialised length to the tokenizer (undefined behaviour on every image); **Gemma 4 images are ~4.5× faster** on a Q8_0 projector instead of the BF16 one it shipped with, which has no optimised ARM kernel; long chats could come back empty when a stale KV cache skipped context compaction. The engine moved into a new **`:llamacpp`** JVM module so it runs without a device, which is what the new **`:model-harness`** uses to sweep the catalog on macOS — templates, tool round trips, thinking, vision, history replay, context overflow — and where four of those fixes came from. llama.cpp at **b10327**.

## swift-pii

- **[New project](https://github.com/andriydruk/swift-pii)** — **Presidio-compatible PII detection and anonymization in pure Swift**, macOS and Linux, no Apple-only frameworks and no Foundation in the core. **88 recognizers**: 17 on by default (cards, IBANs, e-mail, phone, SSN, passports, dates) and 71 country-specific ones opt-in. Detection is scored rather than binary — a Luhn-valid card is 1.0, a bare phone shape is 0.4, a supporting word nearby raises it. `Anonymizer` then redacts, masks, replaces, hashes, or encrypts reversibly. Names, places and organisations need the language model, and spaCy's **`en_core_web_sm`** is bundled (12 MB) so that path needs no download. That meant porting the pipeline itself: tokenizer, tagger, the edit-tree lemmatizer, NER, and the **dependency parser** — the last one only because spaCy forbids an entity from spanning a sentence boundary and takes those boundaries from the parse, which is what closed the final NER gaps. Measured against spaCy: **50,731/50,731 dependency heads and labels**, 2,414/2,414 sentence boundaries, exact tokenization in all seven non-English languages, and **28,669 recorded parity cases** overall. Upstream is pinned to an exact commit and CI refuses artifacts stamped with any other. Also ships a CLI whose exit status is meaningful — 1 when PII is found — which upstream's cannot do.

## swift-anydoc

- **[New project](https://github.com/andriydruk/swift-anydoc)** — **Documents to GitHub-Flavored Markdown in pure Swift**: Word, PowerPoint, Excel (including the legacy `.doc`/`.ppt`/`.xls` record formats), OpenDocument, RTF, EPUB, CSV and PDF, across 20 extensions. `Package.swift` fetches nothing; `zlib` is the single system link, and `import Foundation` is banned inside the library and checked in CI, which builds on Linux where those frameworks do not exist. ZIP, MS-CFB, a namespace-aware XML pull parser, legacy codepage tables and the whole PDF stack are written in-repo. The Rust reference is treated as an executable specification and built locally as an oracle: **57 of 58 reference fixtures convert byte-identically**, plus **168 generated adversarial PDFs** byte-identical against the reference binary, **1,384 corruption mutants** with no crashes or hangs, 265 hand-built adversarial documents, and 1,793 tests. PDF conversion runs at about **1.5×** the Rust reference. `.xlsb` is deliberately unsupported — the reference reaches it through a third-party crate and no fixture exercises it on either side, so a port would have nothing to check it against.
