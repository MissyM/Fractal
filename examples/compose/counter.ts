import { Context, Component, ev } from '../../src'
import { styleGroup, StyleGroup } from '../../src/utils/style'

import { ViewInterface } from '../../src/interfaces/view'
import h from 'snabbdom/h'

let name = 'Main'

let state = ({key}) => ({
  key,
  count: 0,
})

let actions = {
  Set: (count: number) => state => {
    state.count = count
    return state
  },
  Inc: () => state => {
    state.count ++
    return state
  },
}

let events = (ctx: Context) => ({
  set: (n: number) => actions.Set(n),
  inc: () => actions.Inc(),
})

let view: ViewInterface = (ctx, s) =>

h('div', {
  key: name,
  class: { [style.base]: true },
}, [
  h('div', {
    class: { [style.count]: true },
    on: {
      click: ev(ctx, 'inc'),
    },
  }, `${s.count}`),
  h('div', {
    class: { [style.reset]: true },
    on: {
      click: ev(ctx, 'set', () => 0),
    },
  }, 'reset'),
])


let styleObj: StyleGroup = {
  base: {
    width: '120px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px',
    backgroundColor: '#C1C6CC',
  },
  count: {
    width: '30px',
    height: '30px',
    marginRight: '10px',
    borderRadius: '50%',
    color: 'white',
    fontSize: '20px',
    backgroundColor: '#3232F2',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reset: {
    padding: '4px',
    color: 'white',
    fontSize: '18px',
    backgroundColor: '#EA1818',
  },
}

let style: any = styleGroup(styleObj, name)


let mDef: Component = {
  name,
  state,
  events,
  actions,
  interfaces: {
    view,
  },
}

export default mDef
