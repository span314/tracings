'use strict';
/*!
Load widgets and bind events v0.1-RC6 | Software Copyright (c) Shawn Pan
*/
document.addEventListener('DOMContentLoaded', function() {
  var canvasEl = document.getElementById('diagram'),
      controlsEl = document.getElementById('controls'),
      danceSelectEl = document.getElementById('danceSelect'),
      errorBarEl = document.getElementById('errorBar'),
      compatiblityErrors = [],
      diagram, createStateButton, createToggleButton;

  //Check compatibility
  canvasEl.getContext || compatiblityErrors.push('canvas'); //http://caniuse.com/#feat=canvas
  canvasEl.dataset || compatiblityErrors.push('dataset'); //http://caniuse.com/#feat=dataset
  window.requestAnimationFrame || compatiblityErrors.push('requestAnimationFrame'); //http://caniuse.com/#feat=requestanimationframe
  window.history || compatiblityErrors.push('history'); //http://caniuse.com/#feat=history

  //Partial compatibility
  //window.performance.now || compatiblityErrors.push('high resolution time'); //http://caniuse.com/#feat=high-resolution-time
  //window.AudioContext || compatiblityErrors.push('audio api'); //http://caniuse.com/#feat=audio-api

  if (compatiblityErrors.length) {
    errorBarEl.innerHTML += " Your browser does not support the following HTML5 features: " + compatiblityErrors.join(", ");
    return;
  } else {
    errorBarEl.className = 'hidden';
  }

  //Initialize select and url hash to match
  if (window.location.hash) {
    //Try dance from URL first
    danceSelectEl.value = window.location.hash.substr(1);
  } else {
    //Otherwise push default to URL
    window.history.pushState(null, null, '#' + danceSelectEl.value);
  }

  //Initialize window size
  canvasEl.width = controlsEl.getBoundingClientRect().width;
  canvasEl.height = canvasEl.width < 480 ? window.innerHeight - 88 : window.innerHeight - 48;

  //Initialize diagram
  diagram = new IceDiagram(canvasEl, {
    step: true,
    number: false,
    count: true,
    hold: false,
    optional: true,
    mirror: false,
    rotate: false,
    part: 'lady',
    speed: 1,
    sound: true,
    dance: danceSelectEl.value
  });

  //Bind events
  danceSelectEl.addEventListener('change', function() {
    var danceHash = '#' + danceSelectEl.value;
    diagram.controlEvent('dance', danceSelectEl.value);
    if (window.location.hash !== danceHash) {
      window.history.pushState(null, null, danceHash);
    }
  });

  window.addEventListener('popstate', function() {
    if (window.location.hash) {
      danceSelectEl.value = window.location.hash.substr(1);
      diagram.controlEvent('dance', danceSelectEl.value);
    }
  });

  window.addEventListener('resize', function() {
    //Match the width of canvas with that of the controls div (width:auto)
    canvasEl.width = controlsEl.getBoundingClientRect().width;
    //Show one or two lines of control buttons depending on window size
    canvasEl.height = canvasEl.width < 480 ? window.innerHeight - 88 : window.innerHeight - 48;
    diagram.controlEvent('resize');
  });

  canvasEl.addEventListener('click', function(e) {
    //Note: calcuating offsets from page, because Firefox does not have offsetX/offsetY in click events
    var bounds = this.getBoundingClientRect(),
        x = e.pageX - bounds.left - document.body.scrollLeft,
        y = e.pageY - bounds.top - document.body.scrollTop;
    diagram.controlEvent('click', [x, y]);
  });

  //Bind navigation control buttons
  document.getElementById('beginningButton').addEventListener('click', function() {
    diagram.beginning();
  });

  document.getElementById('startPauseButton').addEventListener('click', function() {
    diagram.startPause();
  });

  document.getElementById('previousButton').addEventListener('click', function() {
    diagram.previous();
  });

  document.getElementById('nextButton').addEventListener('click', function() {
    diagram.next();
  });

  //Bind option buttons
  createToggleButton = function(command) {
    var elem = document.getElementById(command + 'Button');
    elem.addEventListener('click', function() {
      var newState = elem.dataset.active !== 'true';
      elem.dataset.active = newState;
      diagram.controlEvent(command, newState);
    });
  };

  createToggleButton('optional');
  createToggleButton('mirror');
  createToggleButton('rotate');

  createToggleButton('step');
  createToggleButton('number');
  createToggleButton('count');
  createToggleButton('hold');

  createStateButton = function(property, states) {
    var stateIndex = 0,
        elem = document.getElementById(property + 'Button');
    elem.addEventListener('click', function() {
      var state;
      stateIndex = (stateIndex + 1) % states.length;
      state = states[stateIndex];
      elem.dataset.active = state.active;
      elem.className = state.icon;
      diagram.controlEvent(property, state.value);
    });
  };

  createStateButton('part', [{active: false, value: 'lady', icon: 'female'}, {active: false, value: 'man', icon: 'male'}]);
  createStateButton('speed', [{active: false, value: 1, icon: 'speed100'}, {active: true, value: 0.75, icon: 'speed75'}, {active: true, value: 0.50, icon: 'speed50'}]);
});