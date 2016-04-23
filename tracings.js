var drawOnCanvas = function(canvas, dance) {
  if (canvas.getContext) {
    var centerX = canvas.width / 2;
    var centerY = canvas.height / 2;
  	var ctx = canvas.getContext('2d');
    var pattern = dance.patterns[0];
    var components = pattern.components;
    var offsetAngle = Math.PI / 2;
    var patternIndex, i, path;

    for (patternIndex = 0; patternIndex < dance.patternsPerLap; patternIndex++) {
      ctx.save()
      ctx.translate(centerX, centerY);
      ctx.rotate(offsetAngle + 2 * Math.PI * patternIndex / dance.patternsPerLap);
      for (i = 0; i < components.length; i++) {
        path = components[i].path;
        ctx.beginPath();
        ctx.moveTo(path[0], path[1]);
        ctx.bezierCurveTo(path[2], path[3], path[4], path[5], path[6], path[7]);
        ctx.stroke();
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