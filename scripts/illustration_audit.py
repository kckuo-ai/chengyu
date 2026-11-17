#!/usr/bin/env python3
"""Build one deduplicated worklist from the catalog and existing review evidence.

This is a file/record audit, not a new visual review. Historical findings remain
review candidates until a replacement and its review resolve them.
"""
import argparse
import collections
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CHECKS = ('meaning', 'composition', 'hands_feet_pose',
          'objects_contact_perspective', 'text_brand_watermark', 'style',
          'taiwan_context', 'no_red_neckerchief')
SOURCE_REVIEW = 'docs/reviews/2026-11-14-independent-review.json'


def read(path):
    return json.loads((ROOT / path).read_text())


def audit():
    index = read('data/moe-index.json')
    catalog = read('data/illustrations.json')['entries']
    prompts = read('docs/illustration-prompts.json')['entries']
    reviews = read('docs/illustration-reviews.json')['entries']
    p1 = read('docs/illustration-regeneration-queue.json')['entries']
    historical = read(SOURCE_REVIEW)
    revisions = read('docs/illustration-revisions.json')
    resolved = set()
    for revision in revisions:
        no = str(revision['no'])
        review = reviews.get(no, {})
        if (catalog.get(no, {}).get('src') == revision.get('replacement')
                and review.get('passed') is True and not review.get('issues')
                and not review.get('regenerate')):
            resolved.update((no, tag) for tag in revision.get('resolved_findings', []))
    p1_done = {str(e['no']) for e in p1 if e.get('status') == 'published'}
    style = {str(n) for n in historical['P2_style_regenerate']['nos']}
    # The P1 replacement of 1046 includes the required no-red-scarf review.
    scarf = {str(n) for n in historical['P2_style_regenerate'][
        'uniform_red_neckerchief_examples']} - p1_done
    minor = {str(e['no']) for e in historical['P3_minor_optional']}
    tasks = []
    counts = collections.Counter()
    srcs, originals, webps = (collections.defaultdict(list) for _ in range(3))
    errors = []
    unrecorded = legacy = strict = 0
    for entry in index:
        n = str(entry['no'])
        art = catalog.get(n)
        actions = []
        if art is None:
            actions.append('create_new_art')
        else:
            path = ROOT / art['src']
            if art['word'] != entry['w']:
                errors.append(f'{n}: word mismatch')
            if not path.resolve().is_relative_to(ROOT / 'img/idioms'):
                errors.append(f'{n}: asset outside illustration directory')
            elif not path.is_file() or not path.stat().st_size:
                errors.append(f'{n}: missing or empty asset')
            else:
                webps[hashlib.sha256(path.read_bytes()).hexdigest()].append(int(n))
            srcs[art['src']].append(int(n))
            if art.get('originalSha256'):
                originals[art['originalSha256']].append(int(n))
            review = reviews.get(n)
            if review is None:
                unrecorded += 1
                actions.append('review_record_missing')
            elif all(isinstance(review.get('checks', {}).get(k), dict)
                     and review['checks'][k].get('passed') is True
                     and str(review['checks'][k].get('evidence', '')).strip()
                     for k in CHECKS) and review.get('passed') is True:
                strict += 1
            else:
                legacy += 1
                actions.append('review_legacy_checklist')
            if review and review.get('passed') is not True:
                actions.append('review_unresolved')
            if n not in prompts:
                actions.append('prompt_record_missing')
            if any(art['word'][i:i+2] in art['alt']
                   for i in range(len(art['word']) - 1)):
                actions.append('alt_contains_idiom_bigram')
            if art['width'] * 2 != art['height'] * 3:
                actions.append('legacy_format_review')
            if n in style and (n, 'P2_style_review') not in resolved:
                actions.append('P2_style_review')
            if n in scarf and (n, 'red_neckerchief_review') not in resolved:
                actions.append('red_neckerchief_review')
            if n in minor and (n, 'P3_optional_review') not in resolved:
                actions.append('P3_optional_review')
        if n in {str(e['no']) for e in p1 if e.get('status') != 'published'}:
            actions.append('P1_replacement')
        if actions:
            counts.update(actions)
            task = {'no': int(n), 'word': entry['w'], 'actions': actions}
            if art:
                task['src'] = art['src']
            tasks.append(task)
    unreferenced = sorted(str(p.relative_to(ROOT)) for p in
                          (ROOT / 'img/idioms').glob('*.webp')
                          if str(p.relative_to(ROOT)) not in srcs)
    report = {
        'schema_version': 1,
        'sources': {
            'completion': 'data/illustrations.json',
            'scope': 'data/moe-index.json',
            'reviews': 'docs/illustration-reviews.json',
            'prompts': 'docs/illustration-prompts.json',
            'P1': 'docs/illustration-regeneration-queue.json',
            'resolved_findings': 'docs/illustration-revisions.json',
            'historical_findings': SOURCE_REVIEW,
        },
        'limits': 'Record and asset audit only; no new visual pass is implied. '
                  'Missing/legacy evidence is not a failed image. Task categories '
                  'overlap; count unique tasks, not the sum of action counts.',
        'summary': {
            'total_idioms': len(index), 'published_illustrations': len(catalog),
            'missing_illustrations': len(index) - len(catalog),
            'coverage_percent': round(100 * len(catalog) / len(index), 2),
            'P1_published': len(p1_done), 'P1_total': len(p1),
            'review_records': len(reviews), 'review_missing': unrecorded,
            'review_legacy': legacy, 'review_eight_checks': strict,
            'unique_task_idioms': len(tasks), 'action_counts': dict(counts),
        },
        'priority': [
            'create_new_art: complete all 1466 catalog entries first',
            'P1_replacement: resume only unresolved P1; published P1 is closed',
            'after full coverage: verify historical style/scarf findings, then '
            'optional P3, adding any confirmed failure to regeneration',
            'backfill missing/legacy review evidence and missing prompts; '
            'inspect alt and legacy format candidates without inventing evidence',
        ],
        'integrity': {
            'errors': errors,
            'duplicate_asset_paths': [v for v in srcs.values() if len(v) > 1],
            'duplicate_original_sha256': [v for v in originals.values() if len(v) > 1],
            'duplicate_webp_sha256': [v for v in webps.values() if len(v) > 1],
            'unreferenced_historical_webps': unreferenced,
            'historical_webps_action': 'retain: outside temporary-branch cleanup scope',
        },
        'tasks': tasks,
    }
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--json', action='store_true')
    parser.add_argument('--write', action='store_true',
                        help='Refresh docs/illustration-worklist.json')
    args = parser.parse_args()
    report = audit()
    if args.write:
        (ROOT / 'docs/illustration-worklist.json').write_text(
            json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    if args.json:
        print(json.dumps(report, ensure_ascii=False, indent=2))
    else:
        print(json.dumps(report['summary'], ensure_ascii=False, indent=2))
    if report['integrity']['errors']:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
