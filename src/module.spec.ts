import {
  Component,
  Module,
  Context,
  run,
  merge,
  stateOf,
  interfaceOf,
  ev,
  Executable,
  createContext,
  Update,
  Task,
  TaskHandler,
  DispatchData,
  dispatch,
  Hooks,
  unmerge,
} from './index'
import { eventHandler, EventInterface } from './interfaces/event'
import { newStream } from './stream'

// Component definition to perform tests

let name = 'Main'

let state = ({key}) => ({
  key,
  count: 0,
})

let actions = {
  Set: (count: number) => s => {
    s.count = count
    return s
  },
  Inc: () => s => {
    s.count ++
    return s
  },
}

let events = (ctx: Context) => ({
  set: (n: number) => actions.Set(n),
  inc: () => actions.Inc(),
  task: (): Task => ['log', { info: 'info', cb: ev(ctx, 'inc') }],
  wrongTask: (): Task => ['wrongTask', {}],
  executableListWrong: (): Executable[] => [
    ['wrongTask2', {}],
  ],
  executableListTask: (): Executable[] => [
    ['log', { info: 'info2', cb: ev(ctx, 'inc') }],
  ],
  executableListAction: (): Executable[] => [
    actions.Inc(),
  ],
})

let event: EventInterface =
  (ctx, s) => ({
    tagName: s.key,
    content: 'Fractal is awesome!! ' + s.count,
    inc: ev(ctx, 'inc'),
    task: ev(ctx, 'task'),
    wrongTask: ev(ctx, 'wrongTask'),
    executableListWrong: ev(ctx, 'executableListWrong'),
    executableListTask: ev(ctx, 'executableListTask'),
    executableListAction: ev(ctx, 'executableListAction'),
  })

let root: Component = {
  name,
  state,
  events,
  actions,
  interfaces: {
    event,
  },
}

describe('Context functions', function () {

  let doLog = []

  let rootCtx: Context = {
    id: 'Main',
    taskRunners: {},
    interfaceStreams: {},
    components: {}, // component index
    // error and warning handling
    warn: (source, description) => {
      rootCtx.warnLog.push([source, description])
      console.warn(`source: ${source}, description: ${description}`)
    },
    error: (source, description) => {
      rootCtx.errorLog.push([source, description])
      console.error(`source: ${source}, description: ${description}`)
    },
    warnLog: [],
    errorLog: [],
  }

  let ctx: Context
  it('Should create a child context (createContext)', () => {
    ctx = createContext(rootCtx, 'child')
    expect(ctx).toBeDefined()
  })

  it('Should put an entry in warnLog when warn function is invoked', () => {
    let warn = ['child', 'warn 1']
    rootCtx.warn(warn[0], warn[1])
    let lastWarn = rootCtx.warnLog[rootCtx.warnLog.length - 1]
    expect(lastWarn).toEqual(warn)
  })

  it('Should delegate error function', () => {
    let error = ['child', 'error 1']
    ctx.error(error[0], error[1])
    let lastError = rootCtx.errorLog[rootCtx.errorLog.length - 1]
    expect(lastError).toEqual(error)
  })

  it('Should merge a component to context (merge)', () => {
    merge(rootCtx, 'child', root)
    expect(ctx.components[`Main$child`]).toBeDefined()
  })

  it('Should overwrite a component if has the same name and log a warning', () => {
    ctx.components[`Main$child`].state.count = 17
    merge(rootCtx, 'child', root)
    expect(ctx.components[`Main$child`]).toBeDefined()
    // Should overwrite
    expect(ctx.components[`Main$child`].state.count).toEqual(0)
    expect(rootCtx.warnLog[rootCtx.warnLog.length - 1])
      .toEqual(['merge', `component 'Main' has overwritten component 'Main$child'`])
  })

  let state

  it('Should get the state from a certain component (stateOf)', () => {
    state = stateOf(rootCtx, 'child')
    expect(state.count).toEqual(0)
  })

  it('Should get an interface message from a certain component (interfaceOf)', () => {
    expect(interfaceOf(rootCtx, 'child', 'event')).toEqual(event(createContext(rootCtx, 'child'), state))
  })

  it('Should log an error if try to get an interface message from an inexistent component (interfaceOf)', () => {
    interfaceOf(rootCtx, 'wrong', 'event')
    expect(rootCtx.errorLog[rootCtx.errorLog.length - 1]).toEqual([
      'interfaceOf',
      `there are no module 'Main$wrong'`,
    ])
  })

  it('Should log an error if try to get an inexistent interface message from a certain component (interfaceOf)', () => {
    interfaceOf(rootCtx, 'child', 'wrong')
    expect(rootCtx.errorLog[rootCtx.errorLog.length - 1]).toEqual([
      'interfaceOf',
      `there are no interface 'wrong' in module 'Main$child'`,
    ])
  })

})

describe('One Component + module functionality', function () {

  let value$ = newStream<any>(undefined)
  function onValue(val) {
    value$.set(val)
  }

  let taskLog = []

  let logTask: TaskHandler = log => mod => (data: {info: any, cb: DispatchData}) => {
    log.push(data.info)
    mod.dispatch(data.cb)
  }

  let app = run({
    root,
    tasks: {
      log: logTask(taskLog),
    },
    interfaces: {
      event: eventHandler(onValue),
    }
  })

  it('Should log an error when module dont have an InterfaceHandler', () => {
    let app = run({
      root,
      interfaces: {},
    })
    expect(app.ctx.errorLog[app.ctx.errorLog.length - 1]).toEqual([
      'InterfaceHandlers',
      `'Main' module has no interface called 'event', missing interface handler`,
    ])
  })

  it('should have initial state', () => {
    let value = value$.get()
    expect(value.tagName).toBe('Main')
    expect(value.content).toBe('Fractal is awesome!! 0')
  })

  // Events should dispatch actions and intefaces are recalculated

  let value

  it('should react to an event (dispatch function)', done => {
    value$.subscribe(value => {
      expect(value.content).toBe('Fractal is awesome!! 1')
      done()
    })
    // extract value and dispatch interface handlers
    value = value$.get()
    value._dispatch(value.inc)
  })

  it('Should put an entry in errorLog when error function is invoked', () => {
    let error = ['child', 'error 1']
    app.ctx.error(error[0], error[1])
    let lastError = app.ctx.errorLog[app.ctx.errorLog.length - 1]
    expect(lastError).toEqual(error)
  })

  it('Should delegate warn function', () => {
    let warn = ['child', 'warn 1']
    app.ctx.warn(warn[0], warn[1])
    let lastWarn = app.ctx.warnLog[app.ctx.warnLog.length - 1]
    expect(lastWarn).toEqual(warn)
  })

  it('should log an error when try to dispatch an event of an inexistent module', () => {
    value._dispatch(['someId', 'someEvent'])
    expect(app.ctx.errorLog[app.ctx.errorLog.length - 1]).toEqual([
      'dispatch',
      `there are no module with id 'someId'`,
    ])
  })

  it('should log an error when try to dispatch an inexistent event of a module', () => {
    value._dispatch(['Main', 'someEvent'])
    expect(app.ctx.errorLog[app.ctx.errorLog.length - 1]).toEqual([
      'dispatch',
      `there are no event with id 'someEvent' in module 'Main'`,
    ])
  })

  // Events should dispatch tasks to its handlers and those can dispatch events

  it('should dispatch an executable (action / task) asyncronusly from an event when it return a Task with EventData', done => {
    value$.removeSubscribers()
    value$.subscribe(value => {
      expect(value.content).toBe('Fractal is awesome!! 2')
      expect(taskLog[taskLog.length - 1]).toEqual('info')
      done()
    })
    value._dispatch(value.task)
  })

  it('should log an error when try to dispatch an task that has no task handler', () => {
    value$.removeSubscribers()
    value._dispatch(value.wrongTask)
    expect(app.ctx.errorLog[app.ctx.errorLog.length - 1]).toEqual([
      'execute',
      'there are no task handler for wrongTask',
    ])
  })

  // Executable lists

  it('should dispatch an error if try to dispatch an executable list with a task with no handler', () => {
    value$.removeSubscribers()
    value._dispatch(value.executableListWrong)
    expect(app.ctx.errorLog[app.ctx.errorLog.length - 1]).toEqual([
      'execute',
      'there are no task handler for wrongTask2',
    ])
  })

  it('should dispatch an executable list that contains a task', done => {
    value$.removeSubscribers()
    value$.subscribe(value => {
      expect(value.content).toBe('Fractal is awesome!! 3')
      expect(taskLog[taskLog.length - 1]).toEqual('info2')
      done()
    })
    value._dispatch(value.executableListTask)
  })

  it('should dispatch an executable list that contains an action', done => {
    value$.removeSubscribers()
    value$.subscribe(value => {
      expect(value.content).toBe('Fractal is awesome!! 4')
      done()
    })
    value._dispatch(value.executableListAction)
  })

  // dispose module

  it('should dispose a module', () => {
    app.dispose()
    expect(app.ctx.components).toEqual({})
  })

})

describe('Component composition', () => {

  // Managed composition

  // for building new components reutilize the existents

  let child: Component = {
    name: 'Child',
    state,
    events,
    actions,
    interfaces: {
      event,
    },
  }

  let components = {
    child1: child,
    child2: child,
    child3: child,
  }

  let mainEvent: EventInterface =
    (ctx, s) => ({
      tagName: s.key,
      content: 'Fractal is awesome!! ' + s.count,
      inc: ev(ctx, 'inc'),
      childEvent1: interfaceOf(ctx, 'child1', 'event'),
      childEvent2: interfaceOf(ctx, 'child2', 'event'),
      childEvent3: interfaceOf(ctx, 'child3', 'event'),
    })

  let main: Component = {
    name: 'Main',
    state,
    components,
    events,
    actions,
    interfaces: {
      event: mainEvent,
    },
  }

  let app: Module

  let value2$ = newStream<any>(undefined)
  function onValue2(val) {
    value2$.set(val)
  }

  it('Should merge child components', () => {
    app = run({
      root: main,
      interfaces: {
        event: eventHandler(onValue2),
      }
    })
    expect(app.ctx.components['Main$child1']).toBeDefined()
    expect(app.ctx.components['Main$child2']).toBeDefined()
    expect(app.ctx.components['Main$child3']).toBeDefined()
  })

  it('a child should react to events', done => {
    let value = value2$.get()
    value2$.removeSubscribers()
    value2$.subscribe(value => {
      expect(value.childEvent1.content).toBe('Fractal is awesome!! 1')
      expect(value.childEvent2.content).toBe('Fractal is awesome!! 0')
      expect(value.childEvent3.content).toBe('Fractal is awesome!! 0')
      done()
    })
    value._dispatch(value.childEvent1.inc)
  })

  it('should unmerge a component tree', () => {
    unmerge(app.ctx)
    expect(Object.keys(app.ctx.components).length).toEqual(0)
  })

  it('should log an error when unmerge an inexistent component', () => {
    app = run({
      root: main,
      interfaces: {
        event: eventHandler(() => 0),
      },
    })
    app.ctx.id = 'wrong'
    unmerge(app.ctx)
    expect(app.ctx.errorLog[app.ctx.errorLog.length - 1]).toEqual(['unmerge', `there is no component name 'wrong'`])
  })

})

describe('Lifecycle hooks', () => {
  let disposeLog = []

  let hooks: Hooks = {
    init: ctx => {
      dispatch(ctx, ev(ctx, 'inc'))
    },
    destroy: ctx => {
      let parts = ctx.id.split('$')
      disposeLog.push(parts[parts.length - 1])
    },
  }

  let child: Component = {
    name: 'Child',
    state,
    hooks,
    events,
    actions,
    interfaces: {
      event,
    },
  }
  let components = {
    child1: child,
    child2: child,
    child3: child,
  }
  let mainEvent: EventInterface =
    (ctx, s) => ({
      tagName: s.key,
      content: 'Fractal is awesome!! ' + s.count,
      inc: ev(ctx, 'inc'),
      childEvent1: interfaceOf(ctx, 'child1', 'event'),
      childEvent2: interfaceOf(ctx, 'child2', 'event'),
      childEvent3: interfaceOf(ctx, 'child3', 'event'),
    })

  let main: Component = {
    name: 'Main',
    state,
    hooks,
    components,
    events,
    actions,
    interfaces: {
      event: mainEvent,
    },
  }

  let app: Module

  let value$ = newStream<any>(undefined)
  function onValue(val) {
    value$.set(val)
  }

  let value

  it('Should call init in all component tree when initialize the module', () => {
    app = run({
      root: main,
      interfaces: {
        event: eventHandler(onValue),
      },
    })
    value = value$.get()
    expect(value.childEvent1.content).toBe('Fractal is awesome!! 1')
    expect(value.childEvent2.content).toBe('Fractal is awesome!! 1')
    expect(value.childEvent3.content).toBe('Fractal is awesome!! 1')
  })

  it('Should call destroy in all component tree when dispose the module', () => {
    app.dispose()
    expect(disposeLog).toEqual(['child1', 'child2', 'child3', 'Main'])
  })

})

describe('Hot swapping', () => {
   let child: Component = {
    name: 'Child',
    state,
    events,
    actions,
    interfaces: {
      event,
    },
  }
  let components = {
    child1: child,
    child2: child,
    child3: child,
  }
  let mainEventV1: EventInterface =
    (ctx, s) => ({
      tagName: s.key,
      content: 'Fractal is awesome!! ' + s.count,
      inc: ev(ctx, 'inc'),
      childEvent1: interfaceOf(ctx, 'child1', 'event'),
      childEvent2: interfaceOf(ctx, 'child2', 'event'),
      childEvent3: interfaceOf(ctx, 'child3', 'event'),
    })

  let mainV1: Component = {
    name: 'Main',
    state,
    components,
    events,
    actions,
    interfaces: {
      event: mainEventV1,
    },
  }

  let mainEventV2: EventInterface =
    (ctx, s) => ({
      tagName: s.key,
      content: 'Fractal is awesome V2!! ' + s.count + ' :D',
      inc: ev(ctx, 'inc'),
      childEvent1: interfaceOf(ctx, 'child1', 'event'),
      childEvent2: interfaceOf(ctx, 'child2', 'event'),
      childEvent3: interfaceOf(ctx, 'child3', 'event'),
    })

  let mainV2: Component = {
    name: 'Main',
    state,
    components,
    events,
    actions,
    interfaces: {
      event: mainEventV2,
    },
  }

  let app: Module

  let value$ = newStream<any>(undefined)
  function onValue(val) {
    value$.set(val)
  }

  let value

  it('Should call init in all component tree when initialize the module', () => {
    app = run({
      root: mainV1,
      interfaces: {
        event: eventHandler(onValue),
      },
    })
    app.reattach(mainV2)
    value = value$.get()
    expect(value.content).toBe('Fractal is awesome V2!! 0 :D')
    expect(value.childEvent1.content).toBe('Fractal is awesome!! 0')
    expect(value.childEvent2.content).toBe('Fractal is awesome!! 0')
    expect(value.childEvent3.content).toBe('Fractal is awesome!! 0')
  })
})
