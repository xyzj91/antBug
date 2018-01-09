/**
 * antBug 蚂蚁bug收集系统
 * author:alen 2018年1月4日
 */
window.antBug = (function(window,documents){
    var ant = {};
    var _self = this;
    _self.isInit = false;//防止重复监听
    ant.SERVER_HOST = "";//服务器地址
    ant.APP_ID = "default";//唯一识别ID
    ant.DEBUG = false;//debug 模式
    _self.APIVERSION = "1.0";//插件版本
    _self.messageContent = {
        notifierVersion: _self.APIVERSION,//插件版本号
        userAgent: window.navigator.userAgent,//用户agent头
        locale: window.navigator.language || window.navigator.userLanguage,//语言
        url: window.location.href,//接口地址
        appId: ant.APP_ID,//识别id
        title: documents.title,//当前页面标题
        time: (new Date).getTime(),
        appVersion: "",//app版本
        message: "",//错误信息
        fileName: "",//文件名称
        lineNumber: "",//第几行
        columnNumber: "",//第几列
        stacktrace: "",//错误详情
        type: "",//错误类型 可选值 resourceError,httpError,uncaughtError
        deviceType: "web",//设备类型
        osVersion: "",//系统版本
        ext: {},//扩展传参
        breadcrumbs:"",//错误记录
    };
    ant.collectResourceError = true;//是否收集资源加载错误
    ant.collectHttpError = true;//是否收集http错误
    ant.maxErrorNum = 20;//最大错误量
    _self.breadcrumbs = [];//上报失败记录

    /**
     * 参数合并
     * @param {type} target
     * @param {type} source
     * @param {type} deep
     * @returns {unresolved}
     */
    ant.extend = function() { //from jquery2
        var options, name, src, copy, copyIsArray, clone,
            target = arguments[0] || {},
            i = 1,
            length = arguments.length,
            deep = false;

        if (typeof target === "boolean") {
            deep = target;

            target = arguments[i] || {};
            i++;
        }

        if (typeof target !== "object" && !$.isFunction(target)) {
            target = {};
        }

        if (i === length) {
            target = this;
            i--;
        }

        for (; i < length; i++) {
            if ((options = arguments[i]) != null) {
                for (name in options) {
                    src = target[name];
                    copy = options[name];

                    if (target === copy) {
                        continue;
                    }

                    if (deep && copy && ($.isPlainObject(copy) || (copyIsArray = $.isArray(copy)))) {
                        if (copyIsArray) {
                            copyIsArray = false;
                            clone = src && $.isArray(src) ? src : [];

                        } else {
                            clone = src && $.isPlainObject(src) ? src : {};
                        }

                        target[name] = $.extend(deep, clone, copy);

                    } else if (copy !== undefined) {
                        target[name] = copy;
                    }
                }
            }
        }

        return target;
    };

    //异常上报到服务器
    _self.send = function(param){
        var ajax = new XMLHttpRequest();
        var data = {
            "type":"get",
            "url":"",
            "data":{},
            "success":function(){},
            "error":function(){},
        };
        if(param){
            data = ant.extend(data,param);
        }
        ajax.open(data.type,data.url);
        if(data.data){
            ajax.send(data.data);
        }
        ajax.onreadystatechange = function(){
            if(ajax.readyState==4){
                if(ajax.status==200){
                    data.success(ajax.responseText);
                }else{
                    data.error(ajax.status);
                }
            }
        };
    }

    /**
     * 错误数据兼容获取
     * @param error
     * @returns {*}
     */
    _self.parseError = function(error){
        var messageContent = JSON.parse(JSON.stringify(_self.messageContent));
        messageContent.message = error.message;
        messageContent.fileName = error.fileName;
        messageContent.lineNumber = error.lineNumber;
        messageContent.columnNumber = error.columnNumber;
        messageContent.stacktrace = error.stacktrace;
        messageContent.target = error.target;
        _self.messageContent.breadcrumbs = _self.breadcrumbs;

        _self.pushBreadcrumbs(error);//将错误推入数组中
        return messageContent;
    }

    /**
     * 错误信息处理
     * @param error
     * @returns {*}
     */
    _self.parseErrorMessage = function(error){
        var message = _self.parseError(error);
        message = ant.extend(message,error);
        if(!error.type && message.message.indexOf("Uncaught")!==false){
            message.type = "uncaughtError";
        }
        return message;
    }
    /**
     * 将数据转成json格式字符串
     * @param e
     * @returns {string}
     */
    _self.toJsonStr = function (data) {
        if ("undefined" != typeof JSON) return JSON.stringify(data);
        if (data instanceof Array) {
            for (var arr = [], i = 0; r < data.length; i++) arr.push(_self.toJsonStr(data[i]));
            return "[" + arr.join(",") + "]"
        }
        var _arr = [];
        for (var row in data) if (data.hasOwnProperty(row)) {
            var i = '"' + row + '":',
                info = data[row];
            info && ("object" == typeof info ? i += _self.toJsonStr(info) : "number" == typeof info ? i += info : i = i + '"' + info.replace(/\n/g, "\\n") + '"', _arr.push(i))
        }
        return "{" + _arr.join(",") + "}"
    }
    /**
     * 转换数据
     * @param e
     * @returns {*}
     */
    _self.converData = function(data) {
        var res;
        try {
            res = toJsonStr(data)
        } catch (exception) {
            delete data.metaData;
            try {
                res = toJsonStr(data)
            } catch (data) {
                return;
            }
        }
        return res;
    }
    //是否是字符串
    _self.isString = function(str){
        return (typeof str=='string')&&str.constructor==String;
    }
    //输出日志
    _self.dump = function(data,message){
        if(ant.DEBUG){
            if(!_self.isString(data)){
                data = JSON.stringify(data);
            }
            console.log(data);
            if(message){
                console.log(message);
            }
        }
    }
    //主动上报异常接口
    ant.error = function(messageContent){
        if(ant.maxErrorNum){
            ant.maxErrorNum -= 1;
            var message = _self.converData(_self.parseErrorMessage(messageContent));
            _self.dump(message);//输出日志
            if(message){
                _self.send({
                    "type":"post",
                    "url":ant.SERVER_HOST,
                    "data":message,
                    "success":function(data){
                        _self.dump(data);//输出日志
                        //上报成功,移除记录
                        _self.removeBreadcrumbs();
                    },
                    "error":function(errcode){
                        _self.dump(errcode,"记录上传失败");//输出日志
                    }
                });
            }
        }
    }
    /**
     * 将记录推入数组中
     * @param data
     */
   _self.pushBreadcrumbs = function(data){
       var errorContent = data;
       if(errorContent.breadcrumbs){
           delete errorContent.breadcrumbs;
       }
         _self.breadcrumbs.push(errorContent),_self.breadcrumbs.length>ant.maxErrorNum&&_self.breadcrumbs.shift();
   }
    /**
     * 移除记录
     */
   _self.removeBreadcrumbs = function(){
       _self.breadcrumbs = [];
   }
    _self.parseUrl2Xpath = function(_target) {

        for (var arr = []; _target && _target.nodeType == Node.ELEMENT_NODE; _target = _target.parentNode) {
            var temp, num = 0,
                temp1 = false;
            for (temp = _target.previousSibling; temp; temp = temp.previousSibling) temp.nodeType != Node.DOCUMENT_TYPE_NODE && temp.nodeName == _target.nodeName && ++num;
            for (temp = _target.nextSibling; temp && !temp1; temp = temp.nextSibling) temp.nodeName == _target.nodeName && (temp1 = true);
            var parsedata = (_target.prefix ? _target.prefix + ":" : "") + _target.localName,
                step = num || temp1 ? "[" + (num + 1) + "]" : "";
            arr.splice(0, 0, parsedata + step)
        }
        return arr.length ? "/" + arr.join("/") : null
    }
    _self.parseSelector = function(_target) {
        for (var arr = []; _target.parentNode;) {
            if (_target.id) {
                arr.unshift("#" + _target.id);
                break
            }
            if (_target == _target.ownerDocument.documentElement) arr.unshift(_target.tagName);
            else {
                for (var i = 1, temp = _target; temp.previousElementSibling; temp = temp.previousElementSibling, i++);
                arr.unshift(_target.tagName + ":nth-child(" + i + ")")
            }
            _target = _target.parentNode
        }
        return arr.join(" > ")
    }

    /**
     * 资源错误异常搜集适配器
     * @param error
     */
    ant.resourceErrorAdaper = function(error){
        if(ant.collectResourceError && !error.message){
            var _target;
            _target = error.target ? error.target : error.srcElement;
            var outerHTML = _target && _target.outerHTML;
            outerHTML && outerHTML.length > 200 && (outerHTML = outerHTML.slice(0, 200));
            var data = {
                type: "resourceError",
                fileName:_target.fileName,
                lineNumber:error.lineNumber,
                columnNumber:error.columnNumber,
                stacktrace: error.stacktrace,
                target: {
                    outerHTML: outerHTML,
                    src: _target && _target.src,
                    tagName: _target && _target.tagName,
                    id: _target && _target.id,
                    className: _target && _target.className,
                    name: _target && _target.name,
                    type: _target && _target.type,
                    XPath: _self.parseUrl2Xpath(_target),
                    selector: _self.parseSelector(_target),
                    timeStamp: error.timeStamp
                }
            };
            if (_target.src !== window.location.href && (!_target.src || !_target.src.match(/.*\/(.*)$/) || _target.src.match(/.*\/(.*)$/)[1]) && data.target.src && window.XMLHttpRequest) {
                var xmlHttprequest = new XMLHttpRequest;
                xmlHttprequest.AntDebug = true
                    , xmlHttprequest.open("HEAD", data.target.src)
                    , xmlHttprequest.send()
                    , xmlHttprequest.onload = function(request) {
                    200 !== request.target.status && (data.target.status = request.target.status, data.target.statusText = request.target.statusText),ant.error(data)
                }
            }
        }
    }
    /**
     * 监听错误
     */
    _self.listenerError = function(){
        /**
         * 全局监听错误
         * @param errorMessage 错误信息
         * @param errorFile 报错文件
         * @param lineNumber 错误行
         * @param colNumber 错误列
         * @param error 错误详细信息
         */
        window.onerror = function (errorMessage,errorFile,lineNumber,colNumber,error) {
            ant.error({
                message: errorMessage,//错误信息
                fileName: errorFile,//文件名称
                lineNumber: lineNumber,//第几行
                columnNumber: colNumber,//第几列
                stacktrace: error,//错误详情
            });
        };
        documents.onreadystatechange = function(){
        }
    }
    /**
     * 检查http请求状态
     * @param data
     * @returns {boolean}
     */
    _self.checkHttpStatus = function(data){
        return ant.collectHttpError && ((true == data.detail.status || !/^file:\/\/\//.test(data.detail.url)) && 2 !== parseInt(data.detail.status / 100));
    }
    /**
     * 初始化资源加载错误监听
     */
    ant.resourceError = function(){
        window.addEventListener&&window.addEventListener("error",ant.resourceErrorAdaper,true);
        _self._hashchange = window.onhashchange;
        window.onhashchange = function(){
            var data = {
                url: window.location.href,
                title: document.title
            };
            return _self._hashchange.apply(this, arguments);
        };
        if(window.XMLHttpRequest){
            _self.prototype = XMLHttpRequest.prototype;
            if(!_self.prototype){
                return;
            }
            var method,httpurl,firstTime,_open = _self.prototype.open;
            _self.prototype.open = function(_method,url){
                firstTime = (new Date).getTime();
                method = _method;
                httpurl = url;
                try{
                    _open.apply(this,arguments);
                }catch(e){
                    console.log("请求失败");
                }
            };
            var _send = _self.prototype.send;
            _self.prototype.send = function(){
                var _this = this;
                var _onreadystatechange = _this.onreadystatechange;
                _this.onreadystatechange = function(){
                    if (4 === _this.readyState) {
                        var times = (new Date).getTime() - firstTime,
                            data = {
                                type: "XMLHttpRequest",
                                page: {
                                    url: window.location.href
                                },
                                detail: {
                                    method: method,
                                    url: _this.responseURL || httpurl,
                                    status: _this.status,
                                    statusText: _this.statusText
                                },
                                elapsedTime: times,
                                time: firstTime
                            };
                        //http错误上报
                        if (_self.checkHttpStatus(data)) {
                            var req = {
                                    method: data.detail.method,
                                    url: data.detail.url
                                },
                                res = {
                                    status: _this.status,
                                    statusText: _this.statusText,
                                    response: _this.response,
                                    elapsedTime: times
                                };
                            //上报错误
                            ant.error({
                                type: "httpError",
                                req: req,
                                res: res,
                            });
                        }
                    }
                    _onreadystatechange&&_onreadystatechange.apply(this,arguments);
                },_send.apply(this,arguments);
            }
        }

    }

    /**
     * 初始化异常监控类
     */
    ant.init = function(param){
        if(_self.isInit){
            return ant;
        }
        _self.isInit = true;
        //初始化资源请求错误监听
        ant.resourceError();
        //监听错误消息
        _self.listenerError();
        if(param){
            _self.messageContent = ant.extend(_self.messageContent,param);//合并请求参数
        }
    };

    return ant;
})(window,document);

/**demo 集成时请去掉
 antBug.init({
    appVersion: "3.1",//app版本
});
 antBug.collectHttpError = false;
 antBug.collectResourceError = true;
 antBug.SERVER_HOST = "http://www.baidu.com";
 **/