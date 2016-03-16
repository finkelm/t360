/* (function () {
    "use strict";

    var methods, generateNewMethod, i, j, cur, old, addEvent;

    if ("console" in window) {
        methods = [
            "log", "assert", "clear", "count",
            "debug", "dir", "dirxml", "error",
            "exception", "group", "groupCollapsed",
            "groupEnd", "info", "profile", "profileEnd",
            "table", "time", "timeEnd", "timeStamp",
            "trace", "warn"
        ];

        generateNewMethod = function (oldCallback, methodName) {
            return function () {
                var args;
                alert("called console." + methodName + ", with " + arguments.length + " argument(s)");
                args = Array.prototype.slice.call(arguments, 0);
                Function.prototype.apply.call(oldCallback, console, arguments);
            };
        };

        for (i = 0, j = methods.length; i < j; i++) {
            cur = methods[i];
            if (cur in console) {
                old = console[cur];
                console[cur] = generateNewMethod(old, cur);
            }
        }
    }

    window.onerror = function (msg, url, line) {
        alert("Window error: " + msg + ", " + url + ", line " + line);
    };
}()); */

window.onload = function () {
  var paths = [
    [ [85, 460],
      [85, 110],
      [125, 60],
      [165, 110],
      [140, 280],
      [225, 310],
      [280, 310],
      [300, 230],
      [340, 150],
      [380, 230],
      [400, 290],
      [415, 310],
      [430, 310],
      [455, 310],
      [465, 330],
      [465, 350],
      [465, 405]
    ],
    [ [110, 395],
      [380, 395]
    ]
  ];

  var svg = d3.select("#map")
    .append("svg")
    .attr("viewBox", "0 0 500 500")
    .attr("width", "100%")
    .attr("height", "100%");

  var floorPlanURL = "images/floorplan.jpg";

  var img = svg.selectAll("image").data([0]);

  img.enter()
    .append("svg:image")
    .attr('image-rendering','optimizeQuality')
    .attr("xlink:href", floorPlanURL)
    .attr("x", "0")
    .attr("y", "0")
    .attr('height', "500px")
    .attr('width', "500px");

  img.on("click", function(){
    d3.select("#map").classed("opened", !d3.select("#map").classed("opened"));
    d3.select("#map").classed("closed", !d3.select("#map").classed("closed"));
  });

  var paths_rendered = [];

  for(var i = 0; i < paths.length; i++){
    var points = paths[i];
    var path_rendered = svg
      .append("path")
      .classed('path', true)
      .data([points])
      .attr("d", d3.svg.line()
        .tension(.7)
        .interpolate("cardinal"))
      .on('mouseover', function(d) {
        d3.select(this).transition().duration(400).style('opacity','1');
      })
      .on('mouseout', function() {
        if(!d3.select(this).classed('selected')){
          d3.select(this).transition().duration(400).style('opacity','0.7');
        }
      });
    path_rendered.on("click", function() {
      var path = d3.select(this), m = d3.svg.mouse(this), p = closestPoint(path.node(), m);
      changeTime(pointToFraction(p))
      selectPath(path);
    });
    paths_rendered.push(path_rendered);
  }

  var avatar = svg.append("g").attr("class", "avatar");

  var circle = avatar.append("circle").attr("class", "base")
    .attr("r", 6)
    .attr("cx", 0)
    .attr("cy", 0);

  var triangle = avatar.append("g").attr("class", "triangle");
  triangle.append("path").attr("class", "inner")
    .attr("d",d3.svg.arc()
                .innerRadius(0)
                .outerRadius(70)
                .startAngle((-60/180) * Math.PI)
                .endAngle((60/180) * Math.PI));
  triangle.append("path").attr("class", "outer")
    .attr("d",d3.svg.arc()
                .innerRadius(0)
                .outerRadius(70)
                .startAngle((-60/180) * Math.PI)
                .endAngle((60/180) * Math.PI));

  var dot = avatar.append("circle").attr("class", "dot")
    .attr("r", 3)
    .attr("cx", 0)
    .attr("cy", 0);

  avatar.attr('transform', 'translate(' + pathStartPoint(paths_rendered[0])[0] + ' ' + pathStartPoint(paths_rendered[0])[1] +')')

  selectPath(paths_rendered[0]);
  updatePointer(paths_rendered[0].node(), 0, 0);


  // Functions
  //Get path start point for placing marker
  function getNormAngleFromNormal(path, length){
    var precision = 0.1;
    var pathLength = path.getTotalLength();
    // length < precision  === situation where not enough precision before
    if(length > pathLength - precision){
    }else{
      var from = path.getPointAtLength(length);
      var to = path.getPointAtLength(length+precision);
      var v2 = {x: to.x - from.x, y: to.y - from.y};
      var v1 = {x: 0, y: -1};
      //var angleRad = Math.acos( (v1.x * v2.x + v1.y * v2.y) / ( Math.sqrt(v1.x*v1.x + v1.y*v1.y) * Math.sqrt(v2.x*v2.x + v2.y*v2.y) ) );
      var dot = v1.x * v2.x + v1.y * v2.y;
      var det = v1.x * v2.y - v1.y * v2.x;
      var angleRad = Math.atan2(det, dot);
      return(angleRad * 180 / Math.PI);
    }
  }

  function pathStartPoint(path) {
    var firstSeg = path.node();
    if(firstSeg && firstSeg.pathSegList){ 
      firstSeg = firstSeg.pathSegList[0];
      return [firstSeg.x, firstSeg.y];
    }else{
      return [0, 0]
    }
  }

  function pointToFraction(point) {
    var currentPath = d3.select(".selected").node();
    var pathLength = currentPath.getTotalLength();
    return(point.pathLength/pathLength);
  }

  function selectPath(path) {
    path.classed('selected',true);
    for(var i = 0; i < paths_rendered.length; i++){
      if(paths_rendered[i].node() === path.node()){
        paths_rendered[i].style('opacity','1');
      }else{
        paths_rendered[i].classed('selected',false);
        paths_rendered[i].transition().duration(350).style('opacity','0.7');
      }
    }
  }

  function closestPoint(pathNode, point) {
    var pathLength = pathNode.getTotalLength(),
        precision = pathLength / pathNode.pathSegList.numberOfItems * .125,
        best,
        bestLength,
        bestDistance = Infinity;

    // linear scan for coarse approximation
    for (var scan, scanLength = 0, scanDistance; scanLength <= pathLength; scanLength += precision) {
      if ((scanDistance = distance2(scan = pathNode.getPointAtLength(scanLength))) < bestDistance) {
        best = scan, bestLength = scanLength, bestDistance = scanDistance;
      }
    }

    // binary search for precise estimate
    precision *= .3;
    while (precision > .3) {
      var before,
          after,
          beforeLength,
          afterLength,
          beforeDistance,
          afterDistance;
      if ((beforeLength = bestLength - precision) >= 0 && (beforeDistance = distance2(before = pathNode.getPointAtLength(beforeLength))) < bestDistance) {
        best = before, bestLength = beforeLength, bestDistance = beforeDistance;
      } else if ((afterLength = bestLength + precision) <= pathLength && (afterDistance = distance2(after = pathNode.getPointAtLength(afterLength))) < bestDistance) {
        best = after, bestLength = afterLength, bestDistance = afterDistance;
      } else {
        precision *= .3;
      }
    }

    best = [best.x, best.y];
    best.distance = Math.sqrt(bestDistance);
    best.pathLength = bestLength;
    return best;

    function distance2(p) {
      var dx = p.x - point[0],
          dy = p.y - point[1];
      return dx * dx + dy * dy;
    }
  }


  var api = null;
  var mainLoopInterval = null;

  var changingTime = 0;
  function changeTime(proportion){
    var totalTime = api.get('plugin[video].totaltime');
    changingTime = proportion * totalTime;
    api.get('plugin[video]').seek(proportion * totalTime);
  }

  function updatePointer(path, length, yaw){
    var normAngle = getNormAngleFromNormal(path, length);
    if(yaw){
      triangle.attr("transform", function(d) {
        return "rotate("+(normAngle+yaw)+")";
      });
    }
  }

  var onReadyHandler = function(pEvent){
    api = document.getElementById('krpanoSWFObject');
    //Here we just define the loop that'll pull values to update the UI
    mainLoopInterval = window.setInterval(mainLoop, 50);
  };

  embedpano({swf:"krpano/krpano.swf", 
             xml:"krpano/video.xml", 
             target:"pano", 
             html5:(document.domain ? "prefer" : "auto"), 
             passQueryParameters:true, 
             onready: onReadyHandler});

  var oldPoint = null;
  var oldYaw = null;
  function updateCircle(){
    var currentTime = api.get('plugin[video].time');
    var totalTime = api.get('plugin[video].totaltime');
    var currentPath = d3.select(".selected").node();
    var pathLength = currentPath.getTotalLength();
    var newPathLength = pathLength * (currentTime/totalTime);
    if(newPathLength){
      var newPoint = currentPath.getPointAtLength(newPathLength);
      var newYaw = api.get('view.hlookat');
      if(oldPoint === null || oldPoint.x !== newPoint.x || oldPoint.y !== newPoint.y){
        if(changingTime === null){
          oldPoint = newPoint;
          avatar.attr('transform', 'translate(' + newPoint.x + ' ' + newPoint.y +')');
        }else if(changingTime < 10){
          changingTime = changingTime + 1;
        }else{
          changingTime = null;
        }
      }
      if(oldYaw === null || oldYaw !== newYaw){
        oldYaw = newYaw;
        updatePointer(currentPath, newPathLength, newYaw);
      }
    }
  }

  function mainLoop(){
    updateCircle();
  }
};
