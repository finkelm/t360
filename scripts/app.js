(function () {
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
}());

window.onload = function () {
  var paths = [
    "M389.6,401.9c0.4-19.5,1.5-100.3-15.8-145.2c-3.5-9.2-8.5-18.6-18.1-23.7c-15.4-8.3-34.6-1.3-47.5,3.4c-25.5,9.3-25.6,18.8-45.2,23.2c-4.8,1.1-30.6,6.3-47.5-7.9c-10.3-8.7-11.8-20.1-16.4-44.6c-3.2-17.1-8.3-42.5-15.8-74"
  ];

  // total length = 1311
  var still_lengths = [
    27.067881975182246,
    189.45199926979015,
    363.43498208544145,
    429.15802427860655
  ];

  var svg = d3.select("#map")
    .append("svg")
    .classed('video', true)
    .attr("viewBox", "0 0 500 500")
    .attr("width", "100%")
    .attr("height", "100%");

  var floorPlanURL = "images/floorplan.png";

  var img = svg.selectAll(".map-image").data([0]);

  img.enter()
    .append("svg:image")
    .classed("map-image", true)
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
      //.data([points])
      .attr("d", points)
      .on('mouseover', function(d) {
        d3.select(this).transition().duration(400).style('opacity','1');
      })
      .on('mouseout', function() {
        if(!d3.select(this).classed('selected')){
          d3.select(this).transition().duration(400).style('opacity','0.7');
        }
      });
    path_rendered.on("click", function() {
      var path = d3.select(this), m = d3.mouse(this), p = closestPoint(path.node(), m);
      changeTime(pointToFraction(p));
      selectPath(path);
    });
    paths_rendered.push(path_rendered);
  }

  var avatar = svg.append("g").attr("class", "avatar");

  var circle = avatar.append("circle").attr("class", "base")
    .attr("r", 6)
    .attr("cx", 0)
    .attr("cy", 0);

  var rawTriangle = '<radialGradient id="RadialGrad" cx="0" cy="0" r="120" gradientUnits="userSpaceOnUse"><stop  offset="0.2" style="stop-color:#020202;stop-opacity:0.95"/><stop  offset="0.2737" style="stop-color:#1C1C1C;stop-opacity:0.75"/><stop  offset="0.4758" style="stop-color:#393939;stop-opacity:0.65"/><stop  offset="0.648" style="stop-color:#CECFD1;stop-opacity:0.55"/><stop  offset="0.7982" style="stop-color:#D6D6D6;stop-opacity:0.35"/><stop  offset="0.9286" style="stop-color:#FFFFFF;stop-opacity:0.15"/></radialGradient>'

  var triangle = avatar.append("g").attr("class", "triangle");
  triangle.html(rawTriangle);
  triangle.append("path").attr("class", "inner")
    .attr("d",d3.svg.arc()
                .innerRadius(0)
                .outerRadius(90)
                .startAngle((-60/180) * Math.PI)
                .endAngle((60/180) * Math.PI));
  /*triangle.append("path").attr("class", "outer")
    .attr("d",d3.svg.arc()
                .innerRadius(0)
                .outerRadius(70)
                .startAngle((-60/180) * Math.PI)
                .endAngle((60/180) * Math.PI));*/

  var dot = avatar.append("circle").attr("class", "dot")
    .attr("r", 3)
    .attr("cx", 0)
    .attr("cy", 0);

  avatar.attr('transform', 'translate(' + pathStartPoint(paths_rendered[0])[0] + ' ' + pathStartPoint(paths_rendered[0])[1] +')')

  selectPath(paths_rendered[0]);
  updatePointer(paths_rendered[0].node(), 0, 0);

  var stillIcon = "images/location.png";
  var still_points = svg.selectAll('.still-node').data(still_lengths);
  still_points.enter()
    .append("svg:image")
    .classed("still-node", true)
    .attr('image-rendering','optimizeQuality')
    .attr("xlink:href", stillIcon)
    .attr("x", function(d){ return paths_rendered[0].node().getPointAtLength(d).x - 15 })
    .attr("y", function(d){ return paths_rendered[0].node().getPointAtLength(d).y - 15 })
    .attr('height', "30px")
    .attr('width', "30px");

  still_points.on("click", function(d,i){
    var totalTime = api.get('plugin[video].totaltime'),
      currentPath = d3.select(".selected").node(),
      pathLength = currentPath.getTotalLength();
    api.call("seek_update("+(totalTime*still_lengths[i]/pathLength)+")");
    window.setTimeout(function(){
      api.call("plugin[video].play()");
      api.call("plugin[video].pause()");
    }, 1000)
  });

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
    return [0, 0];
    if(firstSeg && firstSeg.pathSegList){
      firstSeg = firstSeg.pathSegList[0];
      return [firstSeg.x, firstSeg.y];
    }else{
      return [0, 0];
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
    //api.get('plugin[video]').seek(proportion * totalTime);
    api.call("seek_update("+(proportion * totalTime)+"%)");
  }

  function updatePointer(path, length, yaw){
    var normAngle = getNormAngleFromNormal(path, length);
    if(yaw !== undefined || yaw !== null){
      triangle.attr("transform", function(d) {
        return "rotate("+(normAngle+yaw)+")";
      });
    }
  }

  var onReadyHandler = function(pEvent){
    api = document.getElementById('krpanoSWFObject');
    //Here we just define the loop that'll pull values to update the UI
    mainLoopInterval = window.setInterval(mainLoop, 50);

    window.setTimeout(function(){
      api.call("plugin[video].play()");
      api.call("plugin[video].pause()");
    }, 1000)
  };

  embedpano({swf:"krpano/krpano.swf",
             xml:"krpano/video.xml",
             target:"pano",
             html5: "prefer",// (document.domain ? "prefer" : "auto"),
             passQueryParameters:true,
             onready: onReadyHandler});

  /*Updates location and direction of avatar*/

  var oldPoint = null;
  var oldYaw = null;
  function updateCircle(){
    var currentTime = api.get('plugin[video].time');
    var totalTime = api.get('plugin[video].totaltime');
    var currentPath = d3.select(".selected").node();
    var pathLength = currentPath.getTotalLength();
    var newPathLength = pathLength * (currentTime/totalTime);
    if(newPathLength !== undefined && !isNaN(newPathLength) && newPathLength !== null && currentPath !== undefined && currentPath !== null){
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
      updatePointer(currentPath, newPathLength, newYaw);
    }
  }

  /*Updates the mode (video/stills)*/
  var oldMode = null;
  function updateMode(){
    var newMode = api.get('videointerface_mode');
    if(newMode !== oldMode){
      oldMode = newMode;
      if(newMode == 'video'){
        svg.classed('video', true);
        svg.classed('still', false);
      }else if(newMode == 'still'){
        svg.classed('still', true);
        svg.classed('video', false);
        // Find the closest still node, move to it
        var currentTime = api.get('plugin[video].time'),
            currentPath = d3.select(".selected").node(),
            pathLength = currentPath.getTotalLength(),
            totalTime = api.get('plugin[video].totaltime'),
            newPathLength = pathLength * (currentTime/totalTime);
        var i = 0;
        for(; i < still_lengths.length - 1; i++){
          if(newPathLength < still_lengths[i]){ break }
        }
        api.call("seek_update("+(totalTime*still_lengths[i]/pathLength)+")");
        window.setTimeout(function(){
          api.call("plugin[video].play()");
          api.call("plugin[video].pause()");
        }, 1000)
        //api.call('seek_update('+(totalTime*still_lengths[i]/pathLength)+')');
      }
    }
  }

  function mainLoop(){
    updateCircle();
    updateMode();
  }
};
