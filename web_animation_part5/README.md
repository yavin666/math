# Kissing Number Animation Implementation

This project implements a web-based animation of the "Kissing Number in n-Dimensions" chart, strictly adhering to the provided visual reference.

## Technical Implementation

-   **Stack**: HTML5, CSS3, JavaScript (ES6+).
-   **Rendering Engine**: SVG (Scalable Vector Graphics) is used for the chart to ensure crisp rendering on all screen sizes and "academic" quality lines.
-   **Animation Library**: [GSAP (GreenSock Animation Platform)](https://greensock.com/gsap/) is used for robust timeline management, ensuring smooth 60fps animations and precise sequencing.
-   **Responsiveness**: The SVG uses `viewBox` to scale automatically while maintaining aspect ratio. CSS media queries adjust font sizes for smaller screens.

## Visual Style Matching

1.  **Color Palette**:
    -   Background: `#fdfbf7` (Parchment off-white)
    -   Green Series: `#2e7d32` (Forest Green)
    -   Red Highlight: `#d32f2f` (Crimson)
    -   Black Series: `#000000`
2.  **Typography**:
    -   Title: `Times New Roman`, Bold, Italic, Underlined.
    -   Axes/Labels: `Arial` (Sans-serif) for readability.
3.  **Animation Sequence**:
    -   **Phase 1**: Axes and Grid lines draw in.
    -   **Phase 2**: The curve grows from n=2 to n=16 (Green section), with points popping up sequentially.
    -   **Phase 3**: The critical breakthrough point at n=16 (Value 4320) pulses and turns Red.
    -   **Phase 4**: The curve continues rapidly to n=20 (Black section).

## How to Run

1.  Open the folder `d:\Math\web_animation`.
2.  Open `index.html` in any modern web browser (Chrome, Firefox, Safari).
3.  No local server is strictly required, but recommended for best performance.

## Files

-   `index.html`: Structure and SVG container.
-   `style.css`: Visual styling.
-   `script.js`: Data logic and GSAP animation sequences.
