const http = require('http');

function makeRequest(path, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: '/api/campaigns' + path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                console.log(`Response for ${method} ${path}: ${res.statusCode}`);
                console.log(data);
                resolve();
            });
        });

        req.on('error', (e) => {
            console.error(`Problem with request ${method} ${path}: ${e.message}`);
            reject(e);
        });

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function run() {
    try {
        await makeRequest('/');

        console.log('Testing create with valid data...');
        await makeRequest('/create', 'POST', {
            title: 'Test Campaign Valid',
            description: 'Test Description',
            category: 'Environment',
            location: 'New York',
            start_date: '2023-12-01',
            end_date: '2023-12-31',
            volunteers_target: 10,
            organizer_id: 1
        });

        console.log('Testing create with missing data (expect 400)...');
        await makeRequest('/create', 'POST', {
            title: 'Test Campaign Invalid'
            // Missing others
        });

    } catch (e) {
        console.error(e);
    }
}

run();
