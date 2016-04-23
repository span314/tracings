var drawOnCanvas = function(canvas, dance) {
  if (canvas.getContext) {
    var centerX = canvas.width / 2;
    var centerY = canvas.height / 2;
  	var ctx = canvas.getContext('2d');
    var offsetAngle = Math.PI / 2;
    var pattern, component, path;
    var patternIndex, componentIndex, pathIndex, lapIndex;

    patternIndex = 0;
    pattern = dance.patterns[patternIndex];

    for (lapIndex = 0; lapIndex < dance.patternsPerLap; lapIndex++) {
      ctx.save()
      ctx.translate(centerX, centerY);
      ctx.rotate(offsetAngle + 2 * Math.PI * lapIndex / dance.patternsPerLap);
      for (componentIndex = 0; componentIndex < pattern.components.length; componentIndex++) {
        component = pattern.components[componentIndex];
        for (pathIndex = 0; pathIndex < component.paths.length; pathIndex++) {
          path = component.paths[pathIndex];
          ctx.beginPath();
          ctx.moveTo.apply(ctx, path.start);
          ctx.bezierCurveTo.apply(ctx, path.bezier);
          ctx.stroke();
        }
      }      
      ctx.restore()
    }
  	console.log('done');
  } else {
  	console.log('Canvas not supported');
  }
}

$(document).ready(function() {
  $.getJSON('canasta_tango.json', function(data) {
    console.log(data);

    var canvas = $('#diagramCanvas').get(0);
    drawOnCanvas(canvas, data);
  });
});

console.log("foo");