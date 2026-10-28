const myPlot = document.getElementById("myPlot");
const mySceneContainer = document.getElementById("myScene");
const myPlotButton = document.getElementById("myShowPlot");
let myRenderer;
let myCamera;
let myAnimationFrame;
let myRenderScene;

// Parse a small mathematical language without evaluating arbitrary JavaScript.
function myCompileEquation(myExpression) {
  const mySource = myExpression.trim().replace(/^y\s*=\s*/i, "").replace(/−/g, "-");
  if (!mySource) throw new Error("Enter an equation using x.");
  const myTokens = [];
  const myPattern = /\s*(?:(\d+(?:\.\d*)?|\.\d+)(?:[eE]([+-]?\d+))?|([a-zA-Z]+)|([+\-*/^()]))/gy;
  let myPosition = 0;
  while (myPosition < mySource.length) {
    myPattern.lastIndex = myPosition;
    const myMatch = myPattern.exec(mySource);
    if (!myMatch) throw new Error("Unsupported symbol. Use numbers, x, operators, and the listed functions.");
    myTokens.push(myMatch[1] ? { type: "number", value: Number(myMatch[1] + (myMatch[2] ? "e" + myMatch[2] : "")) } : { type: myMatch[3] ? "name" : "symbol", value: (myMatch[3] || myMatch[4]).toLowerCase() });
    myPosition = myPattern.lastIndex;
  }
  let myIndex = 0;
  const myFunctions = { sin: Math.sin, cos: Math.cos, tan: Math.tan, sqrt: Math.sqrt, abs: Math.abs, log: Math.log, exp: Math.exp };
  function myTake(myValue) { if (myTokens[myIndex]?.value === myValue) { myIndex++; return true; } return false; }
  function myPrimary() {
    const myToken = myTokens[myIndex++];
    if (!myToken) throw new Error("The equation is incomplete.");
    if (myToken.type === "number") return () => myToken.value;
    if (myToken.value === "(") { const myInner = myExpressionNode(); if (!myTake(")")) throw new Error("A closing parenthesis is missing."); return myInner; }
    if (myToken.value === "x") return (myX) => myX;
    if (myToken.value === "pi") return () => Math.PI;
    if (myToken.value === "e") return () => Math.E;
    if (myToken.type === "name" && Object.hasOwn(myFunctions, myToken.value)) {
      if (!myTake("(")) throw new Error("Put function arguments in parentheses, for example sin(x).");
      const myArgument = myExpressionNode();
      if (!myTake(")")) throw new Error("A closing parenthesis is missing.");
      return (myX) => myFunctions[myToken.value](myArgument(myX));
    }
    throw new Error("Unknown name or unexpected symbol: " + myToken.value);
  }
  function myPower() { let myLeft = myPrimary(); if (myTake("^")) { const myRight = myUnary(), myBase = myLeft; myLeft = (myX) => myBase(myX) ** myRight(myX); } return myLeft; }
  function myUnary() { if (myTake("+")) return myUnary(); if (myTake("-")) { const myInner = myUnary(); return (myX) => -myInner(myX); } return myPower(); }
  function myProduct() { let myLeft = myUnary(); while (["*", "/"].includes(myTokens[myIndex]?.value)) { const myOperator = myTokens[myIndex++].value, myRight = myUnary(), myPrevious = myLeft; myLeft = myOperator === "*" ? (myX) => myPrevious(myX) * myRight(myX) : (myX) => myPrevious(myX) / myRight(myX); } return myLeft; }
  function myExpressionNode() { let myLeft = myProduct(); while (["+", "-"].includes(myTokens[myIndex]?.value)) { const myOperator = myTokens[myIndex++].value, myRight = myProduct(), myPrevious = myLeft; myLeft = myOperator === "+" ? (myX) => myPrevious(myX) + myRight(myX) : (myX) => myPrevious(myX) - myRight(myX); } return myLeft; }
  const myResult = myExpressionNode();
  if (myIndex !== myTokens.length) throw new Error("Unexpected text. Use * between multiplied terms.");
  return myResult;
}

document.getElementById("myPlotForm").onsubmit = async (myEvent) => {
  myEvent.preventDefault();
  const myStatus = document.getElementById("myPlotStatus");
  const myEquation = document.getElementById("myEquation").value;
  let myFunction;
  try { myFunction = myCompileEquation(myEquation); }
  catch (myError) { myStatus.textContent = myError.message; return; }
  if (typeof Plotly === "undefined") {
    myStatus.textContent = "The chart library could not be loaded. Please check your connection and try again.";
    return;
  }
  const myX = Array.from({ length: 501 }, (_, myIndex) => (myIndex * 0.008 - 2) * Math.PI);
  const myY = myX.map((myValue) => { const myResult = myFunction(myValue); return Number.isFinite(myResult) ? myResult : null; });
  if (myY.every((myValue) => myValue === null)) { myStatus.textContent = "This equation has no finite values in the displayed range."; return; }
  myPlot.hidden = false;
  try {
    await Plotly.react(myPlot, [{ x: myX, y: myY, mode: "lines", connectgaps: false, line: { color: "#cc785c", width: 3 }, hovertemplate: "x: %{x:.2f}<br>y: %{y:.2f}<extra></extra>" }], {
      margin: { t: 30, r: 24, b: 50, l: 52 },
      paper_bgcolor: "#181715", plot_bgcolor: "#181715", font: { color: "#faf9f5", family: "Inter, sans-serif" },
      xaxis: { title: "x", gridcolor: "#252320", zerolinecolor: "#6c6a64" },
      yaxis: { title: "y", autorange: true, gridcolor: "#252320", zerolinecolor: "#6c6a64" },
    }, { responsive: true, displaylogo: false });
    // Keep zooming and panning inside the bounds calculated for this equation.
    const myInitialXRange = myPlot._fullLayout.xaxis.range.slice();
    const myInitialYRange = myPlot._fullLayout.yaxis.range.slice();
    await Plotly.relayout(myPlot, {
      "xaxis.minallowed": myInitialXRange[0],
      "xaxis.maxallowed": myInitialXRange[1],
      "yaxis.minallowed": myInitialYRange[0],
      "yaxis.maxallowed": myInitialYRange[1],
    });
    myPlotButton.textContent = "Update plot";
    myStatus.textContent = "Showing y = " + myEquation.trim().replace(/^y\s*=\s*/i, "") + " · x from −2π to 2π";
  } catch (myError) {
    myStatus.textContent = "The chart could not be displayed. Please try again.";
  }
};

function myStartScene() {
  if (typeof THREE === "undefined") {
    document.getElementById("mySceneStatus").textContent = "The 3D library could not be loaded. Please check your connection and reload the page.";
    return;
  }
  try {
    mySceneContainer.hidden = false;
    const myScene = new THREE.Scene();
    myCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    myCamera.position.z = 4;
    myRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    myRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const myShape = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0xcc785c, wireframe: true }));
    myScene.add(myShape);
    myRenderScene = () => myRenderer.render(myScene, myCamera);
    mySceneContainer.appendChild(myRenderer.domElement);
    myResizeScene();
    const myAnimate = () => {
      myRenderScene();
      myShape.rotation.x += 0.003;
      myShape.rotation.y += 0.005;
      myAnimationFrame = requestAnimationFrame(myAnimate);
    };
    myAnimate();
    document.getElementById("mySceneStatus").textContent = "Icosahedron · rotating";
  } catch (myError) {
    if (myAnimationFrame) cancelAnimationFrame(myAnimationFrame);
    if (myRenderer) { myRenderer.dispose(); myRenderer = null; }
    myRenderScene = null;
    mySceneContainer.replaceChildren();
    mySceneContainer.hidden = true;
    document.getElementById("mySceneStatus").textContent = "The 3D scene could not be displayed. Your browser may not support WebGL.";
  }
}

function myResizeScene() {
  if (!myRenderer || !myCamera) return;
  const myWidth = mySceneContainer.clientWidth;
  const myHeight = mySceneContainer.clientHeight;
  if (!myWidth || !myHeight) return;
  myCamera.aspect = myWidth / myHeight;
  myCamera.updateProjectionMatrix();
  myRenderer.setSize(myWidth, myHeight);
  if (myRenderScene) myRenderScene();
}
window.addEventListener("resize", myResizeScene);
myStartScene();
document.getElementById("myPlotForm").requestSubmit();
