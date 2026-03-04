const https = require('https');

async function fetchFromGAS(urlStr) {
    return new Promise((resolve, reject) => {
        // GAS always redirects
        const req = https.get(urlStr, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                // Follow redirect
                https.get(res.headers.location, (redirectRes) => {
                    let data = '';
                    redirectRes.on('data', chunk => data += chunk);
                    redirectRes.on('end', () => resolve(JSON.parse(data)));
                }).on('error', reject);
            } else {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve(JSON.parse(data)));
            }
        });
        req.on('error', reject);
    });
}

(async () => {
    try {
        const url1 = "https://script.google.com/macros/s/AKfycbwiWogccR5ri7QfLu06kXd_R2OH9pRKiUAMFRFCBVcsnEHpipTxc1UCv41AoN1EWpK7/exec?action=get&Ma=Conciencia%20Hist%C3%B3rica%201";
        console.log("Fetching: " + url1);
        const data1 = await fetchFromGAS(url1);
        console.log("Data length: " + data1.length);
        if (data1.length > 0) {
            console.log("Keys of first item: ", Object.keys(data1[0]));
            console.log("First item: ", data1[0]);
        }
    } catch (e) {
        console.error(e);
    }
})();
