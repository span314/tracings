//Requires IE9 or later - uses HTML5 and ECMAScript5
'use strict';

$(document).ready(function() {
  $('#diagramContainer').diagram();

  $('#danceSelect').selectmenu();
  $('#partButtons').buttonset();
  $('#optButtons').buttonset();

  $('#beginningButton').iconButton({
    iconList: ['ui-icon-seek-start']
  }).click(function() {
    $('#diagramContainer').diagram('beginning');
    $('#startPauseButton').iconButton('updateIcon', 0);
  });

  $('#previousButton').iconButton({
    iconList: ['ui-icon-carat-1-w']
  }).click(function() {
    $('#diagramContainer').diagram('previous');
    $('#startPauseButton').iconButton('updateIcon', 0);
  });

  $('#startPauseButton').iconButton({
    iconList: ['ui-icon-play', 'ui-icon-pause']
  }).click(function() {
    if ($(this).iconButton('updateIcon')) {
      $('#diagramContainer').diagram('start');
    } else {
      $('#diagramContainer').diagram('pause');
    }
  });

  $('#nextButton').iconButton({
    iconList: ['ui-icon-carat-1-e']
  }).click(function() {
    $('#diagramContainer').diagram('next');
    $('#startPauseButton').iconButton('updateIcon', 0);
  });

  $('#speedSlider').slider({
    min: 20,
    max: 100,
    step: 5,
    value: 100,
    change: function(event, ui) {
      $('#diagramContainer').diagram('updateSpeed', ui.value);
      $('#speedValue').text($('#diagramContainer').diagram('playbackSpeedDesc'));
    }
  });
});

$.widget('shawnpan.iconButton', $.ui.button, {
  options: {
    text: false,
    iconList: ['ui-icon-blank']
  },

  iconIndex: 0,

  _create: function() {
    this._super();
    this.updateIcon(0);
  },

  updateIcon: function(index) {
    if (typeof(index) === 'undefined') {
      this.iconIndex = (this.iconIndex + 1) % this.options.iconList.length;
    } else {
      this.iconIndex = index;
    }
    this._setOption('icons', {primary: this.options.iconList[this.iconIndex]});
    return this.iconIndex;
  }
});

$.widget('shawnpan.diagram', {
  playing: false,
  part: 'lady',
  position: 0,
  positionCount: 0,
  stepTickCount: 0,
  playbackSpeedPercent: 100,
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
      controls.optional = elem.find('#optional');

      //bind events
      controls.dance.on('selectmenuchange', this._loadDance.bind(this));

      controls.partLady.click(this._updatePart.bind(this, 'lady'));
      controls.partMan.click(this._updatePart.bind(this, 'man'));

      controls.optional.click(this._loadPattern.bind(this));

      //controls.speed.on('slidechange', this._updateSpeed.bind(this));

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
    });
  },

  _loadPattern: function() {
    var i, pattern,
        optionalSteps = this.controls.optional.prop('checked') ? 'yes' : 'no';
    console.log('loading pattern ' + this.dance.name + ' ' + this.part);
    for (i = 0; i < this.dance.patterns.length; i++) {
      pattern = this.dance.patterns[i];
      if ($.inArray(this.part, pattern.parts) >= 0) {
        this.components = $.grep(pattern.components,
          function(component) {
            return !component.optional || component.optional === optionalSteps;
          });
        break;
      }
    }
    this.positionCount = this.components.length * this.dance.patternsPerLap;
    this.beginning();
    $('#speedValue').text($('#diagramContainer').diagram('playbackSpeedDesc')); //TODO
    this._drawPattern();
  },

  _drawPattern: function() {
    var pattern, component, path, lapIndex, componentIndex, pathIndex,
        ctx = this.canvasContext,
        currentComponent = this._currentComponent(),
        currentLap = Math.floor(this.position / this.components.length),
        tickCount = this._currentComponent().offset + this.stepTickCount,
        fracBeat = tickCount % 4,
        beat = ((tickCount - fracBeat) / 4) % this.dance.timeSignatureTop + 1;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    //ctx.fillRect(0, 0, beat * this.canvas.width / this.dance.timeSignatureTop, 10);

    for (lapIndex = 0; lapIndex < this.dance.patternsPerLap; lapIndex++) {
      ctx.save();
      ctx.translate(this.centerX, this.centerY);
      ctx.rotate(this.offsetAngle + 2 * Math.PI * lapIndex / this.dance.patternsPerLap);
      for (componentIndex = 0; componentIndex < this.components.length; componentIndex++) {
        component = this.components[componentIndex];
        ctx.save();
        if (currentLap === lapIndex) {
          ctx.lineWidth = 3;
          if (component === currentComponent) {
            if (beat === 1 && fracBeat === 0) {
              ctx.lineWidth = 5;
              ctx.strokeStyle = 'rgb(255,0,0)';
            } else if (fracBeat === 0) {
              ctx.lineWidth = 4;
              ctx.strokeStyle = 'rgb(235,0,0)';
            } else {
              ctx.strokeStyle = 'rgb(215,0,0)';
            }
          } else if (component.group && component.group === currentComponent.group) {
            ctx.strokeStyle = 'rgb(150,0,0)';
          }
        } else {
          ctx.lineWidth = 2;
        }
        for (pathIndex = 0; pathIndex < component.path.length; pathIndex++) {
          path = component.path[pathIndex];
          ctx.beginPath();
          ctx.moveTo.apply(ctx, path.start);
          ctx.bezierCurveTo.apply(ctx, path.bezier);
          ctx.stroke();
        }
        ctx.restore();
      }
      ctx.restore();
    }
  },

  updateSpeed: function(percentage) {
    console.log('update speed');
    this.playbackSpeedPercent = percentage;
    if (this.playing) {
      this.pause();
      this.start();
    }
  },

  playbackSpeedDesc: function() {
    return this.playbackSpeedPercent + '% (' + Math.round(this.playbackSpeedPercent * this.dance.beatsPerMinute / 100) + ' bpm)';
  },

  _playbackInterval: function() {
    return 1500000 / (this.playbackSpeedPercent * this.dance.beatsPerMinute) //60000 ms / 4 ticks per beat * 100 percent
  },

  _updatePart: function(part) {
    if (this.part !== part) {
      this.part = part;
      this._loadPattern();
    }
  },

  _currentComponent: function() {
    return this.components[this.position % this.components.length];
  },

  beginning: function() {
    this.pause();
    this.position = 0;
    this.stepTickCount = 0;
    this._drawPattern();
  },

  previous: function() {
    this.pause();
    this._movePosition(-1);
    this._drawPattern();
  },

  next: function() {
    this.pause();
    this._movePosition(1);
    this._drawPattern();
  },

  _movePosition: function(amount) {
    this.position = (this.position + this.positionCount + amount) % this.positionCount;
    this.stepTickCount = 0;
  },

  start: function() {
    if (!this.playing) {
      console.log('start');
      this.playing = true;
      this.timer = setInterval(this.tick.bind(this), this._playbackInterval());
    }
  },

  pause: function() {
    if (this.playing) {
      console.log('pause');
      clearInterval(this.timer);
      this.playing = false;
    }
  },

  tick: function() {
    this.stepTickCount++;
    if (this.stepTickCount >= this._currentComponent().duration) {
      this._movePosition(1);
    }
    this._drawPattern();
  }
});