# GPX File Cleaner

Clean the start and end points of a GPX file and remove special extensions. Perfect for cleaning fitness tracker exports before importing to OpenStreetMap or other mapping services, if you are concerned about privacy or data size.

**Features:**
- Remove extensions (heart rate, cadence, power data, etc.)
- Trim GPS points from start and end of tracks
- 100% client-side processing - data never leaves your browser
- Perfect for cleaning fitness tracker exports

## Running

This tool runs entirely in your browser with no server required. You can run it locally or upload to any web server.

### Local Development
```bash
# Using Python 3
python3 -m http.server 8000

# Using Node.js
npx http-server
```

Then open http://localhost:8000 in your browser.

### Web Server
Simply upload all files to any web server and access the index.html file.