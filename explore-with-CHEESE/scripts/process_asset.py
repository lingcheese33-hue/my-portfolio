#!/usr/bin/env python3
"""
Asset processing pipeline for Explore with Cheese letter assets.
Usage: python3 process_asset.py <input_url_or_path> <output_webp_path>
Steps: download (if URL) → rembg background removal → trim → 8% margin → resize ≤900 → WebP q90 → verify
"""
import sys, os, ssl, urllib.request, warnings, time, json
warnings.filterwarnings('ignore')
from PIL import Image
from rembg import remove

def download(url, dest):
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, context=ctx, timeout=120) as resp:
        data = resp.read()
    with open(dest, 'wb') as f:
        f.write(data)
    return len(data)

def process(src, outpath):
    t0 = time.time()
    im = Image.open(src)
    if im.mode != 'RGBA':
        im = im.convert('RGBA')
    # Background removal
    result = remove(im)
    # Trim transparent padding
    bbox = result.getbbox()
    if bbox is None:
        raise RuntimeError('No content found after background removal')
    cropped = result.crop(bbox)
    # Add 8% safe margin
    w, h = cropped.size
    margin = int(max(w, h) * 0.08)
    padded = Image.new('RGBA', (w + 2*margin, h + 2*margin), (0, 0, 0, 0))
    padded.paste(cropped, (margin, margin))
    # Resize max 900px
    padded.thumbnail((900, 900), Image.Resampling.LANCZOS)
    # Save WebP
    os.makedirs(os.path.dirname(outpath), exist_ok=True)
    padded.save(outpath, 'WEBP', quality=90, method=6)
    # Verify
    verify = Image.open(outpath)
    alpha_ok = verify.mode == 'RGBA'
    size_kb = os.path.getsize(outpath) / 1024
    info = {
        'output': outpath,
        'mode': verify.mode,
        'size': list(verify.size),
        'file_kb': round(size_kb, 1),
        'has_alpha': alpha_ok,
        'trimmed_bbox': list(bbox),
        'time_s': round(time.time() - t0, 1),
    }
    print(json.dumps(info, indent=2))
    return info

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print('Usage: python3 process_asset.py <url_or_path> <output.webp>')
        sys.exit(1)
    src = sys.argv[1]
    out = sys.argv[2]
    if src.startswith('http'):
        tmp = '/tmp/asset_input_' + str(int(time.time())) + '.jpg'
        n = download(src, tmp)
        print(f'Downloaded {n} bytes', file=sys.stderr)
        src = tmp
    process(src, out)
