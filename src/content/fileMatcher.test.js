// Node built-in test runner — no bundler, no browser deps (NFR-18).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isGenerated, classifyFiles } from './fileMatcher.js';

describe('isGenerated — root patterns', () => {
  it('root *.pb.go matches foo/bar.pb.go', () => {
    const patterns = [{ pattern: '*.pb.go', directory: '', generated: true }];
    assert.equal(isGenerated('foo/bar.pb.go', patterns), true);
  });

  it('root *.pb.go matches top-level bar.pb.go', () => {
    const patterns = [{ pattern: '*.pb.go', directory: '', generated: true }];
    assert.equal(isGenerated('bar.pb.go', patterns), true);
  });

  it('root *.pb.go does not match bar.pb.go.bak', () => {
    const patterns = [{ pattern: '*.pb.go', directory: '', generated: true }];
    assert.equal(isGenerated('bar.pb.go.bak', patterns), false);
  });

  it('no matching pattern returns false', () => {
    const patterns = [{ pattern: '*.pb.go', directory: '', generated: true }];
    assert.equal(isGenerated('src/main.go', patterns), false);
  });
});

describe('isGenerated — nested scope (FR-11)', () => {
  it('subdir-scoped pattern does NOT match file outside that subdir', () => {
    const patterns = [{ pattern: '*.gen.js', directory: 'subdir', generated: true }];
    assert.equal(isGenerated('otherdir/foo.gen.js', patterns), false);
  });

  it('subdir-scoped pattern matches file inside that subdir', () => {
    const patterns = [{ pattern: '*.gen.js', directory: 'subdir', generated: true }];
    assert.equal(isGenerated('subdir/foo.gen.js', patterns), true);
  });

  it('subdir-scoped pattern matches file in nested subdir', () => {
    const patterns = [{ pattern: '*.gen.js', directory: 'subdir', generated: true }];
    assert.equal(isGenerated('subdir/deep/foo.gen.js', patterns), true);
  });

  it('root-scoped pattern still matches files in any subdir', () => {
    const patterns = [{ pattern: '*.gen.js', directory: '', generated: true }];
    assert.equal(isGenerated('otherdir/foo.gen.js', patterns), true);
  });
});

describe('isGenerated — last-match-wins negation (NFR-06)', () => {
  it('negation pattern overrides earlier positive match', () => {
    const patterns = [
      { pattern: '*.gen.js', directory: '', generated: true },
      { pattern: 'foo.gen.js', directory: '', generated: false },
    ];
    assert.equal(isGenerated('foo.gen.js', patterns), false);
  });

  it('positive pattern overrides earlier negation', () => {
    const patterns = [
      { pattern: '*.gen.js', directory: '', generated: false },
      { pattern: 'foo.gen.js', directory: '', generated: true },
    ];
    assert.equal(isGenerated('foo.gen.js', patterns), true);
  });

  it('non-matching negation does not affect result', () => {
    const patterns = [
      { pattern: '*.gen.js', directory: '', generated: true },
      { pattern: 'bar.gen.js', directory: '', generated: false },
    ];
    assert.equal(isGenerated('foo.gen.js', patterns), true);
  });
});

describe('isGenerated — ** glob', () => {
  it('generated/** matches deeply nested file', () => {
    const patterns = [{ pattern: 'generated/**', directory: '', generated: true }];
    assert.equal(isGenerated('generated/deep/nested/file.go', patterns), true);
  });

  it('generated/** matches direct child', () => {
    const patterns = [{ pattern: 'generated/**', directory: '', generated: true }];
    assert.equal(isGenerated('generated/file.go', patterns), true);
  });

  it('generated/** does not match sibling dir', () => {
    const patterns = [{ pattern: 'generated/**', directory: '', generated: true }];
    assert.equal(isGenerated('not-generated/file.go', patterns), false);
  });
});

describe('isGenerated — anchored pattern (leading /)', () => {
  it('/foo.go only matches root foo.go', () => {
    const patterns = [{ pattern: '/foo.go', directory: '', generated: true }];
    assert.equal(isGenerated('foo.go', patterns), true);
    assert.equal(isGenerated('subdir/foo.go', patterns), false);
  });
});

describe('isGenerated — ? wildcard', () => {
  it('? matches single char but not /', () => {
    const patterns = [{ pattern: 'file?.go', directory: '', generated: true }];
    assert.equal(isGenerated('file1.go', patterns), true);
    assert.equal(isGenerated('fileAB.go', patterns), false);
  });
});

describe('classifyFiles', () => {
  it('returns a Map with correct classification for each path', () => {
    const patterns = [{ pattern: '*.pb.go', directory: '', generated: true }];
    const result = classifyFiles(['foo.pb.go', 'main.go'], patterns);
    assert.equal(result.get('foo.pb.go'), true);
    assert.equal(result.get('main.go'), false);
  });

  it('returns empty Map for empty input', () => {
    const result = classifyFiles([], []);
    assert.equal(result.size, 0);
  });
});
