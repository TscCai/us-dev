let tree = {};
let tmpSet = new Set();
function search(name) {
    if (tree.has(name)) {
        return tree.get(name);
    }
    else {
        return undefined;
    }
}

function deepFirstTree(name) {
    let tmp = '';
    tmp += name + '|';
    if (tmpSet.has(name)) {
        throw new Error(`${name}中存在循环引用`);
    }
    tmpSet.add(name);
    const req = search(name);

    if (!Array.isArray(req) || req.length === 0) {
        tmpSet.clear();
        return tmp;
    }
    else {
        for (const r of req) {
            tmp += deepFirstTree(r);
        }
        return tmp;
    }

}

const createList = function (name, dict) {
    tree = dict;
    let stack = deepFirstTree(name);
    if (stack.endsWith('|')) {
        stack = stack.substring(0, stack.length - 1);
    }
    let arr = stack.split('|').reverse();
    const d_set = new Set(arr);
    return Array.from(d_set);
}


module.exports = { createList: createList };