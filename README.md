#antBug 前端异常上报组件
antBug是一个前端模块化的异常上报组件,可以上报前端的js执行错误,页面中的文件加载异常以及网络请求异常
用户还可以自定义异常上报

###组件初始化
在页面引入该组件,然后在页面进行初始化即可

	antBug.init({
    	appVersion: "3.1",//app版本
	});
###配置项
####当前页最大错误收集量 antBug.maxErrorNum
  为了不影响原有的业务性能,系统默认最多搜集当前页的20个异常,超过则忽略,可以通过此项合理调整
  例如设置为当前页最多收集10个异常

	antBug.maxErrorNum = 10;

###异常上报服务器 antBug.SERVER_HOST 异常上报服务器地址
为了不影响现有的技术栈,所以本组件不提供服务器端,异常上报地址您可以自由设置

	antBug.SERVER_HOST = "http://www.baidu.com";

###其他可选配置项:

	_self.messageContent = {
        notifierVersion: _self.APIVERSION,//插件版本号
        userAgent: window.navigator.userAgent,//用户agent头
        locale: window.navigator.language || window.navigator.userLanguage,//语言
        url: window.location.href,//接口地址
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

如果有自定义的需要传递的参数可以在ext中进行传递
异常类型分为:resourceError,httpError,uncaughtError

###resourceError 资源加载异常错误
当页面中的资源加载异常时会触发此错误类型
例如页面中的图片加载错误
如果不需要监听图片加载错误,可以设置antBug.collectResourceError = false;

	antBug.collectResourceError = false;

###httpError网络请求错误
页面中的ajax请求错误时会上报此错误类型
如果不需要上报此错误可以设置antBug.collectHttpError = false;

	antBug.collectHttpError = false;

###自定义上报错误 antBug.error(errorContent)
用户通过此函数可以上传自定义的错误
