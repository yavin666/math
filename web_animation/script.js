// Data Configuration
const data = [
    { n: 1, val: 2 },
    { n: 2, val: 6 }, { n: 3, val: 12 }, { n: 4, val: 24 }, { n: 5, val: 40 },
    { n: 6, val: 72 }, { n: 7, val: 126 }, { n: 8, val: 240 }, { n: 9, val: 306 },
    { n: 10, val: 500 }, { n: 11, val: 582 }, { n: 12, val: 840 }, { n: 13, val: 1154 },
    { n: 14, val: 1932 }, { n: 15, val: 2564 }, { n: 16, val: 4320 }, { n: 17, val: 5730 },
    { n: 18, val: 7654 }, { n: 19, val: 11692 }, { n: 20, val: 19448 },
    { n: 21, val: 29768 }, { n: 22, val: 49896 }, { n: 23, val: 93150 }, { n: 24, val: 196560 },
    { n: 25, val: 197048 }, { n: 26, val: 198512 }, { n: 27, val: 199976 }, { n: 28, val: 204368 },
    { n: 29, val: 208272 }, { n: 30, val: 219984 }, { n: 31, val: 232874 }
];

// Configuration
const config = {
    svgWidth: 2200, 
    svgHeight: 1200, 
    margin: { top: 100, right: 120, bottom: 160, left: 180 }, // Increased margins for labels
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
    specialGrowthEnabled: false,
    growthEmphasis: 0,
    focusDim: 0,
    focusDim10: 0,
    focusDim11: 0,
    growthTargetN: null
};

const specialGrowth = { v10: 500, v11: 582 };

// Dimensions
const width = config.svgWidth - config.margin.left - config.margin.right;
const height = config.svgHeight - config.margin.top - config.margin.bottom;

// Scales
const xScale = (n) => config.margin.left + (n / 24) * width;

const segments = {
    green: data.slice(0, 14), // n=2 to n=14 (value 1932)
    blackMain: data.slice(13, 18), // Overlap at n=14 to continue smoothly
    blackLast: data.slice(17, data.length) // Include all remaining points
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
        if (n >= 24) {
            const stepA = 20;
            const stepB = 10;
            if (n <= 28) {
                yOffset = -((n - 24) * stepA);
            } else {
                yOffset = -((28 - 24) * stepA) - ((n - 28) * stepB);
            }
        }
        const labelY = cy - 40 + yOffset;
        l.setAttribute("y", String(labelY));

        const leadLabel = 0.55;
        const tlBase = Math.max(0, Math.min(1, (config.n - (n - leadLabel)) / leadLabel));
        const tl = (config.dataVisible ? tlBase : 0);
        const firstAlpha = n === 1 ? (config.firstValueAlpha ?? 1) : 1;
        let opacity = tl * (config.dataAlpha ?? 1) * firstAlpha;
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

    // Axis Lines
    // REMOVED from here to allow GSAP animation to control them
    // Only update if not animating or handle logic differently if needed
    // But currently these are static or animated once.
    // updateChartGeometry is called on every GSAP tick, so setting attributes here
    // overwrites GSAP's work.
    
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
    const xAxisX2 = config.svgWidth - config.margin.right + 80;

    if (xAxisLine) {
        xAxisLine.setAttribute("x1", String(config.margin.left));
        xAxisLine.setAttribute("y1", String(axisBaselineY));
        xAxisLine.setAttribute("x2", String(xAxisX2));
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
    const yStepsMicro = [0, 100, 200, 300, 400, 500];
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

    // Vertical Grid lines (0..31)
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
}

function prepareDataElements() {
    ensureSvgDefs();

    // Create Paths
    // Explicitly adding stroke attributes to ensure visibility if CSS fails
    const greenPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    greenPath.setAttribute("d", buildPathD(segments.green));
    greenPath.setAttribute("class", "data-line non-scaling");
    greenPath.setAttribute("fill", "none");
    greenPath.setAttribute("stroke", config.colors.green);
    greenPath.setAttribute("stroke-width", "3.5");
    greenPath.setAttribute("id", "path-green");
    svg.insertBefore(greenPath, pointsGroup);

    const blackMainPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    blackMainPath.setAttribute("d", buildPathD(segments.blackMain));
    blackMainPath.setAttribute("class", "data-line non-scaling");
    blackMainPath.setAttribute("fill", "none");
    blackMainPath.setAttribute("stroke", config.colors.black);
    blackMainPath.setAttribute("stroke-width", "3.5");
    blackMainPath.setAttribute("id", "path-black-main");
    svg.insertBefore(blackMainPath, pointsGroup);

    const blackLastPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    blackLastPath.setAttribute("d", buildPathD(segments.blackLast));
    blackLastPath.setAttribute("class", "data-line non-scaling");
    blackLastPath.setAttribute("fill", "none");
    blackLastPath.setAttribute("stroke", config.colors.black);
    blackLastPath.setAttribute("stroke-width", "3.5");
    blackLastPath.setAttribute("id", "path-black-last");
    svg.insertBefore(blackLastPath, pointsGroup);
    
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
        let labelSize = "36px"; // Increased base size

        if (d.n === 14) {
            color = config.colors.red;
            labelColor = config.colors.red;
            labelWeight = "normal";
            labelSize = "36px"; // Increased highlight size
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
        text.setAttribute("y", y - 28);
        text.classList.add("point-label");
        if (d.n === 14) text.classList.add("highlight");
        
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
    const tl = gsap.timeline({ 
        defaults: { ease: "none" },
        onUpdate: updateChartGeometry
    });
    window.tl = tl;

    const chartWrapper = document.querySelector(".chart-wrapper");
    gsap.set(chartWrapper, {
        x: 0,
        y: 0,
        scale: 1,
        transformOrigin: config.cameraEnabled ? "0% 100%" : "50% 50%"
    });

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

        const s = Number(gsap.getProperty(chartWrapper, "scaleX")) || 1;
        const dx = (targetX - cx) / s;
        const dy = (targetY - cy) / s;

        const x0 = Number(gsap.getProperty(chartWrapper, "x")) || 0;
        const y0 = Number(gsap.getProperty(chartWrapper, "y")) || 0;
        const k = force ? 1 : 0.14;
        gsap.set(chartWrapper, { x: x0 + dx * k, y: y0 + dy * k });
    };

    // Initial state
    config.n = 1.0;
    config.yMax = 600;
    config.axesVisible = false;
    config.dataVisible = false;
    config.dataAlpha = 0;
    config.firstValueAlpha = 0;
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

    const xAxisLine = document.querySelector("#x-axis-line");
    const yAxisLine = document.querySelector("#y-axis-line");
    const xAxisX2 = config.svgWidth - config.margin.right + 80;
    const yAxisY2 = config.margin.top;
    const axisBaselineY = config.svgHeight - config.margin.bottom;

    // Reset Axes for entrance animation
    // Explicitly hide ticks first
    const xTicks = axesGroup.querySelectorAll("text.tick-text[data-n]");
    const xTickLines = axesGroup.querySelectorAll("line.tick-line-x");
    gsap.set([xTicks, xTickLines], { opacity: 0 });
    
    // Ensure Y-axis ticks are also hidden initially
    const yTicks = Array.from(axesGroup.querySelectorAll("text.tick-text[data-value]"));
    const yGrid = Array.from(gridGroup.querySelectorAll("line.grid-line-h"));
    gsap.set([yTicks, yGrid], { opacity: 0 });

    const yTicksMicro = yTicks
        .filter((el) => el.dataset.group === "micro")
        .sort((a, b) => parseFloat(a.dataset.value) - parseFloat(b.dataset.value));
    const yGridMicro = yGrid
        .filter((el) => el.dataset.group === "micro")
        .sort((a, b) => parseFloat(a.dataset.value) - parseFloat(b.dataset.value));

    const yTicksNonMicro = yTicks.filter((el) => el.dataset.group !== "micro");
    const yGridNonMicro = yGrid.filter((el) => el.dataset.group !== "micro");

    gsap.set(xAxisLine, { attr: { x2: config.margin.left } });
    // Use fromTo in the timeline to ensure robust start state for Y-axis

    // Animation Sequence
    // 0. Axes Entrance (Lines appear first)
    tl.to(xAxisLine, { duration: 1.5, attr: { x2: xAxisX2 }, ease: "power2.out" })
      // X Ticks: Appear from left to right, following the line
      .to([xTickLines, xTicks], { 
          duration: 0.5, 
          opacity: 1, 
          stagger: 0.03, // Staggered appearance
          ease: "power1.out" 
      }, "<0.1") // Start shortly after line starts

      // Micro Y ticks (<=500): bottom -> top, together with X ticks
      .to(yGridMicro, { duration: 0.5, opacity: 1, stagger: 0.06, ease: "power1.out" }, "<")
      .to(yTicksMicro, { duration: 0.5, opacity: 1, stagger: 0.06, ease: "power1.out" }, "<")
      
      .fromTo(yAxisLine, 
          { attr: { y2: axisBaselineY } }, 
          { duration: 1.0, attr: { y2: yAxisY2 }, ease: "power2.out" }, 
          "<"
      )
      
      // Y Ticks: Fade in
      .to(yGridNonMicro, { duration: 0.5, opacity: 1, stagger: 0.05 }, "<0.2")
      .to(yTicksNonMicro, { duration: 0.5, opacity: 1, stagger: 0.05 }, "<");
    
    tl.addLabel("afterAxes");
     
    // 0.5 Reveal Ticks (X and Y axis ticks fade in) - REMOVED (Handled above)
    tl.to(config, {
        duration: 0.1,
        onStart: () => {
            config.axesVisible = true;
            config.dataVisible = true;
            config.dataAlpha = 0;
            config.firstValueAlpha = 0;
        }
    });

    tl.to(config, {
        dataAlpha: 1,
        duration: 0.6,
        ease: "power1.out"
    }, "<+0.05");
    
    tl.to(config, {
        firstValueAlpha: 1,
        duration: 0.35,
        ease: "power1.out"
    }, "<+2.0");

    tl.call(() => {
        config.ticksAutoOpacity = true;
    });

    tl.addLabel("phase1", "afterAxes+=3.0");

    if (config.cameraEnabled) {
        const rect = chartWrapper.getBoundingClientRect();

        const pFull = { x: 0, y: 0, s: 1 };
        const pClose = { x: rect.width * 0.22, y: -rect.height * 0.16, s: 2.35 };
        const pMid = { x: -rect.width * 0.10, y: -rect.height * 0.06, s: 1.45 };
        const pEnd = { x: 0, y: 0, s: 1 };

        const catmullRom = (p0, p1, p2, p3, t) => {
            const t2 = t * t;
            const t3 = t2 * t;
            return 0.5 * (
                (2 * p1) +
                (-p0 + p2) * t +
                (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
                (-p0 + 3 * p1 - 3 * p2 + p3) * t3
            );
        };

        const samplePath = (p) => {
            const segLen = 1 / 3;
            if (p <= segLen) {
                const t = p / segLen;
                return {
                    x: catmullRom(pFull.x, pFull.x, pClose.x, pMid.x, t),
                    y: catmullRom(pFull.y, pFull.y, pClose.y, pMid.y, t),
                    s: catmullRom(pFull.s, pFull.s, pClose.s, pMid.s, t)
                };
            }
            if (p <= 2 * segLen) {
                const t = (p - segLen) / segLen;
                return {
                    x: catmullRom(pFull.x, pClose.x, pMid.x, pEnd.x, t),
                    y: catmullRom(pFull.y, pClose.y, pMid.y, pEnd.y, t),
                    s: catmullRom(pFull.s, pClose.s, pMid.s, pEnd.s, t)
                };
            }
            const t = (p - 2 * segLen) / segLen;
            return {
                x: catmullRom(pClose.x, pMid.x, pEnd.x, pEnd.x, t),
                y: catmullRom(pClose.y, pMid.y, pEnd.y, pEnd.y, t),
                s: catmullRom(pClose.s, pMid.s, pEnd.s, pEnd.s, t)
            };
        };

        const camera = { p: 0 };
        const applyCamera = () => {
            const v = samplePath(camera.p);
            gsap.set(chartWrapper, { x: v.x, y: v.y, scale: v.s });
        };

        tl.call(applyCamera, [], "afterAxes");

        tl.to(camera, {
            p: 2 / 3,
            duration: 9,
            ease: "sine.inOut",
            onUpdate: applyCamera
        }, "afterAxes");

        tl.to(camera, {
            p: 1,
            duration: 2.0,
            ease: "sine.inOut",
            onUpdate: applyCamera
        }, "afterAxes+=9");
    }

    // 1. Slow start (n=2 to n=14) 
    // Keep number/point progression unchanged; delay only yMax scaling
    tl.to(config, {
        n: 14,
        duration: 7,
        ease: "linear"
    }, "phase1");
    tl.to(config, {
        yMax: 2500,
        duration: 7,
        ease: "linear"
    }, "phase1");

    // 2. The Burst (approaching n=16 and beyond)
    // User wants "burst at ~5000". n=16 is 4320.
    // We accelerate n and drastically increase yMax
    tl.to(config, {
        n: 24,
        duration: 6,
        ease: "power4.inOut"
    }, "phase1+=7");
    tl.to(config, {
        yMax: 200000,
        duration: 6,
        ease: "power4.inOut"
    }, "<+0.45");

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

        tl.to(chartWrapper, {
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
