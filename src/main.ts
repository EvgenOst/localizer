import {
  apply,
  createDeepObjectFromStruct,
  createEmptyStruct,
  createObjectFromStruct,
  createStructFromObject,
  findEntries,
  getFiles,
  getStructInfo,
  getUnique,
  merge,
  readFile,
  readJSON,
  sortStruct,
  writeJSON,
} from './utils';

interface ICheckOptions {
  target: string;
  quiet?: boolean;
  debug?: boolean;
  clean?: boolean;
  sort?: boolean;
  flat?: boolean;
  regex?: string;
  write?: boolean;
}

const emptyFn = () => {};

export async function check(source: string[], options: ICheckOptions): Promise<void> {
  const { quiet, debug, clean, sort, flat, regex, write } = options;
  const log = !quiet ? console.info.bind(console, '[INF]') : emptyFn;
  const dbg = debug ? console.debug.bind(console, '[DBG]') : emptyFn;
  const warn = console.warn.bind(console, '[WRN]');

  const sourcePromise = Promise.all<Promise<string[]>>(source.map((s) => getFiles(s)));
  const sources: string[] = getUnique((await sourcePromise).flat());
  const targets = await getFiles(options.target);

  log(`Обработка файлов (${sources.length})`);
  if (debug) {
    dbg('===============');
    dbg(sources.join('\n'));
    dbg('===============');
  }
  log('Поиск вхождений строки...');

  /**
   * @TODO Вынести регулярное выражение в настройку
   */
  const checkRegex = /(?:[\W])__\(\s*['"]([\w-.%]+?)['"](?:,(?:['"\w\s]*?)?)*?\)/gm;
  let entries = [] as string[];
  for (const file of sources) {
    entries = entries.concat(await findEntries(file, checkRegex));
  }
  const struct = createEmptyStruct(entries);

  log(`Найдено уникальных строк (${struct.size} из ${entries.length})`);

  for (const file of targets) {
    log(`Обновление ${file}`);

    const data = await readJSON(file);
    const dataStruct = createStructFromObject(data || {});
    let out;

    if (debug) dbg('input =>', dataStruct);

    if (!clean) {
      out = merge(struct, dataStruct);
    } else {
      out = apply(struct, dataStruct);
    }

    const info = getStructInfo(out, struct);
    if (info.emptyKeys.length) {
      warn(`Найдено пустых значений (${info.emptyKeys.length})`);
      warn('<empty>');
      info.emptyKeys.forEach((k) => warn(k));
      warn('</empty>');
    }
    if (info.diffKeys.length) {
      warn(`Найдено неиспользуемых ключей (${info.diffKeys.length})`);
      warn('<diff>');
      info.diffKeys.forEach((k) => warn(k));
      warn('</diff>');
    }

    if (sort) {
      out = sortStruct(out);
    }

    if (debug) dbg('out =>', out);

    /**
     * @TODO Изменять файл либо с помощью флага или после интерактивного вопроса
     */
    if ((!info.emptyKeys.length && !info.diffKeys.length) || write) {
      await writeJSON(file, flat ? createObjectFromStruct(out) : createDeepObjectFromStruct(out));
    }
  }

  log('Успешно');
}

interface IUpdateLocalesOptions {
  target: string;
  clean?: boolean;
  flat?: boolean;
  quiet?: boolean;
  sort?: boolean;
}

export async function updateLocales(source: string, options: IUpdateLocalesOptions) {
  const { target, clean, flat, quiet, sort } = options;
  const log = !quiet ? console.info.bind(console, '[INF]') : emptyFn;
  const warn = console.warn.bind(console, '[WRN]');
  const error = console.error.bind(console, '[ERR]');

  const sources = await getFiles(source);

  if (sources.length !== 1) {
    error('Неверно указан файл источник');
    return;
  }
  const sourceFile = sources[0];
  const targets = (await getFiles(target)).filter((f) => f !== sourceFile);

  const sourceObj = await readJSON(sourceFile);
  if (!sourceObj) return;

  for (const file of targets) {
    log(`Обновление ${file}`);

    const struct = createStructFromObject(sourceObj);
    const data = await readJSON(file);
    const dataStruct = createStructFromObject(data || {});
    let out;

    if (!clean) {
      out = merge(struct, dataStruct);
    } else {
      out = apply(struct, merge(struct, dataStruct), true);
    }

    if (sort) {
      out = sortStruct(out);
    }

    await writeJSON(file, flat ? createObjectFromStruct(out) : createDeepObjectFromStruct(out));
  }

  log('Успешно');
}

interface IGetInfoOptions {
  debug: boolean;
}

export async function getInfo(source: string[], options: IGetInfoOptions): Promise<void> {
  process.stdout.write('\u001b[2J\u001b[0;0H');
  const { debug } = options;

  let totalCount = 0;
  const sourcePromise = Promise.all<Promise<string[]>>(source.map((s) => getFiles(s)));
  const sources: string[] = getUnique((await sourcePromise).flat());
  const ruTextRegEx = /(['"`])[А-Яа-яЁё]+?\W+?\1/;

  for (const file of sources) {
    const out = [] as [number, string][];
    try {
      const fileStr = await readFile(file);
      for (let i = 0, arr = fileStr.split('\n'); i < arr.length; i++) {
        const str = arr[i];
        if (ruTextRegEx.test(str)) {
          out.push([i, str]);
          totalCount++;
        }
      }

      if (out.length) {
        console.info(file);
        console.info(`Совпадений (${out.length})`);
        console.info(out.map((e) => `${e[0] + 1}\t${e[1].trim()}`).join('\n') + '\n');
      }
    } catch (error) {
      console.error('[ERR] Ошибка чтения файла', error);
    }
  }

  console.info(`Всего найдено совпадений (${totalCount})`);
}
