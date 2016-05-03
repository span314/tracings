//Requires IE9 or later - uses HTML5 and ECMAScript5

$(document).ready(function() {
  $('#diagramContainer').diagram();
  $('#danceSelect').selectmenu();
  $('#partButtons').buttonset();

  $('#beginningButton').button({
    text: false,
    icons: {primary: 'ui-icon-seek-start'}
  });

  $('#previousButton').button({
    text: false,
    icons: {primary: 'ui-icon-carat-1-w'}
  });

  $('#startPauseButton').button({
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
    value: 100
  });
});

$.widget('shawnpan.diagram', {
  playing: false,
  part: 'lady',
  controls: {},

  _create: function() {
      var elem, controls;
      //check canvas compatibility
      this.canvas = this.element.find('canvas').get(0);
      if (!this.canvas.getContext) {
        console.log('Canvas not supported');
        return;
      }

      //find control ui
      elem = this.element;
      controls = this.controls;
      controls.dance = elem.find('#danceSelect');
      controls.partLady = elem.find('#partLady');
      controls.partMan = elem.find('#partMan');
      controls.beginning = elem.find('#beginningButton');
      controls.previous = elem.find('#previousButton');
      controls.next = elem.find('#nextButton');
      controls.startPause = elem.find('#startPauseButton');
      controls.speed = elem.find('#speedSlider');
      controls.speedValue = elem.find('#speedValue');

      //bind events
      controls.dance.on('selectmenuchange', this._loadDance.bind(this));

      controls.partLady.click(this._updatePart.bind(this, 'lady'));
      controls.partMan.click(this._updatePart.bind(this, 'man'));

      controls.beginning.click(this.beginning.bind(this));
      controls.previous.click(this.previous.bind(this));
      controls.next.click(this.next.bind(this));
      controls.startPause.click(this.toggleStartPause.bind(this));



      controls.speed.on('slidechange', this._updateSpeed.bind(this));

      //initialize
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
    console.log(this.controls.dance.val());
    $.getJSON('patterns/' + this.controls.dance.val(), function(data) {
      console.log(data);
      widget.dance = data;
      widget._loadPattern();
      widget._updateSpeed();
    });
  },

  _loadPattern: function() {
    var i;
    console.log('loading pattern ' + this.dance.name + ' ' + this.part);
    for (i = 0; i < this.dance.patterns.length; i++) {
      pattern = this.dance.patterns[i];
      if ($.inArray(this.part, pattern.parts) >= 0) {
        this.pattern = pattern;
        break;
      }
    }
    this._drawPattern();
  },

  _drawPattern: function() {
    var pattern, component, path, lapIndex, componentIndex, pathIndex,
        ctx = this.canvasContext;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (lapIndex = 0; lapIndex < this.dance.patternsPerLap; lapIndex++) {
      ctx.save()
      ctx.translate(this.centerX, this.centerY);
      ctx.rotate(this.offsetAngle + 2 * Math.PI * lapIndex / this.dance.patternsPerLap);
      for (componentIndex = 0; componentIndex < this.pattern.components.length; componentIndex++) {
        component = this.pattern.components[componentIndex];
        for (pathIndex = 0; pathIndex < component.path.length; pathIndex++) {
          path = component.path[pathIndex];
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

  _updateSpeed: function() {
    var percentage = this.controls.speed.slider('value');
    this.playbackBPM = percentage * this.dance.beatsPerMinute / 100;
    this.controls.speedValue.text(percentage + '% (' + Math.round(this.playbackBPM) + ' bpm)');
  },

  _updatePart: function(part) {
    if (this.part !== part) {
      this.part = part;
      this._loadPattern();
    }
  },

  beginning: function() {
    this.pause();
    console.log('beginning');
  },

  previous: function() {
    this.pause();
    console.log('previous');
  },

  next: function() {
    this.pause();
    console.log('next');
  },

  start: function() {
    if (!this.playing) {
      console.log('start');
      this.playing = true;
      this.controls.startPause.button('option', {icons: {primary: 'ui-icon-pause'}});
    }
  },

  pause: function() {
    if (this.playing) {
      console.log('pause');
      this.playing = false;
      this.controls.startPause.button('option', {icons: {primary: 'ui-icon-play'}});
    }
  },

  toggleStartPause: function() {
    if (this.playing) {
      this.pause();
    } else {
      this.start();
    }
  }
});