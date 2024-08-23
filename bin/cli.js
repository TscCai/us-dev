#!/usr/bin/env node

// __dirname: 程序运行目录
const fs = require('fs');
const rlSync = require('readline-sync');
const path = require('path');
const packageJson = require('../package.json');

const WORKSPACE = path.resolve().replaceAll('\\', '/').endsWith('/') ? path.resolve().replaceAll('\\', '/') : path.resolve().replaceAll('\\', '/') + "/";

// 控制台程序入口
usdev(process.argv.slice(2));

/**
 * @description 控制台界面入口函数
 * @author Tsccai
 * @date 2024-04-05
 * @param {Array} args 控制台参数数组，已去除头部的node和cli
 * @returns {void}
 */
function usdev(args) {
    console.info(`${packageJson.name} ${packageJson.version}`);
    if (args.length === 0) {
        showHelpInfo();
        return;
    }
    switch (args[0].toLowerCase()) {
        case 'init':
            init(args.slice(1));
            break;
        case 'build':
            const restArgs = args.slice(1);
            if (restArgs.length === 1 && restArgs[0] !== 'deploy') {
                console.info('Unknown argument after "build".');
                showHelpInfo();
                return;
            }
            try {
                //let config = loadConfig(args.slice(1));
                let config = loadConfig([]);
                build(config);

                if (restArgs.length === 1) {
                    deploy(restArgs);
                }
            }
            catch (err) {
                console.error(err);
            }
            finally {
                break;
            }
        case 'deploy':
            deploy(args.slice(1));
            break;
        case 'help':
            showHelpInfo();
            break;
        default:
            console.warn(`Unknown command: "${args[0]}"`);
            console.info(`To see a list of supported us-dev commands, run:`);
            console.info(`usdev help`);
    }
}

/**
 * @description 在控制台中打印帮助信息
 * @author Tsccai
 * @date 2024-04-05
 * @returns {void}
 */
function showHelpInfo() {
    console.info(`usdev <command>\n`);
    console.info(`Usage:\n`);
    console.info(`usdev init <foo>                              init a usdev project named <foo>`);
    console.info(`usdev build                                   build project via us-dev.json in current directory`);
    // console.info(`usdev build --config <foo>                    build project via <foo> in current directory`);
    // console.info(`usdev build -c <foo>                          same as usdev build --config <foo>`);
    console.info(`usdev deploy                                  deploy the built userscript in default browser`);
    console.info(`usdev deploy --browser <foo>                  deploy the built userscript in browser <foo>`);
    console.info(`usdev deploy -b <foo>                         same as usdev deploy --browser <foo>`);
    console.info(`usdev build deploy                            build project and deploy it`);
    console.info(`usdev help                                    show help info`);
}

/**
 * @description 加载us-dev.json配置文件
 * @author Tsccai
 * @date 2024-04-05
 * @param {Array} args 命令行参数，此处应为空数组
 * @returns {Object} us-dev项目配置对象
 * @exception \{{{Error}}\} {{参数不正确}}{{}}
 * @exception \{{{Error}}\} {{工作目录下未找到us-dev.json文件}}{{}}
 */
function loadConfig(args) {
    let config = {};
    let configFile = "";
    switch (args.length) {
        // Use custom config, not support yet.
        // case 2:
        //     if (!(args[0].toLowerCase() === '--config' || args[0].toLowerCase() === '-c')) {
        //         console.warn(`Unknown options ${args[0]}`);
        //         return;
        //     }
        //     const inputConfig = args[1];
        //     if (!path.resolve(inputConfig).replaceAll('\\', '/').startsWith(WORKSPACE)) {
        //         console.warn("Unsafe build attempt, build failed.");
        //         return;
        //     }
        //     configFile = path.resolve(inputConfig).replaceAll('\\', '/');
        //     if (!fs.existsSync(configFile)) {
        //         console.warn(`Can't find file: ${inputConfig} in current directory, build failed.`);
        //         return;
        //     }
        //     config = require(configFile);
        //     break;
        case 0:
            configFile = path.resolve(WORKSPACE, "us-dev.json");
            if (!fs.existsSync(configFile)) {
                throw new Error("Can't find file: us-dev.json in current directory, build failed.");
            }
            config = require(configFile);
            break;
        default:
            throw new Error(`Unknown options: ${args[0]}`);
    }
    return config;
}

/**
 * @description 调用us-build模块，启动编译
 * @author Tsccai
 * @date 2024-04-05
 * @param {Object} config
 * @returns {void}
 */
function build(config) {
    const usBuild = require('../us-build');
    usBuild.build(config);
}

/**
 * @description 初始化us-dev项目
 * @author Tsccai
 * @date 2024-04-05
 * @param {Array} args 命令行参数，['project-name']
 * @returns {any}
 */
function init(args) {
    if (args.length > 1) {
        console.warn(`Unknown option: ${args.slice(1)}`);
        console.info(`To see a list of supported us-dev commands, run:`);
        console.info(`usdev help`);
        return;
    }
    const dirs = fs.readdirSync(WORKSPACE);
    if (dirs.length > 0) {
        // 若工作目录不是空目录，则提示是否继续
        const answer = rlSync.question(`Current workspace(${WORKSPACE}) is not an empty directory, should continue? [yes/no]`);
        switch (answer.toLowerCase()) {
            case "yes":
            case "y":
                break;
            case "no":
            case "n":
                return;
            default:
                console.info('Unknown command, please type "yes" or "no');
                init(args);
        }
    }

    let projectName = 'us-dev project';
    if (args.length === 1) {
        projectName = args[0];
    }
    try {
        // 从us-dev程序目录下加载us-dev-sample.json模板配置文件，修改后写入工作目录
        let usConfig = require('../template/us-dev-sample.json');
        usConfig.output = `./dist/${projectName}.user.js`;
        usConfig.header = './src/gm_header.js';
        fs.writeFileSync(
            path.resolve(WORKSPACE, 'us-dev.json'),
            JSON.stringify(usConfig, null, "\t")
        );
        // 从us-dev程序目录下加载gm_header-sample.js模板头文件，修改后写入工作目录
        let gm_header = fs.readFileSync(path.resolve(__dirname, '../template/gm_header-sample.js'), 'utf8');
        gm_header = gm_header.replaceAll('#PROJECT_NAME', projectName);
        gm_header = gm_header.replaceAll('#AUTHOR', process.env.username);
        if (!fs.existsSync('./src')) {
            fs.mkdirSync('./src')
        }
        fs.writeFileSync('./src/gm_header.js', gm_header);
        // 写入空的项目编译入口文件
        fs.writeFileSync('./src/main.js', "");

        console.info('Project init successfully.');
    }
    catch (err) {
        switch (err.code) {
            case "MODULE_NOT_FOUND":
            //break;
            case "ENOENT":
            //break;
            default:
                throw (err);
        }
    }
}

/**
 * @description 将编译后的user script部署到浏览器，浏览器插件需开启本地文件访问权限
 * @author Tsccai
 * @date 2024-04-05
 * @param {Array} args 命令行参数，应为['--browser','BROWSER_NAME']或['-b','BROWSER_NAME']
 * @returns {void}
 */
function deploy(args) {
    // 加载us-dev项目配置文件
    configFile = path.resolve(WORKSPACE, "us-dev.json");
    const config = require(path.resolve(configFile));
    let browser = void 0;
    // 获取部署用的浏览器
    if (args.length === 2 && (args[0] === '--browser' || args[0] === '-b')) {
        browser = getDeployBrowser(args[1]);
    }
    else if (config.deploy !== void 0 && config.deploy !== '') {
        browser = getDeployBrowser(config.deploy);
    }
    else {
        console.warn('No browser to deploy.');
        return;
    }
    const builtScript = config.output;
    const url = `file:///${path.resolve(WORKSPACE, builtScript)}`;
    // 用浏览器打开脚本，手动安装部署
    try {
        open(url, browser);
    }
    catch (err) {
        console.error('Deploy failed.');
        console.error(err);
    }
}

/**
 * @description 将us-dev配置中的浏览器名称转换为对应的浏览器
 * @author Tsccai
 * @date 2024-04-05
 * @param {string} name 浏览器名称
 * @returns {string} 实际将使用的浏览器
 */
function getDeployBrowser(name) {
    let browser = void 0;
    switch (name.toLocaleLowerCase()) {
        case "chrome":
            browser = "chrome";
            break;
        case "firefox":
            browser = "firefox"
            break;
        case "edge":
        case "msedge":
            browser = "msedge";
            break;
        default:
            throw new Error('No browser can use.');
    }
    return browser;
}

/**
 * @description 使用start命令调用浏览器打开脚本
 * @author Tsccai
 * @date 2024-06-15
 * @param {any} url
 * @param {any} browser
 * @returns {any}
 */
function open(url, browser) {
    const child_process = require('child_process');
    const cmd = `start ${browser} ${url}`;
    child_process.execSync(cmd);
}