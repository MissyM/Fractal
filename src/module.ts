import {
  Component,
  Action,
  Update,
  Context,
  ComponentSpace,
  ComponentSpaceIndex,
  Executable,
  EventData,
  DispatchData,
  EventFunction,
  Interface,
} from './core'
import {
  InterfaceHandler,
  InterfaceFunction,
  InterfaceMsg,
  InterfaceHandlerObject,
} from './interface'
import { Task, TaskFunction } from './task'
import { newStream, Stream } from './stream'

export interface ModuleDef {
  log?: boolean
  logAll?: boolean
  root: Component
  tasks?: {
    [name: string]: TaskFunction
  }
  interfaces: {
    [name: string]: InterfaceFunction
  }
}

export interface Module {
  moduleDef: ModuleDef
  reattach(root: Component): void
  dispose(): void
  isDisposed: boolean
  // related to internals
  interfaces: {
    [name: string]: InterfaceHandlerObject
  }
  interfaceStreams: {
    [name: string]: Stream<InterfaceMsg>
  }
  moduleAPI: ModuleAPI
  // Root component context
  ctx: Context
}

// API from module to handlers
export interface ModuleAPI {
  dispatch: {
    (dispatchData: DispatchData): void
  }
  merge: {
    (name: string, component: Component): void
  }
  mergeAll: {
    (components: { [name: string]: Component }): void
  }
  warn: {
    (source, description): void
  }
  error: {
    (source, description): void
  }
}

// create context for a component
export function createContext (ctx: Context, name: string): Context {
  let id = ctx.id === '' ? name : `${ctx.id}$${name}`
  return {
    id, // the component id
    // delegation
    components: ctx.components,
    interfaceStreams: ctx.interfaceStreams,
    taskRunners: ctx.taskRunners,
    warn: ctx.warn,
    warnLog: ctx.warnLog,
    error: ctx.error,
    errorLog: ctx.errorLog,
  }
}

// gets the state from a certain component
export function stateOf (ctx, name) {
  return ctx.components[`${ctx.id}$${name}`].state
}

// gets an interface message from a certain component
export function interfaceOf (ctx: Context, name: string, interfaceName: string): any {
  let id = `${ctx.id}$${name}`
  let componentSpace = ctx.components[id]
  if (!componentSpace) {
    ctx.error('interfaceOf', `there are no module '${id}'`)
    return {}
  }
  if (!componentSpace.def.interfaces[interfaceName]) {
    ctx.error('interfaceOf', `there are no interface '${interfaceName}' in module '${id}'`)
    return {}
  }
  return componentSpace.def.interfaces[interfaceName](componentSpace.ctx, componentSpace.state)
}

// add a component to the component index
export function merge (ctx: Context, name: string, component: Component): Context {
  // namespaced name if is a child
  let id = ctx.id === '' ? name : ctx.id + '$' + name
  if (ctx.components[id]) {
    ctx.warn('merge', `component '${ctx.id}' has overwritten component '${id}'`)
  }

  let childCtx = createContext(ctx, name)

  ctx.components[id] = {
    ctx: childCtx,
    state: component.state({key: name}),
    events: component.events(childCtx),
    def: component,
  }
  // composition
  if (component.components) {
    mergeAll(childCtx, component.components)
  }
  // lifecycle hook: init
  if (component.hooks && component.hooks['init']) {
    component.hooks['init'](childCtx)
  }

  return childCtx
}

// add many components to the component index
export function mergeAll (ctx: Context, components: { [name: string]: Component }) {
  for (let i = 0, names = Object.keys(components), len = names.length; i < len; i++) {
    merge(ctx, names[i], components[names[i]])
  }
}

// remove a component to the component index
export function unmerge (ctx: Context): void {
  let componentSpace = ctx.components[ctx.id]
  if (componentSpace) {
    ctx.error('unmerge', `there is no component name '${ctx.id}'`)
  }
  // decomposition
  let components = componentSpace.def.components
  if (components) {
    unmergeAll(ctx, components)
  }
  // lifecycle hook: destroy
  if (componentSpace.def.hooks && componentSpace.def.hooks['destroy']) {
    componentSpace.def.hooks['destroy'](ctx)
  }

  delete ctx.components[ctx.id]
}

// add many components to the component index
export function unmergeAll (ctx: Context, components: { [name: string]: Component }) {
  for (let i = 0, ids = Object.keys(components), len = ids.length; i < len; i++) {
    unmerge(ctx.components[ctx.id + '$' + ids[i]].ctx)
  }
}

// create an EventData array
export function ev (ctx: Context, inputName: string, paramFn?: EventFunction): EventData {
   return [ctx.id, inputName, paramFn]
}

// dispatch an event to the respective component
export const dispatch = (ctx: Context, dispatchData: DispatchData) => {
  let component = ctx.components[dispatchData[0]]
  if (!component) {
    return ctx.error('dispatch', `there are no module with id '${dispatchData[0]}'`)
  }
  let event = component.events[dispatchData[1]]
  if (event) {
    execute(ctx, dispatchData[0], event(dispatchData[2]))
  } else {
    ctx.error('dispatch', `there are no event with id '${dispatchData[1]}' in module '${dispatchData[0]}'`)
  }
}

export function execute (ctx: Context, id: string, executable: Executable | Executable[]) {
  let componentSpace = ctx.components[id]

  if (typeof executable === 'function') {
    // single update
    componentSpace.state = (<Update> executable)(componentSpace.state)
    notifyInterfaceHandlers(ctx)
  } else {
    /* istanbul ignore else */
    if (executable instanceof Array) {
      if (executable[0] && typeof executable[0] === 'string') {
        // single task
        if (!ctx.taskRunners[executable[0]]) {
          return ctx.error('execute', `there are no task handler for ${executable[0]}`)
        }
        ctx.taskRunners[executable[0]](executable[1])
      } else {
        /* istanbul ignore else */
        if (executable[0] instanceof Array || typeof executable[0] === 'function') {
          // list of updates and tasks
          for (let i = 0, len = executable.length; i < len; i++) {
            if (typeof executable[i] === 'function') {
              // is an update
              componentSpace.state = (<Update> executable[i])(componentSpace.state)
              notifyInterfaceHandlers(ctx)
            } else {
                /* istanbul ignore else */
                if (executable[i] instanceof Array && typeof executable[i][0] === 'string') {
                // single task
                if (!ctx.taskRunners[executable[i][0]]) {
                  return ctx.error('execute', `there are no task handler for ${executable[i][0]}`)
                }
                ctx.taskRunners[executable[i][0]](executable[i][1])
              }
            }
            // the else branch never occurs because of Typecript check
          }
        }
      }
    }
    // the else branch never occurs because of Typecript check
  }
}

// permorms interface recalculation
export function notifyInterfaceHandlers (ctx: Context) {
  let space = ctx.components[ctx.id]
  for (let name in  ctx.interfaceStreams) {
    ctx.interfaceStreams[name].set(space.def.interfaces[name](ctx, space.state))
  }
}

export interface InterfaceHandlerStreams {
  [driverName: string]: Stream<InterfaceMsg>
}

// function for running a root component
export function run (moduleDefinition: ModuleDef): Module {
  // internal module state
  // root component
  let component: Component
  let moduleDef: ModuleDef
  let moduleAPI: ModuleAPI
  // root context
  let ctx: Context
  let interfaceHanlerObjects: {
    [name: string]: InterfaceHandlerObject
  }

  // attach root component
  function attach (comp?: Component, lastComponents?: ComponentSpaceIndex) {
    moduleDef = {
      log: false,
      logAll: false,
      ...moduleDefinition,
    }
    // root component, take account of hot swaping
    component = comp ? comp : moduleDef.root
    let rootName = component.name
    // if is hot swaping, do not recalculat context
    if (!lastComponents) {
      // root context
      ctx = {
        id: '',
        // component index
        components: {},
        taskRunners: {},
        interfaceStreams: {},
        // error and warning handling
        warn: (source, description) => {
          ctx.warnLog.push([source, description])
          console.warn(`source: ${source}, description: ${description}`)
        },
        warnLog: [],
        error: (source, description) => {
          ctx.errorLog.push([source, description])
          console.error(`source: ${source}, description: ${description}`)
        },
        errorLog: [],
      }
    } else {
      // hot swaping mode changes the id of root context
      ctx.id = rootName
    }

    // API for modules
    moduleAPI = {
      // dispatch function type used for handlers
      dispatch: (dispatchData) => dispatch(ctx, dispatchData),
      // merge a component to the component index
      merge: (name, component) => merge(ctx, name, component),
      // merge many components to the component index
      mergeAll: (components) => mergeAll(ctx, components),
      // delegated methods
      warn: ctx.warn,
      error: ctx.error,
    }
    // pass ModuleAPI to every InterfaceFunction
    // if is not hot swaping
    if (!lastComponents) {
      interfaceHanlerObjects = {}
      // TODO: optimize for (let in) with for (Object.keys())
      for (let name in moduleDef.interfaces) {
        interfaceHanlerObjects[name] = moduleDef.interfaces[name](moduleAPI)
      }
      // pass ModuleAPI to every TaskFunction
      for (let name in moduleDef.tasks) {
        ctx.taskRunners[name] = moduleDef.tasks[name](moduleAPI)
      }
    }
    // merges main component and ctx.id now contains it name
    ctx = merge(ctx, component.name, component)
    // preserves state on hot swaping - TODO: make a deepmerge
    if (lastComponents) {
      for (let i = 0, ids = Object.keys(lastComponents), len = ids.length; i < len; i++) {
        // if the component still existing
        if (ctx.components[ids[i]]) {
          ctx.components[ids[i]].state = lastComponents[ids[i]].state
        }
      }
    }
    // creates interfaceStreams (interface recalculation)
    for (let name in component.interfaces) {
      if (interfaceHanlerObjects[name]) {
        ctx.interfaceStreams[name] = newStream(component.interfaces[name](ctx, ctx.components[rootName].state))
        // connect interface handlers to driver streams
        interfaceHanlerObjects[name][(lastComponents) ? 'reattach' : 'attach'](ctx.interfaceStreams[name])
      } else {
        return ctx.error('InterfaceHandlers', `'${rootName}' module has no interface called '${name}', missing interface handler`)
      }
    }

  }

  attach(undefined)

  return {
    moduleDef,
    // reattach root component, used for hot swaping
    reattach (comp: Component) {
      disposeinterfaceStreams(ctx)
      let lastComponents = ctx.components
      ctx.components = {}
      // TODO: use a deepmerge algoritm
      attach(comp, lastComponents)
    },
    dispose () {
      // dispose all streams
      unmerge(ctx)
      disposeinterfaceStreams(ctx)
      this.isDisposed = true
    },
    isDisposed: false,
    // related to internals
    interfaces: interfaceHanlerObjects,
    interfaceStreams: ctx.interfaceStreams,
    // root context
    moduleAPI,
    ctx,
  }
}

export function disposeinterfaceStreams (ctx: Context) {
  for (var i = 0, keys = Object.keys(ctx.interfaceStreams); i < keys.length; i++) {
    ctx.interfaceStreams[keys[i]].dispose()
  }
}
