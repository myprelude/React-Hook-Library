# React Hooks的实现原理和最佳实践

## 在谈 react hooks 之前

React的组件化给前端开发带来了前所未有的体验，我们可以像玩乐高玩具一样将一个组件堆积拼接起来，就组成了一个完整的UI界面，在加快了开发速度的同时又提高了代码的可维护性。但是随着业务功能复杂度提高，业务代码不得不和生命周期函数糅合到一起。这样很多重复的业务逻辑代码很难被抽离出来，为了快速开发不得不Ctrl+C，如果业务代码逻辑发生变化时，我们又不得不同时修改多个地方，极大的影响开发效率和可维护性。为了解决这个业务逻辑复用的问题，React官方也做了很多努力：

###  React.mixin

React mixin 是通过React.createClass创建组件时使用的，现在主流都是通过ES6方式创建react组件，官方因为mixin不好追踪变化以及影响性能，所以放弃了对其支持，同时也不推荐我们使用。这里就简单介绍下mixin：

mixin的原理其实就是将[mixin]里面的方法合并到组件的prototype上

```javascript
var logMixin = {
    alertLog:function(){
        alert('alert mixin...')
    },
    componentDidMount:function(){
        console.log('mixin did mount')
    }
}

var MixinComponentDemo = React.createClass({
    mixins:[logMixin],
    componentDidMount:function(){
        document.body.addEventListener('click',()=>{
            this.alertLog()
        })
        console.log('component did mount')
    }
})

// 打印如下
// component did mount
// mixin did mount
// 点击页面
// alert mixin...
```
可以看出来`mixin`就是将`logMixn`的方法合并到`MixinComponentDemo`组件中,如果有重名的生命周期函数都会执行（render除外），如果有重名的函数会报错。但是由于mixin的问题比较多所以这里就不展开讲。[点击了解更多](https://reactjs.org/blog/2016/07/13/mixins-considered-harmful.html)

### 高阶组件

组件是 React 中代码复用的基本单元。但你会发现某些模式并不适合传统组件。

例如：我们有个计时器和日志记录组件

```javascript
class LogTimeComponent extends React.Component{
    constructor(props){
        super(props);
        this.state = {
            index: 0
        }
        this.show = 0;
    }
    componentDidMount(){
        this.timer = setInterval(()=>{
            this.setState({
                index: ++index
            })
        },1000)
        console.log('组件渲染完成----')
    }
    componentDidUpdate(){
        console.log(`我背更新了${++this.show}`)
    }
    componentWillUnmount(){
        clearInterval(this.timer)
        console.log('组件即将卸载----')
    }
    render(){
        return(
            <div>
                <span>{`我已经显示了：${this.state.index}s`}</span>
            </div>
        )
        
    }
}
```
上面就简单的实现了简单的日志和计时器组件。那么问题来了假如有三个组件分别是`LogComponent`(需要记录日志)、`SetTimeComponent`(需要记录时间)、`LogTimeShowComponent`(日志和时间都需要记录)；怎么处理呢？把上面逻辑 Ctrl+C 然后 Ctrl+V 吗？如果记录日志的文案改变需要每个组件都修改么？官方给我们提供了高阶组件(HOC)的解决方案：

```javascript
function logTimeHOC(WrappedComponent,options={time:true,log:true}){
    return class extends React.Component{
        constructor(props){
            super(props);
            this.state = {
                index: 0
            }
            this.show = 0;
        }
        componentDidMount(){
            options.time&&this.timer = setInterval(()=>{
                this.setState({
                    index: ++index
                })
            },1000)
            options.log&&console.log('组件渲染完成----')
        }
        componentDidUpdate(){
            options.log&&console.log(`我背更新了${++this.show}`)
        }
        componentWillUnmount(){
            this.timer&&clearInterval(this.timer)
            options.log&&console.log('组件即将卸载----')
        }
        render(){
            return(<WrappedComponent {...this.state} {...this.props}/>)
        }
    }
}
```
`logTimeHOC`就是一个函数，接受一个组件返回一个新的组件（其实高阶组件就是一个函数）。我们用这个高阶组件来构建我们上面的三个组件：

`LogComponent`：打印日志组件
```javascript
class InnerLogComponent extends React.Component{
    render(){
        return(
            <div>我是打印日志组件</div>
        )
    }
}
// 使用高阶组件`logTimeHOC`包裹下 
export default logTimeHOC(InnerLogComponent,{log:true})
```
`SetTimeComponent`：计时组件
```javascript
class InnerSetTimeComponent extends React.Component{
    render(){
        return(
            <div>
                <div>我是计时组件</div>
                <span>{`我显示了${this.props.index}s`}</span>
            </div>
        )
    }
}
// 使用高阶组件`logTimeHOC`包裹下 
export default logTimeHOC(InnerSetTimeComponent,{time:true})
```
`LogTimeShowComponent`：计时+打印日志组件
```javascript
class InnerLogTimeShowComponent extends React.Component{
    render(){
        return(
            <div>
                <div>我是日志打印+计时组件</div>
            </div>
        )
    }
}
// 使用高阶组件`logTimeHOC`包裹下 
export default logTimeHOC(InnerLogTimeShowComponent)
```
这样不仅复用了业务逻辑提高了开发效率，同时还方便后期维护。当然上面的案例只是为了举例而写的案例，实际场景我们需要自己去合理抽取业务逻辑。高阶组件虽然很好用但是也有一些自身的缺陷：

* 高阶组件的props都是直接透传下来，无法确实子组件的props的来源。
* 可能会出现props重复导致报错。
* 组件的嵌套层级太深。
* 会导致ref丢失。

## React Hooks

上面说了很多，无非就是告诉我们已经有解决功能复用的方案了。为啥还要React Hooks这个呢？上面例子可以看出来，虽然解决了功能复用但是也带来了其他问题。由此官方给我带来`React Hooks`,它不仅仅解决了功能复用的问题，还让我们以函数的方式创建组件，摆脱Class方式创建，从而不必在被this的工作方式困惑，不必在不同生命周期中处理业务。

```javascript
import React,{ useState, useEffect } from 'react'
function useLogTime(data={log:true,time:true}){
    const [count,setCount] = useState(0);
    useEffect(()=>{
        data.log && console.log('组件渲染完成----')
        let timer = null;
        if(data.time){
            timer = setInterval(()=>{setCount(c=>c+1)},1000)
        } 
        return ()=>{
            data.log && console.log('组件即将卸载----')
            data.time && clearInterval(timer)
        }
    },[])
    return {count}
}
```
我们通过`React Hooks`的方式重新改写了上面日志时间记录高阶组件。如果不了解`React Hooks`的基本用法建议先[阅读react hook文档](https://react.docschina.org/docs/hooks-reference.html)。如果想深入了解setInterval在Hook中的表现可以看这篇[重新 Think in Hooks](https://zhuanlan.zhihu.com/p/67183229)。

假设我们已经掌握了`React Hooks`,那么我来重写下上面的三个组件：

`LogComponent`：打印日志组件
```javascript
export default function LogComponent(){
    useLogTime({log:true})
    return(
        <div>我是打印日志组件</div>
    )
}  
```
`SetTimeComponent`：计时组件
```javascript
export default function SetTimeComponent (){
    const {count} = useLogTime({time:true})
    return(
        <div>
            <div>我是计时组件</div>
            <span>{`我显示了${count}s`}</span>
        </div>
    )
}
```
`LogTimeShowComponent`：计时+打印日志组件
```javascript
export default function LogTimeShowComponent (){
    const {count} = useLogTime()
    return(
        <div>
            <div>我是日志打印+计时组件</div>
            <div>{`我显示了${count}s`}</div>
        </div>
    )
}
```
我们用`React Hooks`实现的这个三个组件和高阶组件一比较是不是发现更加清爽，更加PF。将日志打印和记录时间功能抽象出一个`useLogTime`自定义Hooks。如果其他组件需要打印日志或者记录时间，只要直接调用`useLogTime`这个自定义Hooks就可以了。是不是有种封装函数的感觉。

### React Hooks实现原理

如果让我们来实现一个`React Hooks`我们如何实现呢？好像毫无头绪，可以先看一个简单的`useState`:(这部分内容只是帮我们更好的理解Hooks工作原理，想了解Hooks最佳实践可以直接查看[React 生产应用]())

```javascript
    function App(){
        const [count,setCount] = useState(0);
        useEffect(()=>{
            console.log(`update--${count}`)
        },[count])
        return(
            <div>
                <button onClick={()=>setCount(count+1)}>
                {`当前点击次数：${count}`}
                </button>
            </div>
        )
    }
```
* 实现setState

上面可以看出来当调用`useState`时；会返回一个变量和一个函数，其参数时返回变量的默认值。我们先构建如下的useState函数：

```javascript
function useState(initVal) {
    let val = initVal;
    function setVal(newVal) {
        val = newVal;
        render(); // 修改val后 重新渲染页面
    }
    return [val, setVal];
}
```
我们可以在代码中来使用`useState`--[查看demo](https://codesandbox.io/s/hardcore-thompson-rm9n5);

不出意外当我们点击页面上的按钮时候，按钮中数字并不会改变；看控制台中每次点击都会输出0，说明useState是执行了。由于val是在函数内部被声明的，每次useState都会重新声明val从而导致状态无法被保存，因此我们需要将val放到全局作用域声明。

```javascript
let val; // 放到全局作用域
function useState(initVal) {
    val = val|| initVal; // 判断val是否存在 存在就使用
    function setVal(newVal) {
        val = newVal;
        render(); // 修改val后 重新渲染页面
    }
    return [val, setVal];
}
```
修改`useState`后，点击按钮时按钮就发生改变了--[修改后Demo](https://codesandbox.io/s/optimistic-keldysh-zmkfv)

* 实现useEffect

`useEffect`是一个函数，有两个参数一个是函数，一个是可选参数-数组,根据第二个参数中是否有变化来判断是否执行第一个参数的函数：

```javascript
// 实现第一版 不考虑第二个参数
function useEffect(fn){
    fn();
}
```
ok！不考虑第二个参数很简单，其实就是执行下函数--[这里查看Demo](https://codesandbox.io/s/mystifying-northcutt-4wdc1)（控制台中能看到useEffect执行了）。但是我们需要根据第二个参数来判断是否执行，而不是一直执行。所以我们还需要有一个判断逻辑去执行函数。

```javascript
let watchArr; // 为了记录状态变化 放到全局作用域
function useEffect(fn,watch){
    // 判断是否变化 
    const hasWatchChange = watchArr?
    !watch.every((val,i)=>{ val===watchArr[i] }):true;
    if( hasWatchChange ){
        fn();
        watchArr = watch;
    }
}
```
完成好`useEffect`我们在去测试下 --[测试demo](https://codesandbox.io/s/gifted-hawking-ivbmm)

打开测试页面我们每次点击按钮，控制台会打印当前更新的count；到目前为止，我们模拟实现了`useState`和`useEffect`可以正常工作了。不知道大家是否还记得我们通过全局变量来保证状态的实时更新；如果组件中要多次调用，就会发生变量冲突的问题，因为他们共享一个全局变量。如何解决这个问题呢？

* 解决同时调用多个 `useState` `useEffect`的问题

```javascript
// 通过数组维护变量
let memoizedState  = [];
let currentCursor = 0;

function useState(initVal) {
    memoizedState[currentCursor] = memoizedState[currentCursor] || initVal;
    function setVal(newVal) {
        memoizedState[currentCursor] = newVal;
        render(); 
    }
    // 返回state 然后 currentCursor+1
    return [memoizedState[currentCursor++], setVal]; 
}

function useEffect(fn, watch) {
  const hasWatchChange = memoizedState[currentCursor]
    ? !watch.every((val, i) => val === memoizedState[currentCursor][i])
    : true;
  if (hasWatchChange) {
    fn();
    memoizedState[currentCursor] = watch;
    currentCursor++; // 累加 currentCursor
  }
}
```
修改核心是将`useState`,`useEffect`按照调用的顺序放入memoizedState中,每次更新时，按照顺序进行取值和判断逻辑--[查看Demo](https://codesandbox.io/s/dazzling-ardinghelli-j1gcs)

* 图解React Hooks 原理

![图解Reat Hooks](https://dimg04.c-ctrip.com/images/410a16000000yzafh4B8C.jpg)

如上图我们根据调用hooks顺序，将hooks依次存入数组`memoizedState`中，每次存入时都是将当前的`currentcursor`作为数组的下标，将其传入的值作为数组的值，然后在累加`currentcursor`，所以hooks的状态值都被存入数组中`memoizedState`。

![图解React Hooks执行更新](https://dimg04.c-ctrip.com/images/410516000000z0jd0D544.jpg)

上面状态更新图，我们可以看到执行`setCount(count + 1)`或`setData(data + 2)`时，先将旧数组`memoizedState`中对应的值取出来重新复值，从而生成新数组`memoizedState`。对于是否执行`useEffect`通过判断其第二个参数是否发生变化而决定的。

这里我们就知道了为啥[官方文档介绍：](https://react.docschina.org/docs/hooks-rules.html)**不要在循环，条件或嵌套函数中调用 Hooks， 确保总是在你的 React 函数的最顶层调用他们**。因为我们是根据调用hooks的顺序依次将值存入数组中，如果在判断逻辑循环嵌套中，就有可能导致更新时不能获取到对应的值，从而导致取值混乱。同时`useEffect`第二个参数是数组，也是因为它就是以数组的形式存入的。

当然，react官方不会像我们这么粗暴的方式去实现的，想了解官方是如何实现可以去[这里查看](https://github.com/facebook/react/blob/master/packages/react/src/ReactHooks.js)。

## React 生产应用

在说到React实际工作应用之前，希望你能对React Hooks有做过了解，知道如`useState`、`useEffect`、`useContext`等基本Hooks的使用，以及如何自定义Hooks，如果不了解可以[点击这里了解关于Hook的知识点](https://react.docschina.org/docs/hooks-intro.html)。

### 如何模拟React的生命周期

* constructor：函数组件不需要构造函数。你可以通过调用 useState 来初始化 state。
* componentDidMount：通过 useEffect 传入第二个参数为[]实现。
* componentDidUpdate：通过 useEffect 传入第二个参数为空或者为值变动的数组。
* componentWillUnmount：主要用来清除副作用。通过 useEffect 函数 return 一个函数来模拟。
* shouldComponentUpdate：你可以用 React.memo 包裹一个组件来对它的 props 进行浅比较。来模拟是否更新组件。
* componentDidCatch and getDerivedStateFromError：目前还没有这些方法的 Hooks 等价写法，但很快会加上。

### 如何通过React Hooks进行数据请求

前端页面免不了要和数据打交道，在Class组件中我们通常都是在`componentDidMount`生命周期中发起数据请求，然而我们使用Hooks时该如何发送请求呢？

```javascript
import React,{ useState,useEffect } from 'react';

export default function App() {
  const [data, setData] = useState(null);
  useEffect(() => {
    const fetchData = async () => {
      const result = await axios(
        "https://easy-mock.com/mock/5b514734fe14b078aee5b189/example/queryList"
      );
      setData(result.data); // 赋值获取后的数据
    };
    fetchData();
  });

  return (
    <div>
      {data ? (
        <ul>
          <li>{`id：${data.id}`}</li>
          <li>{`title：${data.title}`}</li>
        </ul>
      ) : null}
    </div>
  );
}
```
[可以查看Demo](https://codesandbox.io/s/stoic-cache-yzf3p),我们发现页面报错。根据我们了解到的知识，如果 useEffect 第二个参数不传入，导致每次data更新都会执行，这样就陷入死循环循环了。我们需要改造下

```javascript
...

useEffect(() => {

    ...

},[]);

'''
```
我们给第二个参数加上一个[\]发现页面就可以显示了，[将这个Demo中注释解除了](https://codesandbox.io/s/stoic-cache-yzf3p)。，我们就可以发现页面正常显示了。

我们一个程序会有多个组件，很多组件都会有请求接口的逻辑，不能每个需要用到这个逻辑的时候都重新写或者Ctrl+C。所以我们需要将这个逻辑抽离出来作为一个公共的Hooks来调用，那么我们就要用到自定义Hooks。

```javascript
// config =>  期望格式
// {
//     method: 'post',
//     url: '/user/12345',
//     data: {
//         firstName: 'Fred',
//         lastName: 'Flintstone'
//     }
// }
function useFetchHook(config){
    const [data,setData] = useState(null);
    useEffect(() => {
        const fetchData = async () => {
            const result = await axios(config);
            setData(result.data)
        };
        fetchData();
    },[]);
    return { data }
}
```
现在我们就将请求接口的逻辑单独抽出来了，如果那个组件需要使用可以直接引入`useFetchHook`[这里可以查看Demo](https://codesandbox.io/s/fragrant-rgb-x3m4c)。

上面的`useFetchHook`虽然可以解决我们请求接口的问题；如果我们现在是一个分页接口，每次传入不同的page都会重新请求，所以我们还需要修改下：

```javascript
//  watch => 期望格式是 []
function useFetchHook(config,watch){
    const [data,setData] = useState(null);
    useEffect(() => {
        ...
    },
    watch?[...watch]:[] // 判断是否有需要监测的属性
    );
    return { data }
}
```
[点击查看Demo](https://codesandbox.io/s/busy-haze-ebw94),我们现在点检页面上的按钮发现页面的数据户一直发生变化，控制台也会打印，说明我们更改page时都会重新请求接口，上面的问题就解决了。

上面的`useFetchHook`虽然可以解决大部分情况，但是一个健全的 接口请求Hooks 还需要告知使用者接口请求状态的成功、失败。我们继续---

```javascript
function useFetchHook(config,watch){
    // status 标识当前接口请求状态 0：请求中 1：请求成功 2：请求失败
    const [status,setStatus] = useState(0);
    const [data,setData] = useState(null);
    useEffect(() => {
        try{
            ...
            setStatus(1) // 成功
        }catch(err){
            setStatus(2) // 失败
        }
    },
    watch?[...watch]:[] // 判断是否有需要监测的属性
    );
    return { data, status }
}
```
[点击这里可以查看](https://codesandbox.io/s/distracted-fire-7bw6h);我们改造后发现页面按钮多了接口状态，点击时也会发生改变，为了测试失败状态，我们将 Chrome - network - Offine 改为 offine状态，再次点击发现状态就变成2（失败）。

还没有完呢！使用者知道了状态后可以做相应的 loading... 操作等等；但是对于接口的报错我们也可以做一个埋点信息或者给一个友善的提示---至于后面怎么写我相信大家都可以发挥自己的想象。下面是`useFetchHook`完整代码：

```javascript
function useFetchHook(config, watch) {
    const [data, setData] = useState(null);
    const [status, setStatus] = useState(0);
    useEffect(
        () => {
        const fetchData = async () => {
            try {
            const result = await axios(config);
            setData(result.data);
            setStatus(1);
            } catch (err) {
            setStatus(2);
            }
        };

        fetchData();
        },
        watch ? [watch] : []
    );
    return { data, status };
}
```

### 提高性能的操作

```javascript
class App extends Component{
    render() {
        return 
        <div>
            <Button onClick={ () => { console.log('do something'); }}  />
        </div>;
    }
}
```
上面App组件如果props发生改变时，就会重新渲染组件。如果这个修改并不涉及到Button组件，但是由于每次render的时候都会产生新的onClick函数，react就认为其发生了改变，从而产生了不必要的渲染而引起性能浪费。

```javascript
class App extends Component{
    constructor(){
        super();
        this.buttonClick = this.buttonClick.bind(this);
    }
    render() {
        return 
        <div>
            <Button onClick={ this.buttonClick }  />
        </div>;
    }
}
```
在类组件中我们可以直接将函数绑定到this对象上。在Hooks组件中怎么解决呢？

```javascript
function App(){
    const buttonClick = useCallback(
        () => { console.log('do something'),[]
    )
    return(
        <div>
            <Button onClick={ buttonClick }  />
        </div>
    )
}
```
如上直接用`useCallback`生成一个记忆函数，这样更新时就不会发生渲染了。在react Hooks 中 还有一个`useMemo`也能实现同样的效果。

### React Hooks 实现一个简版的redux

React是从上而下的单向数据流，父子组件之间信息传递可以通过Props实现，兄弟组件的信息传递我们可以将Props提升到共同的父级实现信息传递，如果组件层级嵌套过深，对开发者来说是十分痛苦的。所以社区基于redux产生了react-redux工具，当然我们这里对react-redux做讲解，而是提供一种新的解决方案。

[这里提供体验地址](https://codesandbox.io/s/bold-thunder-xe8mb)

```javascript
// 创建Context
const AppContext = React.createContext();
const AppDispatch = (state, action) => {
    switch (action.type) {
        case "count.add":
            return { ...state, count: state.count + 1 };
        case "count.reduce":
            return { ...state, count: state.count - 1 };
        case "color":
            return { ...state, color: colorArr[getRandom()] };
        default:
            return state;
    }
};
// 创建Provider
const AppProvider = props => {
    let [state, dispatch] = useReducer(AppDispatch, context);
    return (
        <AppContext.Provider value={{ state, dispatch }}>
        {props.children}
        </AppContext.Provider>
    );
};
// ...
function Demo3() {
    // 使用 Context
    const { state, dispatch } = useContext(AppContext);
    return (
        <div
        className="demo"
        style={{ backgroundColor: state.color }}
        onClick={() => {
            dispatch({ type: "count.add" });
            dispatch({ type: "color" });
        }}
        >
        <div className="font">{state.count}</div>
        </div>
    );
}
// ...
// 将 AppProvider 放到根组件
ReactDOM.render(
  <AppProvider>
    <App />
  </AppProvider>,
  rootElement
);
```
[完整代码在这里获取](https://codesandbox.io/s/bold-thunder-xe8mb)


### 一起来封装常用的Hooks

在开始封装常用Hooks之前插一个题外话，我们在开发中时，不可能都是新项目；对于那些老项目（react已经升级到16.8.x）我们应该如何去使用Hooks呢？其实很简单我们可以开发一些常用的hooks，当我们老项目有新的功能我们完全可以用Hooks去开发，如果对老的组件进行修改时我们就可以考虑给老组件上Hooks；不建议一上来就进行大改。随着我们的常用Hooks组件库的丰富，后期改起来也会非常快。

在使用Hooks时难免少不了一些常用的Hooks，如果可以将这些常用的Hooks封装起来岂不是美滋滋！

首先可以创建如下目录结构：

!['React Hooks 目录结构'](https://dimg04.c-ctrip.com/images/410p16000000yzpa25956.jpg)

index.js文件

```javascript
import useInterval from  './useInterval'
// ...
export{
    useInterval
    // ...
}
```

lib中存放常用Hooks, 如实现一个useInterval：为啥我们需要一个useInterval的自定义Hooks呢？


在程序中直接使用 setInterval
```javascript
function App(){
    const [count,setCount] = useState(0);
    useEffect(()=>{
        console.log(count)
        setInterval(()=>{
            setCount(count+1)
        })
    })
    return <p>{count}</p>
}
```
上面代码直接运行我们会发现页面上的 count 越加越快，是由于 count 每次发生改变都导致定时器触发。所以需要每次在清除下定时器：

```javascript
function App(){
    const [count,setCount] = useState(0);
    useEffect(()=>{
        console.log(count)
        const timer = setInterval(()=>{
            setCount(count+1)
        })
        // 清除副作用
        return ()=>{ clearInterval(timer) } 
    })
    return <p>{count}</p>
}
```
改动代码后页面好像可以正常显示了，我们打开控制台可以看到一直会打印 count ，这样对于性能来将无疑是一种浪费，我们只需要执行一次就可以了，在改下代码

```javascript
function App(){
    const [count,setCount] = useState(0);
    useEffect(()=>{
        console.log(count)
        const timer = setInterval(()=>{
            setCount(count+1)
        })
        return ()=>{ clearInterval(timer) }
    },[]) // 添加第二个参数
    return <p>{count}</p>
}
```
在看页面，发现控制台好像是只打印一次了，但是页面上的 count 以及不发生改变了，这不是我们想要的，还需要改变下：

```javascript
function App(){
    const [count,setCount] = useState(0);
    useEffect(()=>{
        console.log(count)
        const timer = setInterval(()=>{
            setCount(count+1)
        })
        return ()=>{ clearInterval(timer) }
    },[count]) // 添加  count 变量 
    return <p>{count}</p>
}
```
Ok！现在好像解决了上面的问题了，但是这个只是一个定时器累加的任务而且只涉及到一个变量，如果是定时执行其他任务，同时有多个变量，那么岂不是又要修改。所以为了解决这个问题我们迫切需要一个useInterval自定义钩子。

```javascript
function useInterval(callback,time=300){
    const intervalFn = useRef(); // 1
    useEffect(()=>{
        intervalFn.current = callback;  // 2
    })
    useEffect(()=>{
        const timer = setInterval(()=>{
            intervalFn.current()
        },time)
        return ()=>{ clearInterval(timer) }
    },[time])  // 3
}
```
[自定义useInterval钩子体验地址](https://codesandbox.io/s/keen-babbage-livir)

简单介绍下useInterval钩子: 1.通过useRef创建一个对象；2.将需要执行的定时任务储存在这个对象上；3.将time作为第二个参数是为了当我们动态改变定时任务时，能过重新执行定时器。

开发中使用`useInterval`如下：

```
useInterval(() => {
    // you code
}, 1000);
```
是不是很简单有很方便，现在将`useInterval`放到lib文件夹中，再在index.js文件中导出一下，其他地方要用的时候直接import就可以了。

**开放思维**

问题：做一个useImgLazy的 hooks 函数。

*为提高网页的性能我们一般都会网页上图片资源做一些优化，懒加载就是一种方案，useImgLazy就是实现懒加载的 Hooks*

```javascript
// 判断是否在视口里面
function isInWindow(el){
    const bound = el.getBoundingClientRect();
    const clientHeight = window.innerHeight;
    return bound.top <= clientHeight + 100;
}
// 加载图片真实链接
function loadImg(el){
    if(!el.src){
        const source = el.getAttribute('data-sourceSrc');
        el.src = source;
    }
}
// 加载图片
function checkImgs(className){
    const imgs = document.querySelectorAll(`img.${className}`);
    Array.from(imgs).forEach(el =>{
        if (isInWindow(el)){
            loadImg(el);
        }
    })
}
function useImgLazy(className){
    useEffect(()=>{
        window.addEventListener('scroll',()=>{
            checkImgs(className)
        });
        checkImgs(className);

        return ()=>{
            window.removeEventListener('scroll')
        }
    },[])
}
```
上面代码逻辑就是 通过`getBoundingClientRect`获取图片元素的位置，从而判断是否显示图片真实地址，用`useEffect`模拟页面加载成功（onload事件）同时监听`scroll`事件。

在需要使用图片懒加载的项目中使用:

```javascript
function App(){
    // ...
    useImgLazy('lazy-img')
    // ...
    return (
        <div>
            // ...
            <img className='lazy-img' data-sourceSrc='真实图片地址'/>
        </div>
    )
}
```
以上`useImgLazy`代码我是写这篇文章时突然诞生的一个想法，没有验证，如果哪位同学验证后有问题还请告知我[在这里是反馈问题](https://github.com/myprelude/React-Hook-Library/issues)，如生产上使用产生问题我一概不负责。


我相信大家看了这篇文章一定会蠢蠢欲动，创建一个自定义 Hooks 。点击这里[你们使用过哪些自定义Hooks函数](https://github.com/myprelude/React-Hook-Library/issues/1)你可以分享、学习其他人是如何自定义有趣的Hooks。

这里可以分享Hooks的最佳实践帮助我们更快的使用React Hooks[说说Hooks中的一些最佳实践##](https://github.com/myprelude/React-Hook-Library/issues/2)

[这里会收集大家分享的--实用的有趣的Hooks](https://github.com/myprelude/React-Hook-Library)



## 参考文章

* [React 中文文档](https://react.docschina.org/)
* [React Hooks 原理](https://github.com/brickspert/blog/issues/26)
* [Deep dive: How do React hooks really work?](https://www.netlify.com/blog/2019/03/11/deep-dive-how-do-react-hooks-really-work/)
* [Making setInterval Declarative with React Hooks](https://overreacted.io/making-setinterval-declarative-with-react-hooks/)
* [Um guia completo para useEffect](https://overreacted.io/pt-br/a-complete-guide-to-useeffect/)
* [How to fetch data with React Hooks?](https://www.robinwieruch.de/react-hooks-fetch-data/)
