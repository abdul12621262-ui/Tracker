const https = require('https');
const fs = require('fs');
const path = require('path');

console.log('⏳ Downloading GeoLite2-City database...');

// Download from a public mirror
const url = 'https://raw.githubusercontent.com/P3TERX/GeoLite.mmdb/download/GeoLite2-City.mmdb';
const destPath = path.join(__dirname, 'geoip', 'GeoLite2-City.mmdb');

// Create geoip directory if it doesn't exist
const geoipDir = path.dirname(destPath);
if (!fs.existsSync(geoipDir)) {
    fs.mkdirSync(geoipDir, { recursive: true });
}

const file = fs.createWriteStream(destPath);

https.get(url, (response) => {
    if (response.statusCode === 302 || response.statusCode === 301) {
        // Follow redirect
        https.get(response.headers.location, (redirectResponse) => {
            redirectResponse.pipe(file);
            file.on('finish', () => {
                file.close();
                console.log('✅ GeoLite2-City database downloaded successfully!');
                console.log(`📁 Saved to: ${destPath}`);
                console.log('\n🚀 You can now run: npm start');
            });
        }).on('error', (err) => {
            fs.unlink(destPath, () => {});
            console.error('❌ Download error:', err.message);
            process.exit(1);
        });
    } else if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
            file.close();
            console.log('✅ GeoLite2-City database downloaded successfully!');
            console.log(`📁 Saved to: ${destPath}`);
            console.log('\n🚀 You can now run: npm start');
        });
    } else {
        console.error(`❌ Failed to download: HTTP ${response.statusCode}`);
        process.exit(1);
    }
}).on('error', (err) => {
    fs.unlink(destPath, () => {});
    console.error('❌ Request error:', err.message);
    process.exit(1);
});

file.on('error', (err) => {
    fs.unlink(destPath, () => {});
    console.error('❌ File write error:', err.message);
    process.exit(1);
});
