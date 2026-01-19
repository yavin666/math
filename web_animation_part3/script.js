// Data Configuration
const data = [
    { n: 1, val: 2 },
    { n: 2, val: 6 }, { n: 3, val: 12 }, { n: 4, val: 24 }, { n: 5, val: 40 },
    { n: 6, val: 72 }, { n: 7, val: 126 }, { n: 8, val: 240 }, { n: 9, val: 306 },
    { n: 10, val: 500 }, { n: 11, val: 582 }, { n: 12, val: 840 }, { n: 13, val: 1154 }
];

// Configuration
const config = {
    svgWidth: 2200, 
    svgHeight: 1200, 
    margin: { top: 200, right: 220, bottom: 360, left: 320 }, // Increased margins for labels
    colors: {
        green: "#2e7d32",
        red: "#d32f2f",
        black: "#333333" 
    },
    yMax: 100, 
    n: 2, 
    maxN: 24,
    cameraEnabled: true,
    dataAlpha: 0,
    firstValueAlpha: 0,
    point4Flicker: 1,
    point9Flicker: 1,
    point13Flicker: 1,
    specialGrowthEnabled: false,
    growthEmphasis: 0,
    focusDim: 0,
    focusDim10: 0,
    focusDim11: 0,
    growthTargetN: null,
    enableFinalPhase: false
};

const specialGrowth = { v10: 500, v11: 582 };

// Dimensions
const width = config.svgWidth - config.margin.left - config.margin.right;
const height = config.svgHeight - config.margin.top - config.margin.bottom;

// Scales
const xScale = (n) => {
    const denom = Math.max(getXAxisExtentN(), 1);
    return config.margin.left + (n / denom) * width;
};

/**
 * 获取X轴当前应显示到的维度终点（初始为4，随后随摄像机右移对应的n增长）。
 */
function getXAxisExtentN() {
    const base = 4;
    const max = config.maxN ?? 24;
    const nNow = Number.isFinite(config.n) ? config.n : 0;
    return Math.max(base, Math.min(max, nNow));
}

/**
 * 按当前X轴维度终点更新X轴线段长度。
 */
function updateXAxisLine() {
    const xAxisLine = svg.querySelector("#x-axis-line");
    if (!xAxisLine) return;
    if (typeof gsap !== "undefined" && gsap.isTweening && gsap.isTweening(xAxisLine)) return;

    const axisBaselineY = config.svgHeight - config.margin.bottom;
    const extentN = getXAxisExtentN();
    const axisPad = 80;
    const x2 = xScale(extentN) + axisPad;

    xAxisLine.setAttribute("x1", String(config.margin.left));
    xAxisLine.setAttribute("y1", String(axisBaselineY));
    xAxisLine.setAttribute("x2", String(x2));
    xAxisLine.setAttribute("y2", String(axisBaselineY));
}

const segments = {
    green: data, // n=1 to n=15
    blackMain: [], // Not used in part 3
    blackLast: [] // Not used in part 3
};

const yScale = (val) => {
    const top = config.margin.top;
    const baseline = config.svgHeight - config.margin.bottom;
    const h = baseline - top;
    // Dynamic linear scale based on config.yMax
    // Ensure yMax doesn't go below a minimum to prevent division by zero or extreme zoom
    const effectiveYMax = Math.max(config.yMax, 10);
    return baseline - (val / effectiveYMax) * h;
};

const buildPathD = (arr, maxN) => {
    let dStr = "";
    let hasStarted = false;
    
    for (let i = 0; i < arr.length; i++) {
        const p = arr[i];
        if (p.n <= maxN) {
            const x = xScale(p.n);
            const y = yScale(p.val);
            if (!hasStarted) {
                dStr += `M ${x} ${y}`;
                hasStarted = true;
            } else {
                dStr += ` L ${x} ${y}`;
            }
        } else {
            // Interpolate to current maxN if we are in the middle of a segment
            if (i > 0 && arr[i-1].n < maxN) {
                const prev = arr[i-1];
                // Linear interpolation
                const ratio = (maxN - prev.n) / (p.n - prev.n);
                const val = prev.val + (p.val - prev.val) * ratio;
                const x = xScale(maxN);
                const y = yScale(val);
                dStr += ` L ${x} ${y}`;
            }
            break; // Stop
        }
    }
    return dStr;
};

function updateChartGeometry() {
    const switchStart = 4500;
    const switchEnd = 6000;
    const switchT = Math.max(0, Math.min(1, (config.yMax - switchStart) / (switchEnd - switchStart)));
    const smallFactor = 1 - switchT;
    const largeFactor = switchT;

    const gridLinesH = gridGroup.querySelectorAll("line.grid-line-h");
    gridLinesH.forEach((line) => {
        const val = parseFloat(line.dataset.value);
        const y = yScale(val);
        line.setAttribute("y1", String(y));
        line.setAttribute("y2", String(y));
        
        // Visibility Logic:
        // 1. Hide if above chart (future values not reached by zoom yet)
        // 2. Hide if clustered at bottom (past values that are now too small relative to scale)
        // Threshold increased to 40px to prevent clutter near 0
        const isTooHigh = y < config.margin.top;
        const isTooLow = val > 0 && y > (config.svgHeight - config.margin.bottom - 30);
        
        if (config.ticksAutoOpacity) {
            const group = line.dataset.group;
            const baseOpacity = (isTooHigh || isTooLow) ? 0 : 1;
            const groupOpacity = (group === "micro" || group === "small") ? smallFactor : (group === "large" ? largeFactor : 1);
            line.style.opacity = String(baseOpacity * groupOpacity);
        }
    });

    // Remove vertical grid lines (Cleanup per user request)
    const gridLinesV = gridGroup.querySelectorAll("line.grid-line-v");
    gridLinesV.forEach(line => line.remove());

    const yTicks = axesGroup.querySelectorAll("text.tick-text[data-value]");
    yTicks.forEach((t) => {
        const val = parseFloat(t.dataset.value);
        const y = yScale(val) + 5;
        t.setAttribute("y", String(y));
        
        const isTooHigh = y < config.margin.top;
        const isTooLow = val > 0 && y > (config.svgHeight - config.margin.bottom - 40); 
        
        if (config.ticksAutoOpacity) {
            const group = t.dataset.group;
            const baseOpacity = (isTooHigh || isTooLow) ? 0 : 1;
            const groupOpacity = (group === "micro" || group === "small") ? smallFactor : (group === "large" ? largeFactor : 1);
            t.style.opacity = String(baseOpacity * groupOpacity);
        }
    });

    const xTicks = axesGroup.querySelectorAll("text.tick-text[data-n]");
    // Opacity handled by GSAP entrance animation, no continuous update needed
    
    const xTickLines = axesGroup.querySelectorAll("line.tick-line-x");
    // Opacity handled by GSAP entrance animation, no continuous update needed

    const xAxisExtentN = getXAxisExtentN();
    xTicks.forEach((t) => {
        const n = parseFloat(t.dataset.n);
        const x = xScale(n);
        t.setAttribute("x", String(x));
        const opacity = n <= xAxisExtentN + 1e-6 ? 1 : 0;
        t.style.opacity = String(opacity);
    });
    xTickLines.forEach((l) => {
        const n = parseFloat(l.dataset.n);
        const x = xScale(n);
        l.setAttribute("x1", String(x));
        l.setAttribute("x2", String(x));
        const opacity = n <= xAxisExtentN + 1e-6 ? 1 : 0;
        l.style.opacity = String(opacity);
    });

    const points = pointsGroup.querySelectorAll("g.data-point");
    points.forEach((p) => {
        const n = parseFloat(p.dataset.n);
        let val = parseFloat(p.dataset.val);
        if (config.specialGrowthEnabled) {
            if (n === 10) val = specialGrowth.v10;
            if (n === 11) val = specialGrowth.v11;
        }
        const x = xScale(n);
        const y = yScale(val);

        const leadPoint = 0.35;
        const tpBase = Math.max(0, Math.min(1, (config.n - (n - leadPoint)) / leadPoint));
        const tp = (config.dataVisible ? tpBase : 0);
        const firstAlpha = n === 1 ? (config.firstValueAlpha ?? 1) : 1;
        const growthTargetN = config.growthTargetN;
        const isGrowthTarget = growthTargetN == null || n === growthTargetN;
        const emphasis = (config.specialGrowthEnabled && isGrowthTarget && (n === 10 || n === 11)) ? (1 + 0.35 * (config.growthEmphasis ?? 0)) : 1;
        p.setAttribute("transform", `translate(${x} ${y}) scale(${tp * firstAlpha * emphasis})`);
        let opacity = tp * (config.dataAlpha ?? 1) * firstAlpha;
        if (n === 4) opacity *= (config.point4Flicker ?? 1);
        if (n === 9) opacity *= (config.point9Flicker ?? 1);
        if (n === 13) opacity *= (config.point13Flicker ?? 1);
        const dim = config.focusDim ?? 0;
        const dim10 = config.focusDim10 ?? 0;
        const dim11 = config.focusDim11 ?? 0;
        if (dim > 0 || dim10 > 0 || dim11 > 0) {
            if (n === 10) opacity *= (1 - 0.55 * dim10);
            else if (n === 11) opacity *= (1 - 0.55 * dim11);
            else opacity *= (1 - 0.55 * dim);
        }
        p.style.opacity = String(opacity);
    });

    const labels = labelsGroup.querySelectorAll("text.point-label");
    labels.forEach((l) => {
        const n = parseFloat(l.dataset.n);
        let val = parseFloat(l.dataset.val);
        if (config.specialGrowthEnabled) {
            if (n === 10) val = specialGrowth.v10;
            if (n === 11) val = specialGrowth.v11;
        }
        let cx = xScale(n);
        const cy = yScale(val);

        // Manual offset for specific points to avoid overlapping with the line
        if (n === 21 || n === 22 || n === 23) {
            cx -= 50; // Shift left
        }

        l.setAttribute("x", String(cx));
        let yOffset = 0;
        if (n >= 8) {
            const stepA = 20;
            const stepB = 10;
            if (n <= 8) {
                yOffset = -((n - 8) * stepA);
            } else {
                yOffset = 0;
            }
        }
        const labelY = cy - 40 + yOffset;
        l.setAttribute("y", String(labelY));

        const leadLabel = 0.55;
        const tlBase = Math.max(0, Math.min(1, (config.n - (n - leadLabel)) / leadLabel));
        const tl = (config.dataVisible ? tlBase : 0);
        const firstAlpha = n === 1 ? (config.firstValueAlpha ?? 1) : 1;
        let opacity = tl * (config.dataAlpha ?? 1) * firstAlpha;
        if (n === 4) opacity *= (config.point4Flicker ?? 1);
        if (n === 9) opacity *= (config.point9Flicker ?? 1);
        if (n === 13) opacity *= (config.point13Flicker ?? 1);
        const dim = config.focusDim ?? 0;
        const dim10 = config.focusDim10 ?? 0;
        const dim11 = config.focusDim11 ?? 0;
        if (dim > 0 || dim10 > 0 || dim11 > 0) {
            if (n === 10) opacity *= (1 - 0.55 * dim10);
            else if (n === 11) opacity *= (1 - 0.55 * dim11);
            else opacity *= (1 - 0.55 * dim);
        }
        l.style.opacity = String(opacity);
        l.textContent = String(Math.round(val));
        if (config.specialGrowthEnabled && (n === 10 || n === 11)) {
            const growthTargetN = config.growthTargetN;
            const isGrowthTarget = growthTargetN == null || n === growthTargetN;
            if (isGrowthTarget) {
                const s = 1 + 0.35 * (config.growthEmphasis ?? 0);
                l.setAttribute("transform", `translate(${cx} ${labelY}) scale(${s}) translate(${-cx} ${-labelY})`);
            } else if (l.hasAttribute("transform")) {
                l.removeAttribute("transform");
            }
        } else if (l.hasAttribute("transform")) {
            l.removeAttribute("transform");
        }
    });

    updateXAxisLine();
    
    // Update Paths
    // We treat all data as one continuous path for simplicity now, or keep segments if needed for coloring
    // User didn't object to segments, so keeping them but updating logic
    
    const greenPath = svg.querySelector("#path-green");
    const blackMainPath = svg.querySelector("#path-black-main");
    const blackLastPath = svg.querySelector("#path-black-last");

    // Dynamic drawing: pass config.n to buildPathD
    if (greenPath) greenPath.setAttribute("d", buildPathD(segments.green, config.n));
    if (blackMainPath) blackMainPath.setAttribute("d", buildPathD(segments.blackMain, config.n));
    if (blackLastPath) blackLastPath.setAttribute("d", buildPathD(segments.blackLast, config.n));
}

// DOM Elements
const svg = document.querySelector("#chart");
const gridGroup = document.querySelector("#grid");
const axesGroup = document.querySelector("#axes");
const pointsGroup = document.querySelector("#points");
const labelsGroup = document.querySelector("#labels");
const linePath = document.querySelector("#line-path");

function syncSvgLayout() {
    svg.setAttribute("viewBox", `0 0 ${config.svgWidth} ${config.svgHeight}`);

    const xAxisLine = document.querySelector("#x-axis-line");
    const yAxisLine = document.querySelector("#y-axis-line");
    const axisBaselineY = config.svgHeight - config.margin.bottom;

    if (xAxisLine) {
        xAxisLine.setAttribute("x1", String(config.margin.left));
        xAxisLine.setAttribute("y1", String(axisBaselineY));
        const axisPad = 80;
        xAxisLine.setAttribute("x2", String(xScale(getXAxisExtentN()) + axisPad));
        xAxisLine.setAttribute("y2", String(axisBaselineY));
    }

    if (yAxisLine) {
        yAxisLine.setAttribute("x1", String(config.margin.left));
        yAxisLine.setAttribute("y1", String(axisBaselineY));
        yAxisLine.setAttribute("x2", String(config.margin.left));
        yAxisLine.setAttribute("y2", String(config.margin.top));
        // Ensure visibility
        // yAxisLine.style.stroke = "#000"; // REMOVED: Handled by CSS .axis class
        // yAxisLine.style.strokeWidth = "2px"; // REMOVED: Handled by CSS .axis class
        yAxisLine.style.display = "block";
    }
}

function clearGroup(el) {
    while (el && el.firstChild) el.removeChild(el.firstChild);
}

function ensureAxisLines() {
    const xAxisLineExisting = svg.querySelector("#x-axis-line");
    const yAxisLineExisting = svg.querySelector("#y-axis-line");

    if (!xAxisLineExisting) {
        const xLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
        xLine.setAttribute("id", "x-axis-line");
        xLine.setAttribute("class", "axis x-axis");
        axesGroup.insertBefore(xLine, axesGroup.firstChild);
    }

    if (!yAxisLineExisting) {
        const yLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
        yLine.setAttribute("id", "y-axis-line");
        yLine.setAttribute("class", "axis y-axis");
        axesGroup.insertBefore(yLine, axesGroup.firstChild);
    }

    syncSvgLayout();
}

function ensureCameraGroup() {
    const ns = "http://www.w3.org/2000/svg";
    let cameraGroup = svg.querySelector("#camera-group");
    if (!cameraGroup) {
        cameraGroup = document.createElementNS(ns, "g");
        cameraGroup.setAttribute("id", "camera-group");

        const defs = svg.querySelector("defs");
        if (defs && defs.nextSibling) svg.insertBefore(cameraGroup, defs.nextSibling);
        else svg.appendChild(cameraGroup);
    }

    const moveIntoCamera = (node) => {
        if (!node) return;
        if (node.parentNode !== cameraGroup) cameraGroup.appendChild(node);
    };

    moveIntoCamera(gridGroup);
    moveIntoCamera(axesGroup);
    moveIntoCamera(linePath);
    moveIntoCamera(pointsGroup);
    moveIntoCamera(labelsGroup);

    ["path-green", "path-black-main", "path-black-last"].forEach((id) => {
        const p = svg.querySelector(`#${id}`);
        if (!p) return;
        if (p.parentNode !== cameraGroup) cameraGroup.insertBefore(p, pointsGroup);
    });

    return cameraGroup;
}

function ensureSvgDefs() {
    let defs = svg.querySelector("defs");
    if (!defs) {
        defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
        svg.insertBefore(defs, svg.firstChild);
    }

    if (!defs.querySelector("#growth-gradient-green")) {
        const greenGrad = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
        greenGrad.setAttribute("id", "growth-gradient-green");
        greenGrad.setAttribute("gradientUnits", "userSpaceOnUse");
        greenGrad.setAttribute("x1", String(config.margin.left));
        greenGrad.setAttribute("y1", "0");
        greenGrad.setAttribute("x2", String(config.svgWidth - config.margin.right));
        greenGrad.setAttribute("y2", "0");

        const s1 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
        s1.setAttribute("offset", "0%");
        s1.setAttribute("stop-color", "var(--line-green)");
        greenGrad.appendChild(s1);

        const s2 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
        s2.setAttribute("offset", "70%");
        s2.setAttribute("stop-color", "var(--line-green)");
        greenGrad.appendChild(s2);

        const s3 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
        s3.setAttribute("offset", "100%");
        s3.setAttribute("stop-color", "var(--line-red)");
        greenGrad.appendChild(s3);

        defs.appendChild(greenGrad);
    }

    if (!defs.querySelector("#growth-gradient-black")) {
        const blackGrad = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
        blackGrad.setAttribute("id", "growth-gradient-black");
        blackGrad.setAttribute("gradientUnits", "userSpaceOnUse");
        blackGrad.setAttribute("x1", String(config.margin.left));
        blackGrad.setAttribute("y1", "0");
        blackGrad.setAttribute("x2", String(config.svgWidth - config.margin.right));
        blackGrad.setAttribute("y2", "0");

        const s1 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
        s1.setAttribute("offset", "0%");
        s1.setAttribute("stop-color", "var(--line-red)");
        blackGrad.appendChild(s1);

        const s2 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
        s2.setAttribute("offset", "100%");
        s2.setAttribute("stop-color", "var(--line-black)");
        blackGrad.appendChild(s2);

        defs.appendChild(blackGrad);
    }

    // Semi-transparent background filter for labels
    if (!defs.querySelector("#label-bg")) {
        const filter = document.createElementNS("http://www.w3.org/2000/svg", "filter");
        filter.setAttribute("id", "label-bg");
        filter.setAttribute("x", "-0.1");
        filter.setAttribute("y", "-0.1");
        filter.setAttribute("width", "1.2");
        filter.setAttribute("height", "1.2");

        const flood = document.createElementNS("http://www.w3.org/2000/svg", "feFlood");
        flood.setAttribute("flood-color", "white");
        flood.setAttribute("flood-opacity", "0.3");
        flood.setAttribute("result", "bg");
        filter.appendChild(flood);

        const merge = document.createElementNS("http://www.w3.org/2000/svg", "feMerge");
        const node1 = document.createElementNS("http://www.w3.org/2000/svg", "feMergeNode");
        node1.setAttribute("in", "bg");
        merge.appendChild(node1);
        const node2 = document.createElementNS("http://www.w3.org/2000/svg", "feMergeNode");
        node2.setAttribute("in", "SourceGraphic");
        merge.appendChild(node2);
        filter.appendChild(merge);

        defs.appendChild(filter);
    }
}



// Initialization
function initChart() {
    syncSvgLayout();
    ensureCameraGroup();
    clearGroup(gridGroup);
    Array.from(axesGroup.childNodes).forEach((node) => {
        if (node && node.nodeType === 1) {
            const el = node;
            const id = el.getAttribute && el.getAttribute("id");
            if (id !== "x-axis-line" && id !== "y-axis-line") {
                axesGroup.removeChild(el);
            }
        }
    });
    ensureAxisLines();
    clearGroup(pointsGroup);
    clearGroup(labelsGroup);
    drawGrid();
    drawAxesTicks();
    prepareDataElements();
    startAnimation();
}

function drawGrid() {
    // Horizontal Grid lines - Full range coverage for burst animation
    const yStepsMicro = [0, 50 , 100,150,200,250,300,350,400,450, 500];
    const yStepsSmall = [1000, 1500, 2000, 2500, 3000, 4000];
    const yStepsLarge = [5000, 10000, 15000, 20000, 50000, 100000, 150000, 200000, 250000];
    const ySteps = [
        ...yStepsMicro.map((v) => ({ val: v, group: "micro" })),
        ...yStepsSmall.map((v) => ({ val: v, group: "small" })),
        ...yStepsLarge.map((v) => ({ val: v, group: "large" }))
    ];

    ySteps.forEach(({ val, group }) => {
        const y = yScale(val);
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", config.margin.left);
        line.setAttribute("y1", y);
        line.setAttribute("x2", config.svgWidth - config.margin.right);
        line.setAttribute("y2", y);
        line.setAttribute("class", "grid-line grid-line-h non-scaling"); 
        line.dataset.value = val;
        line.dataset.group = group;
        
        gridGroup.appendChild(line);

        // Y-Axis Labels
        if (val > 0) {
            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.setAttribute("x", config.margin.left - 80);
            text.setAttribute("y", y + 4);
            text.setAttribute("text-anchor", "end");
            text.setAttribute("class", "tick-text");
            text.dataset.value = val; 
            text.dataset.group = group;
            text.textContent = val;
            
            axesGroup.appendChild(text);
        }
    });

    // Vertical Grid lines (0..24)
    for (let i = 0; i <= 24; i++) {
        const x = xScale(i);
        const yTop = config.margin.top;
        const yBottom = config.svgHeight - config.margin.bottom;
        
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", x);
        line.setAttribute("y1", yBottom);
        line.setAttribute("x2", x);
        line.setAttribute("y2", yTop);
        line.setAttribute("class", "grid-line grid-line-v non-scaling");
        line.dataset.n = i;
        
        gridGroup.appendChild(line);
    }
}

function drawAxesTicks() {
    // X-Axis Ticks
    for (let i = 0; i <= 24; i++) {
        const x = xScale(i);
        const y = config.svgHeight - config.margin.bottom;
        
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", x);
        line.setAttribute("y1", y);
        line.setAttribute("x2", x);
        line.setAttribute("y2", y + 6);
        line.setAttribute("class", "tick-line-x");
        line.dataset.n = i;
        axesGroup.appendChild(line);

        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", x);
        text.setAttribute("y", y + 50); // Increased distance
        text.setAttribute("class", "tick-text");
        text.dataset.n = i;
        text.textContent = i;
        axesGroup.appendChild(text);
    }

    // Y-Axis Title (Kissing Number) - Integrated into SVG
    const yTitle = document.createElementNS("http://www.w3.org/2000/svg", "text");
    const yCenter = config.margin.top + (config.svgHeight - config.margin.top - config.margin.bottom) / 2;
    const xPos = 60; // Left of the axis

    yTitle.setAttribute("x", xPos);
    yTitle.setAttribute("y", yCenter);
    yTitle.setAttribute("text-anchor", "middle");
    yTitle.setAttribute("transform", `rotate(-90, ${xPos}, ${yCenter})`);
    yTitle.style.fill = "var(--text-secondary)";
    yTitle.style.fontSize = "32px";
    yTitle.style.fontFamily = '"Helvetica Neue", Helvetica, Arial, sans-serif';
    yTitle.textContent = "Kissing Number";
    axesGroup.appendChild(yTitle);

    // Remove old HTML label if it exists
    const oldHtmlLabel = document.querySelector(".axis-label.y-label");
    if (oldHtmlLabel) oldHtmlLabel.remove();
}

function prepareDataElements() {
    ensureSvgDefs();
    ensureCameraGroup();

    ["path-green", "path-black-main", "path-black-last"].forEach((id) => {
        const existing = svg.querySelector(`#${id}`);
        if (existing) existing.remove();
    });

    // Create Paths
    // Explicitly adding stroke attributes to ensure visibility if CSS fails
    const greenPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    greenPath.setAttribute("d", buildPathD(segments.green));
    greenPath.setAttribute("class", "data-line non-scaling");
    greenPath.setAttribute("fill", "none");
    greenPath.setAttribute("stroke", config.colors.green);
    greenPath.setAttribute("stroke-width", "3.5");
    greenPath.setAttribute("id", "path-green");
    pointsGroup.parentNode.insertBefore(greenPath, pointsGroup);

    const blackMainPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    blackMainPath.setAttribute("d", buildPathD(segments.blackMain));
    blackMainPath.setAttribute("class", "data-line non-scaling");
    blackMainPath.setAttribute("fill", "none");
    blackMainPath.setAttribute("stroke", config.colors.black);
    blackMainPath.setAttribute("stroke-width", "3.5");
    blackMainPath.setAttribute("id", "path-black-main");
    pointsGroup.parentNode.insertBefore(blackMainPath, pointsGroup);

    const blackLastPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    blackLastPath.setAttribute("d", buildPathD(segments.blackLast));
    blackLastPath.setAttribute("class", "data-line non-scaling");
    blackLastPath.setAttribute("fill", "none");
    blackLastPath.setAttribute("stroke", config.colors.black);
    blackLastPath.setAttribute("stroke-width", "3.5");
    blackLastPath.setAttribute("id", "path-black-last");
    pointsGroup.parentNode.insertBefore(blackLastPath, pointsGroup);
    
    // Hide original single path
    linePath.style.display = "none";

    // Create Points and Labels
    data.forEach((d, i) => {
        const x = xScale(d.n);
        const y = yScale(d.val);
        
        let color = config.colors.black;
        let r = 14;
        let labelColor = config.colors.black;
        let labelWeight = "normal";
        let labelSize = "48px"; // Increased base size

        if (d.n === 14) {
            color = config.colors.red;
            labelColor = config.colors.red;
            labelWeight = "normal";
            labelSize = "48px"; // Increased highlight size
            r = 14;
        }

        // Point (reference-style: soft disk + bright core)
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.classList.add("data-point");
        if (d.n === 14) g.classList.add("highlight");
        g.dataset.targetRadius = r;
        g.dataset.n = d.n;
        g.dataset.val = d.val;
        g.id = `point-${i}`;
        g.setAttribute("transform", `translate(${x} ${y}) scale(0)`);
        g.style.opacity = "0";

        const ring = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        ring.classList.add("data-point-ring");
        ring.setAttribute("cx", "0");
        ring.setAttribute("cy", "0");
        ring.setAttribute("r", String(r));
        g.appendChild(ring);

        const halo = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        halo.classList.add("data-point-halo");
        halo.setAttribute("cx", "0");
        halo.setAttribute("cy", "0");
        halo.setAttribute("r", String(r));
        g.appendChild(halo);

        const core = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        core.classList.add("data-point-core");
        core.setAttribute("cx", "0");
        core.setAttribute("cy", "0");
        core.setAttribute("r", String(Math.max(4, r * 0.5)));
        g.appendChild(core);

        pointsGroup.appendChild(g);

        // Label
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", x);
        text.setAttribute("y", y - 28);
        text.classList.add("point-label");
        if (d.n === 7) text.classList.add("highlight");
        
        // text.setAttribute("fill", labelColor); // Handled by CSS
        text.setAttribute("font-weight", labelWeight);
        // Force inline font-size to override any CSS specificity issues
        text.style.fontSize = labelSize; 
        text.setAttribute("opacity", 0);
        text.textContent = d.val; // Set correct value immediately
        text.dataset.finalVal = d.val;
        text.dataset.n = d.n;
        text.dataset.val = d.val;
        text.id = `label-${i}`;
        labelsGroup.appendChild(text);
    });

    updateChartGeometry();
}

function startAnimation() {
    const chartWrapper = document.querySelector(".chart-wrapper");
    const cameraGroup = ensureCameraGroup();
    gsap.set(chartWrapper, { x: 0, y: 0, scale: 1, transformOrigin: "50% 50%" });

    const camera = { x: 0, y: 0, scale: 1 };
    let cameraMode = "static";
    let updateCameraFromConfig = () => {};
    let lockCamera = () => {
        cameraMode = "locked";
    };
    const applyCamera = () => {
        cameraGroup.setAttribute(
            "transform",
            `matrix(${camera.scale} 0 0 ${camera.scale} ${camera.x} ${camera.y})`
        );
    };
    applyCamera();

    const tl = gsap.timeline({
        defaults: { ease: "none" },
        onUpdate: () => {
            updateChartGeometry();
            updateCameraFromConfig();
            applyCamera();
        }
    });
    window.tl = tl;

    const focusState = { active: false, scale: 3.4 };
    const focusTick = (force = false) => {
        if (!focusState.active) return;
        const a = labelsGroup.querySelector('text.point-label[data-n="10"]');
        const b = labelsGroup.querySelector('text.point-label[data-n="11"]');
        if (!a || !b) return;

        const ra = a.getBoundingClientRect();
        const rb = b.getBoundingClientRect();
        const cx = (ra.left + ra.right + rb.left + rb.right) / 4;
        const cy = (ra.top + ra.bottom + rb.top + rb.bottom) / 4;

        const targetX = window.innerWidth * 0.52;
        const targetY = window.innerHeight * 0.48;

        const s = camera.scale || 1;
        const dx = (targetX - cx) / s;
        const dy = (targetY - cy) / s;

        const x0 = camera.x || 0;
        const y0 = camera.y || 0;
        const k = force ? 1 : 0.14;
        camera.x = x0 + dx * k;
        camera.y = y0 + dy * k;
        applyCamera();
    };

    // Initial state
    config.n = 4.0;
    config.yMax = 30; // Close up on 4
    config.axesVisible = true;
    config.dataVisible = true;
    config.dataAlpha = 1;
    config.firstValueAlpha = 1;
    config.point4Flicker = 1;
    config.point9Flicker = 1;
    config.ticksAutoOpacity = true;
    config.specialGrowthEnabled = false;
    config.growthEmphasis = 0;
    config.focusDim = 0;
    config.focusDim10 = 0;
    config.focusDim11 = 0;
    config.growthTargetN = null;
    specialGrowth.v10 = 500;
    specialGrowth.v11 = 582;
    updateChartGeometry();

    const xAxisLine = document.querySelector("#x-axis-line");
    const yAxisLine = document.querySelector("#y-axis-line");
    const yAxisY2 = config.margin.top;
    const axisBaselineY = config.svgHeight - config.margin.bottom;

    // Reset Axes for entrance animation
    // Explicitly hide ticks first
    const xTicks = axesGroup.querySelectorAll("text.tick-text[data-n]");
    const xTickLines = axesGroup.querySelectorAll("line.tick-line-x");
    gsap.set([xTicks, xTickLines], { opacity: 1 });
    
    // Ensure Y-axis ticks are also hidden initially
    const yTicks = Array.from(axesGroup.querySelectorAll("text.tick-text[data-value]"));
    const yGrid = Array.from(gridGroup.querySelectorAll("line.grid-line-h"));
    gsap.set([yTicks, yGrid], { opacity: 1 });

    const yTicksMicro = yTicks
        .filter((el) => el.dataset.group === "micro")
        .sort((a, b) => parseFloat(a.dataset.value) - parseFloat(b.dataset.value));
    const yGridMicro = yGrid
        .filter((el) => el.dataset.group === "micro")
        .sort((a, b) => parseFloat(a.dataset.value) - parseFloat(b.dataset.value));

    const yTicksNonMicro = yTicks.filter((el) => el.dataset.group !== "micro");
    const yGridNonMicro = yGrid.filter((el) => el.dataset.group !== "micro");

    updateXAxisLine();
    gsap.set(yAxisLine, { attr: { y2: yAxisY2 } });
    // Use fromTo in the timeline to ensure robust start state for Y-axis

    // Animation Sequence
    // 0. Axes Entrance (Lines appear first)
    // REMOVED for Part 2 - Start with axes visible
    
    tl.addLabel("start");
     
    // 0.5 Reveal Ticks (X and Y axis ticks fade in) - REMOVED (Handled above)
    // Removed config fade in logic

    tl.addLabel("phase1", "start");

    if (config.cameraEnabled) {
        // --- Enhanced Camera Logic ---
        const axisBaselineY = config.svgHeight - config.margin.bottom;

        /**
         * 根据当前X轴显示终点给镜头一个水平锚点，保证初始阶段能看到坐标轴。
         */
        function getCameraAnchorX() {
            const base = 4;
            const extent = getXAxisExtentN();
            const t = Math.max(0, Math.min(1, (extent - base) / 6));
            return 0.94 + (0.5 - 0.94) * t;
        }

        const valAt = (nFloat) => {
            if (nFloat <= data[0].n) return data[0].val;
            if (nFloat >= data[data.length - 1].n) return data[data.length - 1].val;
            for (let i = 0; i < data.length - 1; i++) {
                const a = data[i];
                const b = data[i + 1];
                if (nFloat >= a.n && nFloat <= b.n) {
                    const t = (nFloat - a.n) / (b.n - a.n);
                    return a.val + (b.val - a.val) * t;
                }
            }
            return data[data.length - 1].val;
        };

        const centerOnXY = (x, y, s, anchorX = 0.5, anchorY = 0.5) => {
            const cx = config.svgWidth * anchorX;
            const cy = config.svgHeight * anchorY;
            return { x: cx - x * s, y: cy - y * s, scale: s };
        };

        const centerOn = (n, val, s) => centerOnXY(xScale(n), yScale(val), s, 0.5, 0.5);

        const framePointWithXAxis = (n, val) => {
            const tx = xScale(n);
            const ty = yScale(val);
            const dist = Math.abs(axisBaselineY - ty);
            const pad = config.svgHeight * 0.18;
            const usable = Math.max(200, config.svgHeight - pad * 2);
            const s = Math.max(1, Math.min(3.5, usable / (dist + 240)));
            const targetY = ty * 0.4 + axisBaselineY * 0.6;
            return centerOnXY(tx, targetY, s, getCameraAnchorX(), 0.62);
        };

        updateCameraFromConfig = () => {
            if (cameraMode !== "follow") return;
            const nNow = config.n;
            const vNow = valAt(nNow);
            const next = framePointWithXAxis(nNow, vNow);
            camera.x = next.x;
            camera.y = next.y;
            camera.scale = next.scale;
        };

        lockCamera = () => {
            const nNow = config.n;
            const vNow = valAt(nNow);
            const next = framePointWithXAxis(nNow, vNow);
            camera.x = next.x;
            camera.y = next.y;
            camera.scale = next.scale;
            cameraMode = "locked";
        };

        // 1. Initial State: Focus on n=4
        const pFocus4 = framePointWithXAxis(4, 24);
        camera.x = pFocus4.x;
        camera.y = pFocus4.y;
        camera.scale = pFocus4.scale;
        applyCamera();

        // Difficulty Phase: Flicker on n=4
        tl.to(config, {
            point4Flicker: 0.25,
            duration: 0.08,
            repeat: 20,
            yoyo: true,
            ease: "steps(1)"
        }, "start");
        tl.set(config, { point4Flicker: 1 }, "breakthrough");
        
        tl.addLabel("breakthrough", "start+=2.5");
        
        // Helper: Fine white halo pulse
        const stepPulse = (n) => {
            const pt = pointsGroup.querySelector(`g.data-point[data-n="${n}"]`);
            if (pt) {
                const halo = pt.querySelector('.data-point-halo');
                if (halo) {
                    // Reset
                    gsap.set(halo, { opacity: 0, attr: { r: 14 } });
                    // Pulse animation
                    const pulseTl = gsap.timeline();
                    pulseTl.to(halo, {
                        opacity: 1,
                        duration: 0.1,
                        ease: "power2.out"
                    })
                    .to(halo, {
                        attr: { r: 60 }, // Expand radius significantly
                        opacity: 0,
                        duration: 0.9,
                        ease: "sine.out"
                    });
                }
            }
        };

        tl.call(() => {
            cameraMode = "follow";
        }, [], "breakthrough+=0.5");

        // 2. Breakthrough at 4
        tl.call(() => stepPulse(4), [], "breakthrough");
        
        // 3. Step by step growth
        const stepDur = 2.0;

        // n=4 to 5
        tl.to(config, { n: 5, yMax: 50, duration: stepDur, ease: "linear" }, "breakthrough+=0.5");
        tl.call(() => stepPulse(5), [], ">-0.1"); // Trigger pulse just before end of move

        // n=5 to 6
        tl.to(config, { n: 6, yMax: 90, duration: stepDur, ease: "linear" }, ">");
        tl.call(() => stepPulse(6), [], ">-0.1");

        // n=6 to 7
        tl.to(config, { n: 7, yMax: 160, duration: stepDur, ease: "linear" }, ">");
        tl.call(() => stepPulse(7), [], ">-0.1");

        // n=7 to 8
        tl.to(config, { n: 8, yMax: 300, duration: stepDur, ease: "linear" }, ">");
        tl.call(() => stepPulse(8), [], ">-0.1");
        tl.to({}, { duration: 2.4 }, ">");

        // n=8 to 9 (new stall)
        const stepDur2 = 1.8;
        tl.to(config, { n: 9, yMax: 340, duration: stepDur2, ease: "linear" }, ">");
        tl.call(() => stepPulse(9), [], ">-0.1");
        tl.addLabel("captureStart9", ">");
        tl.to(config, {
            point9Flicker: 0.25,
            duration: 0.1,
            repeat: 80,
            yoyo: true,
            ease: "steps(1)"
        }, ">");

        tl.to({}, { duration: 2.8 }, "<");

        tl.call(() => {
            cameraMode = "locked";
        }, [], ">");

        // 4. 从9维继续向右：依次点亮10~13维，再让13维闪烁并伴随镜头右移和X轴生长
        const stepDur3 = 1.6;

        // 停止9维的闪烁
        tl.call(() => {
            if (typeof gsap !== "undefined") {
                gsap.killTweensOf(config, "point9Flicker");
            }
            config.point9Flicker = 1;
        }, [], ">");

        // 9 -> 10
        tl.to(config, { n: 10, yMax: 600, duration: stepDur3, ease: "linear" }, ">");
        tl.call(() => stepPulse(10), [], ">-0.1");

        // 10 -> 11
        tl.to(config, { n: 11, yMax: 680, duration: stepDur3, ease: "linear" }, ">");
        tl.call(() => stepPulse(11), [], ">-0.1");

        // 11 -> 12
        tl.to(config, { n: 12, yMax: 950, duration: stepDur3, ease: "linear" }, ">");
        tl.call(() => stepPulse(12), [], ">-0.1");

        // 12 -> 13
        tl.to(config, { n: 13, yMax: 1400, duration: stepDur3, ease: "linear" }, ">");
        tl.call(() => stepPulse(13), [], ">-0.1");

        // 13维闪烁，同时继续向右平移并让X轴生长（n推进到24）
        tl.to(config, {
            point13Flicker: 0.25,
            duration: 0.1,
            repeat: 80,
            yoyo: true,
            ease: "steps(1)"
        }, ">");

        tl.to(config, {
            n: 24,
            duration: 12.0,
            ease: "linear"
        }, ">");

        tl.to(camera, {
            x: "-=450",
            duration: 12.0,
            ease: "sine.inOut"
        }, "<");

    } else {
        // Fallback
        tl.to(config, { n: 8, yMax: 300, duration: 8, ease: "linear" }, "breakthrough");
    }

    if (config.enableFinalPhase) {
        tl.addLabel("final");
        tl.call(() => {
            config.specialGrowthEnabled = true;
            specialGrowth.v10 = 500;
            specialGrowth.v11 = 582;
            config.growthEmphasis = 0;
            config.focusDim = 0;
            config.focusDim10 = 0;
            config.focusDim11 = 0;
            config.growthTargetN = 10;
        }, [], "final");
        
        tl.to(config, {
            focusDim: 1,
            duration: 0.9,
            ease: "sine.inOut"
        }, "final");

        tl.to(config, {
            focusDim11: 1,
            duration: 0.9,
            ease: "sine.inOut"
        }, "final");

        if (config.cameraEnabled) {
            tl.call(() => {
                if (focusState.active) return;
                focusState.active = true;
                gsap.ticker.add(focusTick);
            }, [], "final");

            tl.to(camera, {
                scale: focusState.scale,
                duration: 1.0,
                ease: "sine.inOut"
            }, "final");
        }

        tl.to(specialGrowth, {
            v10: 510,
            duration: 1.25,
            ease: "sine.inOut"
        }, "final+=1.0");

        tl.to(config, {
            growthEmphasis: 1,
            duration: 0.18,
            ease: "power2.out",
            yoyo: true,
            repeat: 1
        }, "final+=1.0");

        tl.to(config, {
            focusDim10: 1,
            focusDim11: 0,
            duration: 0.45,
            ease: "sine.inOut",
            onStart: () => {
                config.growthTargetN = 11;
            }
        }, "final+=2.25");

        tl.to(specialGrowth, {
            v11: 592,
            duration: 1.25,
            ease: "sine.inOut",
            onComplete: () => {
                if (!config.cameraEnabled) return;
                focusTick(true);
                focusState.active = false;
                gsap.ticker.remove(focusTick);
            }
        }, "final+=2.25");

        tl.to(config, {
            growthEmphasis: 1,
            duration: 0.18,
            ease: "power2.out",
            yoyo: true,
            repeat: 1
        }, "final+=2.25");
    }
}

// Run
window.addEventListener('load', () => {
    initChart();
    
    // Toggle Mode
    const toggleBtn = document.getElementById("mode-toggle");
    const syncModeToggleText = () => {
        const isDark = document.body.classList.contains("dark-mode");
        toggleBtn.textContent = isDark ? "Switch to Light Mode" : "Switch to Dark Mode";
    };
    syncModeToggleText();

    toggleBtn.addEventListener("click", () => {
        document.body.classList.toggle("dark-mode");
        syncModeToggleText();
    });

    const cameraBtn = document.getElementById("camera-toggle");
    cameraBtn.textContent = config.cameraEnabled ? "Camera: On" : "Camera: Off";
    cameraBtn.addEventListener("click", () => {
        config.cameraEnabled = !config.cameraEnabled;
        cameraBtn.textContent = config.cameraEnabled ? "Camera: On" : "Camera: Off";
        if (window.tl) window.tl.kill();
        initChart();
    });

    document.addEventListener("keydown", (e) => {
        if (e.key !== "h" && e.key !== "H") return;
        document.body.classList.toggle("controls-visible");
    });
});
