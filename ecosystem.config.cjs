module.exports = {
  apps: [
    {
      name: "satp",
      script: "./index.js",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      time: true,
      env_production: {
        NODE_ENV: "production",
      },
    },
  ],
};
