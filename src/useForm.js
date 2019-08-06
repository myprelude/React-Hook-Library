import React,{useRef} from 'react'

function type(obj){
    return Object.prototype.toString.call(obj)
}
function isObject(obj){
    return type(obj) === '[object Object]'
}
function isArray(arr){
    return type(arr) === '[object Array]'
}
function isString(str){
    return typeof str ==='string'
} 
function isDOMComponent(inst) {
    return !!(inst && inst.nodeType === 1 && inst.tagName);
}

let Rules = {
    required:{
        pattern: /^[\s\S]*.*[^\s][\s\S]*$/,
        message:'这个是必填项'
    }
}

export default function useForm(rule){
    const inputObj = useRef({});
    const error = useRef({});

    Rules = Object.assign( {}, Rules, rule||{} );

    function validate(rule){
        if( rule && isDOMComponent(rule) ){
            return createData(rule,arguments[1])
        }
        return (ref) => {
            ref && createData(ref,rule)
        }
    }
    function onSubmit (fn){
        let formData = {},rules = {},success = true;

        for (let k in inputObj.current) {
            formData[k] = inputObj.current[k].ref.value;
            rules[k] = inputObj.current[k].rules;
        }

        for (let k in rules) {
            error.current[k] = [];
            rules[k].forEach((item)=>{
                if( item.pattern ){ 
                    success && (success = item.pattern.test(formData[k]));
                    if(!item.pattern.test(formData[k])){
                        error.current[k].push(item.message)
                    }
                }
            })
        }

        fn && fn({ success, data:formData, error:{...error.current} })
    }

    function resetError(target,fn){
        return ()=>{
            if(target){
                error.current[target] && (error.current[target] = {});
            }else{
                error.current = {};
            }
            fn && fn({...error.current})
        }
    }
    /****************************************************************************** 
     *                           Util start                                       *             
    *******************************************************************************/
    /**
     * 构造数据
     * @param {DOM Object} ref 
     * @param {Object/string/Array} rule 
     */
    function createData(ref,rule){
        inputObj.current[ref.name] = {
            ref: ref,
            rules: formatRule(rule)
        }
        error.current[ref.name] = error.current[ref.name]?error.current[ref.name]:null;
    }
    /**
     * 构建验证规则数据
     * @param {Object/string/Array} rule 
     */
    function formatRule(rule){
        if( isArray(rule) ){
            let ruleObj = [];
            rule.forEach((list)=>{
                if( list && isString(list) ){
                    if( Rules[list] ){
                        ruleObj.push(Rules[list]);
                    }else{
                        console.error(`${list}  is Invalid Rules; please checked rule or add ${list} in Rules`);
                    }
                }
                else if( list && isObject(list) ){
                    ruleObj.push(list)
                }
            })
            return ruleObj;
        }
        else if( isObject(rule) ){
            return [rule]
        }
        else if( rule && isString(rule) ){
            if( Rules[rule] ){
                return [Rules[rule]];
            }else{
                console.error(`${rule}  is Invalid Rules; please checked rule or add ${rule} in Rules`);
                return [];
            }
        }
        else{
            return [];
        }
    }
    /****************************************************************************** 
     *                           Util End                                         *             
    *******************************************************************************/
    return { validate, onSubmit, resetError }
}
