var fs = require("fs");
var path = require("path");
var http = require("http");
var url = require("url");
var zip = require("adm-zip");

var Repository = function(basepath){
	var basepath = basepath || process.cwd();
	var Cache = function(){
		var cache = {};
		return{
			setValue: function(key, value){
				cache[key] = value;
				return value;
			},
			getValue: function(key){
				return cache[key];
			}
		};
	};
	
	var cache = Cache();
	var getFromZip = function(filepath){
		var archivename = /((?:.+)\.zip[\\/])/.exec(filepath)[1];
		var archive = cache.getValue(archivename) || cache.setValue(archivename, new zip(archivename));
		var entryname = /.zip[\\/](.+)/.exec(filepath)[1].replace(/\\/g, "/");
		var entry = archive.getEntry(entryname);
		if(entry) return archive.readFile(entry);
	};
	
	var getFromFs = function(filepath){
		if(fs.statSync(filepath).isDirectory()) filename += "/index.html";
		return fs.readFileSync(filepath, "binary");
	};
	
	return{
		getFile: function(filename){
			var filepath = path.join(basepath, filename);
			if(/\.zip[\\/]/.test(filepath)) return getFromZip(filepath);
			else if(fs.existsSync(filepath)) return getFromFs(filepath);
		}
	};
};

var Static = function(con, repository){
	var contentTypesByExtension = {
		".html": "text/html",
		".css":  "text/css",
		".js":   "text/javascript"
	};
	
	var file = null;
	try{
		file = repository.getFile(con.url.pathname);
	}catch(err){
		con.writeText(500, err + "\n");
		return;
	}
	
	if(!file){
		con.writeText(404, "404 Not Found\n");
		return;
	}
	
	var headers = {};
	var contentType = contentTypesByExtension[path.extname(con.url.pathname)];
	if(contentType) headers["Content-Type"] = contentType;
	con.writeRes(200, headers, file, "binary");
};

var Server = function(repository){
	var repository = repository || Repository();
	var Connection = function(req, res){	
		return{
			url: url.parse(req.url),
			readJSON: function(callback){
				var body = '';
				req.setEncoding('utf8');
				req.on("data", function(chunk){ body += chunk; });
				req.on("end", function(){
					callback(JSON.parse(body));
				});
			},
			writeRes: function(code, head, body, binary){
				res.writeHead(code, head);
				res.write(body, binary || "utf8");
				res.end();
			},
			writeText: function(code, body){
				this.writeRes(code, {"Content-Type": "text/plain"}, body);
			},
			writeJSON: function(body){
				this.writeRes(200, {"Content-Type": "application/json"}, JSON.stringify(body));
			}
		};
	};
	
	var Router = function(){
		var routes = [];
		return{
			addRoute: function(route, handler){
				routes.push({
					route: new RegExp(route),
					handler: handler
				});
				return this;
			},
			getHandler: function(path){
				for(var i = 0; i < routes.length; i++){
					var m = routes[i].route.exec(path);
					if(m) return function(con){
						routes[i].handler(con, m.slice(1).map(
							function(x){ return unescape(x); }));
					};
				}
			}
		};
	};
	
	var router = Router();
	return{
		addRoute: router.addRoute,
		listen: function(port){		
			http.createServer(function(req, res){
				if(req.connection.remoteAddress != "127.0.0.1") return;
				(router.getHandler(url.parse(req.url).pathname) ||
					function(con){ return Static(con, repository); })(Connection(req, res));
			}).listen(port);
			return this;
		}
	};
};

var Chapter = function(chNames){
	var pipe = function(init, processors){
		var self = this;
		self.out = init;
		if(processors instanceof Array) processors.forEach(
			function(x){ self.out = x(self.out); });
		else self.out = processors(self.out);
		return out;
	};

	var readFile = function(name){
		return (name instanceof Array)?
			name.reduce(function(sum, x){ return sum + fs.readFileSync(x).toString(); }, "")
			: fs.readFileSync(name).toString();
	};

	var parseXml = function(body, re, index){
		var ret = [], m;
		while(m = re.exec(body)) ret.push(m[index || 1]);	
		return ret;
	};

	var purgeHtml = function(body){
		var re = new RegExp("<a id=(.*?)>", "g");
		return (body || "").replace(re, "");
	};

	var extractCh = function(body){
		var getPage = function(body){
			var re = new RegExp("<a id=\"page_v\\d+_(\\d+)\"\/>", "g"), m;
			var no = parseInt((re.exec(body) || ["-1", "-1"])[1]);
			return (no != -1)? [no - 1, no] : [-1];
		};

		var pRe = new RegExp("(<p class=\"(?:.*?)\">(?:.*?)<\/p>)", "g");	
		return parseXml(body, pRe).map(function(x, xi){		
			return{
				body: purgeHtml(x),
				page: getPage(x),
			};
		}).map(function(x, xi, all){
			x.page = (x.page[0] == -1)? [all[xi - 1].page[1] || all[xi - 1].page[0]] : x.page;
			return x;
		}).filter(function(x){
			var chRe = new RegExp("<p class=\"(?:indent|noindent|equation).*?\">(.*?)<\/p>", "g");
			x.body = parseXml(x.body, chRe)[0];				
			return x.body != undefined;
		}).map(function(x, xi){
			x.id = xi;
			return x;
		});
	};

	pipe(chNames, [readFile, extractCh]);
};

var Pipe = function(init){
	var self = this;
	self.value = init;
	return{
		pipe: function(processor){
			self.value = processor(self.value);
			return self;
		}
	};
};

Server().listen(3000);
