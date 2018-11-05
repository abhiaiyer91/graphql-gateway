import 'mocha';
import { keys, get } from 'lodash';
import * as express from 'express';
import { GraphQLClient } from 'graphql-request';
import { makeExecutableSchema } from 'graphql-tools';
import { Binding } from 'graphql-binding';
import { expect } from 'chai';

import createGateway from '../src';

class ServiceBinding extends Binding {
  queryFields() {
    return keys(this.schema.getQueryType().getFields());
  }

  mutationFields() {
    const mutationType = this.schema.getMutationType();
    return keys(mutationType && mutationType.getFields());
  }

  subscriptionFields() {
    const subscriptionType = this.schema.getSubscriptionType();
    return keys(subscriptionType && subscriptionType.getFields());
  }
}

const serviceATypeDefs = `
    type User {
        id: ID!
    }
    type Query {
        userById(id: ID!): User
    }
    type Mutation {
        updateUser(id: ID!): User
    }
`;

const serviceAResolvers = {
  Query: {
    userById: (root, { id }) => {
      return {
        id,
      };
    },
  },
  Mutation: {
    updateUser: (root, { id }) => {
      return {
        id,
      };
    },
  },
};

// Create the remote schema
const serviceASchema = makeExecutableSchema({
  resolvers: serviceAResolvers,
  typeDefs: serviceATypeDefs,
});

const ServiceABinding = new ServiceBinding({ schema: serviceASchema });

const serviceBTypeDefs = `
    type Post {
        id: ID!
    }
    type Query {
        post(id: ID!): Post
    }
    type Mutation {
        updatePost(id: ID!): Post
    }
`;

const serviceBResolvers = {
  Query: {
    post: async (root, { id }) => {
      return {
        id,
      };
    },
  },
  Mutation: {
    updatePost: (root, { id }) => {
      return {
        id,
      };
    },
  },
};

// Create the remote schema
const serviceBSchema = makeExecutableSchema({
  resolvers: serviceBResolvers,
  typeDefs: serviceBTypeDefs,
});

const ServiceBBinding = new ServiceBinding({ schema: serviceBSchema });

const combinedTypeDefintions = `
    type Post {
        id: ID!
    }
    type User {
        id: ID!
    }
    type Query {
        userById(id: ID!): User
        post(id: ID!): Post
    }

    type Mutation {
        updateUser(id: ID!): User
        updatePost(id: ID!): Post
    }
`;

const server = express();

describe('GraphQL Gateway', () => {
  let serverInstance;
  let graphQLClient;
  before(() => {
    const serviceMap = {
      a: ServiceABinding,
      b: ServiceBBinding,
    };
    createGateway({
      server,
      config: serviceMap,
      typeDefinitions: combinedTypeDefintions,
      context: () => {
        return {};
      },
      headersToForward: ['x-userid'],
    });
    serverInstance = server.listen(1909, () => {
      console.log('listening on port 1909');
    });

    const endpoint = 'http://localhost:1909/graphql';

    graphQLClient = new GraphQLClient(endpoint);
  });

  after(() => {
    serverInstance.close();
  });

  it('should be able to query Service A from Gateway', async () => {
    const query = `
    {
      userById(id: "1") {
        id
      }
    }
  `;

    const data = await graphQLClient.request(query);

    expect(get(data, 'userById.id')).to.eql('1');
  });

  it('should be able to call a mutation Service A from Gateway', async () => {
    const query = `
    mutation {
      updateUser(id: "1") {
        id
      }
    }
  `;

    const data = await graphQLClient.request(query);

    expect(get(data, 'updateUser.id')).to.eql('1');
  });

  it('should be able to query Service B from Gateway', async () => {
    const query = `
    {
      post(id: "1") {
        id
      }
    }
  `;

    const data = await graphQLClient.request(query);

    expect(get(data, 'post.id')).to.eql('1');
  });

  it('should be able to call a mutation Service B from Gateway', async () => {
    const query = `
    mutation {
      updatePost(id: "1") {
        id
      }
    }
  `;

    const data = await graphQLClient.request(query);

    expect(get(data, 'updatePost.id')).to.eql('1');
  });
});
