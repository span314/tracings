'use strict';
/*!
Load widgets and bind events v0.1-RC6 | Software Copyright (c) Shawn Pan
*/
document.addEventListener('DOMContentLoaded', function() {
  var canvasEl = document.getElementById('diagram'),
      controlsEl = document.getElementById('controls'),
      danceSelectEl = document.getElementById('danceSelect'),
      diagram, createIconButton, createToggleButton;

  //Initialize select and url hash to match
  if (window.location.hash) { //Try dance from URL first
    danceSelectEl.value = window.location.hash.substr(1);
  } else if (window.history.pushState) { //Otherwise push default to URL
    window.history.pushState(null, null, '#' + danceSelectEl.value);
  } else { //IE support
    window.location.hash = '#' + danceSelectEl.value;
  }

  //Initial window size
  canvasEl.width = controlsEl.getBoundingClientRect().width;
  canvasEl.height = canvasEl.width < 480 ? window.innerHeight - 88 : window.innerHeight - 48;

  diagram = new IceDiagram(canvasEl, {
    step: true,
    number: false,
    count: true,
    hold: false,
    optional: true,
    mirror: false,
    rotate: false,
    part: 'lady',
    speed: 100,
    dance: danceSelectEl.value
  });

  danceSelectEl.addEventListener('change', function() {
    var danceHash = '#' + danceSelectEl.value;
    diagram.controlEvent('dance', danceSelectEl.value);
    if (window.location.hash !== danceHash) {
      if (window.history.pushState) {
        window.history.pushState(null, null, danceHash);
      } else { //IE support
        window.location.hash = danceHash;
      }
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

  createToggleButton = function(command) {
    var elem = document.getElementById(command + 'Button');
    elem.addEventListener('click', function() {
      var newState = (elem.getAttribute('data-active') !== 'true');
      elem.setAttribute('data-active', newState);
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

  createIconButton = function(property, states) {
    var stateIndex = 0,
        elem = document.getElementById(property + 'Button');
    elem.addEventListener('click', function() {
      var state;
      stateIndex = (stateIndex + 1) % states.length;
      state = states[stateIndex];
      elem.setAttribute('data-active', state.active);
      elem.className = state.icon;
      diagram.controlEvent(property, state.value);
    });
  };

  createIconButton('part', [{active: false, value: 'lady', icon: 'female'}, {active: false, value: 'man', icon: 'male'}]);
  createIconButton('speed', [{active: false, value: 100, icon: 'clock-fast'}, {active: true, value: 75, icon: 'clock-fast'}, {active: true, value: 50, icon: 'clock-fast'}]);

});