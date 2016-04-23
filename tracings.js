$(document).ready(function() {
  $('#diagramContainer').diagram();
});

$.widget('shawnpan.diagram', {

  _create: function() {
      console.log('widget create');
      this.canvas = this.element.find('canvas').get(0);
      this.$danceSelect = this.element.find('.danceSelect');
      this.$partSelect = this.element.find('.partSelect');
      this.$danceSelect.on('change', $.proxy(this._loadDance, this));
      this.$partSelect.on('change', $.proxy(this._loadPattern, this));
      if (!this.canvas.getContext) {
        console.log('Canvas not supported');
        return;
      }
      this.canvasContext = this.canvas.getContext('2d');
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
    $.getJSON(this.$danceSelect.val(), function(data) {
      console.log(data);
      widget.dance = data;
      widget._loadPattern();
    });
  },

  _loadPattern: function() {
    var part, i;
    part = this.$partSelect.val();
    console.log(part);
    for (i = 0; i < this.dance.patterns.length; i++) {
      pattern = this.dance.patterns[i];
      if ($.inArray(part, pattern.parts) <= 0) {
        this.pattern = pattern;
        break;
      }
    }
    this._drawPattern();
  },

  _drawPattern: function() {
    var ctx, pattern, component, path, lapIndex, componentIndex, pathIndex;
    ctx = this.canvasContext;

    for (lapIndex = 0; lapIndex < this.dance.patternsPerLap; lapIndex++) {
      ctx.save()
      ctx.translate(this.centerX, this.centerY);
      ctx.rotate(this.offsetAngle + 2 * Math.PI * lapIndex / this.dance.patternsPerLap);
      for (componentIndex = 0; componentIndex < this.pattern.components.length; componentIndex++) {
        component = this.pattern.components[componentIndex];
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