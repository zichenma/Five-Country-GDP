'use strict'
	 /* Cross filter debug utility 
     	reference : http://www.codeproject.com/Articles/693841/Making-Dashboards-with-Dc-js-Part-Using-Crossfil
     */
//print_filter function is created for testing dataset in brower console log.
	function print_filter(filter){
		var f=eval(filter);
		if (typeof(f.length) != "undefined") {}else{}
		if (typeof(f.top) != "undefined") {f=f.top(Infinity);}else{}
		if (typeof(f.dimension) != "undefined") {f=f.dimension(function(d) { return "";}).top(Infinity);}else{}
		console.log(filter+"("+f.length+") = "+JSON.stringify(f).replace("[","[\n\t").replace(/}\,/g,"},\n\t").replace("]","\n]"));
	}



// load the json data
d3.json("data/GDP.json", function (data) {

    //Check data import
    //print_filter(data);
	
    // Melt the data to separate country registration data per year
	var newdata = melt(data,["country"],"year");
	
    //print_filter(newdata);

	//parse the year data to string
	var parseDate = d3.time.format("%Y").parse;
	newdata.forEach(function(d) {
		d.date = parseDate(d.year);
		d.country = d.country;
		d.value = isNaN(d.value) ? 0 : +d.value;
		d.year = d.date.getFullYear();
	});

	//put the data into crossfilter
	var ndx = crossfilter(newdata);

	//group all the data
	var all = ndx.groupAll();
	// Create dimensions
	var dateDim = ndx.dimension(function(d) {return d.year;});
	var yearDim = ndx.dimension(function(d) {return d.year;});
	var minDate = dateDim.bottom(1)[0].year;
	var maxDate = dateDim.top(1)[0].year;
	//print_filter(minDate);
	//print_filter(maxDate);

	// Reduce data by group
	var year_total = dateDim.group().reduceSum(function(d) {return d.value;});
	var usa=dateDim.group().reduceSum(function(d) {if (d.country==="United States") {return d.value;}else{return 0;}});
	var china=dateDim.group().reduceSum(function(d) {if (d.country==="China") {return d.value;}else{return 0;}});
	var japan=dateDim.group().reduceSum(function(d) {if (d.country==="Japan") {return d.value;}else{return 0;}});
	var germany=dateDim.group().reduceSum(function(d) {if (d.country==="Germany") {return d.value;}else{return 0;}});
	var uk=dateDim.group().reduceSum(function(d) {if (d.country==="United Kingdom") {return d.value;}else{return 0;}});

	//print_filter(year_total);
	//print_filter(usa);
	
	// Label creation function
	function getvalues(d){
		var str=d.key+":"+d.value+"\n";
		return str;
	}
	
	// Reduce function for country wise totals and avg per year
	var flatMapGroup = dateDim.group().reduce(
	  function  (p,v) {
		++p.count;
		p[v.country] = isNaN(v.value) ? 0 : +v.value;
		p["total"] += 	Math.round(p[v.country]);
		p["avg"] = Math.round(p["total"]/p.count);
		return p;
	  },
	  function (p,v) {
		--p.count;
		p["total"] -= Math.round(p[v.country]);
		p[v.country] = 0;
		p["avg"] = Math.round(p["total"]/p.count);
		
		return p;
	  },
	  function () { return {count:0,avg:0,total:0}; }
	  ); 
	
	//print_filter(flatMapGroup);

	 

	//Create moving line chart
	var moveChart  = dc.lineChart("#chart-line-regperyear");
		moveChart.yAxis().tickFormat(function(v) {return v/100;});
		moveChart
		.renderArea(true)
        .width(500)
        .height(250)
		.transitionDuration(1000)
        .margins({top: 30, right: 50, bottom: 30, left: 40})
        .dimension(dateDim)
	  //.colorDomain([0, 6000])
		//.colors(d3.scale.category20b())
		//.colorAccessor(function (d) {
       //      return d.value;
       //})
		.brushOn(false)
		.mouseZoomable(true)
		.elasticX(true)
		.elasticY(true)
		.group(usa,"United States")
		.stack(china,"China")
		.stack(japan,"Japan")
		.stack(germany,"Germany")
		.stack(uk,"United Kingdom")
		.x(d3.scale.linear().domain([minDate, maxDate]).range([0,50]))
		.legend(dc.legend().x(50).y(10).itemHeight(12).gap(10).horizontal(true))
		.yAxisLabel("USD 100 Billion")
		.xAxisLabel('Years')
		.title(function(d){ return getvalues(d);} )
		.xAxis().tickFormat(function (v) {
		  return v;
		});

	// year ring chart
	var yearRingChart   = dc.pieChart("#chart-ring-year");
		yearRingChart
		.width(550).height(250)
		//.colors(d3.scale.category20b())
		.dimension(yearDim)
		.group(year_total)
		.innerRadius(50);

	//year chart
	var yearChart  = dc.lineChart("#year-time-chart");
	yearChart.yAxis().tickFormat(function(v) {return v/100;});
	yearChart
        .width(500)
        .height(250)
        .transitionDuration(500)
        .margins({top: 10, right: 50, bottom: 30, left: 40})
        .dimension(yearDim)
        .elasticY(true)
        .elasticX(true)
		.group(year_total,"total")
		.x(d3.scale.linear().domain([minDate, maxDate]).range([0,50]))
		.yAxisLabel("USD 100 Billion")
		.xAxisLabel('Years')
		//when mouse staty at the point, it will show the title
		.title(function(d){ return getvalues(d);} )
		.xAxis().tickFormat(function (v) {
		  return v;
		});

	
	// create bubble chart
	var yearlyAvgBubbleChart = dc.bubbleChart('#year-avg-chart');
    yearlyAvgBubbleChart
        .width(500) // (optional) define chart width, :default = 200
        .height(250)  // (optional) define chart height, :default = 200
        .transitionDuration(1500) // (optional) define chart transition duration, :default = 750
        .margins({top: 10, right: 50, bottom: 30, left: 40})
        .dimension(yearDim)
		.group(flatMapGroup)
        .colors(colorbrewer.RdYlGn[9]) // (optional) define color function or array for bubbles
        .colorDomain([300, 1000])
		.colorAccessor(function (d) {
			return d.value.avg;
		})
        .keyAccessor(function (p) {
            return p.value.total;
        })
		.valueAccessor(function (p) {
			return p.value.avg;
		})
        .radiusValueAccessor(function (p) {
            return p.value.avg;
        })
		.maxBubbleRelativeSize(0.04)
        .x(d3.scale.linear().domain([2001, 2015]))
        .y(d3.scale.linear().domain([0, 1000]))
        .r(d3.scale.linear().domain([300, 6000]).range([0,50]))
		.elasticY(true)
        .elasticX(true)
        .yAxisPadding(100)
        .xAxisPadding(500)
        .renderHorizontalGridLines(true) // (optional) render horizontal grid lines, :default=false
        .renderVerticalGridLines(true) // (optional) render vertical grid lines, :default=false
        .xAxisLabel('Registration Total') // (optional) render an axis label below the x axis
        .yAxisLabel('GDP Average')
		.renderLabel(true) // (optional) whether chart should render labels, :default = true
        .label(function (p) {
            return p.key;
        })
		.yAxis().tickFormat(function (v) {return v;});
 
				
	var dataCountWidget   = dc.dataCount("#dc-data-count")
	dataCountWidget
		.dimension(ndx)
		.group(all);
	

	var datatable   = dc.dataTable("#registration-table-graph");
	datatable
		.dimension(flatMapGroup)
		.group(function(d) { return "GDP in USD Billion"
		})
		//.group(function(d) {return d.key;})
		// dynamic columns creation using an array of closures
		.columns([
			function(d) {return d.key; },
			function(d) {return d.value.United_States;},
			function(d) {return d.value.China;},
			function(d) {return d.value.Japan;},
			function(d) {return d.value.Germany;},
			function(d) {return d.value.United_Kingdom;},
			function(d) {return d.value.total;}
		]).sortBy(function (d) {
        return d.key;
		}).order(d3.descending);
	   
	dc.renderAll();
});

