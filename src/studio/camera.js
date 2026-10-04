(function (C) {
  'use strict';
  function multiply(a, b) { var out = new Float32Array(16); for (var col = 0; col < 4; col++) for (var row = 0; row < 4; row++) for (var k = 0; k < 4; k++) out[col * 4 + row] += a[k * 4 + row] * b[col * 4 + k]; return out; }
  function unit(v) { var length = Math.hypot.apply(Math, v) || 1; return v.map(function (x) { return x / length; }); }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function view(eye, target) { var z = unit(eye.map(function (x, i) { return x - target[i]; })), x = unit(cross([0, 1, 0], z)), y = cross(z, x); return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -x.reduce(function (s, n, i) { return s + n * eye[i]; }, 0), -y.reduce(function (s, n, i) { return s + n * eye[i]; }, 0), -z.reduce(function (s, n, i) { return s + n * eye[i]; }, 0), 1]); }
  function projection(fov, aspect) { var f = 1 / Math.tan(fov * Math.PI / 360), near = 0.05, far = 60; return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) / (near - far), -1, 0, 0, 2 * far * near / (near - far), 0]); }
  C.studioCamera = {
    multiply: multiply,
    matrices: function (camera, aspect, card) { var eye = [Math.sin(camera.yaw) * Math.cos(camera.pitch), Math.sin(camera.pitch), Math.cos(camera.yaw) * Math.cos(camera.pitch)].map(function (x, i) { return x * camera.distance + camera.target[i]; }); var rx = card.tilt[0] * Math.PI / 180, ry = card.tilt[1] * Math.PI / 180 + (card.side === 'back' ? Math.PI : 0); var cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry); var model = new Float32Array([cy, sx * sy, -cx * sy, 0, 0, cx, sx, 0, sy, -sx * cy, cx * cy, 0, 0, 0, 0, 1]); return { eye: eye, model: model, vp: multiply(projection(camera.fov, aspect), view(eye, camera.target)) }; },
    orbit: function (camera, dx, dy) { camera.yaw -= dx * 0.008; camera.pitch = Math.max(-1.35, Math.min(1.35, camera.pitch + dy * 0.008)); },
    dolly: function (camera, delta) { camera.distance = Math.max(1.3, Math.min(9, camera.distance * Math.exp(delta * 0.001))); },
    frame: function (scene) { scene.camera = C.studioScenes.defaults().camera; }
  };
})(window.Cardable);
