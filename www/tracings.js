//Requires IE9 or later - uses HTML5 and ECMAScript5
'use strict';

$(document).ready(function() {
  $('#danceSelect').selectmenu({position: {collision: 'flip'}});
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
      controls.controlContainer = elem.find('#controls');

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

      $(window).resize(this._onCanvasResize.bind(this));


      //initialize
      this.canvasContext = this.canvas.getContext('2d');
      this._onCanvasResize();
      this._loadDance();
  },

  _onCanvasResize: function() {
    var width, height,
        aspectRatio = window.innerWidth / window.innerHeight;
    if (aspectRatio > 1.8) {
      //height limited
      height = 0.9 * window.innerHeight;
      width = 1.8 * height;
    } else {
      //width limited
      width = 0.98 * window.innerWidth;
      height = width / 1.8;
    }
    if (width < 1024) {
      width = 1024;
      height = 1024 / 1.8;
    }

    this.canvas.width = width;
    this.canvas.height = height;
    this.centerX = width / 2;
    this.centerY = height / 2;
    this.scaleFactor = (width - 96) / 1024;
    this.controls.controlContainer.width(width);

    if (this.dance) {
      this._loadPattern();
    }
  },

  _loadDance: function() {
    var widget = this;
    console.log(this.controls.dance.val());
    $.getJSON('patterns/' + this.controls.dance.val(), function(data) {
      DiagramUtils.processComponentParams(data);
      console.log(data);
      widget.dance = data;
      widget._loadPattern();
    });
  },

  _loadPattern: function() {
    var lapIndex, componentIndex, pathIndex, transformMatrix, component, paths, offset,
        components = [],
        pattern = this.dance.patterns[this.part];
    console.log('loading pattern ' + this.dance.name + ' ' + this.part);
    this.patternPositions = DiagramUtils.generatePositions(this.dance, this.part, this._optionalStepsEnabled(), this.scaleFactor);
    this._updatePlaybackSpeedLabel();
    this.beginning();
  },

  _drawPattern: function() {
    var pattern, component, path, positionIndex, pathIndex, position,
        ctx = this.canvasContext,
        currentPosition = this.patternPositions[this.position],
        tickCount = currentPosition.offset + this.stepTickCount,
        fracBeat = tickCount % 4,
        beat = ((tickCount - fracBeat) / 4) % this.dance.timeSignatureTop + 1;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    //ctx.fillRect(0, 0, beat * this.canvas.width / this.dance.timeSignatureTop, 10);

    //Draw text
    ctx.font = '30px Arial';
    ctx.fillText(currentPosition.desc, 10, 30);
    ctx.font = '16px Arial';

    ctx.save();
    ctx.translate(this.centerX, this.centerY);

    //Draw rink
    this._drawRink();

    //Draw pattern
    for (positionIndex = 0; positionIndex < this.patternPositions.length; positionIndex++) {
      position = this.patternPositions[positionIndex];

      ctx.save();
      if (position.lapIndex !== currentPosition.lapIndex) {
        ctx.lineWidth = 2;
      } else if (position === currentPosition) {
        ctx.lineWidth = 4;
        if (beat === 1 && fracBeat === 0) {
          ctx.strokeStyle = 'rgb(0,220,0)';
        } else if (fracBeat === 0) {
          ctx.strokeStyle = 'rgb(0,200,0)';
        } else {
          ctx.strokeStyle = 'rgb(0,180,0)';
        }
      } else if (position.group && position.group === currentPosition.group) {
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgb(0,120,0)';
      } else {
        ctx.lineWidth = 3;
      }

      for (pathIndex = 0; pathIndex < position.paths.length; pathIndex++) {
        path = position.paths[pathIndex];
        ctx.beginPath();
        ctx.moveTo.apply(ctx, path.start);
        ctx.bezierCurveTo.apply(ctx, path.bezier);
        ctx.stroke();
      }

      if (position.paths.length) {
        ctx.textBaseline = 'middle';
        if (position.label) {
          //Draw label
          ctx.fillStyle = 'rgb(0,0,255)';
          DiagramUtils.drawTextOnPath(ctx, position.index + ' ' + position.label, position.paths[0], 10);
        }
        if (position.beats) {
          //Draw beats
          ctx.fillStyle = 'rgb(255,0,0)';
          DiagramUtils.drawTextOnPath(ctx, position.beats, position.paths[position.paths.length - 1], -10);
        }
      }

      ctx.restore();

    }
    ctx.restore();
  },

  _drawRink: function() {
    var ctx = this.canvasContext,
        scale = this.scaleFactor * 512 / 30,
        halfWidth = 30.5 * scale,
        halfWidthStraight = 22 * scale,
        halfHeight = 15 * scale,
        halfHeightStraight = 6.5 * scale,
        cornerRadius = 8.5 * scale;

      ctx.beginPath();
      ctx.moveTo(-halfWidthStraight, -halfHeight);
      ctx.arcTo(halfWidth, -halfHeight, halfWidth, halfHeightStraight, cornerRadius);
      ctx.arcTo(halfWidth, halfHeight, -halfWidthStraight, halfHeight, cornerRadius);
      ctx.arcTo(-halfWidth, halfHeight, -halfWidth, halfHeightStraight, cornerRadius);
      ctx.arcTo(-halfWidth, -halfHeight, -halfWidthStraight, -halfHeight, cornerRadius);
      ctx.stroke();
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
    this._shiftPosition(-1);
    this._drawPattern();
  },

  next: function() {
    this._pause();
    this._shiftPosition(1);
    this._drawPattern();
  },

  _shiftPosition: function(amount) {
    this.position = (this.position + this.patternPositions.length + amount) % this.patternPositions.length;
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
    if (this.stepTickCount >= this.patternPositions[this.position].duration) {
      this._shiftPosition(1);
    }
    this._drawPattern();
  }
});

var DiagramUtils = function() {};

DiagramUtils.computeTransformMatrix = function(index, patternsPerLap, scaleFactor) {
  var theta = 2 * Math.PI * index / patternsPerLap,
      sinTheta = Math.sin(theta) * scaleFactor,
      cosTheta = Math.cos(theta) * scaleFactor;
  return [cosTheta, -sinTheta, sinTheta, cosTheta];
};

DiagramUtils.transformCoordinates = function(coordinates, matrix) {
  var i, x, y,
      result = [];
  for (i = 0; i < coordinates.length; i+=2) {
    x = coordinates[i];
    y = coordinates[i+1];
    result.push(x * matrix[0] + y * matrix[1]);
    result.push(x * matrix[2] + y * matrix[3]);
  }
  return result;
};

DiagramUtils.cubicNormalAt = function(cubic, t) {
  var dx = DiagramUtils.cubicNormalAt.derivatives(cubic[0], cubic[2], cubic[4], cubic[6], t),
      dy = DiagramUtils.cubicNormalAt.derivatives(cubic[1], cubic[3], cubic[5], cubic[7], t),
      //Calcuate normal vector by rotating first derivative by 90 degrees and normalize to unit length
      length1d = Math.sqrt(dx[1] * dx[1] + dy[1] * dy[1]),
      normX = -dy[1] / length1d,
      normY = dx[1] / length1d;
      //Point normal vector outward
      if (normX * dx[2] + normY * dy[2] > 0) {
        normX *= -1;
        normY *= -1;
      }
  return {
    value: [dx[0], dy[0]],
    normal: [normX, normY]
  }
};
//Calculate array of value, first derivative, and second derivative
DiagramUtils.cubicNormalAt.derivatives = function(p0, p1, p2, p3, t) {
  var ti = 1 - t;
  return [ti * ti * ti * p0 + 3 * ti * ti * t * p1 + 3 * ti * t * t * p2 + t * t * t * p3,
          3 * ti * ti * (p1 - p0) + 6 * ti * t * (p2 - p1) + 3 * t * t * (p3 - p2),
          6 * ti * (p2 - 2 * p1 + p0) + 6 * t * (p3 - 2 * p2 + p1)];
};

DiagramUtils.preprocessPath = function(path, matrix) {
  var cubic = DiagramUtils.transformCoordinates(path, matrix);
  return $.extend(DiagramUtils.cubicNormalAt(cubic, 0.5), {start: cubic.slice(0, 2), bezier: cubic.slice(2, 8)});
};

DiagramUtils.drawTextOnPath = function(ctx, text, path, offset) {
  var x = path.value[0] + path.normal[0] * offset,
      y = path.value[1] + path.normal[1] * offset;
      ctx.textAlign = path.value[0] > x ? 'end' : 'start';
      ctx.fillText(text, x, y);
};

/**
  Get a hash map of character codes to the corresponding parameter.

  The following codes consisting of a # and a character represent parameterized edge features in text.
  A lower case character (e.g. #e) represent the short text version (e.g. RFO) and an upper case
  character (e.g. #E) represents a long text version (e.g. Right Forward Outside). Examples are given
  in paratheses for the edge code RFO.

  #e  edge (RFO, Right Forward Outside)
  #f  skating foot (R, Right)
  #r  free foot (L, Left)
  #d  direction (F, Forward)
  #b  opposite direction (B, Backward)
  #q  quality (O, Outside)
  #o  opposite quality (I, Inside)
  ##  escaped # character (#)
*/
DiagramUtils.edgeParams = function(edgeCode) {
  var i, result;
  if (!DiagramUtils.edgeParams.cache[edgeCode]) {
    result = {'#': '#'};
    for (i = 0; i < edgeCode.length; i++) {
      $.extend(result, DiagramUtils.edgeParams.CODES[edgeCode.charAt(i)]);
    }
    result.e = $.grep([result.f, result.d, result.q], Boolean).join('');
    result.E = $.grep([result.F, result.D, result.Q], Boolean).join(' ');
    DiagramUtils.edgeParams.cache[edgeCode] = result;
  }
  return DiagramUtils.edgeParams.cache[edgeCode];
};
DiagramUtils.edgeParams.cache = {};
DiagramUtils.edgeParams.CODES = {
  'R': {f: 'R', r: 'L', F: 'Right', R: 'Left'},
  'L': {f: 'L', r: 'R', F: 'Left', R: 'Right'},
  'F': {d: 'F', b: 'B', D: 'Forward', B: 'Backward'},
  'B': {d: 'B', b: 'F', D: 'Backward', B: 'Forward'},
  'I': {q: 'I', o: 'O', Q: 'Inside', O: 'Outside'},
  'O': {q: 'O', o: 'I', Q: 'Outside', O: 'Inside'}
};

//Resolve edge parameters in text. All text should use edge parameters where appropriate to support features such as mirroring.
DiagramUtils.resolveParams = function(edgeCode, label) {
  var i, curChar,
      inParam = false,
      result = '',
      edgeParams = DiagramUtils.edgeParams(edgeCode);
      for (i = 0; i < label.length; i++) {
        curChar = label.charAt(i);
        if (inParam) {
          result += edgeParams[curChar];
          inParam = false;
        } else if (curChar === '#') {
          inParam = true;
        } else {
          result += curChar;
        }
      }
  return result;
};

DiagramUtils.processComponentParams = function(dance) {
  var i, component, step;
  for (i = 0; i < dance.components.length; i++) {
    component = dance.components[i];
    step = dance.steps[component.step];
    component.label = DiagramUtils.resolveParams(component.edge, step.label);
    component.desc = DiagramUtils.resolveParams(component.edge, step.desc);
  }
};

DiagramUtils.generatePositions = function(dance, part, optional, scaleFactor) {
  var lapIndex, componentIndex, pathIndex, transformMatrix, component, paths, offset,
      positions = [],
      pattern = dance.patterns[part];

  offset = 0;
  for (lapIndex = 0; lapIndex < dance.patternsPerLap; lapIndex++) {
    transformMatrix = DiagramUtils.computeTransformMatrix(lapIndex, dance.patternsPerLap, scaleFactor);
    for (componentIndex = pattern.startComponent; componentIndex < pattern.endComponent; componentIndex++) {
      component = dance.components[componentIndex % dance.components.length];
      if (!component.optional || component.optional === optional) {
        paths = [];
        for (pathIndex = 0; pathIndex < component.paths.length; pathIndex++) {
          paths.push(DiagramUtils.preprocessPath(component.paths[pathIndex], transformMatrix));
        }
        positions.push($.extend({}, component, {'paths': paths, 'lapIndex': lapIndex, 'offset': offset}));
        offset += component.duration;
      }
    }
  }
  return positions;
};