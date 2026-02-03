// Data Configuration
const data = [
    { n: 1, val: 2 },
    { n: 2, val: 6 }, { n: 3, val: 12 }, { n: 4, val: 24 }, { n: 5, val: 40 },
    { n: 6, val: 72 }, { n: 7, val: 126 }, { n: 8, val: 240 }, { n: 9, val: 306 },
    { n: 10, val: 500 }, { n: 11, val: 582 }, { n: 12, val: 840 }, { n: 13, val: 1154 },
    { n: 14, val: 1932 }, { n: 15, val: 2564 }, { n: 16, val: 4320 }
];

// Configuration
const config = {
    svgWidth: 2200, 
    svgHeight: 1200, 
    margin: { top: 240, right: 260, bottom: 420, left: 360 }, // Increased margins for labels
    colors: {
        green: "#2e7d32",
        red: "#d32f2f",
        black: "#333333" 
    },
    yMax: 5000, 
    n: 16, 
    maxN: 16,
    cameraEnabled: true,
    dataAlpha: 0,
    firstValueAlpha: 0,
    greenifyN: 0,
    point4Flicker: 1,
    point9Flicker: 1,
    point14Flicker: 1, // Added flicker property for n=14
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
    const max = config.maxN ?? 24;
    return max;
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
    // Remove vertical grid lines (Cleanup per user request)
    const gridLinesV = gridGroup.querySelectorAll("line.grid-line-v");
    gridLinesV.forEach(line => line.remove());

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
        const emphasis = 1;
        p.setAttribute("transform", `translate(${x} ${y}) scale(${tp * firstAlpha * emphasis})`);
        let opacity = tp * (config.dataAlpha ?? 1) * firstAlpha;
        if (n === 4) opacity *= (config.point4Flicker ?? 1);
        if (n === 7) opacity *= (config.point9Flicker ?? 1);
        if (n === 14) opacity *= (config.point14Flicker ?? 1);
        const dim = config.focusDim ?? 0;
        const dim10 = config.focusDim10 ?? 0;
        const dim11 = config.focusDim11 ?? 0;
        if (dim > 0 || dim10 > 0 || dim11 > 0) {
            if (n === 10) opacity *= (1 - 0.55 * dim10);
            else if (n === 11) opacity *= (1 - 0.55 * dim11);
            else opacity *= (1 - 0.55 * dim);
        }

        const greenifyN = Number.isFinite(config.greenifyN) ? config.greenifyN : 0;
        const isGreen = n <= greenifyN + 1e-6;
        p.classList.toggle("is-green", isGreen);
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
        if (n === 7) opacity *= (config.point9Flicker ?? 1);
        if (n === 14) opacity *= (config.point14Flicker ?? 1);
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

        const greenifyN = Number.isFinite(config.greenifyN) ? config.greenifyN : 0;
        const isGreen = n <= greenifyN + 1e-6;
        l.classList.toggle("is-green", isGreen);

        if (l.hasAttribute("transform")) {
            l.removeAttribute("transform");
        }
    });

    updateXAxisLine();
    
    // Update Paths
    // We treat all data as one continuous path for simplicity now, or keep segments if needed for coloring
    // User didn't object to segments, so keeping them but updating logic
    
    const greenPath = svg.querySelector("#path-green");
    const greenOverlayPath = svg.querySelector("#path-green-overlay");
    const blackMainPath = svg.querySelector("#path-black-main");
    const blackLastPath = svg.querySelector("#path-black-last");

    // Dynamic drawing: pass config.n to buildPathD
    if (greenPath) greenPath.setAttribute("d", buildPathD(segments.green, config.n));
    if (greenOverlayPath) greenOverlayPath.setAttribute("d", buildPathD(segments.green, Math.min(config.greenifyN ?? 0, config.n)));
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

    ["path-green", "path-green-overlay", "path-black-main", "path-black-last"].forEach((id) => {
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
    const yStepsMicro = [0,  500];
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
    yTitle.style.fontSize = "26px";
    yTitle.style.fontFamily = '"Helvetica Neue", Helvetica, Arial, sans-serif';
    yTitle.textContent = "Kissing Number";
    axesGroup.appendChild(yTitle);

    // Remove old HTML label if it exists
    const oldHtmlLabelY = document.querySelector(".axis-label.y-label");
    if (oldHtmlLabelY) oldHtmlLabelY.remove();
}

function prepareDataElements() {
    ensureSvgDefs();
    ensureCameraGroup();

    ["path-green", "path-green-overlay", "path-black-main", "path-black-last"].forEach((id) => {
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

    const greenOverlayPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    greenOverlayPath.setAttribute("d", buildPathD(segments.green, 0));
    greenOverlayPath.setAttribute("class", "data-line non-scaling");
    greenOverlayPath.setAttribute("fill", "none");
    greenOverlayPath.setAttribute("stroke-width", "4.5");
    greenOverlayPath.setAttribute("id", "path-green-overlay");
    pointsGroup.parentNode.insertBefore(greenOverlayPath, pointsGroup);

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
        let r = 10;
        let labelColor = config.colors.black;
        let labelWeight = "normal";
        let labelSize = "28px";

        if (d.n === 14) {
            color = config.colors.red;
            labelColor = config.colors.red;
            labelWeight = "normal";
            labelSize = "28px";
            r = 12;
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
        core.setAttribute("r", String(Math.max(4, r * 0.3)));
        g.appendChild(core);

        pointsGroup.appendChild(g);

        // Label
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", x);
        text.setAttribute("y", y - 20);
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
    const updateCameraFromConfig = () => {};
    const applyCamera = () => {
        if (config.cameraEnabled) {
            cameraGroup.setAttribute(
                "transform",
                `matrix(${camera.scale} 0 0 ${camera.scale} ${camera.x} ${camera.y})`
            );
        }
    };

    const tl = gsap.timeline({
        defaults: { ease: "none" },
        onUpdate: () => {
            updateChartGeometry();
            updateCameraFromConfig();
            applyCamera();
        }
    });
    window.tl = tl;

    // Initial state
    config.n = 16.0;
    config.yMax = 5000;
    config.axesVisible = true;
    config.dataVisible = true;
    config.dataAlpha = 1;
    config.firstValueAlpha = 1;
    config.greenifyN = 13;
    config.point4Flicker = 1;
    config.point9Flicker = 1;
    config.ticksAutoOpacity = false;
    config.specialGrowthEnabled = false;
    config.growthEmphasis = 0;
    config.focusDim = 0;
    config.focusDim10 = 0;
    config.focusDim11 = 0;
    config.growthTargetN = null;
    specialGrowth.v10 = 500;
    specialGrowth.v11 = 582;
    updateChartGeometry();

    const enablePoint14OpacityFlicker = () => {
        if (typeof gsap === "undefined") return;
        if (!config) return;

        gsap.killTweensOf(config, "point14Flicker");
        config.point14Flicker = 1;
        gsap.to(config, {
            point14Flicker: 0.35,
            duration: 1.5,
            yoyo: true,
            repeat: -1,
            ease: "sine.inOut",
            overwrite: "auto",
            onUpdate: () => {
                updateChartGeometry();
            }
        });
    };
    enablePoint14OpacityFlicker();

    const focusCameraOnRange = (fromN, toN, centerValueY = null) => {
        const n1 = Math.min(fromN, toN);
        const n2 = Math.max(fromN, toN);
        const x1 = xScale(n1);
        const x2 = xScale(n2);

        const yTop = yScale(2000);
        const yBottom = config.svgHeight - config.margin.bottom;

        const padX = (x2 - x1) * 0.18;
        const padY = (yBottom - yTop) * 0.18;

        const boxX1 = x1 - padX;
        const boxX2 = x2 + padX;
        const boxY1 = yTop - padY;
        const boxY2 = yBottom + padY;

        const w = Math.max(1, boxX2 - boxX1);
        const h = Math.max(1, boxY2 - boxY1);
        const baseScale = Math.max(0.1, Math.min(6, Math.min(config.svgWidth / w, config.svgHeight / h)));
        const scale = Math.max(0.1, Math.min(6, baseScale * 1.18));

        const cx = (boxX1 + boxX2) / 2;
        const cy = Number.isFinite(centerValueY) ? yScale(centerValueY) : (boxY1 + boxY2) / 2;
        camera.scale = scale;
        camera.x = config.svgWidth / 2 - cx * scale;
        camera.y = config.svgHeight / 2 - cy * scale;
    };

    focusCameraOnRange(11, 17, 2000);
    applyCamera();

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
    tl.addLabel("intro");
     
    // 0.5 Reveal Ticks (X and Y axis ticks fade in) - REMOVED (Handled above)
    // Removed config fade in logic

    tl.addLabel("start", "intro+=1.8");
    tl.addLabel("phase1", "start");

    if (config.cameraEnabled) {
        // Helper: Fine white halo pulse
        const stepPulse = (n) => {
            const pt = pointsGroup.querySelector(`g.data-point[data-n="${n}"]`);
            if (pt) {
                const ring = pt.querySelector('.data-point-ring');
                if (ring) {
                    const baseR = Number(pt.dataset.targetRadius) || 10;
                    // Reset
                    gsap.set(ring, { opacity: 0, attr: { r: baseR } });
                    // Pulse animation
                    const pulseTl = gsap.timeline();
                    pulseTl.to(ring, {
                        opacity: 1,
                        duration: 0.1,
                        ease: "power2.out"
                    })
                    .to(ring, {
                        attr: { r: baseR * 4.3 },
                        opacity: 0,
                        duration: 0.6, // Faster (was 0.9)
                        ease: "sine.out"
                    });
                }
            }
        };

        tl.to({}, { duration: 0.35 }, "start");
        tl.addLabel("captureStart9", "start+=0.35");

        tl.to({}, { duration: 1.0 }, "<"); // Reduced parallel wait (was 2.8)

        // Transition Phase: Focus 14, Expand to 24
        // Calculate target camera state for n=14 when n=24
        // Since we cannot predict exact values easily without running simulation,
        // we will use a tl.call to calculate start/end and trigger a parallel tween?
        // No, simpler: We animate camera to a target that we approximate or calculate on the fly.
        // Actually, we can use a "lazy" tween or just use a helper function that returns the target.
        // But `framePointWithXAxis` depends on `config.n`.
        // We will perform a special transition where we update camera manually.
        
        tl.addLabel("expandView", ">");
        const transitionDur = 2.0;

        tl.to(config, {
            n: 24,
            duration: transitionDur,
            ease: "power2.inOut"
        }, "expandView");

        // After 14 flicker completes, continue expanding to full view
        tl.addLabel("fullExpand", ">");

        // 停止在14，不再继续向后点亮
        /*
        tl.to(config, {
            greenifyN: 24,
            duration: 12.0,
            ease: "linear"
        }, ">");
        */

        // tl.to(camera, {
        //     x: "-=450",
        //     duration: 12.0,
        //     ease: "sine.inOut"
        // }, "<");

    } else {
        // Fallback
        // tl.to(config, { n: 8, yMax: 300, duration: 8, ease: "linear" }, "breakthrough");
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
    document.body.classList.add("dark-mode");
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
