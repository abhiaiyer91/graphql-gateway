import { instrumentResolvers } from '@workpop/graphql-metrics';
import { ApolloServer, gql } from 'apollo-server-express';
import { pick } from 'lodash';
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
  context: () => { [key: string]: any };
  typeDefinitions: string;
  config: { [key: string]: any };
  headersToForward?: string[];
}

export default async function createGateway({
  config,
  server,
  typeDefinitions,
  context,
  headersToForward,
}: IConfig) {
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

  // TODO: ADD PROPER CONTEXT OBJECT
  const graphQLServer = new ApolloServer({
    typeDefs: gql(typeDefinitions),
    resolvers: instrumentedResolvers,
    context: ({ req, ...rest }) => {
      const forwardHeaders = headersToForward && pick(req.headers, ...headersToForward);

      const createdContext = context({ req, ...rest }) || {};

      return {
        ...createdContext,
        headers: {
          ...forwardHeaders,
        },
      };
    },
  });

  graphQLServer.applyMiddleware({ app: server });
}
