'use strict';
//Version 0.1-RC3 | Icon Button Widget | Software (c) Shawn Pan | Target IE9+


var initializeIconButton = function(elemId, states, clickHandler) {
  var stateIndex = 0,
      elem = document.getElementById(elemId),
      icon = document.createElement('i');
  elem.appendChild(icon);
  //Initialize state
  elem.className = states[0].cssClass;
  icon.className = 'mdi mdi-' + states[0].icon;
  //Bind click event
  elem.addEventListener('click', function() {
    stateIndex = (stateIndex + 1) % states.length;
    elem.className = states[stateIndex].cssClass;
    icon.className = 'mdi mdi-' + states[stateIndex].icon;
    clickHandler();
  });
};