/**
const timer = useInterval(()=>{ 
	console.log(`我是编号为${timer}的定时器`) 
},1000)
// 清除定时器
clearInterval(timer)
**/

export default function useInterval(callback,time=300){
    const intervalFn = useRef({}); 
    useEffect(()=>{
        intervalFn.current.callback = callback;  
    })
    useEffect(()=>{
        intervalFn.current.timer = setInterval(()=>{
            intervalFn.current()
        },time)
        return ()=>{ 
        	intervalFn.current.timer && 
			clearInterval(intervalFn.current.timer) 
		}
    },[time])  
    return intervalFn.current.timer  
}
