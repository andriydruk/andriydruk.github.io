var ldModule = null;
var ldDetectFT, ldDetectCLD3, ldDetectCLD2;

LangDetect({ locateFile: function(path) { return '/langdetect/' + path; } }).then(function(m) {
  ldModule = m;
  ldDetectFT = m.cwrap('detect_fasttext', 'string', ['string', 'number']);
  ldDetectCLD3 = m.cwrap('detect_cld3', 'string', ['string', 'number']);
  ldDetectCLD2 = m.cwrap('detect_cld2', 'string', ['string', 'number']);
  document.getElementById('ld-status').textContent = 'Ready. Type to detect language.';
}).catch(function(e) {
  document.getElementById('ld-status').textContent = 'Failed to load WASM module.';
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
