(function(C){'use strict';
  // Extends the existing schema before normalization, so old saves receive Full by default.
  C.settingsSchema.entries.cutscenes={key:'cutscenes',label:'Cutscenes',group:'Cards',
    helper:'Full ceremony, shorter sequence, or a calm reveal. Reduced motion uses the calm version.',
    defaultValue:'full',choices:['full','short','off'],control:'segments',
    apply:function(value,api){api.attribute(this.key,value);}};
})(window.Cardable);
