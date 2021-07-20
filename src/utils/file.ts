import fs from 'fs/promises';
import { resolve, extname } from 'path';

export async function getFiles(dir: string): Promise<string[]> {
  if (extname(dir)) return [resolve(dir)];
  let files;

  try {
    const directs = await fs.readdir(dir, { withFileTypes: true });
    files = await Promise.all(
      directs.map((d) => {
        const r = resolve(dir, d.name);
        return d.isDirectory() ? getFiles(r) : Promise.resolve([r]);
      })
    );
  } catch (error: any) {
    console.error('[ERR] Ошибка поиска файлов', error);
  }

  return files ? Array.prototype.concat(...files) : [];
}

export function readFile(file: string): Promise<string> {
  return fs.readFile(file, 'utf8');
}

export async function findEntries(file: string, reg: RegExp): Promise<string[]> {
  const result = [];
  try {
    const fileStr = await readFile(file);
    let match;
    while ((match = reg.exec(fileStr))) {
      result.push(match[1]);
    }
  } catch (error) {
    console.error('[ERR] Ошибка чтения файла', error);
  }

  return result;
}

export async function readJSON(file: string): Promise<{ [key: string]: unknown } | undefined> {
  const jsonStr = await fs.readFile(file, 'utf8');
  let obj;
  if (jsonStr) {
    try {
      obj = JSON.parse(jsonStr);
    } catch (e) {
      console.error(`Ошибка при чтении файла ${file}`);
      throw e;
    }
  }

  return obj;
}

export function writeJSON(file: string, data: Object) {
  return fs.writeFile(file, JSON.stringify(data, null, 2));
}
