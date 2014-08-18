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

function oandaRequest(method, path, params, callback){
  function makeQuery(){    
    return Object.keys(params).reduce(function(prev, key, keyi){
      return prev + (keyi == 0? "" : "&") + key + "=" + params[key];
    }, "");
  }

	function makePath(){
    var ret = path;
		if(method == "GET" && Object.keys(params).length > 0) ret = ret + "?" + makeQuery();
		return ret.replace(":account_id", ACCOUNT_ID).replace(":trade_id", params["trade_id"]);
	}
	
	var post_data = makeQuery();
	var options = {
		host: DOMAIN,
		path: makePath(),
		method: method,
		headers: method != "POST"? {
      "Authorization" : "Bearer " + ACCESS_TOKEN
    } : {
      "Content-Type": "application/x-www-form-urlencoded",
      "Content-Length": post_data.length,
      "Authorization": "Bearer " + ACCESS_TOKEN
		}
	};
	
	console.log(options);
	var ret = new Promise();
	var request = https.request(options, function(response){
		var data = "";
		response.on("data", function(chunk){
			data = data + chunk.toString();
		});
		response.on("end", function(chunk){
			if(response.statusCode != 200){
        console.log(response.statusCode);
        console.log(data);
      }
      
			ret.resolve(JSON.parse(data));
		});
	});
	
	if(method == "POST") request.write(post_data);	
	request.end();
	return ret;
}

function getInstruments(){
	return oandaRequest("GET", "/v1/instruments", {
    accountId: ":account_id"
  });
}

function getPrices(instruments){
	instruments = instruments.instruments.map(function(x){
		return x.instrument;
	});
	
	function getInstruments(){
		return instruments.reduce(function(prev, x, xi){
			return prev + (xi > 0? "%2C" : "") + x;
		}, "");
	}
	
	return oandaRequest("GET", "/v1/prices", { "instruments": getInstruments() });
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
	return oandaRequest("GET", "/v1/accounts/:account_id/trades", {});
}

function closeTrade(trade_id){
	return oandaRequest("DELETE", "/v1/accounts/:account_id/trades/:trade_id", {
		trade_id: trade_id
	});
}
