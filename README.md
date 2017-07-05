# auto-i18n
一个自动提取中文调用百度API生成i18n文件的例子

应对的是一个vue2的项目

匆忙写的 并不精炼 

## 准备工作
你需要申请百度翻译的API权限 [链接](http://api.fanyi.baidu.com/api/trans/product/index)

## 目录结构
这是一个例子 项目是vue写的

```
--i18n // 多语言的文件夹
  |--index.js   // 多语言的模块导出
  |--key.json   // 自动生成中文和对应的key
  |--langs.js   // 自动生成的文件 汇总多语言文件提供
  |--langs      // 生成的文件会自动写到这个文件夹
      |-- xx.js // 自动生成的语言文件
      |--
```      
## 其他事项

我自己用的是vuex-i18n 作为多语言的插件
和element 搭配需要做兼容处理

```
import lang from './i18n'
// ...
// i18n
Vue.use(vuexI18n.plugin, store);
  const i18n = Vue.i18n;
  Object.keys(lang).forEach(k=>{
    i18n.add(k,lang[k])
})
top.$lang = Vue.prototype.$t;// 这里并不推荐这么做 只是为了粗暴解决不在组件中的js中文 
Vue.use(ElementUI)
Vue.locale =_=>0
i18n.set(i18n.locale()||'en')// 默认英语
```

然后 i18n文件夹下index.js 文件做element 多语言文件的兼容处理
```
import lang from './langs';

const {elementLang,localLang} = lang;
const i18n={}

// 数据结构扁平化
function cover2ns(obj={},ns=[],del={}) {
  Object.keys(obj).forEach(k=>{
    if(k==='__root')return
    const o = obj[k]
    if(typeof o==='object'){
      if(!obj.__root)del[k]=0
      o.__root = obj.__root||obj;
      cover2ns(o,ns.concat(k),del)
    }else {
      if(obj.__root)obj.__root[ns.concat(k).join('.')]=o;
    }
  })
  if(!obj.__root){
    Object.keys(del).forEach(k=>delete obj[k])
  }
}

Object.keys(elementLang).forEach(k=>{
  const o =elementLang[k];
  cover2ns(o)
  i18n[k] = Object.assign({},o,localLang[k])
})
console.log(i18n)
export default i18n

```
// 自动生成langs.js的例子
```
import l0 from './langs/zh-CN';
import e0 from 'element-ui/lib/locale/lang/zh-CN';
import l1 from './langs/en';
import e1 from 'element-ui/lib/locale/lang/en';
import l2 from './langs/ja';
import e2 from 'element-ui/lib/locale/lang/ja';
...

export default {
	elementLang:{
		'zh-CN' : e0,
		'en' : e1,
		'ja' : e2,
    ...
    },
  localLang:{
		'zh-CN' : l0,
		'en' : l1,
		'ja' : l2,
		'ko' : l3,
    ...
    }}
```
