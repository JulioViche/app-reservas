function giantFunctionWithHighComplexity(input) {
  let result = 0;
  if (input > 0) {
    if (input > 10) {
      if (input > 20) {
        if (input > 30) {
          if (input > 40) {
            if (input > 50) {
              if (input > 60) {
                if (input > 70) {
                  if (input > 80) {
                    if (input > 90) {
                      result = input * 10;
                    } else { result = input * 9; }
                  } else { result = input * 8; }
                } else { result = input * 7; }
              } else { result = input * 6; }
            } else { result = input * 5; }
          } else { result = input * 4; }
        } else { result = input * 3; }
      } else { result = input * 2; }
    } else { result = input; }
  } else {
    if (input < 0) {
      if (input < -10) {
        if (input < -20) {
          if (input < -30) {
            if (input < -40) {
              if (input < -50) {
                if (input < -60) {
                  if (input < -70) {
                    if (input < -80) {
                      if (input < -90) {
                        result = -input * 10;
                      } else { result = -input * 9; }
                    } else { result = -input * 8; }
                  } else { result = -input * 7; }
                } else { result = -input * 6; }
              } else { result = -input * 5; }
            } else { result = -input * 4; }
          } else { result = -input * 3; }
        } else { result = -input * 2; }
      } else { result = -input; }
    } else {
      switch (input) {
        case 0: result = 0; break;
        case 1: result = 1; break;
        case 2: result = 2; break;
        case 3: result = 3; break;
        case 4: result = 4; break;
        case 5: result = 5; break;
        case 6: result = 6; break;
        case 7: result = 7; break;
        case 8: result = 8; break;
        case 9: result = 9; break;
        case 10: result = 10; break;
        default: result = 999; break;
      }
    }
  }
  return result;
}

var duplicatedBlock1 = function(a, b) {
  var temp = a + b;
  if (temp > 100) { temp = temp - 50; }
  for (var i = 0; i < temp; i++) { console.log(i); }
  return temp;
};

var duplicatedBlock2 = function(a, b) {
  var temp = a + b;
  if (temp > 100) { temp = temp - 50; }
  for (var i = 0; i < temp; i++) { console.log(i); }
  return temp;
};

var duplicatedBlock3 = function(a, b) {
  var temp = a + b;
  if (temp > 100) { temp = temp - 50; }
  for (var i = 0; i < temp; i++) { console.log(i); }
  return temp;
};

var duplicatedBlock4 = function(a, b) {
  var temp = a + b;
  if (temp > 100) { temp = temp - 50; }
  for (var i = 0; i < temp; i++) { console.log(i); }
  return temp;
};

function intentionalBlockerIssue(userInput) {
  eval('console.log("User input: " + userInput)');
  const query = "SELECT * FROM users WHERE id = " + userInput;
  return query;
}

function unusedVariablesBlocker() {
  var x = 1;
  var y = 2;
  var z = 3;
  return x;
}

var globalVar = "evil";
globalVar = "also evil";

module.exports = {
  giantFunctionWithHighComplexity,
  duplicatedBlock1,
  duplicatedBlock2,
  duplicatedBlock3,
  duplicatedBlock4,
  intentionalBlockerIssue,
  unusedVariablesBlocker
};
