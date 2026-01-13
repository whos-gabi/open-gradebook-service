'use strict';

const { PubSub } = require('graphql-subscriptions');

// Create a single PubSub instance for the application
const pubsub = new PubSub();

// Event constants for subscription channels
const EVENTS = {
  GRADE_ADDED: 'GRADE_ADDED',
};

module.exports = {
  pubsub,
  EVENTS,
};
