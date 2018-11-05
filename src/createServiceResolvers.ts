import { get, reduce, isEmpty } from 'lodash';

/**
 * Turn a GraphQL Binding into a resolver function for a GraphQL Server
 */
function createResolver(fields, query) {
  return reduce(
    fields,
    (memo, currentVal) => {
      return {
        ...memo,
        [currentVal]: async (root, args, context, info) => {
          return query[currentVal](args, info, { context });
        },
      };
    },
    {},
  );
}

/**
 * Take a configuration of GraphQL bindings and create a Root resolver object
 * We can then use this to create a GraphQL server
 */
export default function createServiceResolvers(config) {
  // Get Query Fields
  const serviceQueries = reduce(
    config,
    (memo, currentVal) => {
      const fields = currentVal && currentVal.queryFields();

      if (!fields) {
        return memo;
      }

      return {
        ...memo,
        ...createResolver(fields, get(currentVal, 'query')),
      };
    },
    {},
  );

  // Mutation Fields
  const serviceMutations = reduce(
    config,
    (memo, currentVal) => {
      const fields = currentVal && currentVal.mutationFields();

      if (!fields) {
        return memo;
      }

      return {
        ...memo,
        ...createResolver(fields, get(currentVal, 'mutation')),
      };
    },
    {},
  );

  // Subscription Fields
  const serviceSubscriptions = reduce(
    config,
    (memo, currentVal) => {
      const fields = currentVal && currentVal.subscriptionFields();

      if (!fields) {
        return memo;
      }

      return {
        ...memo,
        ...createResolver(fields, get(currentVal, 'subscription')),
      };
    },
    {},
  );

  let rootSchema = {};

  if (!isEmpty(serviceQueries)) {
    rootSchema = {
      ...rootSchema,
      Query: serviceQueries,
    };
  }

  if (!isEmpty(serviceMutations)) {
    rootSchema = {
      ...rootSchema,
      Mutation: serviceMutations,
    };
  }

  if (!isEmpty(serviceSubscriptions)) {
    rootSchema = {
      ...rootSchema,
      Subscription: serviceSubscriptions,
    };
  }

  return rootSchema;
}
