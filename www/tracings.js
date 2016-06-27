'use strict';
//Version 0.1-RC3 | Load widgets and bind events | Software (c) Shawn Pan | Target IE9+

//Create jQuery UI widgets and diagram
$(document).ready(function() {
  var canvasEl = document.getElementById('diagram'),
      controlsEl = document.getElementById('controls'),
      $select = $('#danceSelect').selectmenu({position: {collision: 'flip'}}),
      diagram = new IceDiagram(canvasEl),
      runAndAddListener,
      createIconButton, copyDanceUrlToSelect, copyDanceSelectToUrl, resizeCanvas;


  runAndAddListener = function(elem, event, handler) {
    handler();
    elem.addEventListener(event, handler);
  };

  copyDanceUrlToSelect = function() {
    if (window.location.hash) {
      $select.val(window.location.hash.substr(1));
      $select.selectmenu('refresh');
      diagram.controlEvent('dance', $select.val());
    }
  };

  //Select dance from URL before creating widget and loading diagram
  //TODO handle invalid values
  copyDanceUrlToSelect();

  copyDanceSelectToUrl = function() {
    var dance = $select.val();
    if (window.history.pushState) {
      window.history.pushState(null, null, '#' + dance);
    } else {
      window.location.hash = '#' + dance;
    }
    diagram.controlEvent('dance', dance);
  }
  //Copy default dance to URL if none specified initally
  if (!window.location.hash) {
    copyDanceSelectToUrl();
  }

  //Bind control events
  $select.on('selectmenuchange', copyDanceSelectToUrl);
  window.addEventListener('popstate', copyDanceUrlToSelect);

  resizeCanvas = function() {
    var width, height,
        availableWidth = Math.max(window.innerWidth - 16, 0),
        availableHeight = Math.max(window.innerHeight - 108, 0),
        aspectRatio = availableWidth / availableHeight;
    if (aspectRatio > 1.8) {
      //height limited
      height = availableHeight;
      width = 1.8 * height;
    } else {
      //width limited
      width = availableWidth;
      height = width / 1.8;
    }
    if (width < 800) {
      width = 800;
      height = 800 / 1.8;
    }

    canvasEl.width = width;
    canvasEl.height = height;
    controlsEl.setAttribute('style', 'width:' + width + 'px;');
    diagram.controlEvent('resize');
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  canvasEl.addEventListener('click', function(e) {
    //Note: calcuating offsets from page, because Firefox does not have offsetX/offsetY in click events
    var bounds = this.getBoundingClientRect(),
        x = e.pageX - bounds.left - document.body.scrollLeft,
        y = e.pageY - bounds.top - document.body.scrollTop;
    diagram.controlEvent('click', [x, y]);
  });

  createIconButton = function(property, states) {
    var stateIndex = 0,
        elem = document.getElementById(property + 'Button');
    //Initialize state
    elem.className = (states[0].active ? 'active' : 'inactive') + ' mdi mdi-' + states[0].icon;
    diagram.controlEvent(property, states[0].value || states[0].active);
    //Bind click event
    elem.addEventListener('click', function() {
      stateIndex = (stateIndex + 1) % states.length;
      elem.className = (states[stateIndex].active ? 'active' : 'inactive') + ' mdi mdi-' + states[stateIndex].icon;
      diagram.controlEvent(property, states[stateIndex].value || states[stateIndex].active);
    });
  };

  createIconButton('part', [{active: false, value: 'lady', icon: 'human-female'}, {active: false, value: 'man', icon: 'human-male'}]);
  createIconButton('optional', [{active: true, value: 'yes', icon: 'stairs'}, {active: false, value: 'no', icon: 'stairs'}]);
  createIconButton('mirror', [{active: false, icon: 'swap-horizontal'}, {active: true, icon: 'swap-horizontal'}]);
  createIconButton('rotate', [{active: false, icon: 'rotate-left'}, {active: true, icon: 'rotate-left'}]);

  createIconButton('speed', [{active: false, value: 100, icon: 'clock-fast'}, {active: true, value: 75, icon: 'clock-fast'}, {active: true, value: 50, icon: 'clock-fast'}]);
  createIconButton('beginning', [{active: false, icon: 'page-first'}]);
  createIconButton('startPause', [{active: false, icon: 'play-pause'}]);
  createIconButton('previous', [{active: false, icon: 'chevron-left'}]);
  createIconButton('next', [{active: false, icon: 'chevron-right'}]);

  createIconButton('step', [{active: true, icon: 'format-list-bulleted'}, {active: false, icon: 'format-list-bulleted'}]);
  createIconButton('number', [{active: false, icon: 'format-list-numbers'}, {active: true, icon: 'format-list-numbers'}]);
  createIconButton('count', [{active: true, icon: 'clock'}, {active: false, icon: 'clock'}]);
  createIconButton('hold', [{active: false, icon: 'human-male-female'}, {active: true, icon: 'human-male-female'}]);

  diagram.activate();
});