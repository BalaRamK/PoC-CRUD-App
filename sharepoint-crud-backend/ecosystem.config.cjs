/**
 * PM2 config. Run from repo backend folder so restarts use the code you git pull.
 *
 * From sharepoint-crud-backend:
 *   pm2 start ecosystem.config.cjs
 *
 * Or from repo root:
 *   cd sharepoint-crud-backend && pm2 start ecosystem.config.cjs
 */
module.exports = {
  apps: [
    {
      name: 'poc-backend',
      script: 'server.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',  // single process; cluster can cause wrong process to serve
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: { NODE_ENV: 'production' },
    },
  ],
};
