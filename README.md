# Localizer

## Instalation

To install Localizer, you need to call

```
npm install -D @evgenost/localizer
```

## Description

Localizer is small cli application to help add i18n to the application and manage language files.
This is not a full-fledged localization tool, it allows you to check the correctness of the localization file or generate a localization file based on the source code of the project.

For example, a project uses a localization function that returns a string translated into the desired language.

```javascript
// src/source.js
function __(key) {
  // ...code
  // return translation;
}

let translated = __('hello'); // return 'Hello' or 'Привет' depending on the uploaded translation file
```

The project localization system downloads and uses the translation file in JSON

```json
// locale-en.json
{
  "hello": "Hello!"
}
```

Localizer will check the source code of the project and compare the keys of all calls to the localization function with the keys of the localization file, point out the differences between them and suggest missing keys.

```
npx localizer check src/ -t locale-en.json
```

## Use cases

### Writing to file

When enabled option '--write' will change the localization file even if there is a difference in the keys. In this case, already translations in the correct keys of the translation file will not be touched.

```javascript
// src/source.js
function __(key) {
  // ...code
  // return translation;
}

let translated = __('hello');
let title = __('page-title');
```

```json
// locale-en.json
{
  "hello": "Hello!", // will remain as it is
  "unused-obsolete-key": "bla bla bla" // will removed
  // also will add "page-title":""
}
```

### File structure

Localizer can work with a multi-level structure of a localization file and with a flat structure, as well as change the structure when a special flag is enabled option '--flat'.

```javascript
// src/source.js
function __(key) {
  // ...code
  // return translation;
}

let translated = __('main.hello-page.title');
```

The translation file will be

```json
// locale-en.json
{
  "main": {
    "hello-page": {
      "title": "Hello!"
    }
  }
}
```

When called with the option "--flat"

```json
// locale-en.json
{
  "main.hello-page.title": "Hello!"
}
```
