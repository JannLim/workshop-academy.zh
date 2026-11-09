// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 SubLang International <https://sublang.ai>

import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { basename, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(import.meta.url), '../..');
// 只检查能写注释的源文件；工具生成的清单（spex.yaml、.gitattributes 等）与媒体不要求 SPDX 头。
const sourceExtensions = new Set(['.js', '.mjs', '.cjs', '.css', '.sql', '.md', '.sh', '.html', '.svg']);
const sourceNames = new Set(['.gitignore']);

/** 仓库里的文件：已跟踪的加上未被忽略的新文件；运行数据、备份和 cookie 文件不在其中。 */
function listFiles() {
  try {
    const output = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return output.split('\0').filter(Boolean);
  } catch {
    return walk(root).map((file) => relative(root, file));
  }
}

// 不在 Git 仓库里（例如下载的压缩包）时退回到遍历目录，跳过隐藏目录和数据目录。
function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!entry.name.startsWith('.') && !['node_modules', 'data', 'backups'].includes(entry.name) && !entry.name.startsWith('data-')) {
        files.push(...walk(join(dir, entry.name)));
      }
    } else if (entry.isFile()) {
      files.push(join(dir, entry.name));
    }
  }
  return files;
}

test('每个源文件都带 SPDX 许可与版权声明', () => {
  const missing = [];
  for (const name of listFiles()) {
    if (!sourceExtensions.has(extname(name)) && !sourceNames.has(basename(name))) continue;
    let head;
    try {
      head = readFileSync(join(root, name), 'utf8').split('\n').slice(0, 5).join('\n');
    } catch {
      continue; // 已删除但尚未提交的文件
    }
    if (!/SPDX-License-Identifier: \S/.test(head) || !/SPDX-FileCopyrightText: \S/.test(head)) missing.push(name);
  }
  assert.deepEqual(missing, []);
});

test('固定 Node.js 24 且没有 npm 依赖', () => {
  assert.equal(readFileSync(join(root, '.nvmrc'), 'utf8').trim(), '24.22.2');
  assert.equal(readFileSync(join(root, '.node-version'), 'utf8').trim(), '24.22.2');
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  assert.equal(pkg.engines.node, '>=24');
  for (const field of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
    assert.equal(pkg[field], undefined, `package.json 不应声明 ${field}`);
  }
});
