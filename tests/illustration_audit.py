#!/usr/bin/env python3
"""Check overlap handling and corruption detection on an isolated catalog."""
import hashlib
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
            # Source availability overlaps review findings; it never creates a
            # second task, and a missing source is not a missing website image.
            write('docs/illustration-originals.json', {
                'repository': 'fixture/repo', 'branch': 'archive',
                'commit': 'fixture', 'index_path': 'index.json',
                'sha256s': ['same-original']})
            second = dict(art, word='戊己庚辛', originalSha256='not-archived')
            write('data/illustrations.json', {'entries': {'1': art, '2': second}})
            try:
                module.ROOT = root
                source_report = module.audit()
            finally:
                module.ROOT = original_root
            self.assertEqual([t['no'] for t in source_report['tasks']], [1, 2, 3])
            self.assertEqual(source_report['summary']['originals_missing'], 1)
            self.assertEqual(source_report['summary']['missing_illustrations'], 1)
            self.assertEqual(source_report['tasks'][1]['actions'],
                             ['original_archive_missing'])
            self.assertFalse(source_report['tasks'][1]['original_available'])
            # Passing check fields cannot override an unresolved issue, and
            # approval of another asset does not count as approval of this one.
            invalid = dict(strict, issues=['unresolved detail'], regenerate=True)
            changed = dict(strict, webp_sha256='different-image-hash')
            write('docs/illustration-reviews.json', {'entries': {
                '1': invalid, '2': changed}})
            try:
                module.ROOT = root
                stale_report = module.audit()
            finally:
                module.ROOT = original_root
            self.assertEqual(stale_report['summary']['review_eight_checks'], 0)
            self.assertIn('review_asset_changed', stale_report['tasks'][1]['actions'])
            # A new review resolves only its explicit findings on the exact
            # installed bytes, without requiring the image to be replaced.
            fresh = dict(strict, issues=[], regenerate=False,
                         webp_sha256=hashlib.sha256(image.read_bytes()).hexdigest(),
                         resolved_findings=['P3_optional_review'])
            write('docs/illustration-reviews.json', {'entries': {
                '1': fresh, '2': changed}})
            try:
                module.ROOT = root
                fresh_report = module.audit()
            finally:
                module.ROOT = original_root
            self.assertNotIn('P3_optional_review', fresh_report['tasks'][0]['actions'])
            self.assertIn('red_neckerchief_review', fresh_report['tasks'][0]['actions'])



if __name__ == '__main__':
    unittest.main()
