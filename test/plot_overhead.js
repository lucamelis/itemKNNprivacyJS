var plotly = require('plotly')('lucamelis','wuwziylws6');

var getDimSketch = function(items,epsilon,delta){
	return Math.round(Math.E / epsilon) * Math.round( Math.log(items*items/(2*delta)) );
}

var n_cli = 10000;
var x = [ ];
deal_y = [ ];
user_y = [ ];
for (var i = 0; i < 10; i++) {
	t = getDimSketch(700, 0.1 - 0.01*i, 0.01) ;
	x.push( "-" + t.toString() +"-" );
	deal_y.push( 32*n_cli );
	user_y.push( 32*t );
};

var dealer = {
  x: x, 
  y: deal_y, 
  name: "Dealer", 
  type: "bar"
};

var user = {
  x: x, 
  y: user_y, 
  name: "User", 
  type: "bar"
};
var data = [dealer, user];

var layout = {
	title: "Overhead ("+ n_cli +" users)", 
	xaxis: { title: "Count-min sketch elements" },
	yaxis: { title: "Overhead (bytes)" },
	barmode: "stack"
}

var graphOptions = {layout: layout, filename: "overhead-dim", fileopt: "overwrite"};
plotly.plot(data, graphOptions, function (err, msg) {
    console.log(msg);
});

/////////////////////////////

var x = [ ];
deal_y = [ ];
user_y = [ ];
t = getDimSketch(700, 0.01, 0.01);
for (var i = 1000; i <= 10000; i +=1000 ) {
	x.push( "-" + i.toString() +"-" );
	deal_y.push( 32*i );
	user_y.push( 32*t );
};

var dealer = {
  x: x, 
  y: deal_y, 
  name: "Dealer", 
  type: "bar"
};

var user = {
  x: x, 
  y: user_y, 
  name: "User", 
  type: "bar"
};
var data = [user, dealer];

var layout = {
	title: "Overhead ("+ t +" sketch elements)", 
	xaxis: { title: "Number of clients" },
	yaxis: { title: "Overhead (bytes)" },
	barmode: "stack"
}

var graphOptions = {layout: layout, filename: "overhead-users", fileopt: "overwrite"};
plotly.plot(data, graphOptions, function (err, msg) {
    console.log(msg);
});
