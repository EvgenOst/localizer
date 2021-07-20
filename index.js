#!/usr/bin/env node

const commander = require('commander');
const fs = require('fs').promises;
const { resolve } = require('path');
const programm = new commander.Command();

async function getFiles(dir) {
  if (/\..+$/.test(dir)) return [resolve(dir)];

  const directs = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    directs.map((d) => {
      const res = resolve(dir, d.name);
      return d.isDirectory() ? getFiles(res) : res;
    })
  );

  return Array.prototype.concat(...files);
}

function getUnique(arr) {
  return Array.from(new Set(arr));
}

function isObject(a) {
  return !!a && a.constructor === Object;
}

async function findEntries(files, regex) {
  const result = new Set();

  for (const file of files) {
    const data = await fs.readFile(file, 'utf8');
    let match;
    while ((match = regex.exec(data))) {
      result.add(match[1]);
    }
  }
  return result;
}

function createStructFromFields(keys) {
  const result = [];
  for (const key of keys.values()) {
    result.push(key.split('.'));
  }
  return result;
}

function createStructFromObj(obj) {
  const result = [];

  (function deepSearch(o, deep = 0, path) {
    if (deep >= 20) {
      console.warn('Превышено ограничение глубины объекта');
      return;
    }
    for (const key in o) {
      const p = path ? [...path, key] : [key];
      if (isObject(o[key])) {
        deepSearch(o[key], deep + 1, p);
      } else {
        result.push(p);
      }
    }
  })(obj);

  return result;
}

async function readJSON(file) {
  const jsonStr = await fs.readFile(file, 'utf8');
  let obj;
  if (jsonStr) {
    try {
      obj = JSON.parse(jsonStr);
    } catch (e) {
      /* empty */
      console.error(`Ошибка при чтении файла ${file}`);
      throw e;
    }
  }

  return obj;
}

function writeJSON(file, data) {
  return fs.writeFile(file, JSON.stringify(data, null, 2));
}

function restoreObject(obj, struct) {
  for (const keys of struct) {
    let p = obj;
    for (let i = 0, len = keys.length; i < len; i++) {
      const key = keys[i];
      const isLast = i === len - 1;

      if (!p[key]) {
        p[key] = isLast ? '' : {};
      } else if (!isObject(p[key]) && !isLast) {
        p[key] = { '!': p[key] };
      }

      p = p[key];
    }
  }
  return obj;
}

function merge(target, source, reset) {
  return (function mergeDeep(_target, _source, deep = 0) {
    if (deep >= 20) {
      console.warn('Превышено ограничение глубины объекта');
      return;
    }

    if (!_source) return;

    for (const key in _target) {
      if (isObject(_target[key])) {
        if (isObject(_source[key])) {
          mergeDeep(_target[key], _source[key], deep + 1);
        }
        // Возможность оставить данные, если источник имеет неверную структуру
        // else {
        //   _target[key]['!'] = _source[key];
        // }
        continue;
      }

      if (_source[key] && (reset || !_target[key])) {
        _target[key] = _source[key];
      }
    }
    return _target;
  })(target, source);
}

function sortFields(obj) {
  return (function sortDeep(_obj, deep = 0) {
    if (deep > 20) {
      return _obj;
    }

    return Object.fromEntries(
      Object.entries(_obj)
        .sort(([a, aValue], [b, bValue]) => {
          const aValueIsObj = isObject(aValue);
          const bValueIsObj = isObject(bValue);

          if (aValueIsObj && !bValueIsObj) return 1;
          else if (!aValueIsObj && bValueIsObj) return -1;
          else return a < b ? -1 : a > b ? 1 : 0;
        })
        .map(([key, value]) => [key, isObject(value) ? sortDeep(value, deep + 1) : value])
    );
  })(obj);
}

function findDiffs(obj, targetFields) {
  const fields = createStructFromObj(obj).map((f) => f.join('.'));
  return fields.filter((x) => !targetFields.has(x));
}

programm
  .command('check')
  .description('Проверка и дополнение языковых файлов на предмет недостающих переводов')
  .argument('<source...>', 'Файлы для проверки')
  .requiredOption('-t, --target <value>', 'Файл/директория локализации')
  .option('-c, --clean', 'Удалить все несуществующие ключи перевода')
  .option('-q, --quiet', 'Исполнение без вывода в консоль')
  .option('-s, --sort', 'Сортировать полученные ключи')
  .action(async function (source, options) {
    const allowConsole = !options.quiet;

    const sourcePromise = Promise.all(source.map((s) => getFiles(s)));
    const sources = getUnique((await sourcePromise).flat());
    const targets = await getFiles(options.target);

    if (allowConsole) {
      // console.info(sources.join('\n'));
      console.info('[INFO] Поиск вхождений строки...');
    }

    /**
     * @TODO Вынести регулярное выражение в настройку
     */
    const regex = /(?:[\W])__\(\s*['"]([\w-.%]+?)['"](?:,(?:['"\w\s]*?)?)*?\)/gm;
    const fields = await findEntries(sources, regex);
    const struct = createStructFromFields(fields);

    if (allowConsole) {
      console.info(`[INFO] Найдено уникальных строк (${struct.length})`);
    }

    for (const file of targets) {
      if (allowConsole) console.info('[INFO] Обновление ' + file);

      const data = await readJSON(file);
      let out;

      if (options.clean) {
        out = merge(restoreObject({}, struct), data);
      } else {
        out = restoreObject(data, struct);

        if (allowConsole) {
          const diffs = findDiffs(out, fields);

          if (diffs.length) {
            console.info(`Найдено неиспользуемых ключей (${diffs.length})`);
            console.info('========================');
            console.info(diffs.join('\n'));
            console.info('========================');
          }
        }
      }

      if (options.sort) {
        out = sortFields(out);
      }

      await writeJSON(file, out);
    }

    if (allowConsole) console.info('Успешно');
  });

programm
  .command('update')
  .description('Обновление структуры файла с указанием источника')
  .argument('<source>', 'Файл источник')
  .requiredOption('-t, --target <value>', 'Файл/директория файлов локализации')
  .option('-c, --clean', 'Удалить все несуществующие ключи перевода')
  .option('-q, --quiet', 'Исполнение без вывода в консоль')
  .action(async function (source, options) {
    const allowConsole = !options.quiet;
    const sources = await getFiles(source);

    if (sources.length !== 1) {
      console.error('[ERROR] Неверно указан файл источник');
      return;
    }

    const sourceFile = sources[0];
    const targets = (await getFiles(options.target)).filter((f) => f !== sourceFile);

    const sourceObj = await readJSON(sourceFile);
    const struct = createStructFromObj(sourceObj);

    for (const file of targets) {
      if (allowConsole) console.info('[INFO] Обновление ' + file.replace(/(\w+\..*)$/, '$1'));

      const data = await readJSON(file);
      let out;

      if (options.clean) {
        out = merge(restoreObject({}, struct), data);
      } else {
        out = restoreObject(data, struct);
      }

      out = merge(out, sourceObj);

      await writeJSON(file, out);
    }

    if (allowConsole) console.info('Успешно');
  });

programm.parse(process.argv);
