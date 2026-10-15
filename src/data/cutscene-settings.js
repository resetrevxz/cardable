(function(C){'use strict';
  // Extends the existing schema before normalization, so old saves receive Full by default.
  C.settingsSchema.entries.cutscenes={key:'cutscenes',label:'Cutscenes',group:'Cards',
    helper:'Full by default. Choose the full ceremony, authored Short route, or a calm reveal. Reduced motion uses calm.',
    defaultValue:'full',choices:['full','short','off'],control:'segments',
    apply:function(value,api){api.attribute(this.key,value);}};
  C.settingsSchema.entries.strobing={key:'strobing',label:'Strobing',group:'Cards',
    helper:'Full by default, with rapid flashing and strobing. Choose Safe for gentler light changes.',
    defaultValue:'full',choices:['safe','full'],control:'segments',
    apply:function(value,api){api.attribute(this.key,value);}};
})(window.Cardable);
