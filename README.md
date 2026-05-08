# Image Format Saver

A Chrome extension that adds a right-click context menu to save web images as JPG or PNG, with automatic conversion from modern formats like WebP and AVIF.

## Install

1. Open `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** and select this project folder

## Usage

- Right-click any image on a webpage → **Save image as...** → choose **Save as JPG** or **Save as PNG**
- Click the extension icon to adjust JPG quality, file naming, and display language

## Supported formats

| Source | Output |
|--------|--------|
| WebP   | → JPG / PNG |
| AVIF   | → JPG / PNG |
| GIF    | → JPG / PNG (first frame) |
| BMP    | → JPG / PNG |
| JPG    | → PNG (or saved as-is) |
| PNG    | → JPG (or saved as-is) |

All conversion happens locally. No data is ever uploaded.
