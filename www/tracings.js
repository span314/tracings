'use strict';
//Version 0.1-RC3 | Software (c) Shawn Pan
//Note: uses HTML5 and ECMAScript5 features requiring IE9 or later

//Create jQuery UI widgets and diagram
$(document).ready(function() {
  var copyDanceUrlToSelect, copyDanceSelectToUrl, diagramControls, diagram;
  $('#danceSelect').selectmenu({position: {collision: 'flip'}});
  $('.button-set').buttonset();
  $('#controls').tooltip();

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
    _playbackSpeedPercentage: 100,

    //'optional', 'mirror', 'rotate', 'partLady', 'partMan', 'step', 'number', 'count', 'hold'
    flag: function(flag) {
      return document.getElementById(flag + 'Button').checked;
    },

    dance: function() {
      return $('#danceSelect').val();
    },

    start: function() {
      $('#startPauseButton').find('.mdi').removeClass('mdi-play').addClass('mdi-pause');
    },

    pause: function() {
      $('#startPauseButton').find('.mdi').removeClass('mdi-pause').addClass('mdi-play');
    },

    resize: function(width) {
      $('#controls').width(width);
    },

    speed: function() {
      //Cycle speeds in 25% increments with a minimum of 50% and update button ui
      this._playbackSpeedPercentage -= 25;
      if (this._playbackSpeedPercentage < 50) {
        this._playbackSpeedPercentage = 100;
        $('#speedButton').removeClass('speed-state-active');
      } else {
        $('#speedButton').addClass('speed-state-active');
      }
      return this._playbackSpeedPercentage;
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
  $('.require-reload').find('input').click(diagram.loadPattern.bind(diagram));
  $('.require-redraw').find('input').click(diagram.drawPattern.bind(diagram));
  $('#speedButton').click(diagram.adjustSpeed.bind(diagram));
  $('#beginningButton').click(diagram.beginning.bind(diagram));
  $('#previousButton').click(diagram.previous.bind(diagram));
  $('#nextButton').click(diagram.next.bind(diagram));
  $('#startPauseButton').click(diagram.toggleStartPause.bind(diagram));
  $('#diagram').click(diagram.click.bind(diagram));
  $(window).resize(diagram.onCanvasResize.bind(diagram));
});