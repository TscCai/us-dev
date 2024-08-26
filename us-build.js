require('./date-ext');
const crypto = require('crypto');
const UglifyJS = require('uglify-js');
const dh = require('./dependency-helper');
const fs = require('fs');
const path = require('path');

/**
 * @description 编译us-dev项目
 * @author Tsccai
 * @date 2024-04-05
 * @param {Object} config us-dev.json文件的JS对象
 * @returns {void}
 */
const build = function (config) {

    console.info('pre processing...');
    let header = processHeader(config);

    console.info('analyzing dependency tree...');
    let list = createDependencyList(config);
    let src = loadSourceCode(list);
    console.info('linking source file finished.');

    // 生成uglifyJS配置，编译代码
    let options = createUglifyJSOptions(config);

    console.info('compiling...');
    let outputArr = [];
    const outputFilename = [config.output, config.output.replace(/\.user\.js$/, '-debug.user.js')]
    //let result = UglifyJS.minify(src, options);
    outputArr.push(UglifyJS.minify(src, options));

    options.compress = false;
    outputArr.push(UglifyJS.minify(src, options));


    // 若uglifyJS中出现异常，则将该异常抛出
    for (let result of outputArr) {
        const filename = outputFilename.shift();
        if (result.error !== void 0 && result.error instanceof Error) {
            console.error("Error occurred when compiling.");
            throw result.error;
        }

        // 装饰编译后的代码：添加头文件、代码Hash、编译时间戳等
        let script = decorateMinifiedCode(header, result.code, config);

        // 将最终的代码输出到文件
        const outputDir = path.dirname(path.resolve(filename));
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir);
        }
        fs.writeFileSync(filename, script);
    }


    // 编译后剩余工作，清理临时文件、复制额外文件等
    afterBuild(config);
    console.log('build successfully!');
}

/**
 * @description 处理头文件的常量定义，生成版本号
 * @author Tsccai
 * @date 2024-04-05
 * @param {Object} config us-dev.json文件的JS对象
 * @returns {string} 处理完毕后的header
 */
function processHeader(config) {
    let header = fs.readFileSync(path.resolve(config.header), 'utf8');
    for (const key in config.global_defs) {
        header = header.replaceAll(key, config.global_defs[key]);
    }
    header = header.replace(/@version.*/, `@version      ${config.version}`);
    return header + "\n";
}

/**
 * @description 从us-dev入口脚本开始，递归生成源代码文件字典
 * @author Tsccai
 * @date 2024-04-05
 * @param {any} srcBase 源代码根目录
 * @param {any} entryPoint 入口脚本文件
 * @param {any} dict 源代码文件字典
 * @returns {void}
 */
function genScriptDict(srcBase, entryPoint, dict) {
    const reg = /require\(['"](.*)['"]\)/g;

    if (dict.has(entryPoint)) {
        // 递归终点
        return;
    }
    // 读取entryPoint源码文件
    const i = fs.readFileSync(path.resolve(srcBase, entryPoint), 'utf8');
    let req = [];
    const mc = i.matchAll(reg);
    // 提取源码中的require('XXX')语句，整理为entryPoint的依赖数组
    for (const m of mc) {
        if (m.length > 1 && m[1] !== void 0) {
            let r = m[1];
            if (!r.endsWith('.js')) {
                r += '.js';
            }
            req.push(path.resolve(path.dirname(entryPoint), r));
        }
    }
    // 将entryPoint文件与其依赖数组存入源代码脚本字典
    dict.set(path.resolve(srcBase, entryPoint), req);

    // 从当前entryPoint的依赖数组中递归继续生成源代码脚本字典
    for (const s of req) {
        genScriptDict(path.dirname(entryPoint), s, dict, reg);
    }
}

/**
 * @description 从us-dev入口脚本开始，递归生成依赖队列
 * @author Tsccai
 * @date 2024-04-05
 * @param {any} config us-dev.json文件的JS对象
 * @returns {Array} 有序的依赖队列
 * @exception {Error} 检查到循环依赖
 */
function createDependencyList(config) {

    let entryPoint = config.main;
    let srcBase = './';
    let dict = new Map();

    // 递归生成源代码文件字典
    genScriptDict(srcBase, entryPoint, dict);

    // 递归生成依赖队列
    const list = dh.createList(path.resolve(entryPoint), dict);

    return list;
}

/**
 * @description 从依赖队列中加载脚本，并根据输入参数移除require(xxx)的代码
 * @author Tsccai
 * @date 2024-04-05
 * @param {any} dependencyList 依赖队列
 * @param {any} removeRequire=true 是否移除require(xxx)代码
 * @returns {Object} {src_index:code, ...}
 */
function loadSourceCode(dependencyList, removeRequire = true) {
    let result = {};
    for (let cnt = 0; cnt < dependencyList.length; cnt++) {
        let partialScript = fs.readFileSync(dependencyList[cnt], 'utf8');
        if (removeRequire) {
            partialScript = partialScript.replace(/require\(['"](.*)['"]\);?/g, '');
        }
        result[`s_${cnt} `] = partialScript;
    }
    return result;
}

/**
 * @description uglifyJS.minify()中使用的options对象，将us-dev.json中的global_defs传递给uglifyJS，并额外定义NODE_RUN=false
 * @author Tsccai
 * @date 2024-04-05
 * @param {Object} config us-dev.json文件的JS对象
 * @returns {Object} uglifyJS.minify()中使用的options对象，详见uglifyJS文档
 */
function createUglifyJSOptions(config) {
    let options = config.uglifyjs_options;
    if (options === void 0 || Object.keys(options).length === 0) {
        options = {
            compress: {
                global_defs: {}
            },
            output: {
                beautify: true,
                comments: 'all',
                indent_start: 4
            },
            mangle: false
        };
    }

    if (config.global_defs !== void 0) {
        options.compress.global_defs = config.global_defs;
        options.compress.global_defs['NODE_RUN'] = false;
    }
    return options;
}

/**
 * @description 装饰编译后的代码：添加头文件、代码Hash、编译时间戳等
 * @author Tsccai
 * @date 2024-04-05
 * @param {string} code uglifyJS编译后的代码
 * @param {Object} config us-dev.json文件的JS对象
 * @returns {string} 装饰后的代码
 */
function decorateMinifiedCode(header, code, config) {

    if (config.use_strict || false) {
        code = `'use strict'\n` + code;
    }

    code = `\n(function(){\n${code}\n})();`;

    // 以下代码不可调换位置，否则计算出的Hash值会随时间戳发生变化
    let scriptHash = '';
    if (config.build_hash || false) {
        scriptHash = `// Script MD5: ${createScriptHash(header + code)}\n`;
    }

    header += '// Build by us-dev';
    if (config.build_timestamp || false) {
        header += ` at ${new Date().Format('yyyy-MM-dd HH:mm:ss')}\n`;
    }

    header += scriptHash;
    let completeScript = header + code;
    return completeScript;
}

/**
 * @description 计算文本的MD5值
 * @author Tsccai
 * @date 2024-04-05
 * @param {string} data 将计算Hash值的数据
 * @returns {string} MD5摘要值，16进制字符串表示
 */
function createScriptHash(data) {
    return crypto.createHash('md5').update(data).digest('hex');
}

/**
 * @description 编译工作完成后的额外工作：复制额外文件等
 * @author Tsccai
 * @date 2024-04-05
 * @param {Object} config us-dev.json文件的JS对象
 * @returns {void}
 */
function afterBuild(config) {
    copyExtraFiles(config.extra_copy);
}

/**
 * @description 复制额外文件的具体实现
 * @author Tsccai
 * @date 2024-06-15
 * @param {Array} extra_copy
 * @returns {any}
 */
function copyExtraFiles(extra_copy) {
    if (Array.isArray(extra_copy) && extra_copy.length > 0) {
        console.info('copying extra files...');
        for (const transport of extra_copy) {
            if (transport.src === void 0 || transport.dest === void 0) {
                throw new Error('us-dev.json配置文件中错误的配置节：extra_copy数组中存在未包含"src"或"dest"属性的元素。');
            }
            const src = path.resolve(transport.src);
            if (!fs.existsSync(src)) {
                console.warn(`No such file: ${transport.src}, skip copy.`);
                continue;
            }
            const dest = path.resolve(transport.dest);
            fs.cpSync(src, dest, { recursive: true });
        }
        console.info('extra files copy finished.');
    }
    else {
        console.info('no extra files need to copy.');
    }
}
module.exports = { build: build };