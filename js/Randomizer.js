// Adapted from: http://codetheory.in/weighted-biased-random-number-generation-with-javascript-based-on-probability/
var Randomizer = {
    randInt: function(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },
    randFloat: function(min, max) {
        return Math.random() * (max - min) + min;
    },
    
    zipfFrequency: function(k, s, N) {
        for (var n = 1, sum = 0; n <= N; n++) {
            sum += 1 / Math.pow(n, s)
        }
        return 1 / Math.pow(k, s) / sum;
    },
    
    getZipfWeightList: function(s, listLength) {
        for (var i = 0, weightList = []; i < listLength; i++) {
            weightList.push(Randomizer.zipfFrequency(i+1, s, listLength))
        }
        return weightList;
    },
    
    getRandomItem: function(list) {
        return list[Randomizer.randInt(0, list.length - 1)];
    },
        
    getWeighedRandomItem: function(list, weightList) {
        var totalWeight = weightList.reduce(function(prev, cur, i, arr) {
            return prev + cur;
        });
         
        var random_num = Randomizer.randFloat(0, totalWeight);
        var weight_sum = 0;
         
        for (var i = 0; i < list.length; i++) {
            weight_sum += weightList[i];
            weight_sum = +weight_sum.toFixed(4);
            if (random_num <= weight_sum) {
                return list[i];
            }
        }
    }
};