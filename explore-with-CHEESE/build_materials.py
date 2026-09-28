#!/usr/bin/env python3
"""Convert ASSET_PLAN.json into docs/materials.json format."""
import json, os

ROOT = os.path.dirname(os.path.abspath(__file__))
plan_path = os.path.join(ROOT, 'ASSET_PLAN.json')
out_path = os.path.join(ROOT, 'docs', 'materials.json')

with open(plan_path) as f:
    plan = json.load(f)

records = []
for a in plan['assets']:
    style = f"Classic art parody — {a['painting']} x cheese"
    records.append({
        "position": a['position'],
        "char": a['char'],
        "variant": a['variant'],
        "style": style,
        "concept": a['concept'],
        "prompt": a['prompt'],
        "filename": a['filename']
    })

with open(out_path, 'w') as f:
    json.dump(records, f, indent=2, ensure_ascii=False)

print(f"Wrote {len(records)} records to {out_path}")
