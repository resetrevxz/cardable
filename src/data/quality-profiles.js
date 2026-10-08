(function(C){
  'use strict';
  var profiles={
    'very-low':{rank:0,packLayers:1,particles:0,texture:768,substeps:1,canvasDpr:1,scenePixels:600000,reflectionScale:.5,shadowSize:0,volumeSteps:0,supersample:1,glass:0,dotDensity:1,frameBudgetMs:16.67},
    low:{rank:1,packLayers:2,particles:.15,texture:1024,substeps:1,canvasDpr:1.25,scenePixels:900000,reflectionScale:.5,shadowSize:0,volumeSteps:0,supersample:1,glass:0,dotDensity:1,frameBudgetMs:16.67},
    medium:{rank:2,packLayers:3,particles:.5,texture:1536,substeps:1,canvasDpr:1.5,scenePixels:1400000,reflectionScale:.5,shadowSize:0,volumeSteps:0,supersample:1,glass:.6,dotDensity:1,frameBudgetMs:16.67},
    high:{rank:3,packLayers:4,particles:1,texture:2048,substeps:1,canvasDpr:2,scenePixels:2600000,reflectionScale:.5,shadowSize:1024,volumeSteps:12,supersample:1.1,glass:1,dotDensity:1,frameBudgetMs:16.67},
    'very-high':{rank:4,packLayers:5,particles:1.5,texture:4096,substeps:2,canvasDpr:2.5,scenePixels:5200000,reflectionScale:1,shadowSize:2048,volumeSteps:24,supersample:1.35,glass:1.2,dotDensity:1.2,frameBudgetMs:16.67}
  };
  C.data.qualityProfiles=profiles;
})(window.Cardable);
