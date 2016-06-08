// This is an example of the used javascript OOP structure. T is a class.

var T = function(){
    var _ = this; // Use '_' instead of 'this' when referring to public properties or methods or to the context.
    

    // *********************** Private properties. ***************************************
    
    var privateProperty = 0;
    
    // *********************** Public properties. ****************************************
    
    _.publicProperty = 0;
    
    // *********************** Constructor. **********************************************
    function constructor() {
        
    }
    
    // *********************** Public methods. *******************************************
    
    _.publicMethod = function() {
        privateProperty;    // Call to a private property.
        _.publicProperty;   // Call to a public property.
        privateMethod();    // Call to a public method.
    }
    
    // *********************** Private methods. ******************************************
    var privateMethod = function() {
        privateProperty;    // Call to a private property.
        _.publicProperty;   // Call to a public property.
        _.publicMethod();   // Call to a public method.
    };
    
    constructor();
};

T.staticProperty = 0; 