var createCountMinSketch = require('./count-min.js').createCountMinSketch;

sample_geom = function(p){return Math.ceil(Math.log(1-Math.random()) / Math.log(1-p)) }
sum = function(vec){ return vec.reduce( function( a , b ) { return a + b } , 0 ) }

//return the indeces of sorted array
function argSort(toSort) {
  for (var i = 0; i < toSort.length; i++) {
    toSort[i] = [toSort[i], i];
  }
  toSort.sort(function(left, right) {
    return left[0] < right[0] ? 1 : -1;
  });
  toSort.sortIndices = [];
  for (var j = 0; j < toSort.length; j++) {
    toSort.sortIndices.push(toSort[j][1]);
    toSort[j] = toSort[j][0];
  }
  return toSort;
}

//dot product between feed and the top N elements of weights
function dotNN(feed,weights,N){ 
	var result = 0; 
	var idx = argSort(weights).sortIndices;
	for (var i=0; i < idx.length; i++) 
		result += feed[idx[i]]*weights[idx[i]]; 
	return result 
	}


//from sketch to Matrix counters
function NNmodelBuilding(sketch,n){
	
	var matrix = [ ];
	var ind = 0;
	for(var i = 0; i < n; i++) {
	    matrix[i] = [ ];
	    for(var j = 0; j <= i; j++) {
		matrix[i][j] = matrix[j][i] = sketch.query( (ind++) ) ;
	    }
	}

	//similarity matrix model building
	var sums = [ ]
	for (var i = 0; i < n ; i++)
		sums[i] = sum(matrix[i]);

	var sim = [ ];
	for (var i = 0; i < n; i++) {
		sim[i] = [ ];
	    for(var j = 0; j <= i; j++) {
	    		var den = Math.sqrt( sums[i] * sums[j] );
			sim[i][j] = sim[j][i] = matrix[i][j] / (den > 0 ? den : 1)		
		}
	}

	return sim;
}

// prediction
function NNprediction(feedback, sim, topNN){
	var prediction_vec = [ ]
	for (var k = 0 ; k < sim.length ; k++)
		prediction_vec[ k ] = dotNN( feedback[ k ] , sim[ k ], topNN );
	
	return argSort(prediction_vec).sortIndices.slice(0,topNN);
}

exports.NNmodelBuilding = NNmodelBuilding;
exports.NNprediction = NNprediction

var n = 700;
var topNN = 10; //number of nearest neighbours 
var samples = n*n/2;

var sketch = new createCountMinSketch(0.01, 0.01,samples);

for (var i = 0; i < Math.sqrt(2*samples); i++ )
	sketch.update( i , 1);

// new observation
var feedback = [ ];
for (var i = 0; i < n; i++) {
    feedback[i] = [ ];
    for(var j = 0; j <= i; j++) {
        feedback[i][j] = feedback[j][i] = sample_geom(0.3) % 2;
    }
}

var sim = NNmodelBuilding(sketch,n);	
console.log("--Top",topNN,"recommendation items:",NNprediction(feedback,sim,topNN));

