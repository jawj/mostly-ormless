import { DBConfig } from './core';

const config: DBConfig = {
  // in use, you might set some of these from environment variables
  dbURL: 'postgresql://localhost/mostly_ormless',
  dbTransactionAttempts: 5,
  dbTransactionRetryDelayRange: [25, 250],
  verbose: true,
};

export default config;
