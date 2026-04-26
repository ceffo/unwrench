import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseGitattributes, parseAllGitattributes } from './gitattributesParser.js';

test('empty file returns []', () => {
  assert.deepEqual(parseGitattributes('', ''), []);
});

test('blank lines and comment lines are skipped', () => {
  const content = `
# This is a comment

# Another comment
*.pb.go gitlab-generated
`;
  const result = parseGitattributes(content, '');
  assert.equal(result.length, 1);
  assert.deepEqual(result[0], { pattern: '*.pb.go', directory: '', generated: true });
});

test('simple glob — *.pb.go gitlab-generated', () => {
  const result = parseGitattributes('*.pb.go gitlab-generated', '');
  assert.deepEqual(result, [{ pattern: '*.pb.go', directory: '', generated: true }]);
});

test('negation — -gitlab-generated sets generated: false', () => {
  const result = parseGitattributes('package-lock.json -gitlab-generated', '');
  assert.deepEqual(result, [{ pattern: 'package-lock.json', directory: '', generated: false }]);
});

test('anchored pattern starting with /', () => {
  const result = parseGitattributes('/generated/ gitlab-generated', '');
  assert.deepEqual(result, [{ pattern: '/generated/', directory: '', generated: true }]);
});

test('pattern with multiple attributes — gitlab-generated among them', () => {
  const result = parseGitattributes('*.gen.ts text=auto gitlab-generated eol=lf', '');
  assert.deepEqual(result, [{ pattern: '*.gen.ts', directory: '', generated: true }]);
});

test('pattern with multiple attributes — gitlab-generated not present is skipped', () => {
  const result = parseGitattributes('*.ts text=auto eol=lf', '');
  assert.deepEqual(result, []);
});

test('directory is propagated correctly for non-root', () => {
  const result = parseGitattributes('*.gen.go gitlab-generated', 'api/proto');
  assert.deepEqual(result, [{ pattern: '*.gen.go', directory: 'api/proto', generated: true }]);
});

test('multiple lines produce multiple entries', () => {
  const content = `
*.pb.go gitlab-generated
*.gen.go gitlab-generated
package-lock.json -gitlab-generated
`;
  const result = parseGitattributes(content, '');
  assert.equal(result.length, 3);
  assert.deepEqual(result[0], { pattern: '*.pb.go', directory: '', generated: true });
  assert.deepEqual(result[1], { pattern: '*.gen.go', directory: '', generated: true });
  assert.deepEqual(result[2], { pattern: 'package-lock.json', directory: '', generated: false });
});

test('line with pattern but no attributes is skipped', () => {
  const result = parseGitattributes('orphan-pattern', '');
  assert.deepEqual(result, []);
});

test('parseAllGitattributes combines multiple files with correct directories', () => {
  const files = [
    { path: '.gitattributes', content: '*.pb.go gitlab-generated' },
    { path: 'api/.gitattributes', content: '*.gen.ts gitlab-generated' },
  ];
  const result = parseAllGitattributes(files);
  assert.equal(result.length, 2);
  assert.deepEqual(result[0], { pattern: '*.pb.go', directory: '', generated: true });
  assert.deepEqual(result[1], { pattern: '*.gen.ts', directory: 'api', generated: true });
});

test('parseAllGitattributes with empty files array returns []', () => {
  assert.deepEqual(parseAllGitattributes([]), []);
});
