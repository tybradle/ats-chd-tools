const { execSync } = require('child_process');

const port = process.argv[2] || '14220';
const isWindows = process.platform === 'win32';

console.log(`Checking for processes on port ${port}...`);

try {
    if (isWindows) {
        // Windows: netstat -ano | findstr :<port>
        const output = execSync(`netstat -ano | findstr :${port}`).toString();
        const lines = output.trim().split('\n');

        const pids = new Set();
        lines.forEach(line => {
            // Netstat output: Proto  Local Address          Foreign Address        State           PID
            // Example: TCP    0.0.0.0:14220          0.0.0.0:0              LISTENING       1234
            const parts = line.trim().split(/\s+/);
            const pid = parts[parts.length - 1];
            if (pid && !isNaN(pid) && pid !== '0') {
                pids.add(pid);
            }
        });

        if (pids.size > 0) {
            console.log(`Found processes with PIDs: ${Array.from(pids).join(', ')}. Killing them...`);
            pids.forEach(pid => {
                try {
                    execSync(`taskkill /F /PID ${pid}`);
                    console.log(`✅ Killed PID ${pid}`);
                } catch (e) {
                    console.error(`❌ Failed to kill PID ${pid}: ${e.message}`);
                }
            });
        } else {
            console.log('No processes found on port ' + port);
        }
    } else {
        // Unix: lsof -ti :<port> | xargs kill -9
        try {
            const pids = execSync(`lsof -t -i:${port}`).toString().trim();
            if (pids) {
                console.log(`Found processes with PIDs: ${pids.replace(/\n/g, ', ')}. Killing them...`);
                execSync(`lsof -t -i:${port} | xargs kill -9`);
                console.log('✅ Processes killed.');
            } else {
                console.log('No processes found on port ' + port);
            }
        } catch (e) {
            // lsof returns exit code 1 if no process is found
            console.log('No processes found on port ' + port);
        }
    }
} catch (error) {
    // Silent catch for netstat/findstr failing when no port is found
    if (error.message.includes('findstr')) {
        console.log('No processes found on port ' + port);
    } else {
        console.error('An error occurred while checking/killing port processes:', error.message);
    }
}
