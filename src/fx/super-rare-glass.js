(function (C, root) {
  'use strict';
  var vertex = '#version 300 es\nprecision highp float;layout(location=0)in vec3 aPosition;layout(location=1)in vec3 aNormal;out vec3 normal;out vec2 at;out float depth;void main(){float f=3./(3.-aPosition.z);vec2 p=aPosition.xy*f/1.25;gl_Position=vec4(p.x,-p.y,-aPosition.z*.2,1.);normal=aNormal;at=p*.5+.5;depth=aPosition.z;}';
  var fragment = `#version 300 es
precision highp float;in vec3 normal;in vec2 at;in float depth;out vec4 result;
uniform sampler2D uScene;uniform float uMono,uFold;
vec3 environment(vec2 p){return texture(uScene,clamp(p,vec2(.001),vec2(.999))).rgb;}
void main(){
  vec3 n=normalize(normal);float fresnel=.035+.965*pow(1.-abs(n.z),5.);
  vec2 bend=n.xy*(.045+.05*uFold)*(1.+abs(depth)*.3);
  vec3 transmitted=environment(at+bend);
  // Small dispersion lives inside the glass and respects the saved monochrome setting.
  transmitted.r=environment(at+bend*1.06).r;transmitted.b=environment(at+bend*.94).b;
  vec3 absorption=exp(-vec3(1.5,.65,.2)*(.13+fresnel*.45));
  vec3 view=vec3(0.,0.,1.),light=normalize(vec3(-.35,-.55,1.4));
  vec3 halfway=normalize(view+light);float highlight=pow(max(0.,dot(n,halfway)),72.);
  vec3 reflection=vec3(.10,.22,.48)+environment(.5+n.xy*.34)*.45;
  float softbox=pow(max(0.,dot(n,normalize(vec3(.65,.3,1.)))),18.);
  vec3 reflected=reflect(-view,n);
  float strip=exp(-pow((reflected.x*.8+reflected.y*.28+.34)/.075,2.))*smoothstep(-.05,.6,reflected.z);
  vec3 color=transmitted*absorption*(1.-fresnel*.45)+reflection*fresnel;
  color+=vec3(.78,.92,1.)*(highlight*.22+softbox*.12+strip*.48);
  color+=vec3(.1,.24,.42)*fresnel*.35;
  color=mix(color,vec3(dot(color,vec3(.213,.715,.072))),uMono);
  result=vec4(color,.76+fresnel*.22);
}`;
  C.superRareGlass = { create: function () {
    var canvas = null, gl = null, gpu, program, texture, buffer, ready = false, failed = false, lost = false;
    var resources = { programs: [], textures: [], frames: [], renderbuffers: [] }, uploaded = null, uploadAt = -Infinity, uploadKey = '';
    var meshData = null;
    var stats = { backend: 'canvas', frames: 0, pixels: 0, textureUploads: 0 };
    function prepare() {
      if (ready || failed) return ready;
      canvas = root.document.createElement('canvas');
      gl = canvas.getContext('webgl2', { alpha: true, antialias: true, depth: true, premultipliedAlpha: true, preserveDrawingBuffer: false });
      if (!gl) { failed = true; stats.reason = 'WebGL 2 unavailable'; return false; }
      var context = gl; lost = false;
      canvas.addEventListener('webglcontextlost', function (event) { if(gl!==context)return;event.preventDefault(); lost = true; stats.backend = 'canvas'; });
      canvas.addEventListener('webglcontextrestored', function () { if(gl===context)lost = true; });
      try {
        gpu = C.cutsceneGL.create(gl, resources); program = gpu.program(vertex, fragment);
        texture = gl.createTexture(); resources.textures.push(texture); buffer = gl.createBuffer();
        gl.bindTexture(gl.TEXTURE_2D, texture); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        ready = true; stats.backend = 'webgl2'; return true;
      } catch (error) { failed = true; stats.reason=error.message; dispose(); return false; }
    }
    function rotate(x, y, z, tilt, yaw) {
      var yy = y * Math.cos(tilt) - z * Math.sin(tilt), zz = y * Math.sin(tilt) + z * Math.cos(tilt);
      return [x * Math.cos(yaw) + zz * Math.sin(yaw), yy, -x * Math.sin(yaw) + zz * Math.cos(yaw)];
    }
    function mesh(contour, t, fold) {
      var length = 8 * contour.length * 4 * 6 * 6;
      if (!meshData || meshData.length !== length) meshData = new Float32Array(length);
      var cursor = 0, objects = [];
      for (var index = 0; index < 8; index++) {
        var angle = index * Math.PI / 4 + .22 + t * .08, distance = .84 + (.29 - .84) * fold;
        var depth = Math.sin(angle + t * .12) * .3, tilt = Math.sin(angle) * (.3 + fold * .85), yaw = Math.cos(angle) * (.25 + fold * .7);
        objects.push({ index: index, angle: angle, distance: distance, depth: depth, tilt: tilt, yaw: yaw });
      }
      objects.sort(function(a,b){return a.depth-b.depth;});
      objects.forEach(function (o) {
        var scale = (.84 + (.81 * fold)) * (1 + (o.index % 3 - 1) * .07), spin = o.angle + .42 + fold * .7;
        var points = [];
        function point(index, radial, back) {
          var i=index%contour.length, ring=back?4:radial===0?0:radial===.45?1:radial===.8?2:3,key=ring*contour.length+i;
          if(points[key])return points[key];
          var c = contour[i], x = c[0] * radial * scale, y = c[1] * radial * scale;
          var z = back ? -.10 : .015 + .12 * (1 - radial * radial);
          var nx = back ? c[0] * 8 : c[0] * radial * 5.8, ny = back ? c[1] * 8 : c[1] * radial * 5.8, nz = back ? 0 : 1.2 * (1 - radial * .65);
          var position = rotate(x * Math.cos(spin) - y * Math.sin(spin), x * Math.sin(spin) + y * Math.cos(spin), z, o.tilt, o.yaw);
          var normal = rotate(nx * Math.cos(spin) - ny * Math.sin(spin), nx * Math.sin(spin) + ny * Math.cos(spin), nz, o.tilt, o.yaw);
          return points[key]=[position[0] + Math.cos(o.angle) * o.distance, position[1] + Math.sin(o.angle) * o.distance, position[2] + o.depth, normal[0], normal[1], normal[2]];
        }
        function triangle(a,b,c){for(var i=0;i<6;i++)meshData[cursor++]=a[i];for(var j=0;j<6;j++)meshData[cursor++]=b[j];for(var k=0;k<6;k++)meshData[cursor++]=c[k];}
        var rings = [0, .45, .8, 1];
        for (var ring = 0; ring < rings.length - 1; ring++) for (var i = 0; i < contour.length; i++) {
          var a = point(i,rings[ring],false), b = point(i+1,rings[ring],false), c = point(i+1,rings[ring+1],false), d = point(i,rings[ring+1],false);
          triangle(a,b,c);triangle(a,c,d);
        }
        for (var j = 0; j < contour.length; j++) {
          var front = point(j,1,false), next = point(j+1,1,false), rear = point(j+1,1,true), end = point(j,1,true);
          triangle(front,next,rear);triangle(front,rear,end);
        }
      }); return meshData;
    }
    function paint(q, radius, t, fold, scene, contour) {
      if (!prepare() || lost) return false;
      try {
        var high = ['high','very-high'].indexOf(C.settings.get('cinematicQuality')) >= 0, size = high ? 640 : 448;
        if (canvas.width !== size) canvas.width = canvas.height = size;
        gl.viewport(0,0,size,size); gl.clearColor(0,0,0,0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.useProgram(program.p); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,texture);
        var key=C.settings.get('rarityColor')+':'+size+':'+scene.width;
        if (uploaded !== scene || uploadKey!==key || Math.abs(t-uploadAt)>=1/30) {
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false); gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,scene); uploaded=scene;uploadAt=t;uploadKey=key;stats.textureUploads++;
        }
        gl.uniform1i(gpu.uniform(program,'uScene'),0); gl.uniform1f(gpu.uniform(program,'uFold'),fold); gl.uniform1f(gpu.uniform(program,'uMono'),C.settings.get('rarityColor')==='mono'?1:0);
        var vertices=mesh(contour,t,fold); gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.DYNAMIC_DRAW);
        gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,24,0);gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,3,gl.FLOAT,false,24,12);
        gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
        gl.drawArrays(gl.TRIANGLES,0,vertices.length/6);
        q.save();q.globalAlpha*=fold<.4?fold/.4:1;q.drawImage(canvas,-radius*1.25,-radius*1.25,radius*2.5,radius*2.5);q.restore();
        stats.frames++;stats.pixels=size*size;return true;
      } catch(error) { failed=true;stats.reason=error.message;dispose();return false; }
    }
    function dispose() {
      if(gl){resources.programs.forEach(function(p){gl.deleteProgram(p);});resources.textures.forEach(function(t){gl.deleteTexture(t);});if(buffer)gl.deleteBuffer(buffer);var lose=gl.getExtension('WEBGL_lose_context');if(lose)lose.loseContext();}
      resources={programs:[],textures:[],frames:[],renderbuffers:[]};ready=false;uploaded=null;uploadAt=-Infinity;uploadKey='';buffer=null;program=null;texture=null;gpu=null;meshData=null;gl=null;canvas=null;stats.backend='canvas';stats.pixels=0;
    }
    return { paint:paint,prepare:prepare,stop:dispose,stats:stats,get canvas(){return canvas;} };
  } };
})(window.Cardable,window);
