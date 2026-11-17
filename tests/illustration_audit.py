#!/usr/bin/env python3
"""Check overlap handling and corruption detection on an isolated catalog."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('audit', ROOT / 'scripts/illustration_audit.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class AuditTest(unittest.TestCase):
    def test_overlapping_findings_are_one_task_and_collisions_are_reported(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            def write(path, value):
                target = root / path
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_text(json.dumps(value))
            write('data/moe-index.json', [
                {'no': 1, 'w': '甲乙丙丁'}, {'no': 2, 'w': '戊己庚辛'},
                {'no': 3, 'w': '壬癸子丑'}])
            art = {'word': '甲乙丙丁', 'src': 'img/idioms/shared.webp',
                   'alt': '描述畫面', 'width': 1536, 'height': 1024,
                   'originalSha256': 'same-original'}
            write('data/illustrations.json', {'entries': {'1': art, '2': art}})
            image = root / art['src']
            image.parent.mkdir(parents=True)
            image.write_bytes(b'identical-image-content')
            write('docs/illustration-prompts.json', {'entries': {'1': {}, '2': {}}})
            strict = {'passed': True, 'checks': {key: {'passed': True,
                      'evidence': 'fixture evidence'} for key in module.CHECKS}}
            write('docs/illustration-reviews.json', {'entries': {
                '1': {'passed': True, 'checks': {'style': 'legacy text'}},
                '2': strict}})
            write('docs/illustration-regeneration-queue.json', {'entries': []})
            write('docs/illustration-revisions.json', [])
            write(module.SOURCE_REVIEW, {
                'P2_style_regenerate': {'nos': [1],
                    'uniform_red_neckerchief_examples': [1]},
                'P3_minor_optional': [{'no': 1}]})
            original_root = module.ROOT
            try:
                module.ROOT = root
                report = module.audit()
            finally:
                module.ROOT = original_root
            self.assertEqual([task['no'] for task in report['tasks']], [1, 3])
            self.assertEqual(set(report['tasks'][0]['actions']), {
                'review_legacy_checklist', 'P2_style_review',
                'red_neckerchief_review', 'P3_optional_review'})
            self.assertEqual(report['summary']['missing_illustrations'], 1)
            self.assertEqual(report['summary']['review_eight_checks'], 1)
            self.assertEqual(report['integrity']['duplicate_webp_sha256'], [[1, 2]])
            self.assertEqual(report['integrity']['duplicate_original_sha256'], [[1, 2]])
            self.assertEqual(report['integrity']['errors'], ['2: word mismatch'])
            # Resolution applies only to an explicitly recorded finding on the
            # currently installed replacement, not to all historical findings.
            write('docs/illustration-revisions.json', [{
                'no': 1, 'replacement': art['src'],
                'resolved_findings': ['P2_style_review']}])
            try:
                module.ROOT = root
                resolved_report = module.audit()
            finally:
                module.ROOT = original_root
            actions = resolved_report['tasks'][0]['actions']
            self.assertNotIn('P2_style_review', actions)
            self.assertIn('P3_optional_review', actions)
            self.assertIn('red_neckerchief_review', actions)


if __name__ == '__main__':
    unittest.main()
