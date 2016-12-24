/*!
Ice Diagram Widget v0.3.0 | Software Copyright (c) Shawn Pan
*/
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD
    define(['./diagramcodes.js'], factory);
  } else if (typeof exports === 'object') {
    // Node, CommonJS-like
    module.exports = factory(require('./diagramcodes.js'));
  } else {
    // Browser globals (root is window)
    root.IceDiagram = factory(root.DiagramCodes);
  }
}(this, function (DiagramCodes) {
  'use strict';
  var IceDiagram = function(canvas, options) {
    //store parameters
    this._canvasElement = canvas;
    this._controls = options;
    //create canvas context
    this._canvasContext = canvas.getContext('2d');
    //create audio context, if available
    if (window.AudioContext) {
      this._audioContext = new AudioContext();
    } else if (window.webkitAudioContext) {
      this._audioContext = new webkitAudioContext();
    }
    //initialize
    this._loadDance();
  };

  //Support for various pattern format versions
  IceDiagram._DATA_VERSION_MIN = 2;
  IceDiagram._DATA_VERSION_MAX = 2;

  IceDiagram._BASE_FONT_SIZE = 12;
  IceDiagram._BASE_LABEL_OFFSET = 10;
  IceDiagram._FONT = IceDiagram._BASE_FONT_SIZE + 'px Arial';

  //Width is 870 in diagram generation to compensate for rulebook diagram being not quite the right aspect ratio
  IceDiagram._RINK_WIDTH = 900;
  IceDiagram._RINK_HEIGHT = IceDiagram._RINK_WIDTH / 2;
  IceDiagram._RINK_TO_VIEWPORT_RATIO = 0.88;
  IceDiagram._BASE_WIDTH = IceDiagram._RINK_WIDTH / IceDiagram._RINK_TO_VIEWPORT_RATIO;
  IceDiagram._BASE_HEIGHT = IceDiagram._RINK_HEIGHT / IceDiagram._RINK_TO_VIEWPORT_RATIO;

  IceDiagram._TICKS_PER_BEAT = 4;
  IceDiagram._COLOR_TRACING = '#000';
  IceDiagram._COLOR_TRACING_ACTIVE = ['#0B0', '#0C0', '#0D0', '#0E0'];
  IceDiagram._COLOR_TRACING_GROUP = '#070';
  IceDiagram._COLOR_TEXT_MAIN = '#000';
  IceDiagram._COLOR_TEXT_LABEL_STEP = '#07F';
  IceDiagram._COLOR_TEXT_LABEL_COUNT = '#F70';
  IceDiagram._COLOR_RINK = '#DDD';
  IceDiagram._FADE_MASK = 'rgba(255,255,255,0.75)';

  IceDiagram.prototype.controlEvent = function(eventType, value) {
    console.log('UI ' + eventType + ' ' + (value || ''));
    this._controls[eventType] = value;
    switch (eventType) {
      case 'beginning':
        this._movePosition(0);
        break;
      case 'previous':
        this._movePosition(this._position - 1);
        break;
      case 'next':
        this._movePosition(this._position + 1);
        break;
      case 'startPause':
        this._startPause();
        break;
      case 'click':
        this._click();
        break;
      case 'shift':
        this._shiftCenter();
        break;
      case 'dance':
        this._loadDance();
        break;
      case 'part': case 'optional': case 'mirror': case 'rotate':
        this._loadPattern();
        break;
      case 'step': case 'number': case 'count': case 'hold': case 'speed': case 'resize':
        this._drawPattern();
    }
  };

  IceDiagram.prototype._loadDance = function() {
    var widget = this,
        url = 'patterns/' + this._controls.dance + '.json',
        request = new XMLHttpRequest();
    request.open('GET', url, true);

    request.onload = function() {
      var dance, version;
      if (request.status < 200 || request.status >= 400) {
        window.alert(DiagramCodes._MESSAGES._ERROR_SERVER + DiagramCodes._MESSAGES._ERROR_CONTACT);
        return;
      }
      dance = JSON.parse(request.responseText);

      //TODO remove conditional once all production patterns have a version
      version = dance.dataVersion ? parseInt(dance.dataVersion) : 1;
      if (version < IceDiagram._DATA_VERSION_MIN || version > IceDiagram._DATA_VERSION_MAX) {
        if (window.confirm(DiagramCodes._MESSAGES._ERROR_VERSION + DiagramCodes._MESSAGES._ERROR_CONTACT)) {
          window.location.reload(true);
        }
        return;
      }

      if (dance.dev) {
        window.alert(DiagramCodes._MESSAGES._ERROR_DEV + DiagramCodes._MESSAGES._ERROR_CONTACT);
      }

      widget._dance = dance;
      widget._beatPattern = dance.timeSignatureTop % 3 ? [3, 1, 2, 1] : [3, 1, 1, 2, 1, 1];
      widget._loadPattern();
    };

    request.onerror = function() {
      if (window.confirm(DiagramCodes._MESSAGES._ERROR_CONNECTION + DiagramCodes._MESSAGES._ERROR_CONTACT)) {
        window.location.reload(true);
      }
    };

    request.send();
  };

  IceDiagram.prototype._loadPattern = function() {
    var lastPosition,
        optionalFlag = this._controls.optional ? 'yes' : 'no',
        mirrorFlag = this._controls.mirror,
        rotateFlag = this._controls.rotate,
        part = this._controls.part;
    this._patternPositions = IceDiagram._generatePositions(this._dance, part, optionalFlag, mirrorFlag, rotateFlag);
    lastPosition = this._patternPositions[this._patternPositions.length - 1];
    this._ticksPerLap = lastPosition.offset + lastPosition.duration;
    this._positionSearchTree = IceDiagram._positionTree(this._patternPositions);
    this._movePosition(0);
  };

  IceDiagram.prototype._getCenter = function() {
    var w = this._canvasElement.width,
        h = this._canvasElement.height,
        cx = IceDiagram._trimCenter(this._activeCenter[0], IceDiagram._BASE_WIDTH, w),
        cy = IceDiagram._trimCenter(this._activeCenter[1], IceDiagram._BASE_HEIGHT, h);
    return [w / 2 - cx, h / 2 - cy];
  };

  IceDiagram.prototype._shiftCenter = function() {
    if (!this._playing) {
      this._activeCenter[0] = IceDiagram._trimCenter(this._activeCenter[0] - this._controls.shift[0], IceDiagram._BASE_WIDTH, this._canvasElement.width);
      this._activeCenter[1] = IceDiagram._trimCenter(this._activeCenter[1] - this._controls.shift[1], IceDiagram._BASE_HEIGHT, this._canvasElement.height);
      this._drawPattern();
    }
  };

  IceDiagram.prototype._drawPattern = function() {
    var path, positionIndex, pathIndex, position, labelList, labelText,
        showStep = this._controls.step,
        showNumber = this._controls.number,
        showCount = this._controls.count,
        showHold = this._controls.hold,
        zoom = IceDiagram._getDefaultZoom(this._canvasElement.width, this._canvasElement.height),
        center = this._getCenter(),
        ctx = this._canvasContext,
        currentPosition = this._patternPositions[this._position];

    //Note: set background color to white in css
    //otherwise background will be black in IE and Firefox when fullscreen
    ctx.clearRect(0, 0, this._canvasElement.width, this._canvasElement.height);
    ctx.font = IceDiagram._FONT;

    ctx.save(); //scale
    ctx.scale(zoom, zoom);

    ctx.save(); //translate
    ctx.translate(center[0] / zoom, center[1] / zoom);

    //Draw rink
    this._drawRink();

    //Draw pattern
    for (positionIndex = 0; positionIndex < this._patternPositions.length; positionIndex++) {
      position = this._patternPositions[positionIndex];

      if (position.lapIndex !== currentPosition.lapIndex) {
        ctx.lineWidth = 1;
        ctx.strokeStyle = IceDiagram._COLOR_TRACING;
      } else if (position === currentPosition) {
        ctx.lineWidth = 3;
        ctx.strokeStyle = IceDiagram._COLOR_TRACING_ACTIVE[this._currentBeatInfo.strength];
      } else if (position.group && position.group === currentPosition.group) {
        ctx.lineWidth = 3;
        ctx.strokeStyle = IceDiagram._COLOR_TRACING_GROUP;
      } else {
        ctx.lineWidth = 2;
        ctx.strokeStyle = IceDiagram._COLOR_TRACING;
      }

      for (pathIndex = 0; pathIndex < position.paths.length; pathIndex++) {
        path = position.paths[pathIndex];
        ctx.beginPath();
        ctx.moveTo.apply(ctx, path.cubic.slice(0, 2));
        ctx.bezierCurveTo.apply(ctx, path.cubic.slice(2, 8));
        ctx.stroke();
      }

      if (position.paths.length) {
        ctx.textBaseline = 'middle';
        //Draw index and label
        labelList = [];
        if (showNumber && position.index) {
          labelList.push(position.index);
        }
        if (showStep && position.label) {
          labelList.push(position.label);
        }
        labelText = labelList.join(' ');
        if (labelText) {
          ctx.fillStyle = IceDiagram._COLOR_TEXT_LABEL_STEP;
          IceDiagram._drawTextOnPath(ctx, labelText, position.paths[0], IceDiagram._BASE_LABEL_OFFSET);
        }
        //Draw hold and count
        labelList = [];
        if (showHold && position.hold) {
          labelList.push(DiagramCodes._HOLD_LABELS[position.hold]);
        }
        if (showCount && position.countLabel) {
          labelList.push(position.countLabel);
        }
        labelText = labelList.join(' ');
        if (labelText) {
          ctx.fillStyle = IceDiagram._COLOR_TEXT_LABEL_COUNT;
          IceDiagram._drawTextOnPath(ctx, labelText, position.paths[position.paths.length - 1], -IceDiagram._BASE_LABEL_OFFSET);
        }
      }
    }
    ctx.restore(); //translate

    //Draw text
    IceDiagram._drawTextOver(ctx, currentPosition.desc, IceDiagram._BASE_LABEL_OFFSET, IceDiagram._BASE_LABEL_OFFSET + IceDiagram._BASE_FONT_SIZE);
    labelText = currentPosition.count;
    labelText += currentPosition.duration > IceDiagram._TICKS_PER_BEAT ? ' beats, ' : ' beat, ';
    labelText += currentPosition.edge;
    labelText += DiagramCodes._HOLD_DESCRIPTIONS[currentPosition.hold] ? ', ' + DiagramCodes._HOLD_DESCRIPTIONS[currentPosition.hold] : '';
    IceDiagram._drawTextOver(ctx, labelText, IceDiagram._BASE_LABEL_OFFSET, IceDiagram._BASE_LABEL_OFFSET + IceDiagram._BASE_FONT_SIZE * 2.2);
    labelText = this._controls.speed === 1 ? '' : Math.round(this._controls.speed * this._dance.beatsPerMinute) + 'bpm of ';
    labelText += this._dance.beatsPerMinute + 'bpm';
    IceDiagram._drawTextOver(ctx, labelText, IceDiagram._BASE_LABEL_OFFSET, this._canvasElement.height / zoom - IceDiagram._BASE_LABEL_OFFSET);
    ctx.restore(); //scale
  };

  IceDiagram.prototype._drawRink = function() {
    var ctx = this._canvasContext,
        halfWidth = 0.5 * IceDiagram._RINK_WIDTH,
        halfWidthStraight = 0.361 * IceDiagram._RINK_WIDTH, // 22 / 61
        halfHeight = 0.246 * IceDiagram._RINK_WIDTH, // 15 / 61
        halfHeightStraight = 0.107 * IceDiagram._RINK_WIDTH, // 6.5 / 61
        cornerRadius = 0.139 * IceDiagram._RINK_WIDTH; // 8.5 / 61

    ctx.save();

    ctx.strokeStyle = IceDiagram._COLOR_RINK;

    ctx.beginPath();
    ctx.moveTo(-halfWidthStraight, -halfHeight);
    ctx.arcTo(halfWidth, -halfHeight, halfWidth, halfHeightStraight, cornerRadius);
    ctx.arcTo(halfWidth, halfHeight, -halfWidthStraight, halfHeight, cornerRadius);
    ctx.arcTo(-halfWidth, halfHeight, -halfWidth, halfHeightStraight, cornerRadius);
    ctx.arcTo(-halfWidth, -halfHeight, -halfWidthStraight, -halfHeight, cornerRadius);
    ctx.moveTo(0, -halfHeight);
    ctx.lineTo(0, halfHeight);
    ctx.moveTo(-halfWidth, 0);
    ctx.lineTo(halfWidth, 0);
    ctx.stroke();

    ctx.restore();
  };

  IceDiagram.prototype._nextTick = function() {
    var currentPosition = this._patternPositions[this._position],
        stepTickCount = (this._currentBeatInfo.ticks - currentPosition.offset) % this._ticksPerLap;
    if (stepTickCount >= currentPosition.duration) {
      this._position = this._position === this._patternPositions.length - 1 ? 0 : this._position + 1;
    }
    this._activeCenter = IceDiagram._cubicValueAt(currentPosition.paths[0].cubic, stepTickCount / currentPosition.duration);
  };

  IceDiagram.prototype._movePosition = function(index) {
    this._pause();
    index = (index + this._patternPositions.length) % this._patternPositions.length;
    this._position = index;
    this._currentBeatInfo = this._beatInfo(this._patternPositions[index].offset);
    this._activeCenter = this._patternPositions[this._position].paths[0].value.slice();
    this._drawPattern();
  };

  IceDiagram.prototype._start = function() {
    this._nextTickTimestamp = 0;
    this._elapsedTicks = this._patternPositions[this._position].offset;
    this._nextBeatInfo = this._beatInfo(this._elapsedTicks);

    if (this._audioContext) {
      //Unmute by playing a beat quietly - iOS devices must play directly after a user interaction
      this._scheduleBeatAudio(0.01, this._audioContext.currentTime);
      //Current time does not advance on MS Edge when sound isn't available
      if (this._audioContext.currentTime === 0) {
        this._audioContext = false;
      }
    }

    this._playing = true;
    this._animFrame = window.requestAnimationFrame(this._tick.bind(this));
  };


  IceDiagram.prototype._pause = function() {
    window.cancelAnimationFrame(this._animFrame);
    this._playing = false;
  };

  IceDiagram.prototype._startPause = function() {
    if (this._playing) {
      this._pause();
    } else {
      this._start();
    }
  };

  IceDiagram.prototype._tick = function(rafTimestamp) {
    this._synchronize(rafTimestamp);
    this._drawPattern();
    this._animFrame = window.requestAnimationFrame(this._tick.bind(this));
  };

  IceDiagram.prototype._click = function() {
    var zoom = IceDiagram._getDefaultZoom(this._canvasElement.width, this._canvasElement.height),
        center = this._getCenter(),
        point = [(this._controls.click[0] - center[0]) / zoom, (this._controls.click[1] - center[1]) / zoom],
        nearest = IceDiagram._nearestNeighbor(point, this._positionSearchTree, 16);
    if (nearest >= 0) {
      this._movePosition(this._positionSearchTree[nearest][2]);
    }
  };

  //Schedules audio for beats, returning a object containing tick count, beat number, and beat strength.
  //Takes in a backup ms timestamp such as performance.now(), Date.now(), or requestAnimationFrame timestamp
  //for browsers that do not support web audio API
  IceDiagram.prototype._synchronize = function(backupTimestamp) {
    var currentTime = this._audioContext ? this._audioContext.currentTime : backupTimestamp * 0.001;
    //Initialize timer if necessary
    this._nextTickTimestamp = this._nextTickTimestamp || currentTime;
    //Ideally loop runs once with no lag
    while (currentTime >= this._nextTickTimestamp) {
      this._currentBeatInfo = this._nextBeatInfo;
      this._nextBeatInfo = this._beatInfo(this._elapsedTicks);

      this._nextTick();
      this._nextTickTimestamp +=  60 / (IceDiagram._TICKS_PER_BEAT * this._controls.speed * this._dance.beatsPerMinute);

      if (this._audioContext && this._controls.sound && this._nextBeatInfo.strength) {
        this._scheduleBeatAudio(this._nextBeatInfo.strength / 3, this._nextTickTimestamp);
      }

      this._elapsedTicks++;
    }
  };

  //Construct beat info for given time offset
  IceDiagram.prototype._beatInfo = function(offset) {
    var info = {},
        beatCount = Math.floor(offset / IceDiagram._TICKS_PER_BEAT) % this._beatPattern.length;
    info.ticks = offset;
    info.beat = beatCount % this._dance.timeSignatureTop + 1;
    info.strength = offset % IceDiagram._TICKS_PER_BEAT ? 0 : this._beatPattern[beatCount];
    return info;
  };

  //Schedule audio for a beat - drum-like waveform
  IceDiagram.prototype._scheduleBeatAudio = function(volume, startTime) {
    var osc = this._audioContext.createOscillator(),
        gain = this._audioContext.createGain(),
        endTime = startTime + 0.2;

    osc.start(startTime);
    osc.stop(endTime);

    osc.frequency.setValueAtTime(440.0, startTime);
    osc.frequency.exponentialRampToValueAtTime(1.0, endTime);

    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, endTime);

    osc.connect(gain);
    gain.connect(this._audioContext.destination);
  };

  //Static utility functions

  //Draw text next to a cubic path
  IceDiagram._drawTextOnPath = function(ctx, text, path, offset) {
    var x = path.value[0] + path.normal[0] * offset,
        y = path.value[1] + path.normal[1] * offset;
        ctx.textAlign = path.value[0] > x ? 'end' : 'start';
        ctx.fillText(text, x, y);
  };

  //Draw text with faded background over diagram
  IceDiagram._drawTextOver = function(ctx, text, x, y) {
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = IceDiagram._FADE_MASK;
    ctx.fillRect(x, y - IceDiagram._BASE_FONT_SIZE, ctx.measureText(text).width, IceDiagram._BASE_FONT_SIZE);
    ctx.fillStyle = IceDiagram._COLOR_TEXT_MAIN;
    ctx.fillText(text, x, y);
  };

  //Generate individual positions for a dance
  IceDiagram._generatePositions = function(dance, part, optional, mirror, rotate) {
    var lapIndex, componentIndex, pathIndex, transformMatrix, component, offset, position, cubic, path, positionIndex, countLabel, countTotal,
        positions = [],
        pattern = dance.patterns[part];

    offset = 0;
    for (lapIndex = 0; lapIndex < dance.patternsPerLap; lapIndex++) {
      transformMatrix = IceDiagram._computeTransformMatrix(lapIndex, dance.patternsPerLap, mirror, rotate);
      for (componentIndex = pattern.startComponent; componentIndex < pattern.endComponent; componentIndex++) {
        component = dance.components[componentIndex % dance.components.length];
        if (!component.optional || component.optional === optional) {
          position = {};
          //Copy component properties
          position.hold = component.hold;
          position.index = component.index;
          position.step = component.step;
          position.group = component.group;
          position.beatGrouping = component.beatGrouping;
          //Parse timing
          position.beats = parseFloat(component.beats);
          position.count = IceDiagram._toMixedNumber(position.beats);
          position.duration = Math.round(position.beats * IceDiagram._TICKS_PER_BEAT);
          //Generate paths
          position.paths = [];
          for (pathIndex = 0; pathIndex < component.paths.length; pathIndex++) {
            cubic = IceDiagram._transformCoordinates(component.paths[pathIndex], transformMatrix);
            path = IceDiagram._cubicNormalAt(cubic, component.labelOffset || 0.5);
            path.cubic = cubic;
            position.paths.push(path);
          }
          //Check mirroring
          position.edge = mirror ? DiagramCodes._EDGE_PARAMS[component.edge].m : component.edge;
          //Generate text
          position.label = IceDiagram._resolveParams(position.edge, DiagramCodes._STEP_LABELS[component.step]);
          position.desc = IceDiagram._resolveParams(position.edge, DiagramCodes._STEP_DESCRIPTIONS[component.step]);
          if (component.transition) {
            if (DiagramCodes._TRANSITION_LABELS[component.transition]) {
              position.label = DiagramCodes._TRANSITION_LABELS[component.transition] + '-' + position.label;
            }
            if (DiagramCodes._TRANSITION_DESCRIPTIONS[component.transition]) {
              position.desc = DiagramCodes._TRANSITION_DESCRIPTIONS[component.transition] + ' to ' + position.desc;
            }
          }
          //Add lap index and offset
          position.lapIndex = lapIndex;
          position.offset = offset;
          offset += position.duration;
          positions.push(position);
        }
      }
    }

    //Iterate backwards through steps to generate count labels, taking into account combination steps
    countLabel = '';
    countTotal = 0;
    for (positionIndex = positions.length - 1; positionIndex >= 0; positionIndex--) {
      position = positions[positionIndex];
      if (position.beatGrouping === '+') { //Display with plus notation, e.g. 1+1
        countLabel = '+' + position.count + countLabel;
      } else if (position.beatGrouping === '*') { //Display as sum of durations
        countTotal += position.beats;
      } else if (countTotal) {
        position.countLabel = IceDiagram._toMixedNumber(position.beats + countTotal);
        countTotal = 0;
      } else {
        position.countLabel = position.count + countLabel;
        countLabel = '';
      }
    }

    return positions;
  };

  //Convert a positive decimal to mixed-number String
  //Exact for denominators 1, 2, 3, 4, 5, 6, and 8; approximate otherwise
  //Values that round to zero become an empty string
  IceDiagram._toMixedNumber = function(decimal) {
    var nearestInteger = decimal + 0.0625 | 0, //add 1/16 to round 15/16 up to nearest integer vs down to 7/8
        nearestIndex = (decimal * 24 + 22.5) % 24, //shift by -2 = 22 mod 24 for index, add 0.5 to round
        //Closest fractions to n / 24
        //n 2     3     4     5     6   7   8     9     10    11  12  13  14    15    16    17  18  19    20    21    22
        // '\u2152\u215B\u2159\u2155\xBC\xBC\u2153\u215C\u2156\xBD\xBD\xBD\u2157\u215D\u2154\xBE\xBE\u2158\u215A\u215E\u215E'
        nearestFraction = '⅒⅛⅙⅕¼¼⅓⅜⅖½½½⅗⅝⅔¾¾⅘⅚⅞⅞'.charAt(nearestIndex);
    return (nearestInteger || '') + (nearestFraction || '');
  };

  IceDiagram._computeTransformMatrix = function(index, patternsPerLap, mirror, rotate) {
    var rotateOffset = rotate ? Math.PI : 0,
        theta = 2 * Math.PI * index / patternsPerLap + rotateOffset,
        flipX = mirror ? -1 : 1,
        sinTheta = Math.sin(theta),
        cosTheta = Math.cos(theta);
    return [flipX * cosTheta, -sinTheta, flipX * sinTheta, cosTheta];
  };


  IceDiagram._transformCoordinates = function(coordinates, matrix) {
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

  //Calculate value of a cubic for parameter t
  IceDiagram._cubicValueAt = function(c, t) {
    var ti = 1 - t,
        w1 = ti * ti * ti,
        w2 = 3 * ti * ti * t,
        w3 = 3 * ti * t * t,
        w4 = t * t * t,
        x = w1 * c[0] + w2 * c[2] + w3 * c[4] + w4 * c[6],
        y = w1 * c[1] + w2 * c[3] + w3 * c[5] + w4 * c[7];
    return [x, y];
  };
  //Calculate normal vector of a cubic for parameter t
  IceDiagram._cubicNormalAt = function(cubic, t) {
    var dx = IceDiagram._cubicDerivatives(cubic[0], cubic[2], cubic[4], cubic[6], t),
        dy = IceDiagram._cubicDerivatives(cubic[1], cubic[3], cubic[5], cubic[7], t),
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
    };
  };
  //Calculate array of value, first derivative, and second derivative
  IceDiagram._cubicDerivatives = function(p0, p1, p2, p3, t) {
    var ti = 1 - t;
    return [ti * ti * ti * p0 + 3 * ti * ti * t * p1 + 3 * ti * t * t * p2 + t * t * t * p3,
            3 * ti * ti * (p1 - p0) + 6 * ti * t * (p2 - p1) + 3 * t * t * (p3 - p2),
            6 * ti * (p2 - 2 * p1 + p0) + 6 * t * (p3 - 2 * p2 + p1)];
  };

  //Resolve edge parameters in text. All text should use edge parameters where appropriate to support features such as mirroring.
  IceDiagram._resolveParams = function(edgeCode, label) {
    var i, curChar,
        inParam = false,
        result = '',
        edgeParams = DiagramCodes._EDGE_PARAMS[edgeCode];
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

  //Creates a kd search tree of the paths in the list of positions
  //Creates a point per tick including both end points--roughly
  //means that longer steps have more guide points
  IceDiagram._positionTree = function(positions) {
    var posIndex, position, pathIndex, cubic, point, t,
        points = [];
    for (posIndex = 0; posIndex < positions.length; posIndex++) {
      position = positions[posIndex];
      for (pathIndex = 0; pathIndex < position.paths.length; pathIndex++) {
        cubic = position.paths[pathIndex].cubic;
        for (t = 0; t <= position.duration; t++) {
          point = IceDiagram._cubicValueAt(cubic, t / position.duration);
          point.push(posIndex);
          points.push(point);
        }
      }
    }
    IceDiagram._kdTree(points);
    return points;
  };
  //Creates a 2D tree in-place for an array of points
  IceDiagram._kdTree = function(points) {
    IceDiagram._kdTreeHelper(points, 0, points.length, 0);
  };
  //Recursive helper function for segment of points array between start inclusive and end exclusive and diminsion k=0 or k=1
  IceDiagram._kdTreeHelper = function(points, start, end, k) {
    var mid, kNext;
    if (end - start <= 1) {
      return;
    }
    mid = (start + end) >> 1;
    kNext = (k + 1) % 2;
    IceDiagram._kdQuickSelect(points, start, end, mid, k);
    IceDiagram._kdTreeHelper(points, start, mid, kNext);
    IceDiagram._kdTreeHelper(points, mid + 1, end, kNext);
  };
  //In-place quick select for segment of points array between start inclusive and end exclusive and diminsion k=0 or k=1.
  //The point at index n will be in the correct position afterwards
  IceDiagram._kdQuickSelect = function(points, start, end, n, k) {
    var pivot, pivotIndex, i, swap, partition;
    while (end - start > 1) {
      partition = start;
      //Pick random pivot. Remove by replacing with last element. Working array size shrinks by 1.
      pivotIndex = Math.floor(Math.random() * (end - start) + start);
      pivot = points[pivotIndex];
      points[pivotIndex] = points[end - 1];
      for (i = start; i < end - 1; i++) {
        //Swap lesser elements towards front
        if (points[i][k] < pivot[k]) {
          swap = points[i];
          points[i] = points[partition];
          points[partition] = swap;
          partition++;
        }
      }
      //Restore pivot. Working array size grows by 1 back to original size.
      points[end - 1] = points[partition];
      points[partition] = pivot;
      //Continue on with approriate half
      if (partition < n) {
        start = partition + 1;
      } else if (partition > n) {
        end = partition;
      } else {
        break;
      }
    }
  };

  //Find the nearest neighbor to a point given a kd search tree and a maximum allowed distance
  //Returns index into search tree of nearest point or -1 if no point within max distance
  IceDiagram._nearestNeighbor = function(point, kdTree, maxDist) {
    return IceDiagram._nearestNeighborHelper(point, kdTree, 0, kdTree.length, 0, {index: -1, score: maxDist * maxDist}).index;
  };
  //Recursive helper function
  IceDiagram._nearestNeighborHelper = function(point, kdTree, start, end, k, best) {
    var childMatchStart, childMatchEnd, childOtherStart, childOtherEnd, mid, kNext, kDist, kNextDist, dist2;
    //Base case
    if (start >= end) {
      return best;
    }
    mid = (start + end) >> 1;
    kNext = (k + 1) % 2;
    kDist = point[k] - kdTree[mid][k];
    kNextDist = point[kNext] - kdTree[mid][kNext];
    dist2 = kDist * kDist + kNextDist * kNextDist;
    //Check current node
    if (dist2 < best.score) {
      best = {index: mid, score: dist2};
    }
    //Find the child tree containing the candidate point and the one not containing the point
    if (kDist < 0) {
      childMatchStart = start;
      childMatchEnd = mid;
      childOtherStart = mid + 1;
      childOtherEnd = end;
    } else {
      childOtherStart = start;
      childOtherEnd = mid;
      childMatchStart = mid + 1;
      childMatchEnd = end;
    }
    //Recursively check matching side
    best = IceDiagram._nearestNeighborHelper(point, kdTree, childMatchStart, childMatchEnd, kNext, best);
    //Recursively check other side only if point is near the pivot, otherwise branch can be pruned
    if (kDist * kDist < best.score) {
      best = IceDiagram._nearestNeighborHelper(point, kdTree, childOtherStart, childOtherEnd, kNext, best);
    }
    return best;
  };

  //Trim the 0-origin center to fit content in container
  IceDiagram._trimCenter = function(center, content, container) {
    var bound = (container - content) / 2;
    if (bound > 0) {
      return 0;
    }
    if (center < bound) {
      return bound;
    }
    if (center > -bound) {
      return -bound;
    }
    return center;
  };

  //Get zoom scale factor, stretching above 1 if possible
  IceDiagram._getDefaultZoom = function(width, height) {
    var isHeightLimited = width * IceDiagram._BASE_HEIGHT > height * IceDiagram._BASE_WIDTH;
    return Math.max(isHeightLimited ? height / IceDiagram._BASE_HEIGHT : width / IceDiagram._BASE_WIDTH, 1);
  };

  //Return UMD factory result
  return IceDiagram;
}));