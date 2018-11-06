import { instrumentResolvers } from '@workpop/graphql-metrics';
import { ApolloServer, gql } from 'apollo-server-express';
import { getLogger } from 'log4js';

import createServiceResolvers from './createServiceResolvers';

const logLevels = {
  INFO: 'info',
  ERROR: 'error',
  WARNING: 'warning',
  TRACE: 'trace',
};

interface IConfig {
  server: any;
  context: (params: any) => { [key: string]: any };
  typeDefinitions: string;
  config: { [key: string]: any };
}

export default async function createGateway({ config, server, typeDefinitions, context }: IConfig) {
  const logger = getLogger('graphql:gateway');
  logger.level = 'debug';

  const resolvers = createServiceResolvers(config);

  const instrumentedResolvers = instrumentResolvers({
    resolvers,
    logLevels,
    logFunc: (logLevel, ...args) => {
      return logger[logLevel](...args);
    },
  });

  const graphQLServer = new ApolloServer({
    typeDefs: gql(typeDefinitions),
    resolvers: instrumentedResolvers,
    context,
  });

  graphQLServer.applyMiddleware({ app: server });
}
