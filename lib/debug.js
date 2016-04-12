// Licensed under the Apache License. See footer for details.

//------------------------------------------------------------------------------
// The `createDebug` function takes a string, and returns a function.  The
// function returned will print the string passed into `createDebug`, and the
// the string passed to the function returned.  Similar interface as the
// npm `debug` package.
//------------------------------------------------------------------------------
exports.createDebug = createDebug

//------------------------------------------------------------------------------
function createDebug(name) {
  return function(message) {
    console.log("[" + name + "] " + message)
  }
}

//------------------------------------------------------------------------------
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//------------------------------------------------------------------------------