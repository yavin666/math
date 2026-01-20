// Data Configuration
const data = [
    { n: 25, val: 197048 }, { n: 26, val: 198512 }, { n: 27, val: 199976 }, { n: 28, val: 204368 },
    { n: 29, val: 208272 }, { n: 30, val: 219984 }, { n: 31, val: 232874 }
];

// Configuration
const config = {
    svgWidth: 2200, 
    svgHeight: 1200, 
    margin: { top: 200, right: 220, bottom: 260, left: 320 }, // Increased margins for labels
    colors: {
        green: "#2e7d32",
        red: "#d32f2f",
        black: "#333333" 
    },
    minN: 25,
    xPad: 140,
    yMin: 190000,
    yMax: 240000, 
    n: 31, 
    maxN: 31,
    cameraEnabled: true,
    dataAlpha: 0,
    firstValueAlpha: 0,
    point4Flicker: 1,
    point9Flicker: 1,
    point13Flicker: 1,
    point15Flicker: 1,
    specialGrowthEnabled: false,
    growthEmphasis: 0,
    focusDim: 0,
    focusDim10: 0,
    focusDim11: 0,
    growthTargetN: null,
    enableFinalPhase: false,
    minAxisN: 31 // New config for manual axis expansion
};

const specialGrowth = { v10: 500, v11: 582 };

// Dimensions
const width = config.svgWidth - config.margin.left - config.margin.right;
const height = config.svgHeight - config.margin.top - config.margin.bottom;

// Scales
const xScale = (n) => {
    const extent = getXAxisExtentN();
    const start = config.minN ?? 0;
    const span = Math.max(extent - start, 1);
    const xPad = config.xPad ?? 0;
    const plotLeft = config.margin.left + xPad;
    const plotWidth = Math.max(1, width - xPad);
    return plotLeft + ((n - start) / span) * plotWidth;
};

/**
 * 获取X轴当前应显示到的维度终点（初始为4，随后随摄像机右移对应的n增长）。
 */
function getXAxisExtentN() {
    const base = config.minN ?? 0;
    const max = config.maxN ?? 24;
    const nNow = Number.isFinite(config.n) ? config.n : 0;
    const minN = config.minAxisN ?? 0;
    return Math.max(base, Math.min(max, nNow), minN);
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
    const yMin = Number.isFinite(config.yMin) ? config.yMin : 0;
    const effectiveYMax = Math.max(config.yMax, yMin + 1);
    return baseline - ((val - yMin) / (effectiveYMax - yMin)) * h;
};

const createStarPath = (r) => {
    // 5-point star path
    let path = "";
    for (let i = 0; i < 5; i++) {
        const theta = (Math.PI * 2 * i) / 5 - Math.PI / 2;
        const x = Math.cos(theta) * r;
        const y = Math.sin(theta) * r;
        path += (i === 0 ? "M" : "L") + ` ${x} ${y}`;
        
        const thetaInner = theta + Math.PI / 5;
        const rInner = r * 0.5; // Classic 5-point ratio
        const xInner = Math.cos(thetaInner) * rInner;
        const yInner = Math.sin(thetaInner) * rInner;
        path += ` L ${xInner} ${yInner}`;
    }
    path += "Z";
    return path;
};

const create3DGoldStarGroup = (r) => {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    
    // 5 points, 3D faceted look with Warm/Gold tones
    for (let i = 0; i < 5; i++) {
        const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
        const angleInner = angle + Math.PI / 5;
        const angleInnerPrev = angle - Math.PI / 5;

        const outerX = Math.cos(angle) * r;
        const outerY = Math.sin(angle) * r;

        const rInner = r * 0.5; 
        const innerX = Math.cos(angleInner) * rInner;
        const innerY = Math.sin(angleInner) * rInner;

        const innerPrevX = Math.cos(angleInnerPrev) * rInner;
        const innerPrevY = Math.sin(angleInnerPrev) * rInner;

        // Left Face (Shadow/Warm Gold)
        const pLeft = document.createElementNS("http://www.w3.org/2000/svg", "path");
        pLeft.setAttribute("d", `M 0 0 L ${innerPrevX} ${innerPrevY} L ${outerX} ${outerY} Z`);
        pLeft.setAttribute("fill", "#f5deb3"); // Wheat (Warm Shadow)
        pLeft.setAttribute("stroke", "none");
        g.appendChild(pLeft);

        // Right Face (Highlight/Ivory)
        const pRight = document.createElementNS("http://www.w3.org/2000/svg", "path");
        pRight.setAttribute("d", `M 0 0 L ${outerX} ${outerY} L ${innerX} ${innerY} Z`);
        pRight.setAttribute("fill", "#fffbf0"); // Warm White (Highlight)
        pRight.setAttribute("stroke", "none");
        g.appendChild(pRight);
    }
    
    // Central Glow (Core)
    const core = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    core.setAttribute("cx", "0");
    core.setAttribute("cy", "0");
    core.setAttribute("r", String(r * 0.25));
    core.setAttribute("fill", "url(#star-glass-gradient)"); // Use the nice gradient for the core
    core.setAttribute("opacity", "0.8");
    g.appendChild(core);

    return g;
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
        const yMin = Number.isFinite(config.yMin) ? config.yMin : 0;
        const isTooLow = val > yMin && y > (config.svgHeight - config.margin.bottom - 30);
        
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
        const yMin = Number.isFinite(config.yMin) ? config.yMin : 0;
        const isTooLow = val > yMin && y > (config.svgHeight - config.margin.bottom - 40); 
        
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
        if (n === 15) opacity *= (config.point15Flicker ?? 1);
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
        const labelY = cy - 40;
        l.setAttribute("y", String(labelY));

        const leadLabel = 0.55;
        const tlBase = Math.max(0, Math.min(1, (config.n - (n - leadLabel)) / leadLabel));
        const tl = (config.dataVisible ? tlBase : 0);
        const firstAlpha = n === 1 ? (config.firstValueAlpha ?? 1) : 1;
        let opacity = tl * (config.dataAlpha ?? 1) * firstAlpha;
        if (n === 4) opacity *= (config.point4Flicker ?? 1);
        if (n === 9) opacity *= (config.point9Flicker ?? 1);
        if (n === 13) opacity *= (config.point13Flicker ?? 1);
        if (n === 15) opacity *= (config.point15Flicker ?? 1);
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
const particleGroup = document.querySelector("#particles");
const labelsGroup = document.querySelector("#labels");

function triggerParticleExplosion(n) {
    const d = data.find(item => item.n === n);
    if (!d) return;
    
    const cx = xScale(d.n);
    const cy = yScale(d.val);
    
    // 1. Large Halo Ring (Shockwave)
    const halo = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    halo.setAttribute("cx", cx);
    halo.setAttribute("cy", cy);
    halo.setAttribute("r", 0);
    halo.setAttribute("fill", "none");
    halo.setAttribute("stroke", "white");
    halo.setAttribute("stroke-width", 4);
    halo.style.opacity = 0.8;
    particleGroup.appendChild(halo);
    
    gsap.to(halo, {
        attr: { r: 400, "stroke-width": 0 },
        opacity: 0,
        duration: 2.5,
        ease: "power2.out",
        onComplete: () => halo.remove()
    });

    // 2. Secondary Halo
    const halo2 = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    halo2.setAttribute("cx", cx);
    halo2.setAttribute("cy", cy);
    halo2.setAttribute("r", 0);
    halo2.setAttribute("fill", "none");
    halo2.setAttribute("stroke", "gold"); // Distinct color for breakthrough
    halo2.setAttribute("stroke-width", 2);
    halo2.style.opacity = 0.6;
    particleGroup.appendChild(halo2);
    
    gsap.to(halo2, {
        attr: { r: 300, "stroke-width": 0 },
        opacity: 0,
        duration: 2.0,
        delay: 0.2,
        ease: "power2.out",
        onComplete: () => halo2.remove()
    });

    // 3. Particles
    const particleCount = 60;
    for (let i = 0; i < particleCount; i++) {
        const p = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        p.setAttribute("cx", cx);
        p.setAttribute("cy", cy);
        p.setAttribute("r", Math.random() * 3 + 1);
        p.setAttribute("fill", Math.random() > 0.5 ? "white" : "#ffd700"); // White and Gold
        p.style.opacity = 1;
        particleGroup.appendChild(p);
        
        const angle = Math.random() * Math.PI * 2;
        const dist = 100 + Math.random() * 200;
        const dur = 1 + Math.random() * 1.5;
        
        gsap.to(p, {
            attr: {
                cx: cx + Math.cos(angle) * dist,
                cy: cy + Math.sin(angle) * dist
            },
            opacity: 0,
            duration: dur,
            ease: "power2.out",
            onComplete: () => p.remove()
        });
    }
    
    // 4. Flash
    const flash = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    flash.setAttribute("cx", cx);
    flash.setAttribute("cy", cy);
    flash.setAttribute("r", 10);
    flash.setAttribute("fill", "white");
    flash.style.opacity = 1;
    particleGroup.appendChild(flash);
    
    gsap.to(flash, {
        attr: { r: 150 },
        opacity: 0,
        duration: 0.6,
        ease: "power1.out",
        onComplete: () => flash.remove()
    });
}

function emitBumpParticles(cx, cy) {
    const particleCount = 20; // Fewer but clearer particles for bump
    for (let i = 0; i < particleCount; i++) {
        const p = document.createElementNS("http://www.w3.org/2000/svg", "rect"); // Use rect for "brick fragments" feel
        const size = Math.random() * 6 + 4;
        p.setAttribute("x", cx - size / 2);
        p.setAttribute("y", cy - size / 2);
        p.setAttribute("width", size);
        p.setAttribute("height", size);
        p.setAttribute("fill", Math.random() > 0.3 ? "#ffd700" : "#ffffff"); 
        p.style.opacity = 1;
        particleGroup.appendChild(p);
        
        // Shoot mostly upwards and outwards
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 2; // -PI/2 is UP. Spread +/- 1 radian (~60 deg)
        const dist = 60 + Math.random() * 80;
        const dur = 0.8 + Math.random() * 0.6;
        
        // Physics-ish animation
        const endX = cx + Math.cos(angle) * dist * 1.5;
        const endY = cy + Math.sin(angle) * dist + 100; // Gravity pulls down
        
        gsap.to(p, {
            attr: { x: endX, y: endY },
            rotation: Math.random() * 360,
            opacity: 0,
            duration: dur,
            ease: "power2.out", // Start fast, slow down? No, projectile motion is better simulated via custom ease or physics.
            // Simple approach: Linear motion for X, Power1.in for Y (gravity) - hard to split in one tween.
            // Just use power2.out for "explosion" feel.
            ease: "circ.out",
            onComplete: () => p.remove()
        });
    }
}
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

    if (!defs.querySelector("#star-glass-gradient")) {
        const starGrad = document.createElementNS("http://www.w3.org/2000/svg", "radialGradient");
        starGrad.setAttribute("id", "star-glass-gradient");
        starGrad.setAttribute("cx", "50%");
        starGrad.setAttribute("cy", "50%");
        starGrad.setAttribute("r", "50%");
        starGrad.setAttribute("fx", "50%");
        starGrad.setAttribute("fy", "50%");

        const s1 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
        s1.setAttribute("offset", "0%");
        s1.setAttribute("stop-color", "#fffbf0"); // Warm white center
        starGrad.appendChild(s1);

        const s2 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
        s2.setAttribute("offset", "40%");
        s2.setAttribute("stop-color", "#ffefd5"); // Papaya Whip (soft peach)
        starGrad.appendChild(s2);

        const s3 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
        s3.setAttribute("offset", "100%");
        s3.setAttribute("stop-color", "#f5deb3"); // Wheat/Gold edge
        starGrad.appendChild(s3);

        defs.appendChild(starGrad);
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

    if (!defs.querySelector("#glow-blur")) {
        const filter = document.createElementNS("http://www.w3.org/2000/svg", "filter");
        filter.setAttribute("id", "glow-blur");
        filter.setAttribute("x", "-50%");
        filter.setAttribute("y", "-50%");
        filter.setAttribute("width", "200%");
        filter.setAttribute("height", "200%");
        
        const blur = document.createElementNS("http://www.w3.org/2000/svg", "feGaussianBlur");
        blur.setAttribute("in", "SourceGraphic");
        blur.setAttribute("stdDeviation", "3");
        filter.appendChild(blur);
        
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
    const yMin = Number.isFinite(config.yMin) ? config.yMin : 0;
    const yTop = 240000;
    const step = 10000;
    const ySteps = [];
    for (let v = yMin; v <= yTop; v += step) {
        ySteps.push({ val: v, group: "large" });
    }

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
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", config.margin.left - 80);
        text.setAttribute("y", y + 4);
        text.setAttribute("text-anchor", "end");
        text.setAttribute("class", "tick-text");
        text.dataset.value = val; 
        text.dataset.group = group;
        text.textContent = val;
        
        axesGroup.appendChild(text);
    });

    // Vertical Grid lines (0..31)
    const maxGridN = config.maxN || 24;
    const minGridN = config.minN ?? 0;
    for (let i = minGridN; i <= maxGridN; i++) {
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
    const maxTickN = config.maxN || 24;
    const minTickN = config.minN ?? 0;
    for (let i = minTickN; i <= maxTickN; i++) {
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

    if (minTickN > 0) {
        const y = config.svgHeight - config.margin.bottom;
        const ellipsis = document.createElementNS("http://www.w3.org/2000/svg", "text");
        ellipsis.setAttribute("x", String((config.margin.left + xScale(minTickN)) / 2));
        ellipsis.setAttribute("y", String(y + 50));
        ellipsis.setAttribute("class", "tick-text");
        ellipsis.textContent = "";
        axesGroup.appendChild(ellipsis);
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
        let labelSize = "44px";

        if (d.n === 14) {
            color = config.colors.red;
            labelColor = config.colors.red;
            labelWeight = "normal";
            labelSize = "18px"; // Slightly larger highlight for 14, but still smaller than big stars
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

        if (d.n >= 25) {
            const starHalo = document.createElementNS("http://www.w3.org/2000/svg", "path");
            starHalo.setAttribute("d", createStarPath(r * 1.8)); // Use new shape for halo
            starHalo.setAttribute("fill", "none");
            starHalo.setAttribute("stroke", "gold");
            starHalo.setAttribute("stroke-width", "4"); // Thinner stroke for elegance
            starHalo.setAttribute("stroke-linejoin", "round");
            starHalo.setAttribute("opacity", "0");
            starHalo.setAttribute("filter", "url(#glow-blur)");
            starHalo.classList.add("star-halo");
            g.appendChild(starHalo);

            const star = create3DGoldStarGroup(r * 1.8); // New 5-point Gold Star
            star.setAttribute("opacity", "0");
            star.classList.add("data-point-star");
            star.classList.add("star-main");
            g.appendChild(star);
        }

        pointsGroup.appendChild(g);

        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", x);
        const labelY = y - 28;
        text.setAttribute("y", labelY);
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
    config.n = 31.0;
    config.yMax = 240000;
    config.axesVisible = true;
    config.dataVisible = true;
    config.dataAlpha = 1;
    config.firstValueAlpha = 1;
    config.point4Flicker = 1;
    config.point9Flicker = 1;
    config.point13Flicker = 1;
    config.ticksAutoOpacity = true;
    config.specialGrowthEnabled = false;
    config.growthEmphasis = 0;
    config.focusDim = 0;
    config.focusDim10 = 0;
    config.focusDim11 = 0;
    config.growthTargetN = null;
    config.shakeIntensity = 0;
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

    if (data[0]?.n >= 25) {
        const raisedVals = {
            25: 197056,
            26: 198550,
            27: 200044,
            28: 204520,
            29: 209496,
            30: 220440,
            31: 238078
        };

        const morphToStar = (n) => {
            const pt = pointsGroup.querySelector(`g.data-point[data-n="${n}"]`);
            if (!pt) return;
            if (pt.classList.contains("star-point")) return;
            pt.classList.add("star-point");

            const ring = pt.querySelector(".data-point-ring");
            const halo = pt.querySelector(".data-point-halo");
            const core = pt.querySelector(".data-point-core");
            const starHalo = pt.querySelector(".star-halo");
            const star = pt.querySelector(".star-main");

            const r = parseFloat(pt.dataset.targetRadius || "14");
            if (core) gsap.to(core, { attr: { r: Math.max(2, r * 0.2) }, duration: 0.35, ease: "power2.out" });
            if (ring) gsap.to(ring, { opacity: 0, duration: 0.28, ease: "power2.out" });
            if (halo) gsap.to(halo, { opacity: 0, duration: 0.28, ease: "power2.out" });

            if (starHalo) {
                gsap.fromTo(starHalo, { opacity: 0, scale: 0.6 }, { opacity: 0.6, scale: 1, duration: 0.5, ease: "back.out(2)" });
            }
            if (star) {
                gsap.fromTo(star, { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(2)" });
            }

            const targetVal = raisedVals[n];
            if (Number.isFinite(targetVal)) {
                const d = data.find((x) => x.n === n);
                const label = labelsGroup.querySelector(`text.point-label[data-n="${n}"]`);
                const fromVal = parseFloat(pt.dataset.val || (d ? String(d.val) : "0"));
                const toVal = Math.max(fromVal, targetVal);

                // Mario Bump Effect:
                // 1. Jump up (overshoot)
                // 2. Fall back to final position
                // 3. Update value during jump
                
                // Visual displacement in pixels (not affecting data scale)
                const bumpHeight = 30; // Pixels to jump up
                
                // Original Y position is handled by updateChartGeometry usually,
                // but for this animation we want to override the transform temporarily.
                // We'll animate a separate object or use a proxy to drive the transform Y offset.
                
                // Calculate final Y position based on new value
                const finalY = yScale(toVal);
                const startY = yScale(fromVal);
                
                // We animate 'val' for the label/data, and 'yOffset' for the visual bump
                const proxy = { val: fromVal, yOffset: 0, scale: 1 };
                
                // Sequence:
                // 1. Jump up (val stays roughly same or interpolates? Let's interpolate val)
                // 2. Hit peak (val reaches near target?)
                // 3. Fall down (val settles)
                
                // To simulate "hitting a block", maybe fast up, hard stop, then bounce down?
                // Or standard jump: fast up, slow at top, accelerate down.
                
                // Let's use a Timeline for precise control
                const bumpTl = gsap.timeline({
                    onUpdate: () => {
                        const currentVal = proxy.val;
                        const currentScale = proxy.scale;
                        
                        // Update Data
                        pt.dataset.val = String(currentVal);
                        if (d) d.val = currentVal;
                        if (label) {
                            label.dataset.val = String(currentVal);
                            label.textContent = String(Math.round(currentVal));
                            
                            // Scale the label based on value change progress
                            // We need to manually set the transform because updateChartGeometry might overwrite it
                            // Actually, updateChartGeometry handles transform for labels only if config.specialGrowthEnabled is true.
                            // Here we are in a custom animation sequence.
                            
                            // Get current X/Y from updateChartGeometry logic (or cached)
                            // But since we are changing d.val, updateChartGeometry will move it to the new Y.
                            // We just want to add SCALE.
                            
                            // Since updateChartGeometry runs on main tick, we can set a temporary scale property?
                            // Or just force the style transform here.
                            
                            // Best approach: Use GSAP to animate 'fontSize' or 'scale' directly?
                            // Scaling via transform is smoother.
                            // The label has a base position (x, y).
                            const cx = parseFloat(label.getAttribute("x"));
                            const cy = parseFloat(label.getAttribute("y"));
                            label.setAttribute("transform", `translate(${cx} ${cy}) scale(${currentScale}) translate(${-cx} ${-cy})`);
                        }
                        
                        // Update Visual Position
                        // We need to re-calculate X/Y because updateChartGeometry might be running?
                        // Actually updateChartGeometry reads d.val, so if we update d.val, it will move.
                        // BUT we want an EXTRA offset (the jump).
                        
                        // Let's rely on updateChartGeometry for the base position (based on proxy.val)
                        // And manually apply an extra translate if needed?
                        // No, simpler: stop updateChartGeometry from interfering? 
                        // Or just let updateChartGeometry handle the base position, and we add a jump offset?
                        // updateChartGeometry sets 'transform'. If we change it here, it might be overwritten.
                        // Ideally, we update d.val (so base moves) AND add a "jump" offset.
                        
                        // However, updateChartGeometry runs on gsap.ticker (via main timeline onUpdate).
                        // If we modify d.val, the point moves to the new Y.
                        // We want it to go HIGHER than the new Y temporarily.
                        
                        // Let's assume updateChartGeometry handles the base x/y from d.val.
                        // We will add a temporary "y-bump" via a separate transform or by tricking d.val?
                        // Tricking d.val is bad because label would show wrong number.
                        
                        // Better: Modify the DOM element directly and hope updateChartGeometry doesn't overwrite it instantly?
                        // updateChartGeometry runs every frame. It sets transform attribute.
                        // We should integrate the bump into the position logic or pause updateChartGeometry?
                        // No, let's just use a separate "jump" property on the element that updateChartGeometry respects?
                        // Or simpler: We are in a controlled sequence.
                        
                        // Let's use a "visualYOffset" variable that updateChartGeometry checks?
                        // Or just force set attribute here, knowing it might fight?
                        // The main TL calls updateChartGeometry.
                        
                        // Let's try to animate 'val' to target, AND add a particle explosion at the peak.
                    }
                });

                // Phase 1: Jump Up + Value Change
                // Go to target value + overshoot value?
                // If we want to simulate "bump", we can make the value overshoot?
                // e.g. target is 200,000. We go to 205,000 then back to 200,000?
                // This is the easiest way to get the visual "jump" without fighting the renderer.
                
                // Value overshoot amount (in data units)
                // 30px roughly equals how much value?
                const pixelToDataRatio = (config.yMax - (config.yMin||0)) / (config.svgHeight - config.margin.top - config.margin.bottom);
                const overshootVal = bumpHeight * pixelToDataRatio;
                
                const peakVal = toVal + overshootVal;
                
                // 1. Slow Up to Peak + Scale Up
                bumpTl.to(proxy, {
                    val: peakVal,
                    scale: 1.5, // Scale up during jump
                    duration: 1.2,
                    ease: "power2.out",
                    onComplete: () => {
                        // Trigger Particles at Peak
                         const cx = xScale(n);
                         // Peak Y is based on peakVal
                         const cy = yScale(peakVal);
                         emitBumpParticles(cx, cy);
                    }
                });
                
                // 2. Gentle Bounce Down to Target + Scale Back
                bumpTl.to(proxy, {
                    val: toVal,
                    scale: 1, // Return to normal scale
                    duration: 0.6,
                    ease: "power2.out"
                });

            }
        };

        cameraMode = "locked";
        camera.x = 0;
        camera.y = 0;
        camera.scale = 1;
        applyCamera();

        const startN = data[0].n;
        const endN = data[data.length - 1].n;

        const holdDur = 0.9;
        const stepDur = 1.8; // 每个数字增长动画持续约1.8秒
        const overlapDur = 0.9; // 下一个动画提前0.9秒开始，形成交叠

        tl.to({}, { duration: holdDur }, "start");

        for (let i = startN; i <= endN; i++) {
            const startTime = holdDur + (i - startN) * (stepDur - overlapDur);
            tl.call(() => morphToStar(i), [], `start+=${startTime}`);
        }

        tl.addLabel("starsComplete", `start+=${holdDur + (endN - startN + 1) * stepDur}`);
        tl.to({}, { duration: 3.0 }, "starsComplete");
        return;
    }

    if (config.cameraEnabled) {
        // --- Enhanced Camera Logic ---
        const axisBaselineY = config.svgHeight - config.margin.bottom;

        /**
         * 根据当前X轴显示终点给镜头一个水平锚点，保证初始阶段能看到坐标轴。
         */
        function getCameraAnchorX() {
            const base = config.minN ?? 0;
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

        // 1. Initial State: Focus on start
        const startN = config.minN ?? data[0]?.n ?? 0;
        const startV = data.find((d) => d.n === startN)?.val ?? data[0].val;
        const pFocusStart = framePointWithXAxis(startN, startV);
        camera.x = pFocusStart.x;
        camera.y = pFocusStart.y;
        camera.scale = pFocusStart.scale;
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

        // 4. 从9维继续向右：依次点亮10~15维，再让15维闪烁并伴随镜头右移和X轴生长
        const stepDur3 = 1.6;

        // 停止9维的闪烁
        tl.set(config, { point9Flicker: 1 }, ">");

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

        tl.addLabel("captureStart13", ">");

        // 13 flickering
        tl.to(config, {
            point13Flicker: 0.25,
            duration: 0.1,
            repeat: 20, // Reduced from 80 to move on faster, or keep it if user wants wait
            yoyo: true,
            ease: "steps(1)"
        }, ">");

        // Stop 13 flickering
        tl.set(config, { point13Flicker: 1 }, ">");

        // 13 -> 14 (Breakthrough)
        // Move to 14 and adjust yMax to fit 1932
        tl.to(config, { n: 14, yMax: 2200, duration: 1.6, ease: "linear" }, ">");
        tl.call(() => stepPulse(14), [], ">-0.1");

        // 14 Particle Explosion Effect
        tl.call(() => triggerParticleExplosion(14), [], ">");
        
    // 5. Rapid Growth Phase (15 -> 24)
        // "Exciting, Shocking, Smooth Progress"
        // Pause to build anticipation after explosion
        tl.to({}, { duration: 1.5 }, ">");

        const rapidStart = 15;
        const rapidEnd = 24;
        let lastIntN = 14;

        // One single smooth tween for silky movement
        tl.to(config, {
            n: rapidEnd,
            yMax: 260000, // 196560 * ~1.3
            duration: 6.0, 
            ease: "power2.inOut", // Smoother acceleration
            onStart: () => {
                lastIntN = 14;
            },
            onUpdate: () => {
                const currentInt = Math.floor(config.n);
                
                // Calculate intensity based on progress (0 to 1)
                const progress = (config.n - rapidStart) / (rapidEnd - rapidStart);
                const intensity = Math.max(0, progress); // 0 -> 1

                if (currentInt > lastIntN) {
                    for (let k = lastIntN + 1; k <= currentInt; k++) {
                        // Trigger pulse for k
                        const pt = pointsGroup.querySelector(`g.data-point[data-n="${k}"]`);
                        if (pt) {
                            const halo = pt.querySelector('.data-point-halo');
                            if (halo) {
                                // Subtle pulses
                                const pulseDur = 0.5;
                                const maxR = 30 + (20 * intensity);
                                
                                gsap.fromTo(halo, 
                                    { opacity: 0.5, attr: { r: 10 } },
                                    { opacity: 0, attr: { r: maxR }, duration: pulseDur, ease: "power2.out" }
                                );
                            }
                        }
                    }
                    lastIntN = currentInt;
                }
            }
        }, ">");

        // Climax at 24
        tl.addLabel("climax24", ">");
        tl.call(() => {
             // Screen flash
             const flashOverlay = document.createElementNS("http://www.w3.org/2000/svg", "rect");
             flashOverlay.setAttribute("x", -5000);
             flashOverlay.setAttribute("y", -5000);
             flashOverlay.setAttribute("width", 10000);
             flashOverlay.setAttribute("height", 10000);
             flashOverlay.setAttribute("fill", "white");
             flashOverlay.setAttribute("opacity", 0.4);
             // Ensure it's on top
             svg.appendChild(flashOverlay);
 
             gsap.to(flashOverlay, {
                 opacity: 0,
                 duration: 1.2,
                 ease: "power2.out",
                 onComplete: () => flashOverlay.remove()
             });

            // Trigger particle explosion for 24
            triggerParticleExplosion(24);
        }, [], "climax24");

        // Dampen shake quickly
        tl.to(config, { shakeIntensity: 0, duration: 1.0 }, "climax24");

        tl.to({}, { duration: 1.0 }, "climax24");

        // 6. Final Wave: Zoom out and ripple
        // "Finally, all nodes light up once from left to right"
        tl.addLabel("finalWave", ">");
        
        // Switch camera mode to allow manual control (disable follow)
        tl.call(() => {
            cameraMode = "overview";
        }, [], "finalWave");

        // Zoom out to full view to show all nodes
        if (config.cameraEnabled) {
            tl.to(camera, {
                x: 0,
                y: 0,
                scale: 1,
                duration: 2.5,
                ease: "power2.inOut"
            }, "finalWave");
        }

        // Ripple from 1 to 24
        // Start slightly after zoom starts so it's visible as we pull back
        const waveStart = 0.5; 
        const waveStep = 0.08; // Fast ripple

        for (let i = 1; i <= 24; i++) {
            tl.call(() => {
                const pt = pointsGroup.querySelector(`g.data-point[data-n="${i}"]`);
                if (pt) {
                    const halo = pt.querySelector('.data-point-halo');
                    const ring = pt.querySelector('.data-point-ring');
                    
                    // Use a subtle pulse for the final review
                    if (halo) {
                         gsap.fromTo(halo, 
                            { opacity: 0.6, attr: { r: 10 } },
                            { opacity: 0, attr: { r: 40 }, duration: 0.8, ease: "power2.out" }
                        );
                    }
                    if (ring) {
                         gsap.fromTo(ring,
                            { stroke: "white", "stroke-width": 2, opacity: 0.8 },
                            { "stroke-width": 0, opacity: 0, duration: 0.5, attr: { r: 30 } }
                         );
                    }
                }
            }, [], `finalWave+=${waveStart + i * waveStep}`);
        }
        
        tl.addLabel("allPointsLit", `finalWave+=${waveStart + 24 * waveStep + 1.0}`);

        // --- NEW PHASE: Star Awakening (25-31) ---
        
        // 1. Breathing Halo for n=24 (The "One")
        const breatheDur = 3.0;
        
        // --- NEW: Expand Axis Ahead of Time ---
        // Tween minAxisN to 31 so that the chart squeezes/shifts ONCE before stars appear.
        // DELAYED START: Wait 0s (start immediately) after allPointsLit before expanding.
        const expansionDelay = 0.0;
        const expansionDuration = 5.0; // Smoother, longer duration
        
        tl.to(config, {
            minAxisN: 31,
            duration: expansionDuration,
            ease: "power2.inOut"
        }, `allPointsLit+=${expansionDelay}`);

        tl.call(() => {
            const pt24 = pointsGroup.querySelector('g.data-point[data-n="24"]');
            if (pt24) {
                const halo = pt24.querySelector('.data-point-halo');
                if (halo) {
                     gsap.to(halo, {
                        attr: { r: 60 },
                        opacity: 0.3,
                        duration: 1.5,
                        yoyo: true,
                        repeat: 3,
                        ease: "sine.inOut"
                     });
                }
            }
        }, [], "allPointsLit");

        // Wait for breathing + expansion to finish
        // Total wait needs to cover the expansion end time to avoid stars popping in during movement
        // Expansion ends at: allPointsLit + expansionDelay + expansionDuration = 1.0 + 3.0 = 4.0s
        // breatheDur is 3.0s. So we need at least 4.0s total wait from allPointsLit.
        const totalWait = Math.max(breatheDur, expansionDelay + expansionDuration);
        
        tl.to({}, { duration: totalWait }, "allPointsLit");
        
        // 2. Reveal 25-31 (Stars)
        const starStartN = 25;
        const starEndN = 31;
        const starStepDur = 0.15; // Even faster for a rhythmic cascade

        for (let i = starStartN; i <= starEndN; i++) {
             const labelTime = `starReveal${i}`;
             // Start stars after the totalWait
             const startTime = `allPointsLit+=${totalWait + (i - starStartN) * starStepDur}`;
             tl.addLabel(labelTime, startTime);

             // Reveal Star Point
             // NOTE: config.n controls the line drawing.
             // Since axis is already at 31 (via minAxisN), increasing config.n won't shift the axis,
             // it will just draw the line further to the right.
             // Use a slightly longer duration than the step to allow smooth overlap of line drawing
             tl.to(config, { n: i, yMax: data.find(d => d.n === i).val * 1.1, duration: starStepDur * 1.5, ease: "power2.out" }, labelTime);
             
            tl.call(() => {
                const pt = pointsGroup.querySelector(`g.data-point[data-n="${i}"]`);
                if (!pt) return;

                const t = pt.getAttribute("transform") || "";
                const newT = t.replace(/scale\([^)]*\)/, "scale(1)");
                pt.setAttribute("transform", newT);
                pt.style.opacity = "1";
                
                const label = labelsGroup.querySelector(`#label-${i - 1}`);
                if (label) {
                    gsap.to(label, { opacity: 1, duration: 0.4 });
                }

                const halo = pt.querySelector(".star-halo");
                const starShape = pt.querySelector(".star-main") || pt.querySelector(".data-point-star");
                if (halo) {
                    // Initial pop for halo
                    gsap.fromTo(halo, 
                        { opacity: 0, scale: 0.5 },
                        { opacity: 0.9, scale: 1, duration: 0.6, ease: "back.out(1.5)" }
                    );
                    
                    // Breathing loop
                    gsap.to(halo, {
                        opacity: 0.5,
                        scale: 1.1,
                        duration: 2.0,
                        yoyo: true,
                        repeat: -1,
                        ease: "sine.inOut",
                        delay: 0.6
                    });
                }
                if (starShape) {
                    // Exquisite pop-in animation
                    gsap.fromTo(
                        starShape,
                        { opacity: 0, scale: 0.2, rotation: -45, transformOrigin: "50% 50%" },
                        { opacity: 1, scale: 1, rotation: 0, duration: 0.8, ease: "elastic.out(1, 0.5)" }
                    );
                    
                    // Gentle floating/breathing
                    gsap.to(starShape, {
                        scale: 1.1,
                        rotation: 5,
                        transformOrigin: "50% 50%",
                        duration: 2.5,
                        yoyo: true,
                        repeat: -1,
                        ease: "sine.inOut",
                        delay: 0.8
                    });
                }

                const cx = xScale(i);
                const cy = yScale(data.find(d => d.n === i).val);
                
                for (let k = 0; k < 12; k++) {
                    const p = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                    p.setAttribute("cx", cx);
                    p.setAttribute("cy", cy);
                    p.setAttribute("r", 0.6 + Math.random() * 1.0);
                    p.setAttribute("fill", "rgba(255, 255, 255, 0.55)");
                    particleGroup.appendChild(p);
                    
                    const angle = Math.random() * Math.PI * 2;
                    const dist = 20 + Math.random() * 40;
                    gsap.to(p, {
                        attr: { cx: cx + Math.cos(angle) * dist, cy: cy + Math.sin(angle) * dist },
                        opacity: 0,
                        duration: 0.9 + Math.random() * 0.4,
                        ease: "power2.out",
                        onComplete: () => p.remove()
                    });
                }
            }, [], labelTime);
        }
        
        tl.addLabel("starsComplete", `allPointsLit+=${breatheDur + (starEndN - starStartN + 1) * starStepDur + 1.0}`);

        // Final contemplation hold
        tl.to({}, { duration: 4.0 });

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

    // --- PREVIEW JUMP ---
    // tl.seek("starsComplete"); // Skipped stars
    tl.seek("allPointsLit"); // Jump to just before stars appear for preview
    
    // Force update camera to match the new time
    if (config.cameraEnabled) {
        const nNow = config.n;
        const vNow = valAt(nNow);
        const next = framePointWithXAxis(nNow, vNow);
        camera.x = next.x;
        camera.y = next.y;
        camera.scale = next.scale;
        applyCamera();
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
