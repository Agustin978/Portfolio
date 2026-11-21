// The demo seed writes fake content and uploads placeholder images, so it may only ever touch a
// local development database. Pure so the rule can be tested without a database.
export function assertDemoTarget({
  nodeEnv,
  databaseName,
}: {
  nodeEnv: string;
  databaseName: string;
}): void {
  if (nodeEnv === 'production') {
    throw new Error('db:seed-demo refuses to run with NODE_ENV=production');
  }
  if (!databaseName.endsWith('_dev')) {
    throw new Error(
      `db:seed-demo refuses to run against "${databaseName}": database name must end in _dev`,
    );
  }
}
