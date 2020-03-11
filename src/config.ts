
export interface Config {
  dbMaxTransactionAttempts: number;
  dbTransactionRetryDelayMsRange: [number, number];
  verbose: boolean;
}

export type NewConfig = Partial<Config>;

export const config: Config = {
  dbMaxTransactionAttempts: 5,
  dbTransactionRetryDelayMsRange: [25, 250],
  verbose: false,
};

export const getConfig = () => Object.assign({}, config); // don't let anyone mess with the original
export const setConfig = (newConfig: NewConfig) => Object.assign(config, newConfig);
