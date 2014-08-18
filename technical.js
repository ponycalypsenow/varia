function reduceWeighted(data, reducer, forgettingCurve){
	var forgettingCurve = forgettingCurve || constFC;
	var total_w = 0;
	return data.reduce(function(prev, x, xi){
		var w = forgettingCurve(xi);
		total_w += w;
		return reducer(prev, x, xi, w);
	}, 0)/total_w;
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
	return data[i - 1][0];
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


