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

    // 3. Launch
    const browser = await puppeteer.launch({
        executablePath,
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    await page.setViewport({ width: 2100, height: 1080, deviceScaleFactor: 1 });
    
    const url = `file://${path.join(__dirname, 'index.html').replace(/\\/g, '/')}`;
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


    // Force strict synchronization
    await page.evaluate(() => {
        // Disable GSAP's auto-sleep and lag smoothing
        gsap.ticker.lagSmoothing(0);
        
        // Stop the GSAP ticker completely
        gsap.ticker.remove(gsap.updateRoot);
        gsap.ticker.sleep();
        
        // Pause the global timeline so we can manually scrub it
        gsap.globalTimeline.pause();
        
        // Ensure main timeline is unpaused locally so it responds to global scrubbing
        if (window.tl) window.tl.paused(false);

        // Disable RAF
        window.requestAnimationFrame = () => {};
        window.cancelAnimationFrame = () => {};
    });

    const captureVariant = async ({ name, darkMode }) => {
        const outputDir = path.join(__dirname, name);
        ensureDir(outputDir);

        await page.evaluate((isDark) => {
            if (isDark) document.body.classList.add('dark-mode');
            else document.body.classList.remove('dark-mode');
        }, darkMode);

        const duration = await page.evaluate(() => window.tl.duration());
        const fps = 60;
        const totalFrames = Math.ceil(duration * fps);
        console.log(`[${name}] Animation duration: ${duration}s, Total frames: ${totalFrames}`);

        for (let i = 0; i <= totalFrames; i++) {
            const time = i / fps;
            await page.evaluate(async (t) => {
                // Seek the GLOBAL timeline. This ensures that:
                // 1. The main timeline (window.tl) moves.
                // 2. Any side-effect animations (like halo pulses) created by callbacks 
                //    are also scrubbed/updated correctly relative to global time.
                gsap.globalTimeline.seek(t, false);
            }, time);

            const filename = `frame_${String(i).padStart(4, '0')}.png`;
            const filepath = path.join(outputDir, filename);

            await page.screenshot({
                path: filepath,
                omitBackground: false,
                fullPage: false
            });

            if (i % 60 === 0) console.log(`[${name}] Saved frame ${i}/${totalFrames}`);
        }
    };

    await captureVariant({ name: 'frames_16x9_dark', darkMode: true });
    // await captureVariant({ name: 'frames_16x9_light', darkMode: false });
    
    console.log("Capture complete.");
    await browser.close();
})();
