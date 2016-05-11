//Requires IE9 or later - uses HTML5 and ECMAScript5
'use strict';

$(document).ready(function() {
  $('#danceSelect').selectmenu();
  $('#partButtons').buttonset();
  $('#optButtons').buttonset();

  $('#beginningButton').iconButton({iconList: ['ui-icon-seek-start']});
  $('#previousButton').iconButton({iconList: ['ui-icon-carat-1-w']});
  $('#startPauseButton').iconButton({iconList: ['ui-icon-play', 'ui-icon-pause']});
  $('#nextButton').iconButton({iconList: ['ui-icon-carat-1-e']});

  $('#speedSlider').slider({min: 20, max: 100, step: 5, value: 100});

  $('#diagramContainer').diagram();
});

$.widget('shawnpan.iconButton', $.ui.button, {
  options: {
    text: false,
    iconList: ['ui-icon-blank']
  },

  _create: function() {
    console.log('create');
    this._super();
    this.updateIcon(0);
  },

  updateIcon: function(index) {
    this._setOption('icons', {primary: this.options.iconList[index]});
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
      controls.optional.click(this._loadPattern.bind(this));
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
    });
  },

  _loadPattern: function() {
    var i, pattern,
        widget = this;
    console.log('loading pattern ' + this.dance.name + ' ' + this.part);
    for (i = 0; i < this.dance.patterns.length; i++) {
      pattern = this.dance.patterns[i];
      if ($.inArray(this.part, pattern.parts) >= 0) {
        this.components = $.grep(pattern.components,
          function(component) {
            return !component.optional || component.optional === widget._optionalStepsEnabled();
          });
        break;
      }
    }
    this.positionCount = this.components.length * this.dance.patternsPerLap;
    this._updatePlaybackSpeedLabel();
    this.beginning();
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

    //Draw text
    ctx.font = '30px Arial';
    ctx.fillText(currentComponent.desc, 10, 30);

    //Draw path
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
            ctx.lineWidth = 4;
            if (beat === 1 && fracBeat === 0) {
              ctx.strokeStyle = 'rgb(0,220,0)';
            } else if (fracBeat === 0) {
              ctx.strokeStyle = 'rgb(0,200,0)';
            } else {
              ctx.strokeStyle = 'rgb(0,180,0)';
            }
          } else if (component.group && component.group === currentComponent.group) {
            ctx.lineWidth = 4;
            ctx.strokeStyle = 'rgb(0,120,0)';
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

  _updateSpeed: function(event, ui) {
    console.log('update speed');
    this.playbackSpeedPercent = ui.value;
    this._updatePlaybackSpeedLabel();
    if (this.playing) {
      this._pause();
      this._start();
    }
  },

  _updatePlaybackSpeedLabel: function() {
    var desc = this.playbackSpeedPercent + '% (' + Math.round(this.playbackSpeedPercent * this.dance.beatsPerMinute / 100) + ' bpm)';
    this.controls.speedValue.text(desc);
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

  _optionalStepsEnabled: function() {
    return this.controls.optional.prop('checked') ? 'yes' : 'no';
  },

  beginning: function() {
    this._pause();
    this.position = 0;
    this.stepTickCount = 0;
    this._drawPattern();
  },

  previous: function() {
    this._pause();
    this._movePosition(-1);
    this._drawPattern();
  },

  next: function() {
    this._pause();
    this._movePosition(1);
    this._drawPattern();
  },

  _movePosition: function(amount) {
    this.position = (this.position + this.positionCount + amount) % this.positionCount;
    this.stepTickCount = 0;
  },

  _start: function() {
    console.log('start');
    this.playing = true;
    this.timer = setInterval(this._tick.bind(this), this._playbackInterval());
    this.controls.startPause.iconButton('updateIcon', 1);
  },

  _pause: function() {
    console.log('pause');
    clearInterval(this.timer);
    this.controls.startPause.iconButton('updateIcon', 0);
    this.playing = false;
  },

  toggleStartPause: function() {
    if (this.playing) {
      this._pause();
    } else {
      this._start();
    }
  },

  _tick: function() {
    this.stepTickCount++;
    if (this.stepTickCount >= this._currentComponent().duration) {
      this._movePosition(1);
    }
    this._drawPattern();
  }
});