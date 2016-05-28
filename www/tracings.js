//Requires IE9 or later - uses HTML5 and ECMAScript5
'use strict';

$(document).ready(function() {
  $('#danceSelect').selectmenu({position: {collision: 'flip'}});
  $('.button-set').buttonset();
  $('#speedSlider').slider({min: 20, max: 100, step: 5, value: 100});
  $('#diagramContainer').diagram();
  $(document).tooltip();
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
      controls.mirror = elem.find('#mirror');
      controls.beginning = elem.find('#beginningButton');
      controls.previous = elem.find('#previousButton');
      controls.next = elem.find('#nextButton');
      controls.startPause = elem.find('#startPauseButton');
      controls.startPauseIcon = controls.startPause.find('.mdi');
      controls.speed = elem.find('#speedSlider');
      controls.speedValue = elem.find('#speedValue');
      controls.step = elem.find('#stepButton');
      controls.number = elem.find('#numberButton');
      controls.count = elem.find('#countButton');
      controls.hold = elem.find('#holdButton');

      controls.controlContainer = elem.find('#controls');


      //bind events
      controls.dance.on('selectmenuchange', this._loadDance.bind(this));
      controls.partLady.click(this._updatePart.bind(this, 'lady'));
      controls.partMan.click(this._updatePart.bind(this, 'man'));
      controls.optional.click(this._loadPattern.bind(this));
      controls.mirror.click(this._loadPattern.bind(this));
      controls.beginning.click(this.beginning.bind(this));
      controls.previous.click(this.previous.bind(this));
      controls.next.click(this.next.bind(this));
      controls.startPause.click(this.toggleStartPause.bind(this));
      controls.speed.on('slidechange', this._updateSpeed.bind(this));
      controls.step.click(this._drawPattern.bind(this));
      controls.number.click(this._drawPattern.bind(this));
      controls.count.click(this._drawPattern.bind(this));
      controls.hold.click(this._drawPattern.bind(this));

      $(this.canvas).click(this._onClick.bind(this));
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
      console.log(data);
      widget.dance = data;
      widget._loadPattern();
    });
  },

  _loadPattern: function() {
    var lapIndex, componentIndex, pathIndex, transformMatrix, component, paths, offset,
        components = [],
        pattern = this.dance.patterns[this.part],
        optionalFlag = this.controls.optional.is(':checked') ? 'yes' : 'no',
        mirrorFlag = this.controls.mirror.is(':checked');
    console.log('loading pattern ' + this.dance.name + ' part: ' + this.part + ' optional: ' + optionalFlag + ' mirrored: ' + mirrorFlag);
    this.patternPositions = DiagramUtils.generatePositions(this.dance, this.part, optionalFlag, mirrorFlag, this.scaleFactor);
    this.positionTree = DiagramUtils.positionTree(this.patternPositions);
    this._updatePlaybackSpeedLabel();
    this.beginning();
  },

  _drawPattern: function() {
    var pattern, component, path, positionIndex, pathIndex, position, labelList, labelText,
        showStep = this.controls.step.is(':checked'),
        showNumber = this.controls.number.is(':checked'),
        showCount = this.controls.count.is(':checked'),
        showHold = this.controls.hold.is(':checked'),
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
          ctx.fillStyle = 'rgb(0,0,255)';
          DiagramUtils.drawTextOnPath(ctx, labelText, position.paths[0], 10);
        }
        //Draw hold and count
        labelList = [];
        if (showHold && position.hold) {
          labelList.push(position.hold);
        }
        if (showCount && position.beats) {
          labelList.push(position.beats);
        }
        labelText = labelList.join(' ');
        if (labelText) {
          ctx.fillStyle = 'rgb(255,0,0)';
          DiagramUtils.drawTextOnPath(ctx, labelText, position.paths[position.paths.length - 1], -10);
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

  _movePosition: function(index) {
    this._pause();
    this.position = index;
    this.stepTickCount = 0;
    this._drawPattern();
  },

  _start: function() {
    console.log('start');
    this.playing = true;
    this.timer = setInterval(this._tick.bind(this), this._playbackInterval());
    this.controls.startPauseIcon.removeClass('mdi-play').addClass('mdi-pause');
  },

  _pause: function() {
    console.log('pause');
    clearInterval(this.timer);
    this.controls.startPauseIcon.removeClass('mdi-pause').addClass('mdi-play');
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
  },

  _onClick: function(e) {
    var x = e.offsetX - this.centerX,
        y = e.offsetY - this.centerY,
        point = DiagramUtils.nearestNeighbor([x, y], this.positionTree),
        ctx = this.canvasContext;
    this._movePosition(point[2]);
    ctx.save();
    ctx.translate(this.centerX, this.centerY);
    ctx.fillStyle = 'rgb(0, 255, 255)';
    for (var i = 0; i < this.positionTree.length; i++) {
      ctx.fillRect(this.positionTree[i][0]-1, this.positionTree[i][1]-1, 3, 3);
    }
    ctx.fillStyle = 'rgb(255, 0, 255)';

    ctx.fillRect(x-2, y-2, 5, 5);
    ctx.fillRect(point[0]-2, point[1]-2, 5, 5);
    ctx.restore();
  }
});

var DiagramUtils = function() {};

DiagramUtils.computeTransformMatrix = function(index, patternsPerLap, scaleFactor, mirror) {
  var theta = 2 * Math.PI * index / patternsPerLap,
      flipX = mirror ? -1 : 1,
      sinTheta = Math.sin(theta) * scaleFactor,
      cosTheta = Math.cos(theta) * scaleFactor;
  return [flipX * cosTheta, -sinTheta, flipX * sinTheta, cosTheta];
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
  #m  mirrored edge (LFO, Left Forward Outside)
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
    result.m = $.grep([result.r, result.d, result.q], Boolean).join('');
    result.M = $.grep([result.R, result.D, result.Q], Boolean).join(' ');
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

DiagramUtils.generatePositions = function(dance, part, optional, mirror, scaleFactor) {
  var lapIndex, componentIndex, pathIndex, transformMatrix, component, offset, position, cubic, path,
      positions = [],
      pattern = dance.patterns[part];

  offset = 0;
  for (lapIndex = 0; lapIndex < dance.patternsPerLap; lapIndex++) {
    transformMatrix = DiagramUtils.computeTransformMatrix(lapIndex, dance.patternsPerLap, scaleFactor, mirror);
    for (componentIndex = pattern.startComponent; componentIndex < pattern.endComponent; componentIndex++) {
      component = dance.components[componentIndex % dance.components.length];
      if (!component.optional || component.optional === optional) {
        //Copy component
        position = $.extend({}, component);
        //Generate paths
        position.paths = [];
        for (pathIndex = 0; pathIndex < component.paths.length; pathIndex++) {
          cubic = DiagramUtils.transformCoordinates(component.paths[pathIndex], transformMatrix);
          path = DiagramUtils.cubicNormalAt(cubic, 0.5);
          path.start = cubic.slice(0, 2);
          path.bezier = cubic.slice(2, 8);
          path.cubic = cubic;
          position.paths.push(path);
        }
        //Check mirroring
        position.edge = mirror ? DiagramUtils.edgeParams(component.edge).m : component.edge;
        //Generate text
        position.label = DiagramUtils.resolveParams(position.edge, dance.steps[component.step].label);
        position.desc = DiagramUtils.resolveParams(position.edge, dance.steps[component.step].desc);
        //Add lap index and offset
        position.lapIndex = lapIndex;
        position.offset = offset;
        offset += component.duration;
        positions.push(position);
      }
    }
  }
  return positions;
};

DiagramUtils.nearestNeighbor = function(point, kdTree) {
  console.log('---');
  var best = DiagramUtils.nearestNeighbor.helper(point, kdTree, 0, kdTree.length, 0, {index: -1, score: Infinity});
  if (best.index === -1) {
    return [0, 0, 0];
  }
  return kdTree[best.index];
};
DiagramUtils.nearestNeighbor.helper = function(point, kdTree, start, end, k, best) {
  var child,
      mid = (start + end) >> 1,
      midValue = kdTree[mid],
      dist = Math.sqrt(Math.pow(point[0] - midValue[0], 2) + Math.pow(point[1] - midValue[1], 2)),
      kNext = (k + 1) % 2,
      matchLeft = point[k] < midValue[k];
  console.log('Checking subtree ' + start + ' to ' + end);
  console.log(point);
  console.log(midValue);
  //Check current node
  if (dist < best.score) {
    best = {index: mid, score: dist};
  }
  //Base case
  if (start === mid) {
    return best;
  }
  //Check matching side recursively
  if (matchLeft) {
    child = DiagramUtils.nearestNeighbor.helper(point, kdTree, start, mid, kNext, best);
  } else {
    child = DiagramUtils.nearestNeighbor.helper(point, kdTree, mid + 1, end, kNext, best);
  }
  if (child.score < best.score) {
    best = child;
  }
  //If not close to boundary, return
  if (matchLeft && point[k] + best.score < midValue[k] || !matchLeft && point[k] - best.score > midValue[k]) {
    return best;
  }
  //Check other side
  if (matchLeft) {
    child = DiagramUtils.nearestNeighbor.helper(point, kdTree, mid + 1, end, kNext, best);
  } else {
    child = DiagramUtils.nearestNeighbor.helper(point, kdTree, start, mid, kNext, best);
  }
  if (child.score < best.score) {
    best = child;
  }
  return best;
};

DiagramUtils.positionTree = function(positions) {
  var posIndex, paths, pathIndex,
      points = [];
  for (posIndex = 0; posIndex < positions.length; posIndex++) {
    paths = positions[posIndex].paths;
    for (pathIndex = 0; pathIndex < paths.length; pathIndex++) {
      var i, x, y,
          c = paths[pathIndex].cubic,
          cf = DiagramUtils.positionTree.cubicCoeffs;
      for (i = 0; i < cf.length; i = i + 4) {
        x = c[0] * cf[i] + c[2] * cf[i+1] + c[4] * cf[i+2] + c[6] * cf[i+3];
        y = c[1] * cf[i] + c[3] * cf[i+1] + c[5] * cf[i+2] + c[7] * cf[i+3];
        points.push([x, y, posIndex]);
      }
    }
  }
  DiagramUtils.kdTree(points);
  return points;
};
DiagramUtils.positionTree.cubicCoeffs = function() {
  var i, t, ti,
      coeffs = [];
  for (i = 0; i <= 8; i++) {
    t = i / 8;
    ti = 1 - t;
    coeffs.push(ti * ti * ti);
    coeffs.push(3 * ti * ti * t);
    coeffs.push(3 * ti * t * t);
    coeffs.push(t * t * t);
  }
  return coeffs;
}();

DiagramUtils.kdTree = function(points) {
  DiagramUtils.kdTree.helper(points, 0, points.length, 0);
  console.log(JSON.stringify(points));
};
DiagramUtils.kdTree.helper = function(points, start, end, k) {
  var mid, kNext;
  if (end - start <= 1) {
    return;
  }
  mid = (start + end) >> 1;
  kNext = (k + 1) % 2;
  DiagramUtils.kdTree.quickSelect(points, start, end, mid, k);
  DiagramUtils.kdTree.helper(points, start, mid, kNext);
  DiagramUtils.kdTree.helper(points, mid + 1, end, kNext);
};
DiagramUtils.kdTree.quickSelect = function(points, start, end, n, k) {
  var pivot, pivotIndex, i, swap,
      size = end - start,
      last = end - 1,
      partition = start;
  //Base case
  if (size <= 1) {
    return;
  }
  //Pick random pivot. Remove by replacing with last element. Effective array size shrinks by 1.
  pivotIndex = Math.floor(Math.random() * size + start);
  pivot = points[pivotIndex];
  points[pivotIndex] = points[last];
  for (i = start; i < last; i++) {
    //Swap lesser elements towards front
    if (points[i][k] < pivot[k]) {
      swap = points[i]
      points[i] = points[partition]
      points[partition] = swap
      partition++;
    }
  }
  //Restore pivot. Effective array size grows by 1 back to original size.
  points[last] = points[partition]
  points[partition] = pivot;
  //Recursive call on appropriate half if necessary
  if (partition < n) {
    DiagramUtils.kdTree.quickSelect(points, partition + 1, end, n, k);
  } else if (partition > n) {
    DiagramUtils.kdTree.quickSelect(points, start, partition, n, k);
  }
};

//TODO unit tests
var quickSelectTest = function() {
  var trial, i, pts,
      points = [9, 0, 1, 8, 5, 6, 7, 2, 4, 3];
  for (trial = 0; trial < 25; trial++) {
    for (i = 0; i < 10; i++) {
      pts = points.slice();
      quickSelect(pts, 0, pts.length, i, 0);
      console.log(pts[i] === i);
    }
  }
};