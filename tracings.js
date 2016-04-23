$(document).ready(function() {
  $('#diagramCanvas').diagram({danceUrl: 'canasta_tango.json'});
});

$.widget('shawnpan.diagram', {
  options: {
    danceUrl: 'canasta_tango.json'
  },

  _create: function() {
      console.log('widget create');
      var canvas = this.canvas = this.element.get(0);
      if (!canvas.getContext) {
        console.log('Canvas not supported');
        return;
      }
      this.canvasContext = canvas.getContext('2d');
      this._onCanvasResize();
      this._loadDance();
  },

  _onCanvasResize: function() {
    this.centerX = this.canvas.width / 2;
    this.centerY = this.canvas.height / 2;
    this.offsetAngle = Math.PI / 2 * (this.canvas.width > this.canvas.height);
  },

  _loadDance: function() {
    var widget = this;
    $.getJSON(this.options.danceUrl, function(data) {
      console.log(data);
      widget.dance = data;
      widget._drawPattern();
    });
  },

  _drawPattern: function() {
    var ctx = this.canvasContext;
    var pattern, component, path;
    var patternIndex, componentIndex, pathIndex, lapIndex;

    patternIndex = 0;
    pattern = this.dance.patterns[patternIndex];

    for (lapIndex = 0; lapIndex < this.dance.patternsPerLap; lapIndex++) {
      ctx.save()
      ctx.translate(this.centerX, this.centerY);
      ctx.rotate(this.offsetAngle + 2 * Math.PI * lapIndex / this.dance.patternsPerLap);
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
  }
});