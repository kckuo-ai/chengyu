#!/usr/bin/env python3
"""Validate saved review gates; this does not replace independent visual inspection."""
import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def validate(metadata, review):
    prompts = json.loads((ROOT / 'docs/illustration-prompts.json').read_text())
    if metadata.get('style_prompt') != prompts['style_prompt']:
        raise ValueError('Metadata must use the current canonical style_prompt')
    path = metadata.get('path')
    if not path or path != review.get('path') or not Path(path).is_file():
        raise ValueError('Original must exist and metadata/review paths must match exactly')
    if str(metadata.get('no')) != str(review.get('no')) or metadata.get('no') is None:
        raise ValueError('Metadata/review idiom numbers must match')
    if review.get('passed') is not True or review.get('issues') or review.get('regenerate'):
        raise ValueError('Review must pass with no unresolved issues or regeneration request')
    if not review.get('reviewer'):
        raise ValueError('Independent reviewer must be identified')
    for name in prompts['generation_policy']['required_review_checks']:
        check = review.get('checks', {}).get(name, {})
        if not isinstance(check, dict) or check.get('passed') is not True or not str(check.get('evidence', '')).strip():
            raise ValueError(f'Missing passing visual evidence for {name}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('metadata', type=Path)
    parser.add_argument('review', type=Path)
    args = parser.parse_args()
    validate(json.loads(args.metadata.read_text()), json.loads(args.review.read_text()))
    print('Review gates passed; independently inspect all other checklist items before registration.')
