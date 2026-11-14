#!/usr/bin/env python3
"""Print the canonical generation brief; historical style overrides are forbidden."""
import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def brief(no, scene=None):
    prompts = json.loads((ROOT / 'docs/illustration-prompts.json').read_text())
    if any('style_prompt' in entry for entry in prompts['entries'].values()):
        raise ValueError('Per-entry style_prompt overrides are forbidden')
    queue = json.loads((ROOT / 'docs/illustration-regeneration-queue.json').read_text())
    job = next((e for e in queue['entries'] if e['no'] == no), None)
    if job and job['status'] not in ('registered', 'published'):
        scene = job['suggested_scene_prompt']
        avoid = job.get('avoid_composition_of', [])
    else:
        scene = scene or prompts['entries'].get(str(no), {}).get('scene_prompt')
        avoid = []
    if not scene:
        raise ValueError('Read MOE meaning and supply an original --scene for this new entry')
    return {'no': no, 'style_prompt': prompts['style_prompt'],
            'scene_prompt': scene, 'avoid_composition_of': avoid,
            'prompt': prompts['style_prompt'] + scene}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('no', type=int)
    parser.add_argument('--scene')
    args = parser.parse_args()
    print(json.dumps(brief(args.no, args.scene), ensure_ascii=False, indent=2))
