+++
categories = ["Development"]
date = "2026-04-11T12:00:00+03:00"
description = "Pure C reimplementations of CLD3 and FastText language detection — no dependencies, no external files, all weights embedded in the binary."
draft = false
title = "Compact Compact Language Detector"
onmain = true
comments = true

+++

In a modern world full of AI, detecting the language of a text sounds like a simple task. But in applied AI, it still matters a lot. And because of that, we naturally want a simple, compact library that can detect language reliably in any kind of application. By any kind, I mean literally any: a server app, a desktop app, a mobile app, or even a web app.

#### Why CLD2 Worked For Us

When we ran into this problem a long time ago at [Spark](https://sparkmailapp.com/), we decided we needed a cross-platform language detection library that could run on the client side on every platform. We chose [CLD2 (Compact Language Detection 2)](https://github.com/CLD2Owners/cld2), developed by Google. It is a fairly old Apache 2.0 C++ library based on n-grams, and it does exactly what its name promises. It is a small C++ library with zero dependencies, with all data embedded directly in the source code - just compile and run. We liked it, wrapped it in Swift, and started using it in our apps.

<!--more-->

#### Why Modern Alternatives Stopped Feeling Compact

But over time, I kept wondering why we were still using such an old library, especially because I knew there were more modern options that performed better. Some Spark users had complained that detection was sometimes inaccurate, especially for short messages. [CLD3](https://github.com/google/cld3) from Google and [FastText](https://github.com/facebookresearch/fastText) from Facebook both do a better job in terms of accuracy. In most benchmarks and quality comparisons, they outperform CLD2. But here is the real problem: they are no longer compact. At least not in the way I understand that word.

CLD3 also became part of the Chromium open-source project. Its model weights are actually embedded in the source code, much like CLD2. But the codebase depends on Protocol Buffers for its internal framework - configuration parsing, feature extraction descriptors, and data structures all use protobuf types. You might ask: "Why would a language detector need Protocol Buffers?" The answer is that CLD3 inherited Chromium's infrastructure. Everything there already uses C++ and Protocol Buffers, so it made sense internally. But from the point of view of someone consuming the library outside Chromium, this heavy dependency makes it much less practical in the kind of environment where we used CLD2.

FastText from Facebook takes a different approach. It ships the model as a separate binary file (lid.176.ftz), and you need the FastText library to load and run it. Great for research, but not exactly "drop into your project and compile."

If CLD stands for Compact Language Detector, and its successors are no longer compact, then the fix seems obvious: make them compact again. Compact Compact.

#### What I Built

Let me introduce two libraries:

* [Compact Compact Language Detector 3 (ccld3)](https://github.com/andriydruk/ccld3)
* [Compact FastText](https://github.com/andriydruk/compact-fasttext)

Both libraries are written in pure C. They have zero dependencies and no external files, with all weights embedded directly in the source. For the build system, I provide CMake and my beloved SPM, but you can integrate them however you like.

In other words, "compact" here means four things:

* pure C
* zero dependencies
* no external model files
* weights embedded directly in the source

#### Quick Comparison

<style>
.cmp-table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px; }
.cmp-table th, .cmp-table td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
.cmp-table th { background: #f7f7f7; font-weight: 600; }
</style>

Here is a side-by-side summary of the tradeoffs:

<table class="cmp-table">
<tr><th></th><th>CLD2</th><th>Compact FastText</th><th>CCLD3</th></tr>
<tr><td>Languages</td><td>80+</td><td>176</td><td>109</td></tr>
<tr><td>Model data</td><td>~8.5 MB</td><td>~2.6 MB</td><td>~1.4 MB</td></tr>
<tr><td>Approach</td><td>N-gram lookup tables</td><td>PQ embeddings + HS tree</td><td>Neural network (quantized)</td></tr>
<tr><td>Validated against</td><td>—</td><td>Official Python ✅</td><td>Official C++ ✅</td></tr>
<tr><td>Agreement</td><td>—</td><td>100% / 3000 samples</td><td>100% / 3000 samples</td></tr>
</table>

An important thing to note: we did not shrink or re-quantize the models ourselves. The weights are used exactly as the original authors published them. CLD3's embeddings were already uint8-quantized by Google in the original source code. FastText's ftz was already product-quantized by Facebook (that is how they compressed the model from 125 MB down to 917 KB). We just wrote the inference engine in plain C and converted the original weights into C arrays. That is why we can validate against the reference implementations and get 100% agreement - the math is the same, the weights are the same, only the packaging changed.

> **Bottom line:** both projects preserve the original weights and behavior while packaging them as dependency-free C libraries.

#### Live Demo

To show how compact these libraries have become, all three compile into a single 2.8 MB WebAssembly binary. Here is a live comparison:

<div style="margin: 24px 0;">
<style>
  .ld-textarea { width: 100%; height: 100px; border: 1px solid #ddd; border-radius: 6px; padding: 12px; font-size: 14px; color: #333; background: #fafafa; resize: vertical; outline: none; font-family: inherit; }
  .ld-textarea:focus { border-color: #66afe9; box-shadow: 0 0 0 2px rgba(102,175,233,0.25); background: #fff; }
  .ld-textarea::placeholder { color: #aaa; }
  .ld-results { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-top: 14px; }
  .ld-card { background: #f5f5f5; border: 1px solid #eee; border-radius: 6px; padding: 14px; }
  .ld-card-title { font-size: 0.7em; text-transform: uppercase; letter-spacing: 1px; color: #999; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; }
  .ld-card-title .ld-time { font-size: 0.9em; color: #bbb; text-transform: none; letter-spacing: 0; }
  .ld-lang { font-size: 1.6em; font-weight: 700; color: #222; }
  .ld-lang.ld-und { color: #ccc; }
  .ld-conf { font-size: 0.85em; color: #666; margin-top: 2px; }
  .ld-bar { height: 3px; background: #e8e8e8; border-radius: 2px; margin-top: 8px; overflow: hidden; }
  .ld-bar-fill { height: 100%; border-radius: 2px; transition: width 0.3s ease; }
  .ld-bar-fill.ld-cld2 { background: #e67e22; }
  .ld-bar-fill.ld-ft { background: #3498db; }
  .ld-bar-fill.ld-cld3 { background: #27ae60; }
  .ld-sec { margin-top: 8px; font-size: 0.8em; color: #aaa; }
  .ld-sec span { color: #888; }
  .ld-status { margin-top: 10px; font-size: 0.8em; color: #bbb; }
  @media (max-width: 600px) { .ld-results { grid-template-columns: 1fr; } }
</style>

<textarea class="ld-textarea" id="ld-input" placeholder="Type or paste text in any language..."></textarea>

<div class="ld-results">
  <div class="ld-card">
    <div class="ld-card-title">CLD2 <span class="ld-time" id="ld-time-cld2"></span></div>
    <div class="ld-lang ld-und" id="ld-lang-cld2">---</div>
    <div class="ld-conf" id="ld-conf-cld2"></div>
    <div class="ld-bar"><div class="ld-bar-fill ld-cld2" id="ld-bar-cld2" style="width:0%"></div></div>
    <div class="ld-sec" id="ld-sec-cld2"></div>
  </div>
  <div class="ld-card">
    <div class="ld-card-title">FastText <span class="ld-time" id="ld-time-ft"></span></div>
    <div class="ld-lang ld-und" id="ld-lang-ft">---</div>
    <div class="ld-conf" id="ld-conf-ft"></div>
    <div class="ld-bar"><div class="ld-bar-fill ld-ft" id="ld-bar-ft" style="width:0%"></div></div>
    <div class="ld-sec" id="ld-sec-ft"></div>
  </div>
  <div class="ld-card">
    <div class="ld-card-title">CLD3 <span class="ld-time" id="ld-time-cld3"></span></div>
    <div class="ld-lang ld-und" id="ld-lang-cld3">---</div>
    <div class="ld-conf" id="ld-conf-cld3"></div>
    <div class="ld-bar"><div class="ld-bar-fill ld-cld3" id="ld-bar-cld3" style="width:0%"></div></div>
    <div class="ld-sec" id="ld-sec-cld3"></div>
  </div>
</div>

<div class="ld-status" id="ld-status">Loading WASM module...</div>

<script src="/langdetect/langdetect.js"></script>
<script>
var ldModule = null;
var ldDetectFT, ldDetectCLD3, ldDetectCLD2;

fetch('/langdetect/langdetect.wasm')
  .then(function(r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.arrayBuffer();
  })
  .then(function(bin) {
    return LangDetect({ wasmBinary: bin });
  })
  .then(function(m) {
    ldModule = m;
    ldDetectFT = m.cwrap('detect_fasttext', 'string', ['string', 'number']);
    ldDetectCLD3 = m.cwrap('detect_cld3', 'string', ['string', 'number']);
    ldDetectCLD2 = m.cwrap('detect_cld2', 'string', ['string', 'number']);
    document.getElementById('ld-status').textContent = 'Ready. Type to detect language.';
  }).catch(function(e) {
    document.getElementById('ld-status').textContent = 'Failed to load WASM module: ' + e.message;
    console.error('WASM load error:', e);
  });

var ldTimer = null;
document.getElementById('ld-input').addEventListener('input', function() {
  clearTimeout(ldTimer);
  ldTimer = setTimeout(ldRun, 150);
});

function ldRun() {
  if (!ldModule) return;
  var text = document.getElementById('ld-input').value;
  if (!text.trim()) { ldClear(); return; }
  var len = new TextEncoder().encode(text).length;

  var t0 = performance.now();
  var r = JSON.parse(ldDetectCLD2(text, len));
  ldShow('cld2', r, performance.now() - t0);

  t0 = performance.now();
  r = JSON.parse(ldDetectFT(text, len));
  ldShow('ft', r, performance.now() - t0);

  t0 = performance.now();
  r = JSON.parse(ldDetectCLD3(text, len));
  ldShow('cld3', r, performance.now() - t0);

  document.getElementById('ld-status').textContent = len + ' bytes analyzed';
}

function ldShow(id, r, ms) {
  var lang = r.lang || 'und';
  var pct = Math.round((r.prob || 0) * 100);
  var el = document.getElementById('ld-lang-' + id);
  el.textContent = lang.toUpperCase();
  el.className = 'ld-lang' + (lang === 'und' ? ' ld-und' : '');
  document.getElementById('ld-conf-' + id).textContent = pct > 0 ? pct + '%' : '';
  document.getElementById('ld-bar-' + id).style.width = pct + '%';
  document.getElementById('ld-time-' + id).textContent = ms.toFixed(1) + 'ms';
  var sec = '';
  if (r.lang2 && r.prob2 > 0.01) sec += '<span>' + r.lang2 + '</span> ' + Math.round(r.prob2*100) + '%';
  if (r.lang3 && r.prob3 > 0.01) sec += '  <span>' + r.lang3 + '</span> ' + Math.round(r.prob3*100) + '%';
  document.getElementById('ld-sec-' + id).innerHTML = sec;
}

function ldClear() {
  ['cld2', 'ft', 'cld3'].forEach(function(id) {
    document.getElementById('ld-lang-' + id).textContent = '---';
    document.getElementById('ld-lang-' + id).className = 'ld-lang ld-und';
    document.getElementById('ld-conf-' + id).textContent = '';
    document.getElementById('ld-bar-' + id).style.width = '0%';
    document.getElementById('ld-time-' + id).textContent = '';
    document.getElementById('ld-sec-' + id).innerHTML = '';
  });
  document.getElementById('ld-status').textContent = 'Ready. Type to detect language.';
}
</script>
</div>

> There is a known issue with CLD3 on short text. It is generally recommended for inputs longer than 150 characters, or to use it together with CLD2 as a companion.

I deliberately don't want to compare accuracy here - there are plenty of articles and benchmarks about that already. We're focused on evaluating these libraries against our own data and our own pain points at Spark, and we're still deciding which one we'll ultimately switch to. But the hardest part is done: both CLD3 and FastText have been compacted back to what a language detection library should be - a single dependency you drop into your project and forget about.

*P.S. There is a [separate page just for language detection](https://andriydruk.com/langdetect/) where you can try all three libraries live in WebAssembly.*
