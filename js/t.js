// console.log(publicProperty, privInClass, inst, this);

var T = (function(){
    
    var privateProperty = 0;
    
    var _; // instance
    
    var T = function(param) { // constructor
        _ = this;
        
        _.publicProperty = "6543";
    };
    
    T.prototype.publicProperty = null;
    
    var privateMethod = function() {
        console.log(_.publicProperty, privateProperty, _, this);
    };
    
    
    T.prototype.pubMethod = function() {
        privateMethod();
        console.log(_.publicProperty, privateProperty, _, this, T.staticProperty);
    }
    
    return T;
}());

T.staticProperty = 12; 