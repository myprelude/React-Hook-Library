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
export default function useImgLazy(className){
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
