$(document).ready(function() {
  $('#diagramContainer').diagram();
  $('#danceSelect').selectmenu();
  $('#partButtons').buttonset();
  $('#buttons').buttonset();
  $('#beginningButton').button({
    text: false,
    icons: {primary: 'ui-icon-seek-start'}
  });
  $('#previousButton').button({
    text: false,
    icons: {primary: 'ui-icon-carat-1-w'}
  });
  $('#startStopButton').button({
    text: false,
    icons: {primary: 'ui-icon-play'}
  });
  $('#nextButton').button({
    text: false,
    icons: {primary: 'ui-icon-carat-1-e'}
  });
  $('#speedSlider').slider({
    min: 20,
    max: 100,
    step: 5,
    value: 100,
    change: function(event, ui) {
      var bpm = Math.floor($('#diagramContainer').diagram('speed', ui.value));
      $('#speedValue').text(ui.value + '% (' + bpm + 'bpm)');
    }
  });
});

$.widget('shawnpan.diagram', {

  _create: function() {
      console.log('widget create');
      this.canvas = this.element.find('canvas').get(0);
      this.$speedSlider = this.element.find('#speedSlider');
      this.$danceSelect = this.element.find('#danceSelect');
      this.$danceSelect.on('change', $.proxy(this._loadDance, this));
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
    part = 'lady';
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
  },

  speed: function(speedPercentage) {
    this.speedPercentage = speedPercentage;
    this.playbackBPM = speedPercentage * this.dance.beatsPerMinute / 100;
    return this.playbackBPM;
  }
});