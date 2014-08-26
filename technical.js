function reduceWeighted(data, reducer, forgettingCurve){
	var forgettingCurve = forgettingCurve || constFC;
	var total_w = 0;
	return data.reduce(function(prev, x, xi){
		var w = forgettingCurve(xi);
		total_w += w;
		return reducer(prev, x, xi, w);
	}, 0)/total_w;
}

function range(n){
	return Array.apply(null, { length: n }).map(function(x, xi){ return xi; });
}

function constFC(){
	return 1.0;
}

function exponentialFC(t, S){
	return Math.exp(-t/S);
}

function mean(data, forgettingCurve){
	return reduceWeighted(data, function(prev, x, xi, w){
		return prev + w*x;
	}, forgettingCurve);
}

function median(data, forgettingCurve){
	data = data.map(function(x, xi){
		return [x, (forgettingCurve || constFC)(xi)];
	}).sort(function(a, b){ return a[0] - b[0] });
	var halftotal_w = data.reduce(function(prev, x, xi){
		return prev + x[1];
	}, 0)/2.0;
	var i = 0;
	while(halftotal_w > 0) halftotal_w -= data[i++][1];
	return (data.length%2)? data[i - 1][0] : (data[i - 1][0] + data[i][0])/2.0;
}

function autoCorrelation(data, lag, forgettingCurve){
	var lag = lag || 1;
	var mu = mean(data, forgettingCurve);
	var total = reduceWeighted(data, function(prev, x, xi, w){
		return prev + w*Math.pow(x - mu, 2.0);
	}, forgettingCurve);
	return reduceWeighted(data, function(prev, x, xi, w){
		if(xi + lag >= data.length) return prev;
		return prev + w*(x - mu)*(data[xi + lag] - mu);
	}, forgettingCurve)/total;
}

function standardDeviation(data, forgettingCurve){
	var mu = mean(data, forgettingCurve);
	return Math.sqrt(reduceWeighted(data, function(prev, x, xi, w){
		return prev + w*Math.pow(x - mu, 2.0);
	}, forgettingCurve));
}

function skewness(data, forgettingCurve){
	var mu = mean(data, forgettingCurve);
	var m = median(data, forgettingCurve);
	var sd = standardDeviation(data, forgettingCurve);
	return 3.0*(mu - m)/sd;
}

function rescaledRange(data, n){
	var rs = 0;
	for(var i = 0; i < data.length - n; i++){
		var x = data.slice(i, i + n);
		var m = mean(x);
		var y = x.map(function(x){ return x - m; });
		var z = y.map(function(x, xi){
			return y.slice(0, xi + 1).reduce(function(prev, x){ return prev + x; }, 0);
		});
		var r = Math.max.apply(null, z) - Math.min.apply(null, z);
		var s = Math.sqrt(mean(y.map(function(y){ return y*y; })));
		rs += r/s;
	}
	
	return rs/(data.length - n);
}

function hurstFactor(data){
	var logmax = Math.floor(Math.log(data.length)/Math.LN2);
	var rs = range(logmax - 1).map(function(i){ return Math.pow(2, i + 2); }).map(function(n){ return rescaledRange(data, n); });
	return rs;
}

