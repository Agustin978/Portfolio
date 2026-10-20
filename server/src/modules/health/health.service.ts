export const healthService = {
  getStatus() {
    return { status: 'ok', uptime: Math.round(process.uptime()) };
  },
};
