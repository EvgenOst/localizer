#! /usr/bin/env node

import { Command } from 'commander';
import { check, getInfo, updateLocales } from './main';
const programm = new Command();

programm
  .command('check')
  .description('Проверка и дополнение языковых файлов на предмет недостающих переводов')
  .argument('<source...>', 'Файлы для проверки')
  .requiredOption('-t, --target <value>', 'Файл/директория локализации')
  .option('-c, --clean', 'Удалить все несуществующие ключи перевода')
  .option('-q, --quiet', 'Исполнение без вывода в консоль')
  .option('-s, --sort', 'Сортировать полученные ключи')
  .option('-f, --flat', 'Одноуровневая генерация ключей в файл переводов')
  .option('-w, --write', 'Изменение файла переводов даже при наличии несоответствий')
  .option('-d, --debug', 'Флаг включения debug режима')
  // .option('-r, --regex <value>', 'Регулярное выражение для поиска')
  .action(check);

// programm
//  .command('update')
//  .description('Обновление структуры файла с указанием источника')
//  .argument('<source>', 'Файл источник')
// .requiredOption('-t, --target <value>', 'Файл/директория файлов локализации')
// .option('-c, --clean', 'Удалить все несуществующие ключи перевода')
// .option('-q, --quiet', 'Исполнение без вывода в консоль')
// .action(updateLocales);

programm
  .command('info')
  .description('Поиск строк на кириллице')
  .argument('<source...>', 'Файлы для проверки')
  .option('-d, --debug', 'Флаг включения debug режима')
  .action(getInfo);

programm.parse(process.argv);
