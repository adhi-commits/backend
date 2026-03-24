const http = require('http');

const data = JSON.stringify({
    firstName: 'Test',
    lastName: 'Duplicate',
    email: 'test_duplicate_' + Date.now() + '@example.com',
    phone: '7559918344', // Existing phone
    password: 'Password123!',
    role: 'volunteer',
    skills: ['Testing']
});

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/register',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, (res) => {
    let body = '';

    res.on('data', (chunk) => {
        body += chunk;
    });

    res.on('end', () => {
        console.log('Status Code:', res.statusCode);
        console.log('Response Body:', body);

        if (res.statusCode === 400 && body.includes('Phone number already exists')) {
            console.log('PASS: Duplicate phone correctly rejected.');
        } else {
            console.log('FAIL: Did not get expected error.');
        }
    });
});

req.on('error', (error) => {
    console.error('Error:', error);
});

req.write(data);
req.end();
