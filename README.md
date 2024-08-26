# us-dev
### A user script development toolkit

## How to install
```bash
npm install https://github.com/TscCai/us-dev.git -g

```

## How to use it
### Init project
```bash
mkdir test
cd test
usdev init test
```

### Build project
```bash
usdev build
```

### Deploy in browser
```bash
usdev deploy
```

### Combine command (build and deploy script)
```bash
usdev build deploy
```

### Samples
us-dev.json
```json
{
	"main": "./src/main.js",
	"header": "./src/gm_header.js",
	"output": "./dist/test.user.js",
	"version": "0.1",
	"global_defs": {
		"LOCAL1":"foo",
		"LOCAL2":"bar"
	},
	"extra_copy": [
        {"src":"./lib", "dest":"./dist/lib"},
        {"src":"./doc/readme.md", "dest":"./dist/doc/readme.md"}
    ],
	"build_timestamp": true,
	"build_hash": true,
	"use_strict": true,
	"uglifyjs_options": {},
	"deploy": "msedge"
}
```

gm_header.js
```js
// ==UserScript==
// @name         test
// @namespace    https://your.repo
// @version      0.1
// @description  Some description
// @author       you
// @match        https://example.com
// @grant        GM_getResourceText
// @resource   lib1  LOCAL1
// @resource   lib2  LOCAL2
// ==/UserScript==
```

