import ts from 'typescript';
import {
  mkdtempSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const dir = mkdtempSync(join(tmpdir(), 'store-tests-'));
try {
  for (const file of [
    'src/services/contracts.ts',
    'src/services/model.ts',
    'src/services/handoff.ts',
    'tests/contracts.test.ts',
  ]) {
    mkdirSync(join(dir, file, '..'), { recursive: true });
    const output = ts.transpileModule(
      readFileSync(file, 'utf8').replace(/\.ts(?=['"])/g, '.js'),
      {
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2022,
        },
      },
    ).outputText;
    writeFileSync(join(dir, file.replace(/\.ts$/, '.js')), output);
  }
  writeFileSync(join(dir, 'package.json'), '{"type":"module"}');
  const r = spawnSync(
    process.execPath,
    [join(dir, 'tests/contracts.test.js')],
    { stdio: 'inherit' },
  );
  process.exitCode = r.status ?? 1;
} finally {
  rmSync(dir, { recursive: true, force: true });
}
