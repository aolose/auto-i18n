/**
 * @author Aolose
 * @email i@aolose.cc
 * @description 自动替换和生成i18n文件
 */
const fs = require('fs')
const path = require('path')
const http = require('http');
const queryStr = require('querystring');
const md5 = require('md5')
const elementLang = path.resolve(__dirname, './node_modules/element-ui/lib/locale/lang')
const i18nPath = path.resolve(__dirname, 'src', 'i18n')
const i18nLangPath = path.resolve(i18nPath, 'langs')
const pagePath = path.resolve(__dirname, 'src', 'page')
const cmpPath = path.resolve(__dirname, 'src', 'components')
const langs = fs.readdirSync(elementLang)

const langMap = {
  'zh-CN': 'zh',//中文
  'en': 'en',//英语
  'ja': 'jp',//日语
  'ko': 'kor',//韩语
  'fr': 'fra',//法语
  'es': 'spa',//西班牙语
  'th': 'th',//泰语
  'ru-RU': 'ru',//俄语
  'pt': 'pt',//葡萄牙语
  'de': 'de',//德语
  'it': 'it',//意大利语
  'el': 'el',//希腊语
  'nl': 'nl',//荷兰语
  'pl': 'pl',//波兰语
  'bg': 'bul',//保加利亚语
  'ee': 'est',//爱沙尼亚语
  'da': 'dan',//丹麦语
  'fi': 'fin',//芬兰语
  'cz': 'cs',//捷克语
  'sl': 'slo',//斯洛文尼亚语
  'sv-SE': 'swe',//瑞典语
  'zh-TW': 'cht',//繁体中文
  'vi': 'vie'
}
// 生成langs.js
function createLangsJSFile() {
  let langJSStr = ''
  let exportLStr = ''
  let exportEStr = ''
  Object.keys(langMap).forEach((k, i) => {
    // import zhCn from 'element-ui/lib/locale/lang/zh-CN
    langJSStr += `import l${i} from './langs/${k}';\n`
    langJSStr += `import e${i} from 'element-ui/lib/locale/lang/${k}';\n`
    exportLStr += `\n\t\t'${k}' : l${i},`
    exportEStr += `\n\t\t'${k}' : e${i},`
  })
  langJSStr += `export default {\n\telementLang:{${exportEStr}},\n\tlocalLang:{${exportLStr}}}`
  fs.writeFileSync(path.resolve(i18nPath, 'langs.js'), langJSStr)
}

const vkMap = {} // 缓存中文 自动生成多语言key
const mapFilePath = path.resolve(i18nPath, 'key.json')
const mapFileExist = fs.existsSync(mapFilePath)
if (mapFileExist) Object.assign(vkMap, JSON.parse(fs.readFileSync(mapFilePath)))

/**
 * 文本内容中的中文将会被替换$t(xxx)
 * @param str 文件文本
 * @return {*}
 */
function pickCN(str) {
  const texts = Object.keys(vkMap);
  const keys = texts.map(t => vkMap[t])
  function getOrCreateKey(k) {
    if (/\d+/g.test(k))return false;
    if (!(k in vkMap)) {
      texts.push(k);
      keys.push(vkMap[k] = Math.max.apply(Math, keys.concat(0)) + 1)
    }
    return vkMap[k]
  }
  str =str.replace(/(<template[\s\S]*?>)([\s\S]*)(<\/template)/gi,(m,p0,p,p1)=>{
    // 在标签当中
    p = p.replace(/(<\w+[^/]*?)(\w+[0-9a-zA-Z\-]* *= *["'])(\w*[^\x00-\xff]+[0-9a-zA-Z,.\-_ !@#$%^&*+]*[^\x00-\xff]*)([^/]*?>)/gi,(m,p0,p1,p,p2)=>{
      const v = getOrCreateKey(p);
      return p0+(p? ':'+p1+'$t('+v+')':p1+p)+p2;
    })
    // 标签包裹
    p = p.replace(/(<\w+)([^>]*?>[^<]*?)([^\x00-\xff]+[0-9a-zA-Z,.\-_ !@#$%^&*+]*[^\x00-\xff]*)/gi,(m,p0,p1,p)=>{
      if(p0.indexOf('script')!==-1)return m;
      const v = getOrCreateKey(p);
      return p0+p1+(v?'{{$t('+v+')}}':p)
    })
    return p0+p+p1
  })
  // 在标签当中
  str = str.replace(/(<\w+[^/]*?\w+ *= *)(["'])(\w*[^\x00-\xff]+[0-9a-zA-Z,.\-_ !@#$%^&*+]*[^\x00-\xff]*)(["'])([^/]*?>)/gi,(m,p0,p1,p,p2,p3)=>{
    const v = getOrCreateKey(p);
    return p0+(p? '{$t('+v+')}':p1+p+p2)+p3;
  })
  // 标签包裹
  str = str.replace(/(<\w+)([^>]*?>[^<]*?)([^\x00-\xff]+[0-9a-zA-Z,.\-_ !@#$%^&*+]*[^\x00-\xff]*)/gi,(m,p0,p1,p)=>{
    if(p0.indexOf('script')!==-1)return m;
    const v = getOrCreateKey(p);
    return p0+p1+(v?'{$t('+v+')}':p)
  })
  // 脚本当中
  str = str.replace(/(["'] *?)(\w*[^\x00-\xff]+[^'"]*)([^'"]*["'])/gi, (m, p1, p2, p3) => {
    const v = getOrCreateKey(p2);
    return v ? '(this&&this.$t||top.$lang)(' + v + ')' : (p1 + p2 + p3)
  });
  return str
}

/**
 * 遍历目录下文件执行替换操作
 * @param dir
 */
function replaceFilesCN(dir) {
  const ds = fs.readdirSync(dir)
  ds.forEach((d) => {
    const p = path.resolve(dir, d)
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      replaceFilesCN(p)
    } else if (stat.isFile()) {
      const s = fs.readFileSync(p)
      const str = pickCN(s.toString())
      fs.writeFileSync(p, str)
    }
  })

}


/**
 * 追加更新翻译文件 已有的不会变更
 * @param {string} path 文件路径
 * @param {object} kv 翻译
 */
function updateLangFile(path, kv) {
  const texts = Object.keys(vkMap)
  const keys = texts.map(t => vkMap[t])
  const exist = fs.existsSync(path);
  const ks = {}
  if (exist) {
    let o = {};
    eval('o=' + fs.readFileSync(path).toString().replace(/export +default/, ''))
    Object.assign(ks, o)
  }
  Object.assign(kv, ks);
  let str = 'export default {';
  Object.keys(kv).forEach(k => {
    const idx = keys.indexOf(k >> 0);
    const text = texts[idx];
    const v = kv[k].replace(/'/g, '\\\'')
    str += `\n\t${k} : '${v}', // ${text}`
  });
  str += '\n}'
  fs.writeFileSync(path, str)
}

/**
 * 调用百度翻译 将结果写到多语言文件
 * @param {String} lang 翻译的语言
 * @param {function} next 下一个方法
 */
function translateAndSave(lang, next) {
  const langFile = path.resolve(i18nLangPath, lang + '.js');
  const texts = Object.keys(vkMap);
  const keys = texts.map(t => vkMap[t])
  const salt = Math.random();
  const q = texts.join('\n');
  if (lang === 'zh-CN') {
    const kv = {}
    keys.forEach((k, i) => kv[k] = texts[i])
    updateLangFile(langFile, kv)
    console.log(`update file ${langFile}`)
    if (next) next();
    return
  }
  const appId = '20170630000061010';
  const appKey = 'KAqFHnCQzJ9SZprCx0Rb';
  const sign = md5(appId + q + salt + appKey);
  const data = queryStr.stringify({
    q: q,
    from: 'zh',
    to: langMap[lang],
    appid: appId,
    salt: salt,
    sign: sign
  });
  const opt = {
    host: 'api.fanyi.baidu.com',
    port: '80',
    path: '/api/trans/vip/translate',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(data)
    }
  };
  const post = http.request(opt, res => {
    let data = '';
    res['setEncoding']('utf8');
    res.on('data', chunk => {
      data += chunk;
    });
    res.on('error', err => {
      console.log(err);
      translateAndSave(lang, next)
    })
    res.on('end', () => {
      const kv = {}
      const result = JSON.parse(data)
      const r = result['trans_result'];
      if (r) {
        r.forEach((o, i) => {
          kv[keys[i]] = o['dst'];
        })
      }
      updateLangFile(langFile, kv)
      console.log(`update file ${langFile}`)
      if (next) next();
    })
  })
  post.write(data);
  post.end();
}

createLangsJSFile()
replaceFilesCN(pagePath)
replaceFilesCN(cmpPath)
fs.writeFileSync(mapFilePath, JSON.stringify(vkMap))
const ks = Object.keys(langMap)
let ksIdx = 0;
function next() {
  const lang = ks[ksIdx++];
  if (lang) translateAndSave(lang, next)
}
next();
