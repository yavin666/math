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

    // 3. Launch
    const browser = await puppeteer.launch({
        executablePath,
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    await page.setViewport({ width: 2200, height: 1200, deviceScaleFactor: 1 });
    
    const url = `file://${path.join(__dirname, 'index.html').replace(/\\/g, '/')}?capture=1`;
    console.log(`Navigating to ${url}`);
    
    await page.goto(url, { waitUntil: 'networkidle0' });
    
    // 4. Wait for GSAP timeline
    try {
        await page.waitForFunction('window.tl !== undefined', { timeout: 5000 });
    } catch (e) {
        console.error("Timeline (window.tl) not found.");
        await browser.close();
        process.exit(1);
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

        const timing = await page.evaluate(() => {
            const tl = window.tl;
            const duration = tl.duration();
            // Capture from the very beginning to ensure full animation correspondence
            const startTime = 0; 
            return { duration, startTime };
        });

        const fps = 60;
        const extraTailSeconds = 1.0;
        const endTime = timing.duration + extraTailSeconds;
        const totalFrames = Math.ceil(endTime * fps);
        const startFrame = Math.floor(timing.startTime * fps);

        console.log(
            `[${name}] Animation duration: ${timing.duration}s, ` +
            `end at t=${endTime}s, ` +
            `capture from t=${timing.startTime}s (frame ${startFrame}), ` +
            `Total frames: ${totalFrames - startFrame + 1}`
        );

        await page.evaluate((fpsValue) => {
            if (gsap?.ticker?.fps) gsap.ticker.fps(fpsValue);
        }, fps);

        for (let i = 0; i <= totalFrames; i++) {
            const time = i / fps;
            await page.evaluate(async (t) => {
                gsap.globalTimeline.time(t, false);
                await new Promise(requestAnimationFrame);
                await new Promise(requestAnimationFrame);
            }, time);

            if (i < startFrame) continue;

            const frameIndex = i - startFrame;
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

            if (i % 60 === 0) console.log(`[${name}] Saved frame ${i}/${totalFrames}`);
        }
    };

    await captureVariant({ name: svgOnly ? 'frames_svg_dark' : 'frames_16x9_dark', darkMode: true, svgOnly });
    
    console.log("Capture complete.");
    await browser.close();
})();
