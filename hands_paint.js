
const mpHands = window;
const drawingUtils = window;
const controls = window;
const videoElement = document.getElementsByClassName('input_video')[0];
const canvasElement = document.getElementsByClassName('output_canvas')[0];
const controlsElement = document.getElementsByClassName('control-panel')[0];
const canvasCtx = canvasElement.getContext('2d');
const config = { locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@${mpHands.VERSION}/${file}`;
    } };
// We'll add this to our control panel later, but we'll save it here so we can
// call tick() each time the graph runs.
const fpsControl = new controls.FPS();
// Optimization: Turn off animated spinner after its hiding animation is done.
const spinner = document.querySelector('.loading');
spinner.ontransitionend = () => {
    spinner.style.display = 'none';
};

// initialize canvas element 
canvasCtx.fillStyle = "white";
canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);

// copy current frame 

let currentFrame = canvasCtx.getImageData(0, 0, canvasElement.width, canvasElement.height);
let fingerDistanceThreshold = 0.04;
// draw a dot on current Frame



function onResults(results) {
    // Hide the spinner.
    document.body.classList.add('loaded');
    // Update the frame rate.
    fpsControl.tick();
    // Draw the overlays.
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.putImageData(currentFrame, 0, 0);
    // canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
    
    function draw_circle (x, y, color="green", radius=10){
        canvasCtx.beginPath();
        canvasCtx.arc(x, y, radius, 0, 2 * Math.PI);
        canvasCtx.fillStyle = color;
        canvasCtx.fill();
    }
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            for (const landmark of results.multiHandLandmarks) {
            // draw point at index finger tip if distance is below threshold
            const indexDistance = Math.hypot(
                landmark[4].x - landmark[8].x,
                landmark[4].y - landmark[8].y
            );
            if (indexDistance < fingerDistanceThreshold) {
                const x = (landmark[4].x+ landmark[8].x)/2 * canvasElement.width;
                const y = (landmark[4].y + landmark[8].y)/2 * canvasElement.height;
                canvasCtx.beginPath();
                draw_circle(x, y, "black", 5);
            }

            const middleDistance = Math.hypot(
                landmark[4].x - landmark[12].x,
                landmark[4].y - landmark[12].y
            );
            if (middleDistance < fingerDistanceThreshold) {
                const x = (landmark[4].x + landmark[12].x)/2 * canvasElement.width;
                const y = (landmark[4].y + landmark[12].y)/2 * canvasElement.height;
                canvasCtx.beginPath();
                draw_circle(x, y, "white", 15);
            }

            const ringDistance = Math.hypot(
                landmark[4].x - landmark[16].x,
                landmark[4].y - landmark[16].y
            );
            if (ringDistance < fingerDistanceThreshold) {
                const x = (landmark[4].x + landmark[16].x)/2 * canvasElement.width;
                const y = (landmark[4].y + landmark[16].y)/2 * canvasElement.height;
                canvasCtx.beginPath();
                draw_circle(x, y, "red", 20);
            }

            // reset currentFrame if thumb and pinky are touching
            const thumbPinkyDistance = Math.hypot(
                landmark[4].x - landmark[20].x,
                landmark[4].y - landmark[20].y
            );
            if (thumbPinkyDistance < fingerDistanceThreshold && (landmark[4].z - landmark[20].z<0.06)) {
                canvasCtx.fillStyle = "white";
                canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);
            }
        }
        currentFrame = canvasCtx.getImageData(0, 0, canvasElement.width, canvasElement.height);
    }
    
    if (results.multiHandLandmarks && results.multiHandedness) {
        for (let index = 0; index < results.multiHandLandmarks.length; index++) {
            const classification = results.multiHandedness[index];
            const isRightHand = classification.label === 'Right';
            const landmarks = results.multiHandLandmarks[index];
            drawingUtils.drawConnectors(canvasCtx, landmarks, mpHands.HAND_CONNECTIONS, { color: isRightHand ? '#0055ff' : '#FF0000' });
            drawingUtils.drawLandmarks(canvasCtx, landmarks, {
                color: isRightHand ? '#0055ff' : '#FF0000',
                fillColor: isRightHand ? '#FF0000' : '#0055ff',
                radius: (data) => {
                    return drawingUtils.lerp(data.from.z, -0.15, .1, 10, 1);
                }
            });
        }
    }
    canvasCtx.restore();
    if (results.multiHandWorldLandmarks) {
        // We only get to call updateLandmarks once, so we need to cook the data to
        // fit. The landmarks just merge, but the connections need to be offset.
        const landmarks = results.multiHandWorldLandmarks.reduce((prev, current) => [...prev, ...current], []);
        const colors = [];
        let connections = [];
        for (let loop = 0; loop < results.multiHandWorldLandmarks.length; ++loop) {
            const offset = loop * mpHands.HAND_CONNECTIONS.length;
            const offsetConnections = mpHands.HAND_CONNECTIONS.map((connection) => [connection[0] + offset, connection[1] + offset]);
            connections = connections.concat(offsetConnections);
            const classification = results.multiHandedness[loop];
            colors.push({
                list: offsetConnections.map((unused, i) => i + offset),
                color: classification.label,
            });
        }
       // grid.updateLandmarks(landmarks, connections, colors);
    }
    else {
        // grid.updateLandmarks([]);
    }
}
const hands = new mpHands.Hands(config);
hands.onResults(onResults);
// Present a control panel through which the user can manipulate the solution
// options.
new controls
    .ControlPanel(controlsElement, {
    selfieMode: true,
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
    fingerDistanceThreshold: 0.04,
})
    .add([
    new controls.StaticText({ title: 'MediaPipe Hands' }),
    fpsControl,
    new controls.Toggle({ title: 'Selfie Mode', field: 'selfieMode' }),
    new controls.SourcePicker({
        onFrame: async (input, size) => {
            const aspect = size.height / size.width;
            let width, height;
            if (window.innerWidth > window.innerHeight) {
                height = window.innerHeight;
                width = height / aspect;
            }
            else {
                width = window.innerWidth;
                height = width * aspect;
            }
            canvasElement.width = width;
            canvasElement.height = height;
            await hands.send({ image: input });
        },
    }),
    new controls.Slider({
        title: 'Max Number of Hands',
        field: 'maxNumHands',
        range: [1, 4],
        step: 1
    }),
    new controls.Slider({
        title: 'Model Complexity',
        field: 'modelComplexity',
        discrete: ['Lite', 'Full'],
    }),
    new controls.Slider({
        title: 'Min Detection Confidence',
        field: 'minDetectionConfidence',
        range: [0, 1],
        step: 0.01
    }),
    new controls.Slider({
        title: 'Min Tracking Confidence',
        field: 'minTrackingConfidence',
        range: [0, 1],
        step: 0.01
    }),
    new controls.Slider({
        title: 'Finger Distance Threshold',
        field: 'fingerDistanceThreshold',
        range: [0.01, 0.1],
        step: 0.001
    }),
])
    .on(x => {
    const options = x;

    // update variables outside of this scope
    videoElement.classList.toggle('selfie', options.selfieMode);
    fingerDistanceThreshold = options.fingerDistanceThreshold;
    hands.setOptions(options);
});
