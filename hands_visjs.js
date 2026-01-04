// This demo uses MediaPipe Hands to detect hand landmarks and uses visjs to create an interactive network graph.
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

const fpsControl = new controls.FPS();
// Optimization: Turn off animated spinner after its hiding animation is done.
const spinner = document.querySelector('.loading');
spinner.ontransitionend = () => {
    spinner.style.display = 'none';
};
// feuerwerk stuff: 

function uuidv4() {
        return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
            (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
        );
}

class RocketBase {
  constructor(id,color,x,y){
    this.id = id
    this.label = "RocketBase"
    this.title = color
    this.fixed = true
    this.color = color
    this.x = x
    this.y = y
    this.shape = "database"
    this.fire = function(){
      let position = network.getPositions()[this.id]
      shot(position.x,position.y-10,nodes.get(this.id).color)
    }
  }
}

class Fountain {
  constructor(id,color,x,y){
    this.id = id
    this.label = "Fountain"
    this.title = color
    this.fixed = true
    this.color = color
    this.x = x
    this.y = y
    this.shape = "triangle"
    this.fire = function(){
      let position = network.getPositions()[this.id]
      spray(position.x,position.y-10,nodes.get(this.id).color)
    }
  }
}


function shot(x,y,color){
    let new_id = uuidv4()
    nodes.update({id:new_id,
      label:"bomb",
      x:x,
      y:y,
      mass:10000,
      color:"black",
      shape:"dot",
      hidden:false,
      physics:true})
  window.setTimeout(function(){
    let position=network.getPositions()[new_id]
    explosion(position.x,position.y-100,color)
    network.setSelection({nodes:[new_id],edges:[]})
    network.deleteSelected()
    },1000)
  }


function explosion(x,y,color){
  var added_nodes_ids=[];
  for(let i = 0; i < 20; i++){
  let new_id = uuidv4()
  nodes.update({id:new_id,
      label:"pew",
      x:x,
      y:y,
      color:color,
      shape:"dot",
      hidden:false,
      physics:true,}
      )
  added_nodes_ids.push(new_id)

  window.setTimeout(function(){

    network.setSelection({nodes:[new_id],edges:[]})
    network.deleteSelected()
      
  },700+300*Math.random())
  }
}


function spray(x,y,color){
  var added_nodes_ids=[];
  for(let i = 0; i < 20; i++){

  window.setTimeout(function(){
    let new_id = uuidv4()
  nodes.update({id:new_id,
      label:"pew",
      x:x,
      y:y,
      color:color,
      shape:"dot",
      hidden:false,
      physics:true,}
      )
  added_nodes_ids.push(new_id)
  window.setTimeout(function(){

    network.setSelection({nodes:[new_id],edges:[]})
    network.deleteSelected()
      
  },1700+300*Math.random())

  },100*i)
  

  

  }
}

function fire_recursive(node_id){
  let node = nodes.get(node_id)
    if ("fire" in node){node.fire()}
    else{
      let conn_edges = network.getConnectedEdges(node.id)
      conn_edges.forEach(function(edge_id){
        
        let edge = edges.get(edge_id)
        if (edge.from == node_id){
          let neighbor_node = nodes.get(edge.to)
          
          if (neighbor_node.fire){neighbor_node.fire()}
          else{
            window.setTimeout(function(){
            fire_recursive(edge.to)}
          ,200)
        }
      }
      })
    }
}
  

var nodes = new vis.DataSet([
new RocketBase(1,"red",0,0),
new RocketBase(2,"orange",100,0),
new RocketBase(3,"yellow",200,0),
new RocketBase(4,"green",300,0),
new RocketBase(5,"blue",400,0),
new RocketBase(6,"purple",500,0),
new Fountain(7,"red",50,50),
new Fountain(8,"orange",150,50),
new Fountain(9,"yellow",250,50),
new Fountain(10,"green",350,50),
new Fountain(11,"blue",450,50),
new Fountain(12,"purple",550,50),
{id:13,shape:"ellipse",label:"control",color:"gray",x:0,y:200,fixed:true},
{id:14,shape:"ellipse",label:"control",color:"gray",x:500,y:200,fixed:true},
{id:15,shape:"ellipse",label:"control",color:"gray",x:250,y:400,fixed:true},

]);

// create an array with edges
var edges = new vis.DataSet([{from:13,to:1},
{from:13,to:2},
{from:13,to:3},
{from:13,to:4},
{from:13,to:5},
{from:13,to:6},
{from:14,to:7},
{from:14,to:8},
{from:14,to:9},
{from:14,to:10},
{from:14,to:11},
{from:14,to:12},

{from:15,to:13},
{from:15,to:14},



]);

// initialize a visjs network
const networkContainer = document.getElementById("mynetwork");
const data = {
    nodes: nodes,
    edges: edges,
};

const options = {
    interaction: { hover: true },
    manipulation: {
        enabled: true,
    },
};

let network = new vis.Network(networkContainer, data, options);
console.log("network initialized:", network)
// add events to the network: 


  network.on('dragStart', function (params) {
      if (params.nodes.length>0){
          
          let node=nodes.get(params.nodes[0])
          let position = network.getPositions(params.nodes[0])[params.nodes[0]] //setting the current position is necessary to prevent snap-back to initial position
          node.x=position.x
          node.y=position.y
          node.fixed=false
          nodes.update(node)
      }
  });

network.on('dragEnd', function (params) {
      if (params.nodes.length>0){
          let node=nodes.get(params.nodes[0])
          let position = network.getPositions(params.nodes[0])[params.nodes[0]] //setting the current position is necessary to prevent snap-back to initial position
          node.x=position.x
          node.y=position.y   
          node.fixed=true
          nodes.update(node)
      }
      
  });

  network.on("doubleClick", function (params) {
        
	if (params.nodes.length>0){
		let position = network.getPositions()[params.nodes[0]]
		fire_recursive(params.nodes[0])    
    }
      });

// initialize canvas element for background drawing
canvasCtx.fillStyle = "white";
canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);

// copy current frame 

let currentFrame = canvasCtx.getImageData(0, 0, canvasElement.width, canvasElement.height);

let fingerDistanceThreshold = 0.04;
// draw a dot on current Frame

// variables for drag detection
let isDragging = false;
let last_drag_pointer = null; 
let left_index_closed_position = null; 
let right_index_closed_position = null;
let initial_index_closed_distance = null; 

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
            for ( let i in results.multiHandLandmarks) {
                const landmark = results.multiHandLandmarks[i];
                const classification = results.multiHandedness[i];
                const isRightHand = classification.label === 'Right';
                const isLeftHand = classification.label === 'Left';
            // draw point at index finger tip if distance is below threshold
            const indexDistance = Math.hypot(
                landmark[4].x - landmark[8].x,
                landmark[4].y - landmark[8].y
            );
            if (indexDistance < fingerDistanceThreshold) {
                const x = (landmark[4].x+ landmark[8].x)/2 * canvasElement.width;
                const y = (landmark[4].y + landmark[8].y)/2 * canvasElement.height;
                const z = (landmark[4].z + landmark[8].z)/2 * 1000;
                
                
               // canvasCtx.beginPath();
               // draw_circle(x, y, "black", 5);
                
                
                // store closed index finger position for draging and zooming
               if (isLeftHand){
                    left_index_closed_position = {x: x, y: y, z: z};
                }
                if (isRightHand){
                    right_index_closed_position = {x: x, y: y, z: z};
                } 

                let pointer = network.interactionHandler.getPointer({x: x, y: y});
                

                
            }
            else{
                // reset closed index finger position
                if (isLeftHand){
                    left_index_closed_position = null;
                }
                if (isRightHand){
                    right_index_closed_position = null;
                }
            }

            

            // draw point at middle finger tip if distance is below threshold
            const middleDistance = Math.hypot(
                landmark[4].x - landmark[12].x,
                landmark[4].y - landmark[12].y
            );
            if (middleDistance < fingerDistanceThreshold) {
                const x = (landmark[4].x + landmark[12].x)/2 * canvasElement.width;
                const y = (landmark[4].y + landmark[12].y)/2 * canvasElement.height;
              //  canvasCtx.beginPath();
              //  draw_circle(x, y, "white", 15);
                // check if there is a node at this position 
                let node = network.getNodeAt({x: x, y: y});
                if (node){
                    fire_recursive(node)
                }
            }

            const ringDistance = Math.hypot(
                landmark[4].x - landmark[16].x,
                landmark[4].y - landmark[16].y
            );
            if (ringDistance < fingerDistanceThreshold) {
                const x = (landmark[4].x + landmark[16].x)/2 * canvasElement.width;
                const y = (landmark[4].y + landmark[16].y)/2 * canvasElement.height;
             //   canvasCtx.beginPath();
              //  draw_circle(x, y, "red", 20);

                // spray effect
                let pointer = network.interactionHandler.getPointer({x: x, y: y});
                const point = network.canvas.DOMtoCanvas(pointer)
                spray(point.x, point.y, "red")
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

    // do zooming stuff: 
    console.log("left index closed position:", left_index_closed_position)
    console.log("right index closed position:", right_index_closed_position)
    if (left_index_closed_position && right_index_closed_position){
        console.log("both index fingers closed, zoom mode")
        let current_distance = Math.hypot(
            left_index_closed_position.x - right_index_closed_position.x,
            left_index_closed_position.y - right_index_closed_position.y
        );
        if (initial_index_closed_distance == null){
            initial_index_closed_distance = current_distance;
        }
        else{
            console.log("zooming")
            let zoom_factor = current_distance / initial_index_closed_distance;
            let mean_position = {x: (left_index_closed_position.x + right_index_closed_position.x)/2,
                                    y: (left_index_closed_position.y + right_index_closed_position.y)/2};
            let mean_pointer = network.interactionHandler.getPointer(mean_position);
            let scale = network.getScale();
            let new_scale = scale * zoom_factor;
            network.interactionHandler.zoom(new_scale, mean_pointer);
            initial_index_closed_distance = current_distance;
        }
    }
    else{
        initial_index_closed_distance = null;

        // do dragging stuff:
        let do_drag = false;
        let x = null; 
        let y = null;
        if (right_index_closed_position){
            x = right_index_closed_position.x;
            y = right_index_closed_position.y;
            do_drag = true;
        }
        if (left_index_closed_position){
            x = left_index_closed_position.x;
            y = left_index_closed_position.y;
            do_drag = true;
        }
        if (do_drag){
            if (isDragging==false){
                    // trigger drag start event

                    network.interactionHandler.onTouch(
                        {center: {x: x, y: y},
                        clientX: x,
                        clientY: y}
                    )
                    network.interactionHandler.onTap(
                        {center: {x: x, y: y}, 
                        clientX: x, 
                        clientY: y}
                    )
                    network.interactionHandler.onDragStart(
                        {center: {x: x, y: y}, 
                        clientX: x, 
                        clientY: y});
                    isDragging = true;
                }
                else{
                    // trigger drag event
                    network.interactionHandler.onDrag(
                        {center: {x: x, y: y}, 
                        clientX: x, 
                        clientY: y}
                    );
                }
                last_drag_pointer = network.interactionHandler.getPointer({x: x, y: y});
            }
        else{
            if (isDragging){
                    // trigger mouseup event to stop dragging
                    network.interactionHandler.onDragEnd(
                        {center: last_drag_pointer, 
                        clientX: last_drag_pointer.x, 
                        clientY: last_drag_pointer.y}
                    )
                    network.interactionHandler.onRelease(
                        {center: last_drag_pointer, 
                        clientX: last_drag_pointer.x, 
                        clientY: last_drag_pointer.y}
                    );
                isDragging = false;
                }
            }
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
