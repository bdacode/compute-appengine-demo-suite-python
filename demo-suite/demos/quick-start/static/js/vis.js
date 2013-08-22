var svg = null;
var width = null;
var height = null;
var x = null;
var x2 = null;
var y = null;
var xAxis = null;
var yAxis = null;
var globalMax = 0;
var cur_bars = {};

function redraw_bars(data) {
  var max = d3.max(data, function(d) { return d.value; });
  if (max > globalMax) {
    globalMax = max;
  };
  var avg = d3.sum(data, function(d) { return d.value; }) / data.length;

  x.domain(data.map(function(d) { return d.host; }));
  x2.domain(data.map(function(d) { return d.host; }));
  y.domain([0, globalMax]);
  svg.selectAll("g.x.axis").call(xAxis);
  svg.selectAll("g.y.axis").call(yAxis);

  var draw_new_bars = false;

  data.forEach(function(d) { 
    if (d && !(d.host in cur_bars)) {
      draw_new_bars = true;
    }
    cur_bars[d.host] = true;
  });

  if (draw_new_bars) {
    svg.selectAll("rect").remove();
    svg.selectAll(".bar")
      .data(data)
      .enter().append("rect")
      .attr("class", "bar")
      .attr("x", function(d) { return x(d.host); })
      .attr("width", x.rangeBand())
      .attr("y", function(d) { return y(d.value); })
      .attr("height", function(d) { return height - y(d.value); });
    svg.selectAll(".my-line").remove();
    svg.append("path")
      .datum(data)
      .attr("class", "line my-line")
      .attr("d", line);
  }

  svg.selectAll("rect")
     .data(data)
     .transition()
     .duration(1000)
     .attr("y", function(d) { return y(d.value); })
     .attr("height", function(d) { return height - y(d.value); });

  var line = d3.svg.line()
               .x(function(d, i) { return i*x2(i) + i; })
               .y(function(d, i) { return y(avg); });
  svg.selectAll(".my-line").transition().duration(1000).attr("d", line);
}

function del_bar_chart() {
  d3.select("#perf-graph").select("svg").remove();
  svg = null;
  globalMax = 0;
  cur_bars = {};
}

function gen_bar_chart() {
  var margin = {top: 20, right: 20, bottom: 30, left: 40};

  width = 960 - margin.left - margin.right,
  height = 500 - margin.top - margin.bottom;

  x = d3.scale.ordinal()
    .rangeRoundBands([0, width], .1);

  x2 = d3.scale.ordinal()
    .rangeBands([0, width], 0);
  
  y = d3.scale.linear()
    .range([height, 0]);

  xAxis = d3.svg.axis()
    .scale(x)
    .orient("bottom");

  yAxis = d3.svg.axis()
    .scale(y)
    .orient("left")
    .tickFormat("");

  svg = d3.select("#perf-graph").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  //data.forEach(function(d) {
    //d.value = +d.value;
  //});

  svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);

  svg.append("g")
      .attr("class", "y axis")
      .call(yAxis)
    .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", ".71em")
      .style("text-anchor", "end")
      .text("Disk Througput (KB/s)");
};
