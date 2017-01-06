# Fractal is now in Typescript

We will focus on next topics:

- Simple API + simple architecture (do other diagram like architecture diagram, but focus on what is useful for users)
- Focus on small and emmbedable modules
- Tasks are atomic are not grouped
- Small code (removing some dependencies), ALAP
- Mori for persistent data structures
- Typed views via new Snabbdom with Typescript
- Better composing API
- Better and simple docs, live docs
- Behaviors optimization pattern, via tasks
- Tween.js task for animations
- Router pattern (urls)

FractalBlocks UI follows the same topics

## Dependencies

- Maintain package.json as simple as possible, less dependencies, less scripts ...

## Concepts

- module: is a small or big part of your app, and is designed for composition.
- engine: an engine runs one module (AKA root module), connecting it to external world. A module can be composed of more modules in a module tree
- interface: is the part of a module that is responsible of communications (external world, AKA side effects)
- interface handler: is a part of an engine that handle interfaces of root module. Performs a certain type of side effects.
- state: is the part of a module related to their data
- action: is a part of a module that is the unique way to update the state
- task: is an information related to a specific side effect, tasks are dispatched by modules via inputs (see later)
- task handler: is a part of an engine that handle tasks, performing side effects of certain type
- input: is a part of a module that is a dispatcher for actions and tasks

## Scripts

List of possible commands, we maintain package.json as simple as possible

"lint": "tslint src/**/*.ts",
"build": "rimraf lib/ && tsc",
"benchmarks": "ts-node benchmarks/index.ts",
"prepublish": "typings install && npm run build",
"compile": "cross-env NODE_ENV=production webpack --config webpack/dist.config.js --progress",
"compile-dev": "cross-env NODE_ENV=production webpack --config webpack/dist-dev.config.js --progress",
"compile-server": "cross-env NODE_ENV=production webpack --config webpack/webpack-server.config.js --progress",
"test-dev": "webpack-dev-server --config webpack/test-dev.config.js --progress",
"postinstall": "typings install dt~jasmine --save --global",
"test": "ts-node node_modules/jasmine/bin/jasmine.js JASMINE_CONFIG_PATH=jasmine.json",
"test:coverage": "ts-node node_modules/istanbul/lib/cli.js cover -e .ts  -x \"*.d.ts\" -x \"*.spec.ts\" node_modules/jasmine/bin/jasmine.js -- JASMINE_CONFIG_PATH=jasmine.json"