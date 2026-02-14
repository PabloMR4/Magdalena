module.exports = {
  apps: [{
    name: 'cofradia-magdalena',
    script: 'server.js',
    cwd: '/home/ubuntu/Magdalena',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: '/home/ubuntu/Magdalena/logs/error.log',
    out_file: '/home/ubuntu/Magdalena/logs/out.log',
    log_file: '/home/ubuntu/Magdalena/logs/combined.log',
    time: true
  }]
};
