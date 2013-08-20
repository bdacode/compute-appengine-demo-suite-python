var svg = null;
var width = null;
var height = null;
var x = null;
var x2 = null;
var y = null;
var xAxis = null;
var yAxis = null;

function redraw_bars(data) {
  var max = d3.max(data, function(d) { return d.value; });
  var avg = d3.sum(data, function(d) { return d.value }) / data.length;
  y.domain([0, max]);
  svg.selectAll("g.y.axis").call(yAxis);

  svg.selectAll("rect")
     .data(data)
     .transition()
     .duration(1000)
     .attr("y", function(d) { return y(d.value); })
     .attr("height", function(d) { return height - y(d.value); });
  var line = d3.svg.line()
               .x(function(d, i) { return x(i) + (5*i); })
               .y(function(d, i) { return y(avg); });
  svg.selectAll(".my-line").transition().duration(1000).attr("d", line);
}

function del_bar_chart(data) {
  d3.select("#perf-graph").select("svg").remove();
  svg = null;
}

function gen_bar_chart(data) {
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
    .orient("left");

  svg = d3.select("#perf-graph").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  data.forEach(function(d) {
    d.value = +d.value;
  });

  x.domain(data.map(function(d) { return d.host; }));
  x2.domain(data.map(function(d) { return d.host; }));
  y.domain([0, d3.max(data, function(d) { return d.value; })]);

  svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);

  svg.append("g")
      .attr("class", "y axis")
      .call(yAxis)
    //.append("text")
      //.attr("transform", "rotate(-90)")
      //.attr("y", 6)
      //.attr("dy", ".71em");
      //.style("text-anchor", "end")
      //.text("Througput");

  svg.selectAll(".bar")
      .data(data)
    .enter().append("rect")
      .attr("class", "bar")
      .attr("x", function(d) { return x(d.host); })
      .attr("width", x.rangeBand())
      .attr("y", function(d) { return y(d.value); })
      .attr("height", function(d) { return height - y(d.value); });

  var avg = d3.sum(data, function(d) { return d.value }) / data.length;
  var line = d3.svg.line()
               .x(function(d, i) { return x2(i) + i; })
               .y(function(d, i) { return y(avg); });
  svg.append("path")
     .datum(data)
     .attr("class", "line my-line")
     .attr("d", line);

  function change() {

    // Copy-on-write since tweens are evaluated after a delay.
    var x0 = x.domain(data.sort(this.checked
        ? function(a, b) { return b.value - a.value; }
        : function(a, b) { return d3.ascending(a.host, b.host); })
        .map(function(d) { return d.host; }))
        .copy();

    var transition = svg.transition().duration(750),
        delay = function(d, i) { return i * 50; };

    transition.selectAll(".bar")
        .delay(delay)
        .attr("x", function(d) { return x0(d.host); });

    transition.select(".x.axis")
        .call(xAxis)
      .selectAll("g")
        .delay(delay);
  }

  d3.select("#sort-checkbox").on("change", change);
};
