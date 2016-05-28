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