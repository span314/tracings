'use strict';
//Version 0.1-RC3 | Load widgets and bind events | Software (c) Shawn Pan | Target IE9+

//Create jQuery UI widgets and diagram
$(document).ready(function() {
  var copyDanceUrlToSelect, copyDanceSelectToUrl, diagramControls, diagram;
  $('#danceSelect').selectmenu({position: {collision: 'flip'}});

  copyDanceUrlToSelect = function() {
    if (window.location.hash) {
      $('#danceSelect').val(window.location.hash.substr(1));
      $('#danceSelect').selectmenu('refresh');
    }
  };
  //Select dance from URL before creating widget and loading diagram
  //TODO handle invalid values
  copyDanceUrlToSelect();

  diagramControls = {
    _optionalButton: document.getElementById('optionalButton'),
    _mirrorButton: document.getElementById('mirrorButton'),
    _rotateButton: document.getElementById('rotateButton'),
    _partButton: document.getElementById('partButton'),
    _stepButton: document.getElementById('stepButton'),
    _numberButton: document.getElementById('numberButton'),
    _countButton: document.getElementById('countButton'),
    _holdButton: document.getElementById('holdButton'),
    _speedButton: document.getElementById('speedButton'),
    _controlContainer: document.getElementById('controls'),
    _$danceSelect: $('#danceSelect'),

    optional: function() {
      return this._optionalButton.value === 'true';
    },

    mirror: function() {
      return this._mirrorButton.value === 'true';
    },

    rotate: function() {
      return this._rotateButton.value === 'true';
    },

    part: function() {
      return this._partButton.value;
    },

    step: function() {
      return this._stepButton.value === 'true';
    },

    number: function() {
      return this._numberButton.value === 'true';
    },

    count: function() {
      return this._countButton.value === 'true';
    },

    hold: function() {
      return this._holdButton.value === 'true';
    },

    dance: function() {
      return this._$danceSelect.val();
    },

    start: function() {
      $('#startPauseButton').find('.mdi').removeClass('mdi-play').addClass('mdi-pause');
    },

    pause: function() {
      $('#startPauseButton').find('.mdi').removeClass('mdi-pause').addClass('mdi-play');
    },

    resize: function(width) {
      this._controlContainer.width = width;
    },

    speed: function() {
      return parseInt(this._speedButton.value);
    }
  };
  diagram = new IceDiagram(document.getElementById('diagram'), diagramControls);

  copyDanceSelectToUrl = function() {
    var danceHash = '#' + $('#danceSelect').val();
    if (window.history.pushState) {
      window.history.pushState(null, null, danceHash);
    } else {
      window.location.hash = danceHash;
    }
  }
  //Copy default dance to URL if none specified initally
  if (!window.location.hash) {
    copyDanceSelectToUrl();
  }

  //Bind control events
  $('#danceSelect').on('selectmenuchange', function() {
    copyDanceSelectToUrl();
    diagram.loadDance();
  });
  $(window).on('popstate', function() {
    copyDanceUrlToSelect();
    diagram.loadDance();
  });
  $('#diagram').click(diagram.click.bind(diagram));
  $(window).resize(diagram.onCanvasResize.bind(diagram));

  initializeIconButton('partButton',
    [{active: false, value: 'lady', icon: 'human-female'}, {active: false, value: 'man', icon: 'human-male'}],
    diagram.loadPattern.bind(diagram));
  initializeIconButton('optionalButton',
    [{active: true, icon: 'stairs'}, {active: false, icon: 'stairs'}],
    diagram.loadPattern.bind(diagram));
  initializeIconButton('mirrorButton',
    [{active: false, icon: 'swap-horizontal'}, {active: true, icon: 'swap-horizontal'}],
    diagram.loadPattern.bind(diagram));
  initializeIconButton('rotateButton',
    [{active: false, icon: 'rotate-left'}, {active: true, icon: 'rotate-left'}],
    diagram.loadPattern.bind(diagram));

  initializeIconButton('speedButton',
    [{active: false, value: '100', icon: 'clock-fast'}, {active: true, value: '75', icon: 'clock-fast'}, {active: true, value: '50', icon: 'clock-fast'}],
    diagram.adjustSpeed.bind(diagram));
  initializeIconButton('beginningButton',
    [{active: false, icon: 'page-first'}],
    diagram.beginning.bind(diagram));
  initializeIconButton('startPauseButton',
    [{active: false, value: 'paused', icon: 'play'}, {active: false, value: 'playing', icon: 'pause'}],
    diagram.toggleStartPause.bind(diagram));
  initializeIconButton('previousButton',
    [{active: false, icon: 'chevron-left'}],
    diagram.previous.bind(diagram));
  initializeIconButton('nextButton',
    [{active: false, icon: 'chevron-right'}],
    diagram.next.bind(diagram));

  initializeIconButton('stepButton',
    [{active: true, icon: 'format-list-bulleted'}, {active: false, icon: 'format-list-bulleted'}],
    diagram.drawPattern.bind(diagram));
  initializeIconButton('numberButton',
    [{active: false, icon: 'format-list-numbers'}, {active: true, icon: 'format-list-numbers'}],
    diagram.drawPattern.bind(diagram));
  initializeIconButton('countButton',
    [{active: true, icon: 'clock'}, {active: false, icon: 'clock'}],
    diagram.drawPattern.bind(diagram));
  initializeIconButton('holdButton',
    [{active: false, icon: 'human-male-female'}, {active: true, icon: 'human-male-female'}],
    diagram.drawPattern.bind(diagram));
});