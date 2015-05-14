var Yarrow = function(){
	return{
		getLine: getLine,
		getLines: getLines,
		getHexagram: getHexagram,
		getHexagramAndLines: getHexagramAndLines
	};

	function getLine(){
		var line = 0, pile = 50, left = 0, right = 0, hand = 0;		
		pile--;
		for(var i = 0; i < 3; i++){
			function random(){
				var ret = 0;
				for(var i = 0; i < pile; i++)
					ret += Math.floor(2*Math.random());
				return ret;
			}
			
			left = random();
			right = pile - left;
			pile = 0;
			right--;
			hand = 1;
			while(left > 4){
				left -= 4;
				pile += 4;
			}
			
			hand += left;
			while(right > 4){
				right -= 4;
				pile += 4;
			}
			
			hand += right;
			line += (hand == 9 || hand == 8)? 2 : 3;
		}
		
		return line;
	}
	
	function getLines(){
		var ret = [];
		for(var i = 0; i < 6; i++) ret.push(getLine());
		return ret;
	}
	
	function getHexagram(lines){
		var lookup  = [
			 2, 24,  7, 19, 15, 36, 46, 11,
			16, 51, 40, 54, 62, 55, 32, 34,
			 8,  3, 29, 60, 39, 63, 48,  5,
			45, 17, 47, 58, 31, 49, 28, 43,
			23, 27,  4, 41, 52, 22, 18, 26,
			35, 21, 64, 38, 56, 30, 50, 14,
			20, 42, 59, 61, 53, 37, 57,  9,
			12, 25,  6, 10, 33, 13, 44,  1
		];
		
		return lookup[getPosition(lines || getLines())];
		function getPosition(lines){
			return lines.reduce(function(sum, x, xi){
				return (x == 8 || x == 9)? sum + Math.pow(2, xi) : sum;
			}, 0);
		}
	}
	
	function getHexagramAndLines(){
		var lines = getLines();
		var hexagram = getHexagram(lines);
		return{
			hexagram: hexagram,
			lines: lines.reduce(function(ret, x, xi){
				if(x == 6 || x == 9) ret.push(x + " in " + (xi + 1));
				return ret;
			}, [])
		};
	}
};
