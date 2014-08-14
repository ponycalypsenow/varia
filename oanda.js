var https = require("https");

var DOMAIN = "api-fxpractice.oanda.com";
var ACCESS_TOKEN = "";
var ACCOUNT_ID = "";

function Promise(){
	var self = this;
	self.resolved = false;
	self.thenable = [];
	self.then = function(callback){
		self.thenable.push(callback)
		if(self.resolved) self.value = callback(self.value);
		return self;
	};
	
	self.resolve = function(value){
		self.value = value;
		for(var i = 0; i < self.thenable.length; i++) self.value = self.thenable[i](self.value);
		self.resolved = true;
	};
		
	return self;
}

Promise.all = function(promises){
	// TODO
};

function oandaRequest(method, path, params, callback){
	function makePath(){
		var ret = path;
		if(method == "GET"){
			ret = params.reduce(function(prev, x, xi){
				return prev + (xi == 0? "?" : "&") + (x == "accountId"? "accountId=" + ACCOUNT_ID : x);
			}, ret);
		}
		
		ret = ret.replace(":account_id", ACCOUNT_ID).replace(":trade_id", params["trade_id"]);
		return ret;
	}
	
	function makePostData(){
		var ret = "";
		if(method == "POST"){
			for(var key in params){
				ret = ret + (ret.length == 0? "" : "&") + key + "=" + params[key];
			}
			
			options.headers["Content-Type"] = "application/x-www-form-urlencoded";
			options.headers["Content-Length"] = ret.length;
		}
		
		return ret;
	}
	
	var options = {
		host: DOMAIN,
		path: makePath(),
		method: method,
		headers: {"Authorization" : "Bearer " + ACCESS_TOKEN},
	};
	
	var post_data = makePostData();
	var ret = new Promise();
	var request = https.request(options, function(response){
		var data = "";
		response.on("data", function(chunk){
			data = data + chunk.toString();
		});
		response.on("end", function(chunk){
			if(response.statusCode != 200) console.log("HTTP - " + response.statusCode);
			console.log(data);
			ret.resolve(JSON.parse(data));
		});
	});
	
	if(method == "POST") request.write(post_data);	
	request.end();
	return ret;
}

function getInstruments(){
	return oandaRequest("GET", "/v1/instruments", ["accountId"]);
}

function getPrices(instruments){
	instruments = instruments.instruments.map(function(x){
		return x.instrument;
	});
	
	function makeParams(){
		return instruments.reduce(function(prev, x, xi){
			return prev + (xi > 0? "%2C" : "") + x;
		}, "instruments=");
	}
	
	return oandaRequest("GET", "/v1/prices", [makeParams()]);
}

function makeOrder(instrument, units, side, type){
	return oandaRequest("POST", "/v1/accounts/:account_id/orders", {
		instrument: instrument,
		units: units,
		side: side,
		type: type
	});
}

function getOpenTrades(){
	return oandaRequest("GET", "/v1/accounts/:account_id/trades", []);
}

function closeTrade(trade_id){
	return oandaRequest("DELETE", "/v1/accounts/:account_id/trades/:trade_id", {
		trade_id: trade_id
	});
}
