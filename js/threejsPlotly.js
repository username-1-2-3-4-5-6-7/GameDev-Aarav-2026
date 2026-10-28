const myPlot = document.getElementById("myPlot");
const mySceneContainer = document.getElementById("myScene");
const myPlotButton = document.getElementById("myShowPlot");
const mySceneButton = document.getElementById("myShowScene");
let myRenderer;
let myCamera;
let myAnimationFrame;
let myRenderScene;

myPlotButton.onclick = async () => {
  if (typeof Plotly === "undefined") {
    document.getElementById("myPlotStatus").textContent = "The chart library could not be loaded. Please check your connection and try again.";
    return;
  }
  myPlot.hidden = false;
  const myX = Array.from({ length: 101 }, (_, myIndex) => myIndex * 0.04 * Math.PI);
  const myY = myX.map((myValue) => Math.sin(myValue));
  try {
    await Plotly.newPlot(myPlot, [{ x: myX, y: myY, mode: "lines", line: { color: "#cc785c", width: 3 }, hovertemplate: "x: %{x:.2f}<br>sin(x): %{y:.2f}<extra></extra>" }], {
      margin: { t: 30, r: 24, b: 50, l: 52 },
      paper_bgcolor: "#181715", plot_bgcolor: "#181715", font: { color: "#faf9f5", family: "Inter, sans-serif" },
      xaxis: { title: "x (radians)", gridcolor: "#252320", zerolinecolor: "#6c6a64" },
      yaxis: { title: "sin(x)", range: [-1.2, 1.2], gridcolor: "#252320", zerolinecolor: "#6c6a64" },
    }, { responsive: true, displaylogo: false });
    myPlotButton.hidden = true;
    document.getElementById("myPlotStatus").textContent = "Sine wave · x from 0 to 4π";
  } catch (myError) {
    myPlot.hidden = true;
    document.getElementById("myPlotStatus").textContent = "The chart could not be displayed. Please try again.";
  }
};

mySceneButton.onclick = () => {
  if (typeof THREE === "undefined") {
    document.getElementById("mySceneStatus").textContent = "The 3D library could not be loaded. Please check your connection and try again.";
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
    const myReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const myAnimate = () => {
      myRenderScene();
      if (!myReducedMotion) {
        myShape.rotation.x += 0.003;
        myShape.rotation.y += 0.005;
        myAnimationFrame = requestAnimationFrame(myAnimate);
      }
    };
    myAnimate();
    mySceneButton.hidden = true;
    document.getElementById("mySceneStatus").textContent = myReducedMotion ? "Icosahedron · motion reduced" : "Icosahedron · rotating";
  } catch (myError) {
    if (myAnimationFrame) cancelAnimationFrame(myAnimationFrame);
    if (myRenderer) { myRenderer.dispose(); myRenderer = null; }
    myRenderScene = null;
    mySceneContainer.replaceChildren();
    mySceneContainer.hidden = true;
    document.getElementById("mySceneStatus").textContent = "The 3D scene could not be displayed. Your browser may not support WebGL.";
  }
};

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
