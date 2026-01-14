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

    // 2. Setup output directory
    const outputDir = path.join(__dirname, 'frames');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
    }

    // 3. Launch
    const browser = await puppeteer.launch({
        executablePath,
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Set viewport to 1920x1080 or the SVG size (1200x1200)
    // The user wants "chart animation", the SVG is 1200x1200.
    // Let's set a large viewport to capture high quality.
    await page.setViewport({ width: 1200, height: 1200, deviceScaleFactor: 2 }); // 2x for retina quality
    
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

    // 5. Inject transparent background style
    await page.addStyleTag({
        content: `
            body, html { background: transparent !important; }
            .chart-wrapper { background: transparent !important; }
            #chart { background: transparent !important; }
        `
    });

    // 6. Capture Loop
    const duration = await page.evaluate(() => window.tl.duration());
    const fps = 30;
    const totalFrames = Math.ceil(duration * fps);
    
    console.log(`Animation duration: ${duration}s, Total frames: ${totalFrames}`);
    
    for (let i = 0; i <= totalFrames; i++) {
        const time = i / fps;
        
        await page.evaluate((t) => {
            window.tl.pause();
            window.tl.seek(t);
        }, time);
        
        // Wait a bit for rendering (GSAP is sync usually, but DOM might need a tick)
        // Actually GSAP updates are synchronous if we seek.
        // But let's verify if we need to wait for images or fonts? 
        // networkidle0 handled initial load.
        
        const filename = `frame_${String(i).padStart(4, '0')}.png`;
        const filepath = path.join(outputDir, filename);
        
        // Capture only the chart wrapper or the full page?
        // Since we made body transparent, full page is fine, but maybe clip to the SVG.
        // The SVG is 1200x1200.
        // Let's capture the full page which is 1200x1200 (viewport).
        
        await page.screenshot({
            path: filepath,
            omitBackground: true,
            fullPage: true
        });
        
        if (i % 30 === 0) console.log(`Saved frame ${i}/${totalFrames}`);
    }
    
    console.log("Capture complete.");
    await browser.close();
})();
