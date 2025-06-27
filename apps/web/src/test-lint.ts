// This file has intentional lint errors to test pre-commit hooks
const unused_variable = "this should trigger a lint error"

function badFunction() {
console.log('no indentation')
const x = 1
const y = 2
return x + y
}

// Missing semicolon
const test = "test"

// Unused function
function unusedFunction() {
  return "this function is never used"
}