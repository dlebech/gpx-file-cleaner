class GPXCleaner {
    constructor() {
        this.originalGPX = null;
        this.cleanedGPX = null;
        this.originalCoords = null;
        this.cleanedCoords = null;
        this.fileName = '';
        
        this.initializeEventListeners();
    }
    
    initializeEventListeners() {
        const fileInput = document.getElementById('fileInput');
        const uploadSection = document.getElementById('uploadSection');
        const processButton = document.getElementById('processButton');
        const downloadButton = document.getElementById('downloadButton');
        
        // File input handling
        fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        
        // Drag and drop handling
        uploadSection.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadSection.classList.add('dragover');
        });
        
        uploadSection.addEventListener('dragleave', () => {
            uploadSection.classList.remove('dragover');
        });
        
        uploadSection.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadSection.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.processFile(files[0]);
            }
        });
        
        // Process button
        processButton.addEventListener('click', () => this.processGPX());
        
        // Download button
        downloadButton.addEventListener('click', () => this.downloadCleanedGPX());
    }
    
    handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            this.processFile(file);
        }
    }
    
    processFile(file) {
        if (!file.name.toLowerCase().endsWith('.gpx')) {
            this.showFileMessage('Warning: File does not have .gpx extension', 'warning');
        }
        
        this.fileName = file.name;
        document.getElementById('fileName').textContent = `Selected: ${file.name}`;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const parser = new DOMParser();
                this.originalGPX = parser.parseFromString(e.target.result, 'text/xml');
                
                // Check for parsing errors
                const parserError = this.originalGPX.querySelector('parsererror');
                if (parserError) {
                    throw new Error('Invalid XML format');
                }
                
                this.originalCoords = this.extractCoordinates(this.originalGPX);
                document.getElementById('processButton').disabled = false;
                this.clearFileMessages();
                this.showFileMessage(`Loaded GPX file with ${this.originalCoords.latitudes.length} track points`, 'info');
                
                // Show controls section with slide-down animation
                document.getElementById('controlsSection').classList.add('show');
                
            } catch (error) {
                this.showFileMessage(`Error parsing GPX file: ${error.message}`, 'error');
                document.getElementById('processButton').disabled = true;
            }
        };
        reader.readAsText(file);
    }
    
    extractCoordinates(gpxDoc) {
        const trackPoints = gpxDoc.querySelectorAll('trkpt');
        const latitudes = [];
        const longitudes = [];
        
        trackPoints.forEach(trkpt => {
            const lat = parseFloat(trkpt.getAttribute('lat'));
            const lon = parseFloat(trkpt.getAttribute('lon'));
            if (!isNaN(lat) && !isNaN(lon)) {
                latitudes.push(lat);
                longitudes.push(lon);
            }
        });
        
        return { latitudes, longitudes };
    }
    
    cleanGPX() {
        const startPoints = parseInt(document.getElementById('startPoints').value) || 0;
        const endPoints = parseInt(document.getElementById('endPoints').value) || 0;
        
        // Clone the original GPX document
        const cleanedDoc = this.originalGPX.cloneNode(true);
        
        // Find all track segments
        const trackSegments = cleanedDoc.querySelectorAll('trkseg');
        
        trackSegments.forEach(trkseg => {
            const trackPoints = Array.from(trkseg.querySelectorAll('trkpt'));
            
            // Remove extensions from all track points
            trackPoints.forEach(trkpt => {
                const extensions = trkpt.querySelector('extensions');
                if (extensions) {
                    trkpt.removeChild(extensions);
                }
            });
            
            // Calculate points to keep
            const totalPoints = trackPoints.length;
            if (startPoints + endPoints >= totalPoints) {
                // Remove all points if we're trying to remove more than available
                trackPoints.forEach(trkpt => trkseg.removeChild(trkpt));
            } else {
                // Remove points from start
                for (let i = 0; i < startPoints; i++) {
                    if (trackPoints[i] && trackPoints[i].parentNode) {
                        trackPoints[i].parentNode.removeChild(trackPoints[i]);
                    }
                }
                
                // Remove points from end
                for (let i = totalPoints - endPoints; i < totalPoints; i++) {
                    if (trackPoints[i] && trackPoints[i].parentNode) {
                        trackPoints[i].parentNode.removeChild(trackPoints[i]);
                    }
                }
            }
        });
        
        return cleanedDoc;
    }
    
    processGPX() {
        try {
            this.clearMessages();
            this.cleanedGPX = this.cleanGPX();
            this.cleanedCoords = this.extractCoordinates(this.cleanedGPX);
            
            // Show results
            const totalPoints = this.cleanedCoords.latitudes.length;
            const originalPoints = this.originalCoords.latitudes.length;
            const removedPoints = originalPoints - totalPoints;
            
            document.getElementById('summary').textContent = 
                `Processed successfully! Removed ${removedPoints} points. ${totalPoints} track points remaining.`;
            
            document.getElementById('results').classList.add('show');
            
            // Always show visualization after processing
            this.createVisualization();
            document.getElementById('visualization').style.display = 'block';
            
        } catch (error) {
            this.showMessage(`Error processing GPX: ${error.message}`, 'error');
        }
    }
    
    createVisualization() {
        this.drawTrack('originalCanvas', this.originalCoords);
        this.drawTrack('cleanedCanvas', this.cleanedCoords);
        
        document.getElementById('originalTitle').textContent = 
            `Original Track (${this.originalCoords.latitudes.length} points)`;
        document.getElementById('cleanedTitle').textContent = 
            `Cleaned Track (${this.cleanedCoords.latitudes.length} points)`;
    }
    
    drawTrack(canvasId, coords) {
        const canvas = document.getElementById(canvasId);
        const ctx = canvas.getContext('2d');
        const { latitudes, longitudes } = coords;
        
        if (latitudes.length === 0) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#666';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('No track points', canvas.width / 2, canvas.height / 2);
            return;
        }
        
        // Calculate bounds
        const minLat = Math.min(...latitudes);
        const maxLat = Math.max(...latitudes);
        const minLon = Math.min(...longitudes);
        const maxLon = Math.max(...longitudes);
        
        // Add padding
        const latRange = maxLat - minLat;
        const lonRange = maxLon - minLon;
        const padding = 0.1;
        
        const paddedMinLat = minLat - latRange * padding;
        const paddedMaxLat = maxLat + latRange * padding;
        const paddedMinLon = minLon - lonRange * padding;
        const paddedMaxLon = maxLon + lonRange * padding;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Scale coordinates to canvas
        const scaleX = canvas.width / (paddedMaxLon - paddedMinLon);
        const scaleY = canvas.height / (paddedMaxLat - paddedMinLat);
        
        const toCanvasX = (lon) => (lon - paddedMinLon) * scaleX;
        const toCanvasY = (lat) => canvas.height - (lat - paddedMinLat) * scaleY;
        
        // Draw track
        ctx.strokeStyle = '#2196f3';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        for (let i = 0; i < latitudes.length; i++) {
            const x = toCanvasX(longitudes[i]);
            const y = toCanvasY(latitudes[i]);
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();
        
        // Draw start point (green)
        if (latitudes.length > 0) {
            const startX = toCanvasX(longitudes[0]);
            const startY = toCanvasY(latitudes[0]);
            ctx.fillStyle = '#4caf50';
            ctx.beginPath();
            ctx.arc(startX, startY, 6, 0, 2 * Math.PI);
            ctx.fill();
        }
        
        // Draw end point (red)
        if (latitudes.length > 1) {
            const endX = toCanvasX(longitudes[latitudes.length - 1]);
            const endY = toCanvasY(latitudes[latitudes.length - 1]);
            ctx.fillStyle = '#f44336';
            ctx.beginPath();
            ctx.arc(endX, endY, 6, 0, 2 * Math.PI);
            ctx.fill();
        }
    }
    
    downloadCleanedGPX() {
        if (!this.cleanedGPX) return;
        
        const serializer = new XMLSerializer();
        let xmlString = serializer.serializeToString(this.cleanedGPX);
        
        // Remove any existing XML declaration from the serialized string
        xmlString = xmlString.replace(/^<\?xml[^>]*\?>\s*/, '');
        
        // Create formatted XML with proper declaration
        const formattedXml = '<?xml version="1.0" encoding="UTF-8"?>\n' + 
            this.formatXML(xmlString);
        
        const blob = new Blob([formattedXml], { type: 'application/gpx+xml' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = this.fileName.replace('.gpx', '_cleaned.gpx');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    formatXML(xml) {
        const PADDING = '  ';
        const reg = /(>)(<)(\/*)/g;
        let pad = 0;
        
        xml = xml.replace(reg, '$1\r\n$2$3');
        
        return xml.split('\r\n').map((node) => {
            let indent = 0;
            if (node.match(/.+<\/\w[^>]*>$/)) {
                indent = 0;
            } else if (node.match(/^<\/\w/) && pad > 0) {
                pad -= 1;
            } else if (node.match(/^<\w[^>]*[^\/]>.*$/)) {
                indent = 1;
            } else {
                indent = 0;
            }
            
            pad += indent;
            return PADDING.repeat(pad - indent) + node;
        }).join('\r\n');
    }
    
    showMessage(message, type = 'info') {
        const messagesDiv = document.getElementById('messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = type;
        messageDiv.textContent = message;
        messagesDiv.appendChild(messageDiv);
    }
    
    clearMessages() {
        document.getElementById('messages').innerHTML = '';
    }
    
    showFileMessage(message, type = 'info') {
        const messagesDiv = document.getElementById('fileMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = type;
        messageDiv.textContent = message;
        messagesDiv.appendChild(messageDiv);
    }
    
    clearFileMessages() {
        document.getElementById('fileMessages').innerHTML = '';
    }
}

// Initialize the GPX cleaner when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new GPXCleaner();
});