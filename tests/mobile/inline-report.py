# Makes a report that works on its own: embeds every before/after photo.
# Usage: python3 tests/mobile/inline-report.py .mobile-audit/batch-2b report-b2b.html report-b2b-standalone.html
import base64, io, re, sys, os
from PIL import Image

folder = sys.argv[1]          # e.g. .mobile-audit/batch-2b
src_html = sys.argv[2]        # report-b2b.html
out_html = sys.argv[3]        # report-b2b-standalone.html

html = open(os.path.join(folder, src_html), encoding="utf-8").read()
cache = {}

def data_uri(rel):
    if rel in cache:
        return cache[rel]
    im = Image.open(os.path.join(folder, rel)).convert("RGB")
    buf = io.BytesIO()
    im.save(buf, "WEBP", quality=55, method=6)
    uri = "data:image/webp;base64," + base64.b64encode(buf.getvalue()).decode()
    cache[rel] = uri
    return uri

# <a href="X"><img src="X"> -> keep one copy of the data; the link becomes click-to-enlarge via script
html = re.sub(r'<a href="((?:before|after)/[^"]+\.png)">', r'<a href="#" class="zoom">', html)
html = re.sub(r'src="((?:before|after)/[^"]+\.png)"', lambda m: 'src="%s"' % data_uri(m.group(1)), html)

script = """
<script>
document.addEventListener('click', function (e) {
  var a = e.target.closest && e.target.closest('a.zoom');
  if (!a) return;
  e.preventDefault();
  var img = a.querySelector('img');
  if (!img) return;
  fetch(img.src).then(function (r) { return r.blob(); }).then(function (b) {
    window.open(URL.createObjectURL(b), '_blank');
  });
});
</script>
"""
html = html.replace("</body>", script + "</body>") if "</body>" in html else html + script
open(os.path.join(folder, out_html), "w", encoding="utf-8").write(html)
print("images embedded:", len(cache), "size MB:", round(os.path.getsize(os.path.join(folder, out_html)) / 1e6, 1))
