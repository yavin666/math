const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

(async () => {
    // 1. Find Browser
    const possiblePaths = [
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
    ];
    
    let executablePath = possiblePaths.find(p => fs.existsSync(p));
    
    if (!executablePath) {
        console.error("No supported browser found (Edge or Chrome).");
        process.exit(1);
    }
    
    console.log(`Using browser: ${executablePath}`);

    const ensureDir = (dirPath) => {
        if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
    };

    const svgOnly = process.argv.includes('--svg') || process.argv.includes('--svg-only');
    const useOverview = process.argv.includes('--overview');
    const still = process.argv.includes('--still') || process.argv.includes('--single');
    const timeArg = process.argv.find((a) => a.startsWith('--time='));
    const stillTime = timeArg ? Number(timeArg.slice('--time='.length)) : null;
    const outArg = process.argv.find((a) => a.startsWith('--out='));
    const outPath = outArg ? outArg.slice('--out='.length) : null;

    // 3. Launch
    const browser = await puppeteer.launch({
        executablePath,
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    await page.setViewport({ width: 2200, height: 1200, deviceScaleFactor: 1 });
    
    const htmlFile = useOverview ? 'overview.html' : 'index.html';
    const url = `file://${path.join(__dirname, htmlFile).replace(/\\/g, '/')}?capture=1`;
    console.log(`Navigating to ${url}`);
    
    await page.goto(url, { waitUntil: 'networkidle0' });
    
    if (!(useOverview && still)) {
        try {
            await page.waitForFunction('window.tl !== undefined', { timeout: 5000 });
        } catch (e) {
            console.error("Timeline (window.tl) not found.");
            await browser.close();
            process.exit(1);
        }
    } else {
        try {
            await page.waitForFunction(
                'document.querySelector("#chart") && document.querySelector("#points") && document.querySelector("#points").children.length > 0',
                { timeout: 5000 }
            );
        } catch (e) {
            console.error("Overview chart not ready.");
            await browser.close();
            process.exit(1);
        }
    }

    await page.evaluate(() => {
        const style = document.createElement("style");
        style.textContent = `
            *, *::before, *::after {
                animation: none !important;
                transition: none !important;
            }
        `;
        document.head.appendChild(style);

        gsap.ticker.lagSmoothing(0);
        gsap.globalTimeline.pause(0);
    });

    const captureVariant = async ({ name, darkMode, svgOnly }) => {
        const outputDir = path.join(__dirname, name);
        ensureDir(outputDir);

        await page.evaluate((isDark) => {
            if (isDark) document.body.classList.add('dark-mode');
            else document.body.classList.remove('dark-mode');
        }, darkMode);

        let svgClip = null;
        if (svgOnly) {
            await page.evaluate(() => {
                const style = document.createElement("style");
                style.textContent = `
                    html, body { background: transparent !important; }
                    body.dark-mode { background: transparent !important; }
                    .container, .chart-wrapper { background: transparent !important; }
                    #mode-toggle, #camera-toggle, .axis-label, .caption { display: none !important; }
                `;
                document.head.appendChild(style);
            });

            const svgHandle = await page.$('svg');
            if (!svgHandle) throw new Error('SVG element not found for svg-only capture.');
            const bbox = await svgHandle.boundingBox();
            if (!bbox) throw new Error('SVG bounding box not available for svg-only capture.');
            svgClip = {
                x: Math.floor(bbox.x),
                y: Math.floor(bbox.y),
                width: Math.ceil(bbox.width),
                height: Math.ceil(bbox.height)
            };
        }

        const timing = (still && useOverview)
            ? { duration: 0, startTime: 0, endTime: 0, stillTimeDefault: 0 }
            : await page.evaluate(() => {
                const tl = window.tl;
                const duration = tl.duration();
                const fullExpandTime = typeof tl.getLabelTime === "function" ? tl.getLabelTime("fullExpand") : NaN;
                const stepDur3 = 1.0;
                const t14Start = Number.isFinite(fullExpandTime) ? Math.max(0, fullExpandTime - stepDur3) : 0;
                const startTime = Math.max(0, t14Start - 0.6);
                const endTime = duration + 1.0;
                const stillTimeDefault = Number.isFinite(fullExpandTime) ? Math.min(duration, fullExpandTime) : duration;
                return { duration, startTime, endTime, stillTimeDefault };
            });

        const fps = 60;
        const endTime = timing.endTime ?? (timing.duration + 1.0);
        const totalFrames = Math.ceil((endTime - timing.startTime) * fps);

        console.log(
            `[${name}] Animation duration: ${timing.duration}s, ` +
            `end at t=${endTime}s, ` +
            `capture from t=${timing.startTime}s, ` +
            `Total frames: ${totalFrames + 1} (FPS: ${fps})`
        );

        await page.evaluate((fpsValue) => {
            if (gsap?.ticker?.fps) gsap.ticker.fps(fpsValue);
        }, fps);

        if (still) {
            const time = Number.isFinite(stillTime) ? stillTime : timing.stillTimeDefault;
            if (!(useOverview && still)) {
                await page.evaluate(async (t) => {
                    gsap.globalTimeline.time(t, false);
                    await new Promise(requestAnimationFrame);
                    await new Promise(requestAnimationFrame);
                }, time);
            } else {
                await page.evaluate(async () => {
                    await new Promise(requestAnimationFrame);
                    await new Promise(requestAnimationFrame);
                });
            }

            const filename = outPath
                ? outPath
                : (useOverview
                    ? (svgOnly ? 'overview_svg.png' : 'overview.png')
                    : (svgOnly ? 'still_svg.png' : 'still.png'));
            const filepath = path.isAbsolute(filename) ? filename : path.join(__dirname, filename);

            if (svgOnly) {
                await page.screenshot({ path: filepath, clip: svgClip, omitBackground: true });
            } else {
                await page.screenshot({ path: filepath, omitBackground: false, fullPage: false });
            }
            console.log(`[${name}] Saved still frame at t=${time}s -> ${filepath}`);
            return;
        }

        for (let frameIndex = 0; frameIndex <= totalFrames; frameIndex++) {
            const time = timing.startTime + frameIndex / fps;
            await page.evaluate(async (t) => {
                gsap.globalTimeline.time(t, false);
                await new Promise(requestAnimationFrame);
                await new Promise(requestAnimationFrame);
            }, time);
            const filename = `frame_${String(frameIndex).padStart(4, '0')}.png`;
            const filepath = path.join(outputDir, filename);

            if (svgOnly) {
                await page.screenshot({ path: filepath, clip: svgClip, omitBackground: true });
            } else {
                await page.screenshot({
                    path: filepath,
                    omitBackground: false,
                    fullPage: false
                });
            }

            if (frameIndex % 60 === 0) console.log(`[${name}] Saved frame ${frameIndex}/${totalFrames}`);
        }
    };

    await captureVariant({ name: svgOnly ? 'frames_svg_dark' : 'frames_16x9_dark', darkMode: true, svgOnly });
    
    console.log("Capture complete.");
    await browser.close();
})();
